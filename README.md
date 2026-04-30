# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Mannequin Backend Scaffold

This repo now includes an async mannequin service scaffold:

- API: `backend/app/main.py` (FastAPI)
- Queue: Redis + RQ
- Worker: `backend/app/worker.py`
- Docker Compose: `/docker-compose.yml`

### Start backend services (recommended on Apple Silicon)

```bash
npm run backend:up
```

Then run the worker on host macOS so Hugging Face generation can use MPS:

```bash
npm run backend:worker:host
```

### Optional: run everything in Docker (CPU/debug)

```bash
npm run backend:up:docker-worker
```

### Stop backend services

```bash
npm run backend:down
```

### Endpoints

- `POST /api/v1/mannequin/jobs`
- `GET /api/v1/mannequin/jobs/:jobId`
- `GET /api/v1/health`
- static outputs: `/outputs/...`

The Vite dev server proxies `/api` and `/outputs` to `http://localhost:8000`, so the current `3D Mannequin` page can call the backend without additional frontend changes.

### Generator modes

Default mode is local Hugging Face generation with Ollama prompt refinement:

- `GENERATOR_MODE=hf_local`
- `OLLAMA_ENABLED=true`
- `OLLAMA_BASE_URL=http://127.0.0.1:11434`
- `OLLAMA_MODEL=qwen2.5:7b-instruct`
- `HF_MODEL_ID=diffusers/sdxl-instructpix2pix-768`
- `HF_DEVICE=mps` (or `cpu`)
- `HF_NUM_INFERENCE_STEPS=30`
- `HF_GUIDANCE_SCALE=7.0`
- `HF_IMAGE_STRENGTH=0.45`
- `MANNEQUIN_TEMPLATE_IMAGE=backend/assets/egmusc.webp` (host) or `/app/assets/egmusc.webp` (docker)

Worker flow for `hf_local`:
1. Build deterministic template prompt from request payload.
2. Refine prompt via Ollama (if available).
3. Run local Hugging Face img2img generation.
4. If HF fails, fallback to local renderer.
5. Save preview + manifest.

### Supported generator modes

- `GENERATOR_MODE=hf_local` (Ollama + Hugging Face local generation)
- `GENERATOR_MODE=openai_image` (optional OpenAI image generation + local fallbacks)
- `GENERATOR_MODE=local` (existing local renderer only)

### Hugging Face model options (tested candidates)

- `diffusers/sdxl-instructpix2pix-768` (default; instruction-tuned img2img)
- `stabilityai/stable-diffusion-xl-base-1.0` (strong general SDXL base)
- `timbrooks/instruct-pix2pix` (lighter instruct-pix2pix baseline)

### Manifest metadata

`/outputs/<jobId>/model.json` now includes:
- `generationMode` (`hf_local`, `openai_image`, or `local`)
- `promptSource` (`ollama` or `template`, when applicable)
- `fallbackReason` (present when provider falls back to local renderer)

Security note: never commit API keys to git. Use local `.env`/shell environment only.
