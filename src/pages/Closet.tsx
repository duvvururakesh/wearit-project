import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { useWardrobe } from '@/hooks/useWardrobe'
import ProductImage from '@/components/ProductImage'
import type { Category } from '@/types'

function getImageMode(category: Category, subtype: string) {
  if (category === 'shoes') return 'strict' as const
  if (category === 'bottoms') return 'bottoms' as const
  const normalizedSubtype = subtype.toLowerCase()
  if (normalizedSubtype.includes('jacket') || normalizedSubtype.includes('coat') || normalizedSubtype.includes('blazer')) {
    return 'jacket' as const
  }
  return 'apparel' as const
}

function isJacketLike(subtype: string) {
  const normalizedSubtype = subtype.toLowerCase()
  return normalizedSubtype.includes('jacket') || normalizedSubtype.includes('coat') || normalizedSubtype.includes('blazer')
}

export default function Closet() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const { items, toggleItemFavorite } = useWardrobe()
  const query = params.get('q')?.trim().toLowerCase() ?? ''
  const [category, setCategory] = useState<Category | 'all'>((params.get('category') as Category) || 'all')

  useEffect(() => {
    setCategory((params.get('category') as Category) || 'all')
  }, [params])

  const filtered = useMemo(() => {
    let result = [...items]
    if (category !== 'all') result = result.filter((item) => item.category === category)
    if (query) {
      result = result.filter((item) =>
        `${item.brand} ${item.name} ${item.subtype} ${item.color}`.toLowerCase().includes(query),
      )
    }
    return result.sort((a, b) => b.addedAt.localeCompare(a.addedAt))
  }, [category, items, query])

  const wallItems = filtered
  const heroIndexes = new Set([1, 7, 12, 18])
  return (
    <div className="page-shell-archive app-viewport app-viewport-scroll">
      <div className="closet-grid-page relative min-h-full">
        <div className="closet-grid-content relative z-10 mx-auto grid min-h-full grid-cols-2 auto-rows-[minmax(140px,220px)] gap-x-6 gap-y-6 px-5 py-5 md:grid-cols-4 md:px-7 md:py-7 xl:max-w-none xl:grid-cols-5 xl:auto-rows-[minmax(170px,240px)] xl:gap-x-10 xl:gap-y-10 xl:px-8 xl:py-8">
        {wallItems.map((item, index) => (
          <div
            key={item.id}
            onClick={() => nav(`/item/${item.id}`)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                nav(`/item/${item.id}`)
              }
            }}
            className={`closet-exhibit group relative flex h-full min-h-0 w-full items-end justify-center text-left ${heroIndexes.has(index) ? 'closet-exhibit-hero' : ''}`}
            aria-label={item.name}
            role="button"
            tabIndex={0}
          >
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                void toggleItemFavorite(item.id)
              }}
              className="closet-exhibit-delete button-icon"
              aria-label={`${item.favoriteItem ? 'Remove from favorites' : 'Add to favorites'}: ${item.name}`}
            >
              <Heart size={14} className={item.favoriteItem ? 'favorite-fill favorite-color' : ''} />
            </button>
            <div className="closet-exhibit-meta">
              <p className="type-caption text-text-dark">{item.brand}</p>
              <p className="type-caption text-light-secondary">{item.subtype || item.category}</p>
              <p className="type-caption text-light-secondary">{item.color}</p>
            </div>
            <ProductImage
              src={item.image}
              alt={item.name}
              className={
                item.category === 'shoes'
                  ? `closet-wall-shoe ${heroIndexes.has(index) ? 'closet-wall-shoe-hero' : ''}`
                  : item.category === 'tops'
                    ? isJacketLike(item.subtype)
                      ? `closet-wall-jacket ${heroIndexes.has(index) ? 'closet-wall-jacket-hero' : ''}`
                      : `closet-wall-top ${heroIndexes.has(index) ? 'closet-wall-top-hero' : ''}`
                    : item.category === 'bottoms'
                      ? `closet-wall-bottom ${heroIndexes.has(index) ? 'closet-wall-bottom-hero' : ''}`
                      : `h-full w-full object-contain ${heroIndexes.has(index) ? 'closet-wall-generic-hero' : ''}`
              }
              mode={getImageMode(item.category, item.subtype)}
              fit={item.category === 'shoes' ? 'shoe' : 'default'}
            />
          </div>
        ))}

        {wallItems.length === 0 && (
          <div className="type-body-sm col-span-full py-24 text-center text-light-secondary">
            No items match this closet view.
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
