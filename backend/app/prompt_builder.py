from app.schemas import CreateMannequinJobRequest


def _perspective_label(perspective: str | None) -> str:
  mapping = {
    'front': 'front',
    'front_left': 'front left',
    'front_right': 'front right',
    'back': 'back',
    'back_left': 'back left',
    'back_right': 'back right',
  }
  return mapping.get((perspective or 'front').strip(), 'front')


def build_template_prompt(request: CreateMannequinJobRequest) -> str:
  body_type = request.bodyType or 'male'
  aspect_ratio = request.aspectRatio or '1:1'
  perspective = _perspective_label(request.perspective)
  user_hint = (request.prompt or '').strip()
  source_text = f' Product note: {user_hint}.' if user_hint != '' else ''
  mannequin_line = (
    ' Use the provided mannequin body template to anchor realistic garment drape and body volume, then ensure the final '
    'output remains a ghost mannequin garment without visible mannequin body parts.'
    if request.category in {'tops', 'bottoms'}
    else ''
  )
  return (
    f'Transform this photo into a photorealistic studio shot in the {aspect_ratio} aspect ratio, reconstructed as a '
    f'high-volume 3D form as if worn by a {body_type} invisible body, captured from a {perspective} perspective. '
    'Preserve every original product detail exactly as shown: all colors, patterns, logos, stitching, textures, '
    'fabric types, seams, labels, and design elements must remain completely unchanged with nothing added or removed. '
    'The fabric is stretched taut across the chest, shoulders, and limbs, showing clear structural tension and smooth, '
    'rounded anatomical curves appropriate to the body type. Fine surface wrinkles are reduced but original details are '
    'preserved, replaced by a sleek, filled-out appearance with only deep, natural folds at the joints to emphasize '
    'the internal natural mass. Maintain the exact same garment version without any alterations to its original design '
    'or features. Keep the original fabric texture and detail in high fidelity. The item is isolated against a seamless '
    'white studio background with soft global illumination that highlights the smooth, volumetric surfaces and casts a '
    'soft contact shadow beneath.'
    f'{mannequin_line}'
    f'{source_text}'
  )


def default_negative_prompt() -> str:
  return (
    'person, model, mannequin head, mannequin hands, mannequin legs, skin, face, extra logos, text changes, '
    'watermark, low resolution, blur, distorted geometry, deformed sleeves, torn seams, duplicate garments, crop'
  )
