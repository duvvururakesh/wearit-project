import { useState, useEffect, useRef } from 'react'
import { processImageSource, type ImageProcessingMode } from '@/lib/imageProcessing'

const cache = new Map<string, string>()

/* ── ProductImage component ── */
interface ProductImageProps {
  src: string
  alt: string
  className?: string
  draggable?: boolean
  loading?: 'lazy' | 'eager'
  mode?: ImageProcessingMode
  fit?: 'default' | 'shoe'
}

export default function ProductImage({
  src, alt, className = '', draggable, loading, mode = 'strict', fit = 'default',
}: ProductImageProps) {
  const cacheKey = `v3:${mode}:${src}`
  const [processedSrc, setProcessedSrc] = useState<string | null>(() => cache.get(cacheKey) ?? null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    setProcessedSrc(cache.get(cacheKey) ?? src)
  }, [cacheKey, src])

  useEffect(() => {
    if (!src || cache.has(cacheKey)) return

    void processImageSource(src, mode)
      .then((result) => {
        cache.set(cacheKey, result)
        if (mountedRef.current) setProcessedSrc(result)
      })
      .catch(() => {
        cache.set(cacheKey, src)
        if (mountedRef.current) setProcessedSrc(src)
      })
  }, [cacheKey, mode, src])

  if (fit === 'shoe') {
    return (
      <span className="product-image-shoe-frame">
        <img
          src={processedSrc ?? src}
          alt={alt}
          className={`product-image-shoe ${className}`}
          draggable={draggable}
          loading={loading}
        />
      </span>
    )
  }

  return (
    <img
      src={processedSrc ?? src}
      alt={alt}
      className={className}
      draggable={draggable}
      loading={loading}
    />
  )
}
