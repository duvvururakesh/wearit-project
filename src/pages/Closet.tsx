import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useWardrobe } from '@/hooks/useWardrobe'
import ProductImage from '@/components/ProductImage'
import type { Category } from '@/types'

export default function Closet() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const { items } = useWardrobe()
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

  const wallItems = useMemo(() => filtered.slice(0, 20), [filtered])
  const heroIndexes = new Set([1, 7, 12, 18])
  return (
    <div className="h-[calc(100vh-96px)] overflow-hidden bg-card md:h-[calc(100vh-56px)]">
      <div className="closet-grid-page relative h-full">
        <div className="closet-grid-content relative z-10 mx-auto grid h-full grid-cols-2 grid-rows-5 gap-x-6 gap-y-6 px-5 py-5 md:grid-cols-4 md:px-7 md:py-7 xl:col-start-2 xl:col-end-7 xl:row-start-2 xl:row-end-6 xl:h-full xl:max-w-none xl:grid-cols-5 xl:grid-rows-4 xl:gap-x-10 xl:gap-y-10 xl:px-8 xl:py-8">
        {wallItems.map((item, index) => (
          <button
            key={item.id}
            onClick={() => nav(`/item/${item.id}`)}
            className={`closet-exhibit group relative flex h-full min-h-0 w-full items-end justify-center text-left ${heroIndexes.has(index) ? 'closet-exhibit-hero' : ''}`}
            aria-label={item.name}
          >
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
                    ? `closet-wall-top ${heroIndexes.has(index) ? 'closet-wall-top-hero' : ''}`
                    : item.category === 'bottoms'
                      ? `closet-wall-bottom ${heroIndexes.has(index) ? 'closet-wall-bottom-hero' : ''}`
                      : `h-full w-full object-contain ${heroIndexes.has(index) ? 'closet-wall-generic-hero' : ''}`
              }
              mode={item.category === 'shoes' ? 'strict' : 'apparel'}
              fit={item.category === 'shoes' ? 'shoe' : 'default'}
            />
          </button>
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
