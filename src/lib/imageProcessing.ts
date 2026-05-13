export type ImageProcessingMode = 'strict' | 'apparel' | 'jacket' | 'bottoms' | 'shoe'

type TrimPadding = {
  padXRatio: number
  padTopRatio: number
  padBottomRatio: number
}

function trimTransparentBounds(
  canvas: HTMLCanvasElement,
  {
    padXRatio = 0.04,
    padTopRatio = 0.03,
    padBottomRatio = 0.03,
  }: Partial<TrimPadding> = {},
): string {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  const { width, height } = canvas
  const imageData = ctx.getImageData(0, 0, width, height)
  const { data } = imageData

  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3]
      if (alpha === 0) continue
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }

  if (minX >= maxX || minY >= maxY) {
    return canvas.toDataURL('image/png')
  }

  const padX = Math.round(width * padXRatio)
  const padTop = Math.round(height * padTopRatio)
  const padBottom = Math.round(height * padBottomRatio)
  const cropX = Math.max(0, minX - padX)
  const cropY = Math.max(0, minY - padTop)
  const cropW = Math.min(width - cropX, maxX - minX + padX * 2)
  const cropH = Math.min(height - cropY, maxY - minY + padTop + padBottom)

  const out = document.createElement('canvas')
  out.width = cropW
  out.height = cropH
  out.getContext('2d')!.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)
  return out.toDataURL('image/png')
}

function isolateJacket(canvas: HTMLCanvasElement): string {
  return trimTransparentBounds(canvas)
}

function isolateBottoms(canvas: HTMLCanvasElement): string {
  return trimTransparentBounds(canvas)
}

function isolateShoe(canvas: HTMLCanvasElement): string {
  // Floor-lock shoes by removing bottom transparent padding, while keeping modest side/top breathing space.
  return trimTransparentBounds(canvas, {
    padXRatio: 0.02,
    padTopRatio: 0.02,
    padBottomRatio: 0,
  })
}

function removeDetachedBottomShadow(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  const { width: w, height: h } = canvas
  const imageData = ctx.getImageData(0, 0, w, h)
  const { data } = imageData

  const visited = new Uint8Array(w * h)
  const queue: number[] = []

  for (let x = 0; x < w; x++) {
    const pos = x + (h - 1) * w
    if (data[pos * 4 + 3] > 0) {
      visited[pos] = 1
      queue.push(pos)
    }
  }

  const softShadowMaxBrightness = 185
  const softShadowMinAlpha = 18
  const shadowHeightThreshold = Math.floor(h * 0.62)

  const qualifiesAsBottomShadow = (pos: number) => {
    const idx = pos * 4
    const alpha = data[idx + 3]
    if (alpha < softShadowMinAlpha) return false

    const x = pos % w
    const y = Math.floor(pos / w)
    if (y < shadowHeightThreshold) return false

    const r = data[idx]
    const g = data[idx + 1]
    const b = data[idx + 2]
    const brightness = (r + g + b) / 3
    const channelSpread = Math.max(r, g, b) - Math.min(r, g, b)

    if (brightness > softShadowMaxBrightness) return false
    if (channelSpread > 42) return false

    const above = y > 0 ? pos - w : -1
    if (above >= 0 && data[above * 4 + 3] > 160) return false

    if (x > Math.floor(w * 0.18) && x < Math.ceil(w * 0.82) && alpha > 175) return false
    return true
  }

  let head = 0
  while (head < queue.length) {
    const pos = queue[head++]
    if (!qualifiesAsBottomShadow(pos)) continue

    const idx = pos * 4
    data[idx + 3] = 0

    const x = pos % w
    const y = Math.floor(pos / w)
    const neighbors = [
      x > 0 ? pos - 1 : -1,
      x < w - 1 ? pos + 1 : -1,
      y > 0 ? pos - w : -1,
      y < h - 1 ? pos + w : -1,
    ]

    for (const next of neighbors) {
      if (next >= 0 && !visited[next]) {
        visited[next] = 1
        queue.push(next)
      }
    }
  }

  ctx.putImageData(imageData, 0, 0)
}

function processCanvas(img: HTMLImageElement, mode: ImageProcessingMode): string {
  const canvas = document.createElement('canvas')
  const w = img.naturalWidth
  const h = img.naturalHeight
  canvas.width = w
  canvas.height = h

  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0)

  const imageData = ctx.getImageData(0, 0, w, h)
  const { data } = imageData

  const apparelLike = mode === 'apparel' || mode === 'jacket' || mode === 'bottoms'
  const threshold = apparelLike ? 242 : 248

  const isLight = (idx: number) => data[idx] > threshold && data[idx + 1] > threshold && data[idx + 2] > threshold

  const visited = new Uint8Array(w * h)
  const queue: number[] = []

  for (let x = 0; x < w; x++) {
    const topPos = x
    const bottomPos = x + (h - 1) * w
    if (isLight(topPos * 4)) { queue.push(topPos); visited[topPos] = 1 }
    if (isLight(bottomPos * 4)) { queue.push(bottomPos); visited[bottomPos] = 1 }
  }

  for (let y = 0; y < h; y++) {
    const leftPos = y * w
    const rightPos = y * w + (w - 1)
    if (isLight(leftPos * 4)) { queue.push(leftPos); visited[leftPos] = 1 }
    if (isLight(rightPos * 4)) { queue.push(rightPos); visited[rightPos] = 1 }
  }

  const fillThreshold = apparelLike ? 236 : 242
  const isFillable = (idx: number) => data[idx] > fillThreshold && data[idx + 1] > fillThreshold && data[idx + 2] > fillThreshold

  let head = 0
  while (head < queue.length) {
    const pos = queue[head++]
    const px = pos % w
    const py = Math.floor(pos / w)
    const idx = pos * 4
    data[idx + 3] = 0

    const neighbors = [
      px > 0 ? pos - 1 : -1,
      px < w - 1 ? pos + 1 : -1,
      py > 0 ? pos - w : -1,
      py < h - 1 ? pos + w : -1,
    ]

    for (const next of neighbors) {
      if (next >= 0 && !visited[next]) {
        visited[next] = 1
        if (isFillable(next * 4)) queue.push(next)
      }
    }
  }

  ctx.putImageData(imageData, 0, 0)
  removeDetachedBottomShadow(canvas)

  if (mode === 'shoe') return isolateShoe(canvas)
  if (mode === 'jacket') return isolateJacket(canvas)
  if (mode === 'bottoms') return isolateBottoms(canvas)
  return trimTransparentBounds(canvas)
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = src
  })
}

export async function processImageSource(src: string, mode: ImageProcessingMode): Promise<string> {
  const img = await loadImage(src)
  return processCanvas(img, mode)
}
