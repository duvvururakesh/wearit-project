from dataclasses import dataclass
import os


@dataclass(frozen=True)
class Settings:
  redis_url: str = os.getenv('REDIS_URL', 'redis://redis:6379/0')
  output_dir: str = os.getenv('OUTPUT_DIR', '/data/outputs')
  public_output_base: str = os.getenv('PUBLIC_OUTPUT_BASE', '/outputs')
  api_base_path: str = os.getenv('API_BASE_PATH', '/api/v1')
  cors_allow_origins: str = os.getenv('CORS_ALLOW_ORIGINS', '*')
  generator_mode: str = os.getenv('GENERATOR_MODE', 'hf_local')
  generator_timeout_seconds: int = int(os.getenv('GENERATOR_TIMEOUT_SECONDS', '60'))
  openai_api_key: str = os.getenv('OPENAI_API_KEY', '').strip()
  openai_api_base: str = os.getenv('OPENAI_API_BASE', 'https://api.openai.com/v1').strip()
  openai_image_model: str = os.getenv('OPENAI_IMAGE_MODEL', 'gpt-image-1.5').strip()
  openai_image_quality: str = os.getenv('OPENAI_IMAGE_QUALITY', 'high').strip()
  openai_image_moderation: str = os.getenv('OPENAI_IMAGE_MODERATION', 'auto').strip()
  ollama_enabled: bool = os.getenv('OLLAMA_ENABLED', 'true').strip().lower() in {'1', 'true', 'yes'}
  ollama_base_url: str = os.getenv('OLLAMA_BASE_URL', 'http://127.0.0.1:11434').strip()
  ollama_model: str = os.getenv('OLLAMA_MODEL', 'qwen2.5:7b-instruct').strip()
  hf_model_id: str = os.getenv('HF_MODEL_ID', 'diffusers/sdxl-instructpix2pix-768').strip()
  hf_device: str = os.getenv('HF_DEVICE', 'mps').strip().lower()
  hf_num_inference_steps: int = int(os.getenv('HF_NUM_INFERENCE_STEPS', '30'))
  hf_guidance_scale: float = float(os.getenv('HF_GUIDANCE_SCALE', '7.0'))
  hf_image_strength: float = float(os.getenv('HF_IMAGE_STRENGTH', '0.45'))
  mannequin_template_image: str = os.getenv('MANNEQUIN_TEMPLATE_IMAGE', '').strip()

  @property
  def cors_origins(self) -> list[str]:
    raw = self.cors_allow_origins.strip()
    if raw == '*' or raw == '':
      return ['*']
    return [entry.strip() for entry in raw.split(',') if entry.strip()]


settings = Settings()
