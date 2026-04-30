export type MannequinCategory = 'tops' | 'bottoms' | 'shoes'

interface CreateMannequinJobRequest {
  category: MannequinCategory
  renderMode: 'ghost_mannequin'
  prompt?: string
  aspectRatio: '1:1'
  bodyType: 'male' | 'female'
  perspective: 'front'
  background: 'transparent'
  inputs: Array<{
    view: 'front'
    imageDataUrl: string
  }>
}

interface CreateMannequinJobResponse {
  jobId: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  pollAfterMs?: number
}

interface GetMannequinJobResponse {
  jobId: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  pollAfterMs?: number
  result?: {
    modelUrl?: string | null
    previewImageUrl?: string | null
    manifestUrl?: string | null
  } | null
  error?: {
    code?: string
    message?: string
  } | null
}

interface GenerateMannequinImageOptions {
  category: MannequinCategory
  imageDataUrl: string
  prompt?: string
  bodyType?: 'male' | 'female'
  maxWaitMs?: number
}

function delay(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function toAbsoluteUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url
  return new URL(url, window.location.origin).toString()
}

export function mannequinCategoryFromRoot(root: 'apparel' | 'shoes' | 'accessories', section: string): MannequinCategory | null {
  if (root === 'shoes') return 'shoes'
  if (root === 'accessories') return null
  if (section === 'Bottoms') return 'bottoms'
  return 'tops'
}

export function mannequinCategoryFromItemCategory(category: 'tops' | 'bottoms' | 'shoes' | 'face'): MannequinCategory | null {
  if (category === 'tops' || category === 'bottoms' || category === 'shoes') return category
  return null
}

export async function generateMannequinImage({
  category,
  imageDataUrl,
  prompt,
  bodyType = 'male',
  maxWaitMs = 30_000,
}: GenerateMannequinImageOptions): Promise<string> {
  const createPayload: CreateMannequinJobRequest = {
    category,
    renderMode: 'ghost_mannequin',
    prompt: prompt?.trim() || undefined,
    aspectRatio: '1:1',
    bodyType,
    perspective: 'front',
    background: 'transparent',
    inputs: [{ view: 'front', imageDataUrl }],
  }

  const createResponse = await fetch('/api/v1/mannequin/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createPayload),
  })

  if (!createResponse.ok) {
    throw new Error(`Mannequin create failed (${createResponse.status})`)
  }

  const created = (await createResponse.json()) as CreateMannequinJobResponse
  if (!created.jobId) {
    throw new Error('Mannequin create failed: missing job id')
  }

  const startedAt = Date.now()
  let pollAfterMs = created.pollAfterMs ?? 2000

  while (Date.now() - startedAt < maxWaitMs) {
    await delay(Math.max(500, pollAfterMs))

    const statusResponse = await fetch(`/api/v1/mannequin/jobs/${encodeURIComponent(created.jobId)}`)
    if (!statusResponse.ok) {
      throw new Error(`Mannequin poll failed (${statusResponse.status})`)
    }

    const status = (await statusResponse.json()) as GetMannequinJobResponse
    pollAfterMs = status.pollAfterMs ?? pollAfterMs

    if (status.status === 'completed') {
      const preview = status.result?.previewImageUrl || status.result?.modelUrl
      if (!preview) throw new Error('Mannequin completed without preview URL')
      return toAbsoluteUrl(preview)
    }

    if (status.status === 'failed') {
      throw new Error(status.error?.message || 'Mannequin generation failed')
    }
  }

  throw new Error('Mannequin job timed out')
}
