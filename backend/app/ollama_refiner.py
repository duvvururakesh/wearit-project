import json
from dataclasses import dataclass

import requests

from app.config import settings
from app.schemas import CreateMannequinJobRequest


@dataclass(frozen=True)
class PromptRefinement:
  refined_prompt: str
  negative_prompt: str
  safety_notes: str | None
  prompt_source: str


def _extract_json_block(text: str) -> dict:
  stripped = text.strip()
  try:
    return json.loads(stripped)
  except Exception:
    start = stripped.find('{')
    end = stripped.rfind('}')
    if start >= 0 and end > start:
      return json.loads(stripped[start : end + 1])
  raise ValueError('Unable to parse JSON output from Ollama')


def refine_prompt_with_ollama(
  base_prompt: str,
  negative_prompt: str,
  request: CreateMannequinJobRequest,
) -> PromptRefinement:
  if not settings.ollama_enabled:
    return PromptRefinement(
      refined_prompt=base_prompt,
      negative_prompt=negative_prompt,
      safety_notes=None,
      prompt_source='template',
    )

  instruction = (
    'You are an apparel generation prompt refiner. Return strict JSON with keys '
    'refined_prompt, negative_prompt, safety_notes. Keep product details unchanged.'
  )
  payload = {
    'model': settings.ollama_model,
    'stream': False,
    'format': 'json',
    'messages': [
      {'role': 'system', 'content': instruction},
      {
        'role': 'user',
        'content': json.dumps(
          {
            'base_prompt': base_prompt,
            'negative_prompt': negative_prompt,
            'category': request.category,
            'aspect_ratio': request.aspectRatio,
            'perspective': request.perspective,
            'body_type': request.bodyType,
          },
          ensure_ascii=True,
        ),
      },
    ],
  }

  try:
    response = requests.post(
      f"{settings.ollama_base_url.rstrip('/')}/api/chat",
      json=payload,
      timeout=settings.generator_timeout_seconds,
    )
    response.raise_for_status()
    body = response.json()
    message = body.get('message', {}) if isinstance(body, dict) else {}
    content = message.get('content', '')
    parsed = _extract_json_block(str(content))
    refined_prompt = str(parsed.get('refined_prompt', '')).strip()
    refined_negative = str(parsed.get('negative_prompt', '')).strip()
    safety_notes = parsed.get('safety_notes')
    if refined_prompt == '':
      raise ValueError('Missing refined_prompt from Ollama output')
    if refined_negative == '':
      refined_negative = negative_prompt
    return PromptRefinement(
      refined_prompt=refined_prompt,
      negative_prompt=refined_negative,
      safety_notes=str(safety_notes).strip() if safety_notes else None,
      prompt_source='ollama',
    )
  except Exception:
    return PromptRefinement(
      refined_prompt=base_prompt,
      negative_prompt=negative_prompt,
      safety_notes='Ollama unavailable or invalid JSON; used template prompt.',
      prompt_source='template',
    )
