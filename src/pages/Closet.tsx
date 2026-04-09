import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MoreHorizontal } from 'lucide-react'
import { useWardrobe } from '@/hooks/useWardrobe'
import ProductImage from '@/components/ProductImage'
import { extractBasicColors } from '@/lib/colors'
import type { Category } from '@/types'

const SORT_FILTERS = [
  'Newest',
  'Oldest',
  'Price (Low - High)',
  'Price (High - Low)',
  'Brand (A - Z)',
] as const

export default function Closet() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const { items, deleteItem } = useWardrobe()
  const query = params.get('q')?.trim().toLowerCase() ?? ''
  const [category, setCategory] = useState<Category | 'all'>((params.get('category') as Category) || 'all')
  const [selectedBrand, setSelectedBrand] = useState('All')
  const [selectedColor, setSelectedColor] = useState('All')
  const [selectedSubtype, setSelectedSubtype] = useState('All')
  const [selectedSort, setSelectedSort] = useState<(typeof SORT_FILTERS)[number]>('Newest')
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  useEffect(() => {
    setCategory((params.get('category') as Category) || 'all')
  }, [params])

  const archiveTitle = useMemo(() => {
    if (query) return 'SEARCH RESULTS'
    if (category === 'all') return 'CLOSET ARCHIVE'
    if (category === 'face') return 'ACCESSORIES ARCHIVE'
    return `${category.toUpperCase()} ARCHIVE`
  }, [category])

  const brands = useMemo(
    () => ['All', ...Array.from(new Set(items.map((item) => item.brand))).sort()],
    [items],
  )

  const subtypes = useMemo(() => {
    const source = category === 'all'
      ? items.map((item) => item.subtype).filter(Boolean)
      : items
          .filter((item) => item.category === category)
          .map((item) => item.subtype)
          .filter(Boolean)
    return ['All', ...Array.from(new Set(source)).sort()]
  }, [category, items])

  const colors = useMemo(() => {
    const tokens = new Set<string>()
    items.forEach((item) => {
      extractBasicColors(item.color).forEach((token) => tokens.add(token))
    })
    return ['All', ...Array.from(tokens).sort()]
  }, [items])

  const filtered = useMemo(() => {
    let result = [...items]
    if (category !== 'all') result = result.filter((item) => item.category === category)
    if (selectedBrand !== 'All') result = result.filter((item) => item.brand === selectedBrand)
    if (selectedSubtype !== 'All') result = result.filter((item) => item.subtype === selectedSubtype)
    if (selectedColor !== 'All') result = result.filter((item) => extractBasicColors(item.color).includes(selectedColor))
    if (query) {
      result = result.filter((item) =>
        `${item.brand} ${item.name} ${item.subtype} ${item.color}`.toLowerCase().includes(query),
      )
    }

    if (selectedSort === 'Price (Low - High)') {
      return result.sort((a, b) => a.price - b.price)
    }
    if (selectedSort === 'Price (High - Low)') {
      return result.sort((a, b) => b.price - a.price)
    }
    if (selectedSort === 'Brand (A - Z)') {
      return result.sort((a, b) => a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name))
    }
    if (selectedSort === 'Oldest') {
      return result.sort((a, b) => a.addedAt.localeCompare(b.addedAt))
    }
    return result.sort((a, b) => b.addedAt.localeCompare(a.addedAt))
  }, [category, items, query, selectedBrand, selectedColor, selectedSubtype, selectedSort])

  const renderFilterGroup = (
    title: string,
    options: readonly string[],
    selected: string,
    onSelect: (value: string) => void,
  ) => (
    <div className="archive-filter-group">
      <p className="type-label archive-filter-title text-right text-light-strong">{title}</p>
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onSelect(option)}
          className={`archive-filter-option type-caption ${
            selected === option ? 'archive-filter-option-active' : 'text-light-soft'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  )

  const resetFilters = () => {
    setSelectedBrand('All')
    setSelectedColor('All')
    setSelectedSubtype('All')
    setSelectedSort('Newest')
  }

  return (
    <div className="page-shell-light">
      <div className="page-frame archive-heading-row">
        <div className="flex items-center justify-between">
          <p className="archive-heading-title type-label text-text-dark">{archiveTitle}</p>
          <p className="archive-heading-count type-caption text-light-secondary">
            {filtered.length.toLocaleString()} item{filtered.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <div className="page-frame archive-page-frame">
        <div className="archive-shell lg:grid-cols-[74px_1fr]">
          <aside className="archive-rail type-caption">
            <div className="archive-rail-header">
              <button
                onClick={resetFilters}
                className="type-button-sm archive-reset-button"
              >
                Reset Filters
              </button>
            </div>
            {renderFilterGroup('Sort', SORT_FILTERS, selectedSort, (value) => setSelectedSort(value as (typeof SORT_FILTERS)[number]))}
            {renderFilterGroup('Brand', brands, selectedBrand, setSelectedBrand)}
            {renderFilterGroup('Type', subtypes, selectedSubtype, setSelectedSubtype)}
            {renderFilterGroup('Color', colors, selectedColor, setSelectedColor)}
          </aside>

          <section>
            <div className="archive-grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
              {filtered.map((item) => (
                <div key={item.id} className="archive-tile">
                  <button onClick={() => nav(`/item/${item.id}`)} className="block h-full w-full text-left">
                    <div className="archive-meta type-caption">
                      <div className="archive-date">
                        {new Date(item.addedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        <br />
                        {new Date(item.addedAt).getFullYear()}
                      </div>
                      <div className="archive-name flex-1 pr-2 text-text-dark">
                        {item.name}
                      </div>
                      <div className="archive-price">${item.price}</div>
                    </div>

                    <div className={`archive-media ${item.category === 'shoes' ? 'archive-media-shoe' : 'archive-media-apparel'}`}>
                      <ProductImage src={item.image} alt={item.name} className={item.category === 'shoes' ? '' : 'archive-image'} mode={item.category === 'shoes' ? 'strict' : 'apparel'} fit={item.category === 'shoes' ? 'shoe' : 'default'} />
                    </div>
                  </button>

                  <div className="absolute bottom-2.5 right-2.5">
                    <button
                      onClick={() => setOpenMenu((current) => (current === item.id ? null : item.id))}
                      className="button-icon radius-full"
                      aria-label={`Open actions for ${item.name}`}
                    >
                      <MoreHorizontal size={14} />
                    </button>

                    {openMenu === item.id && (
                      <div className="absolute bottom-8 right-0 z-20 min-w-[112px] border border-light bg-card shadow-sm">
                        <button
                          onClick={() => {
                            setOpenMenu(null)
                            nav(`/item/${item.id}`)
                          }}
                          className="type-button-sm button-ghost block w-full rounded-none px-3 py-2 text-left"
                        >
                          View
                        </button>
                        <button
                          onClick={() => {
                            setOpenMenu(null)
                            nav(`/item/${item.id}?edit=1`)
                          }}
                          className="type-button-sm button-ghost block w-full rounded-none px-3 py-2 text-left"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setOpenMenu(null)
                            deleteItem(item.id)
                          }}
                          className="type-button-sm button-danger block w-full rounded-none px-3 py-2 text-left"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {filtered.length === 0 && (
                <div className="type-body-sm col-span-full border-r border-b border-light px-6 py-24 text-center text-light-secondary">
                  No items match this closet view.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
