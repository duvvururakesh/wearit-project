import base64
import json
import math
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageOps
from rq import get_current_job

from app.config import settings
from app.hf_local_generator import generate_hf_local_image
from app.ollama_refiner import refine_prompt_with_ollama
from app.openai_image_generator import generate_openai_image
from app.prompt_builder import build_template_prompt, default_negative_prompt
from app.schemas import CreateMannequinJobRequest


def set_progress(value: int):
  job = get_current_job()
  if not job:
    return
  job.meta['progressPercent'] = max(0, min(100, int(value)))
  job.save_meta()


def decode_data_url(data_url: str) -> bytes:
  if ',' not in data_url:
    raise ValueError('Invalid data URL')
  _, encoded = data_url.split(',', 1)
  return base64.b64decode(encoded)


def strip_light_background(image: Image.Image) -> Image.Image:
  rgba = image.convert('RGBA')
  pixels = []
  for r, g, b, a in rgba.getdata():
    if r > 244 and g > 244 and b > 244:
      pixels.append((r, g, b, 0))
    else:
      pixels.append((r, g, b, a))
  rgba.putdata(pixels)
  return rgba


def trim_alpha(image: Image.Image) -> Image.Image:
  alpha = image.split()[-1]
  bbox = alpha.getbbox()
  if not bbox:
    return image
  pad = 12
  x1, y1, x2, y2 = bbox
  x1 = max(0, x1 - pad)
  y1 = max(0, y1 - pad)
  x2 = min(image.width, x2 + pad)
  y2 = min(image.height, y2 + pad)
  return image.crop((x1, y1, x2, y2))


ASPECT_SIZES: dict[str, tuple[int, int]] = {
  '1:1': (1400, 1400),
  '4:3': (1400, 1050),
  '3:4': (1050, 1400),
  '16:9': (1400, 788),
  '9:16': (788, 1400),
  '3:2': (1400, 933),
  '2:3': (933, 1400),
}


def apply_perspective(image: Image.Image, perspective: str) -> Image.Image:
  rgba = image.convert('RGBA')

  if perspective.startswith('back'):
    rgba = ImageOps.mirror(rgba)

  skew = 0.0
  if perspective.endswith('left'):
    skew = -0.12
  if perspective.endswith('right'):
    skew = 0.12

  if abs(skew) > 0:
    new_w = int(rgba.width + abs(skew) * rgba.height)
    if skew >= 0:
      affine = (1, skew, 0, 0, 1, 0)
    else:
      affine = (1, skew, -skew * rgba.height, 0, 1, 0)
    rgba = rgba.transform(
      (new_w, rgba.height),
      Image.Transform.AFFINE,
      affine,
      resample=Image.Resampling.BICUBIC,
    )

  angle = 0
  if perspective in {'front_left', 'back_left'}:
    angle = 2
  if perspective in {'front_right', 'back_right'}:
    angle = -2
  if angle != 0:
    rgba = rgba.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)

  return trim_alpha(rgba)


def row_warp_by_profile(image: Image.Image, profile_fn) -> Image.Image:
  rgba = image.convert('RGBA')
  width, height = rgba.size
  out_width = max(2, int(width * 1.45))
  out = Image.new('RGBA', (out_width, height), (0, 0, 0, 0))
  center_x = out_width // 2

  for y in range(height):
    y_norm = y / max(1, height - 1)
    scale = profile_fn(y_norm)
    scale = max(0.72, min(1.42, scale))

    row = rgba.crop((0, y, width, y + 1))
    warped_width = max(1, int(width * scale))
    row = row.resize((warped_width, 1), Image.Resampling.BICUBIC)
    paste_x = center_x - (warped_width // 2)
    out.alpha_composite(row, (paste_x, y))

  return trim_alpha(out)


def top_profile(y_norm: float, body_type: str) -> float:
  shoulder = math.exp(-((y_norm - 0.18) / 0.16) ** 2)
  chest = math.exp(-((y_norm - 0.38) / 0.20) ** 2)
  waist = math.exp(-((y_norm - 0.66) / 0.17) ** 2)
  hem_taper = math.exp(-((y_norm - 0.90) / 0.10) ** 2)

  if body_type == 'male':
    return 1.00 + shoulder * 0.17 + chest * 0.18 + waist * 0.08 - hem_taper * 0.04
  return 1.00 + shoulder * 0.11 + chest * 0.13 + waist * 0.06 - hem_taper * 0.03


def bottom_profile(y_norm: float, body_type: str) -> float:
  hips = math.exp(-((y_norm - 0.24) / 0.14) ** 2)
  thigh = math.exp(-((y_norm - 0.46) / 0.16) ** 2)
  knee = math.exp(-((y_norm - 0.66) / 0.11) ** 2)
  ankle_taper = math.exp(-((y_norm - 0.92) / 0.10) ** 2)

  if body_type == 'male':
    return 1.00 + hips * 0.12 + thigh * 0.10 + knee * 0.04 - ankle_taper * 0.14
  return 1.00 + hips * 0.14 + thigh * 0.12 + knee * 0.04 - ankle_taper * 0.12


def surface_refine(image: Image.Image) -> Image.Image:
  softened = image.filter(ImageFilter.GaussianBlur(radius=0.55))
  return softened.filter(ImageFilter.UnsharpMask(radius=1.1, percent=120, threshold=2))


def apply_body_form(image: Image.Image, category: str, body_type: str) -> Image.Image:
  if category == 'tops':
    formed = row_warp_by_profile(image, lambda y: top_profile(y, body_type))
  elif category == 'bottoms':
    formed = row_warp_by_profile(image, lambda y: bottom_profile(y, body_type))
  else:
    # Shoes: keep shape mostly true, apply subtle volume broadening only.
    formed = row_warp_by_profile(image, lambda y: 1.0 + math.exp(-((y - 0.52) / 0.30) ** 2) * 0.05)

  return trim_alpha(surface_refine(formed))


def render_studio_shot(image: Image.Image, aspect_ratio: str, background: str) -> Image.Image:
  width, height = ASPECT_SIZES.get(aspect_ratio, ASPECT_SIZES['1:1'])
  base = Image.new('RGBA', (width, height), (255, 255, 255, 255) if background == 'white' else (0, 0, 0, 0))
  garment_layer = Image.new('RGBA', (width, height), (0, 0, 0, 0))

  target_w = int(width * 0.68)
  target_h = int(height * 0.78)
  fitted = image.copy()
  fitted.thumbnail((target_w, target_h), Image.Resampling.LANCZOS)

  x = (width - fitted.width) // 2
  y = int(height * 0.12) + (target_h - fitted.height) // 2
  garment_layer.alpha_composite(fitted, (x, y))

  alpha_bbox = garment_layer.split()[-1].getbbox()
  shadow_layer = Image.new('RGBA', (width, height), (0, 0, 0, 0))
  if alpha_bbox:
    garment_w = alpha_bbox[2] - alpha_bbox[0]
    center_x = (alpha_bbox[0] + alpha_bbox[2]) // 2
    shadow_w = max(160, int(garment_w * 0.62))
    shadow_h = max(20, int(shadow_w * 0.11))
    shadow_y = min(height - 16, alpha_bbox[3] + 10)
    opacity = 82 if background == 'white' else 56
    draw = ImageDraw.Draw(shadow_layer)
    draw.ellipse(
      (
        center_x - shadow_w // 2,
        shadow_y - shadow_h // 2,
        center_x + shadow_w // 2,
        shadow_y + shadow_h // 2,
      ),
      fill=(0, 0, 0, opacity),
    )
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(radius=13))

  base.alpha_composite(shadow_layer)
  base.alpha_composite(garment_layer)
  return base


def process_mannequin_job(payload: dict) -> dict:
  request = CreateMannequinJobRequest.model_validate(payload)
  job = get_current_job()
  job_id = job.id if job else 'adhoc'

  output_root = Path(settings.output_dir)
  output_root.mkdir(parents=True, exist_ok=True)
  job_dir = output_root / job_id
  job_dir.mkdir(parents=True, exist_ok=True)

  set_progress(5)

  processed_views: list[Image.Image] = []
  generation_mode_used = 'local'
  fallback_reason = ''
  prompt_source: str | None = None
  safety_notes: str | None = None
  primary_input_data_url = request.inputs[0].imageDataUrl if request.inputs else ''
  configured_mode = settings.generator_mode.lower()
  base_prompt = ''
  refinement = None

  if configured_mode in {'openai_image', 'hf_local'}:
    base_prompt = (request.prompt or '').strip() or build_template_prompt(request)
    refinement = refine_prompt_with_ollama(base_prompt, default_negative_prompt(), request)
    prompt_source = refinement.prompt_source
    safety_notes = refinement.safety_notes

  if configured_mode == 'openai_image':
    try:
      generated = generate_openai_image(
        request=request,
        source_image_data_url=primary_input_data_url,
        prompt=refinement.refined_prompt if refinement else (request.prompt or ''),
      )
      generated = trim_alpha(generated)
      generated.save(job_dir / 'generated_raw.png', 'PNG')
      processed_views.append(generated)
      generation_mode_used = 'openai_image'
      set_progress(75)
    except Exception as error:
      fallback_reason = f'OpenAI image generation failed: {error}'
      generation_mode_used = 'local'
      set_progress(10)

  if generation_mode_used == 'local' and configured_mode in {'hf_local', 'openai_image'}:
    try:
      generated = generate_hf_local_image(
        request=request,
        source_image_data_url=primary_input_data_url,
        prompt=refinement.refined_prompt if refinement else (request.prompt or build_template_prompt(request)),
        negative_prompt=refinement.negative_prompt if refinement else default_negative_prompt(),
      )
      generated = trim_alpha(generated)
      generated.save(job_dir / 'generated_raw.png', 'PNG')
      processed_views.append(generated)
      generation_mode_used = 'hf_local'
      set_progress(75)
    except Exception as error:
      # Never hard fail the queue for local HF issues; preserve existing local renderer fallback.
      fallback_reason = f'HF local generation failed: {error}'
      generation_mode_used = 'local'
      set_progress(10)

  if generation_mode_used == 'local':
    for index, input_view in enumerate(request.inputs):
      raw = decode_data_url(input_view.imageDataUrl)
      image = Image.open(BytesIO(raw))
      image = trim_alpha(strip_light_background(image))
      image = apply_perspective(image, request.perspective or 'front')
      image = apply_body_form(image, request.category, request.bodyType or 'male')
      processed_views.append(image)
      image.save(job_dir / f'input_{input_view.view}.png', 'PNG')
      set_progress(20 + int(((index + 1) / max(len(request.inputs), 1)) * 50))

  primary = processed_views[0] if processed_views else Image.new('RGBA', (800, 800), (0, 0, 0, 0))
  if generation_mode_used in {'hf_local', 'openai_image'}:
    preview = primary.convert('RGBA')
  else:
    preview = render_studio_shot(
      primary,
      request.aspectRatio or '1:1',
      request.background or 'white',
    )
  preview_path = job_dir / 'preview.png'
  preview.save(preview_path, 'PNG')

  manifest = {
    'jobId': job_id,
    'category': request.category,
    'shoeSide': request.shoeSide,
    'renderMode': request.renderMode,
    'prompt': request.prompt,
    'modelTier': request.modelTier,
    'aspectRatio': request.aspectRatio,
    'bodyType': request.bodyType,
    'perspective': request.perspective,
    'background': request.background,
    'inputs': [{'view': item.view} for item in request.inputs],
    'outputPreview': f'{settings.public_output_base}/{job_id}/preview.png',
    'generationMode': generation_mode_used,
    'promptSource': prompt_source,
    'safetyNotes': safety_notes,
    'fallbackReason': fallback_reason or None,
    'note': (
      'Output generated by OpenAI image model.'
      if generation_mode_used == 'openai_image'
      else (
      'Output generated by local Hugging Face img2img model.'
      if generation_mode_used == 'hf_local'
      else (
        'Generation fallback used local renderer after provider failure.'
        if fallback_reason
        else 'Scaffold worker output generated from one uploaded image and prompt options.'
      )
      )
    ),
  }
  manifest_path = job_dir / 'model.json'
  manifest_path.write_text(json.dumps(manifest, indent=2), encoding='utf-8')

  set_progress(100)

  return {
    'modelUrl': f'{settings.public_output_base}/{job_id}/preview.png',
    'previewImageUrl': f'{settings.public_output_base}/{job_id}/preview.png',
    'manifestUrl': f'{settings.public_output_base}/{job_id}/model.json',
  }
