import base64
import json
from io import BytesIO

import requests
from PIL import Image

from app.config import settings
from app.schemas import CreateMannequinJobRequest


def _decode_data_url(data_url: str) -> bytes:
  if ',' not in data_url:
    raise ValueError('Invalid source image data URL')
  _, encoded = data_url.split(',', 1)
  return base64.b64decode(encoded)


def _parse_response_image(payload: dict) -> Image.Image:
  data = payload.get('data')
  if isinstance(data, list) and data:
    first = data[0]
    if isinstance(first, dict):
      b64 = first.get('b64_json')
      if isinstance(b64, str) and b64.strip() != '':
        return Image.open(BytesIO(base64.b64decode(b64))).convert('RGBA')

      url = first.get('url')
      if isinstance(url, str) and url.strip() != '':
        image_response = requests.get(url, timeout=settings.generator_timeout_seconds)
        image_response.raise_for_status()
        return Image.open(BytesIO(image_response.content)).convert('RGBA')

  raise RuntimeError('OpenAI image response returned no usable image output')


def _raise_with_body(response: requests.Response):
  if response.ok:
    return
  body = response.text
  try:
    body = json.dumps(response.json(), ensure_ascii=True)
  except Exception:
    pass
  raise RuntimeError(f'OpenAI image request failed with HTTP {response.status_code}: {body[:1800]}')


def generate_openai_image(
  request: CreateMannequinJobRequest,
  source_image_data_url: str,
  prompt: str,
) -> Image.Image:
  if settings.openai_api_key == '':
    raise RuntimeError('OPENAI_API_KEY is not configured')
  if source_image_data_url.strip() == '':
    raise RuntimeError('OpenAI image generation requires one source image')
  if prompt.strip() == '':
    raise RuntimeError('OpenAI image generation requires a prompt')

  files = {
    'image': ('source.png', _decode_data_url(source_image_data_url), 'image/png'),
  }
  form = {
    'model': settings.openai_image_model,
    'prompt': prompt,
    'quality': settings.openai_image_quality,
    'moderation': settings.openai_image_moderation,
    'response_format': 'b64_json',
  }

  response = requests.post(
    f"{settings.openai_api_base.rstrip('/')}/images/edits",
    headers={'Authorization': f'Bearer {settings.openai_api_key}'},
    files=files,
    data=form,
    timeout=settings.generator_timeout_seconds,
  )
  _raise_with_body(response)
  return _parse_response_image(response.json())
