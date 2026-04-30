#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"

export REDIS_URL="${REDIS_URL:-redis://127.0.0.1:6379/0}"
export OUTPUT_DIR="${OUTPUT_DIR:-$BACKEND_DIR/outputs}"
export PUBLIC_OUTPUT_BASE="${PUBLIC_OUTPUT_BASE:-/outputs}"
export GENERATOR_MODE="${GENERATOR_MODE:-hf_local}"
export OPENAI_API_KEY="${OPENAI_API_KEY:-}"
export OPENAI_API_BASE="${OPENAI_API_BASE:-https://api.openai.com/v1}"
export OPENAI_IMAGE_MODEL="${OPENAI_IMAGE_MODEL:-gpt-image-1.5}"
export OPENAI_IMAGE_QUALITY="${OPENAI_IMAGE_QUALITY:-high}"
export OPENAI_IMAGE_MODERATION="${OPENAI_IMAGE_MODERATION:-auto}"
export OLLAMA_ENABLED="${OLLAMA_ENABLED:-true}"
export OLLAMA_BASE_URL="${OLLAMA_BASE_URL:-http://127.0.0.1:11434}"
export OLLAMA_MODEL="${OLLAMA_MODEL:-qwen2.5:7b-instruct}"
export HF_MODEL_ID="${HF_MODEL_ID:-diffusers/sdxl-instructpix2pix-768}"
export HF_DEVICE="${HF_DEVICE:-mps}"
export HF_NUM_INFERENCE_STEPS="${HF_NUM_INFERENCE_STEPS:-30}"
export HF_GUIDANCE_SCALE="${HF_GUIDANCE_SCALE:-7.0}"
export HF_IMAGE_STRENGTH="${HF_IMAGE_STRENGTH:-0.45}"
export MANNEQUIN_TEMPLATE_IMAGE="${MANNEQUIN_TEMPLATE_IMAGE:-$BACKEND_DIR/assets/egmusc.webp}"

mkdir -p "$OUTPUT_DIR"
cd "$BACKEND_DIR"
python3 -m app.worker
