import base64
from io import BytesIO
from pathlib import Path
from threading import Lock

from PIL import Image

from app.config import settings
from app.schemas import CreateMannequinJobRequest


ASPECT_SIZES: dict[str, tuple[int, int]] = {
  '1:1': (1024, 1024),
  '4:3': (1152, 864),
  '3:4': (864, 1152),
  '16:9': (1216, 684),
  '9:16': (684, 1216),
  '3:2': (1152, 768),
  '2:3': (768, 1152),
}

_pipeline = None
_pipeline_lock = Lock()


def _decode_data_url(data_url: str) -> bytes:
  if ',' not in data_url:
    raise ValueError('Invalid source image data URL')
  _, encoded = data_url.split(',', 1)
  return base64.b64decode(encoded)


def _flatten_to_rgb(image: Image.Image) -> Image.Image:
  rgba = image.convert('RGBA')
  bg = Image.new('RGBA', rgba.size, (255, 255, 255, 255))
  bg.alpha_composite(rgba)
  return bg.convert('RGB')


def _trim_alpha(image: Image.Image) -> Image.Image:
  alpha = image.split()[-1]
  bbox = alpha.getbbox()
  if not bbox:
    return image
  pad = 8
  x1, y1, x2, y2 = bbox
  x1 = max(0, x1 - pad)
  y1 = max(0, y1 - pad)
  x2 = min(image.width, x2 + pad)
  y2 = min(image.height, y2 + pad)
  return image.crop((x1, y1, x2, y2))


def _strip_light_background(image: Image.Image) -> Image.Image:
  rgba = image.convert('RGBA')
  pixels = []
  for r, g, b, a in rgba.getdata():
    if r > 244 and g > 244 and b > 244:
      pixels.append((r, g, b, 0))
    else:
      pixels.append((r, g, b, a))
  rgba.putdata(pixels)
  return rgba


def _resolve_mannequin_template_path() -> Path | None:
  configured = settings.mannequin_template_image.strip()
  candidates: list[Path] = []
  if configured:
    candidates.append(Path(configured).expanduser())
  candidates.append(Path('/app/assets/egmusc.webp'))
  candidates.append(Path(__file__).resolve().parents[1] / 'assets' / 'egmusc.webp')

  for candidate in candidates:
    if candidate.exists():
      return candidate
  return None


def _build_condition_image(
  request: CreateMannequinJobRequest,
  source_image: Image.Image,
  width: int,
  height: int,
) -> Image.Image:
  garment = _trim_alpha(_strip_light_background(source_image.convert('RGBA')))

  # Shoes should keep direct garment conditioning.
  if request.category == 'shoes':
    return _flatten_to_rgb(garment.resize((width, height), Image.Resampling.LANCZOS))

  use_template = True
  if request.metadata and 'useMannequinTemplate' in request.metadata:
    use_template = request.metadata['useMannequinTemplate'].strip().lower() in {'1', 'true', 'yes'}

  template_path = _resolve_mannequin_template_path() if use_template else None
  if template_path is None:
    return _flatten_to_rgb(garment.resize((width, height), Image.Resampling.LANCZOS))

  mannequin = Image.open(template_path).convert('RGBA').resize((width, height), Image.Resampling.LANCZOS)

  if request.category == 'tops':
    max_size = (int(width * 0.58), int(height * 0.56))
    y_anchor = int(height * 0.15)
  else:
    max_size = (int(width * 0.54), int(height * 0.54))
    y_anchor = int(height * 0.39)

  garment.thumbnail(max_size, Image.Resampling.LANCZOS)
  x = (width - garment.width) // 2
  mannequin.alpha_composite(garment, (x, y_anchor))
  return _flatten_to_rgb(mannequin)


def _load_pipeline():
  global _pipeline
  with _pipeline_lock:
    if _pipeline is not None:
      return _pipeline

    try:
      import torch
      from diffusers import AutoPipelineForImage2Image
    except Exception as error:
      raise RuntimeError(f'HF local dependencies unavailable: {error}')

    use_mps = settings.hf_device == 'mps' and hasattr(torch.backends, 'mps') and torch.backends.mps.is_available()
    dtype = torch.float16 if use_mps else torch.float32
    pipe = AutoPipelineForImage2Image.from_pretrained(
      settings.hf_model_id,
      torch_dtype=dtype,
      use_safetensors=True,
    )
    target_device = 'mps' if use_mps else ('cpu' if settings.hf_device == 'mps' else settings.hf_device)
    pipe = pipe.to(target_device)
    if hasattr(pipe, 'enable_attention_slicing'):
      pipe.enable_attention_slicing()
    _pipeline = pipe
    return _pipeline


def generate_hf_local_image(
  request: CreateMannequinJobRequest,
  source_image_data_url: str,
  prompt: str,
  negative_prompt: str,
) -> Image.Image:
  if source_image_data_url.strip() == '':
    raise RuntimeError('HF local generator requires at least one source image')

  source = Image.open(BytesIO(_decode_data_url(source_image_data_url))).convert('RGBA')
  width, height = ASPECT_SIZES.get(request.aspectRatio or '1:1', ASPECT_SIZES['1:1'])
  source_rgb = _build_condition_image(request, source, width, height)

  pipe = _load_pipeline()
  image = pipe(
    prompt=prompt,
    negative_prompt=negative_prompt,
    image=source_rgb,
    num_inference_steps=max(8, settings.hf_num_inference_steps),
    guidance_scale=max(1.0, settings.hf_guidance_scale),
    strength=max(0.05, min(0.95, settings.hf_image_strength)),
  ).images[0].convert('RGBA')

  if (request.background or 'transparent') == 'transparent':
    return _strip_light_background(image)
  return image
