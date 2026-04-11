import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { useWardrobe } from '@/hooks/useWardrobe'
import ProductImage from '@/components/ProductImage'
import type { OutfitCombo, WardrobeItem } from '@/types'

function ShoeMarqueeRow({
  items,
  direction,
  onItemClick,
}: {
  items: WardrobeItem[]
  direction: 'left' | 'right'
  onItemClick: (item: WardrobeItem) => void
}) {
  const loopItems = [...items, ...items]

  return (
    <div className="overflow-hidden">
      <motion.div
        className="flex"
        animate={{
          x: direction === 'left' ? ['0%', '-50%'] : ['-50%', '0%'],
        }}
        transition={{
          duration: 24,
          ease: 'linear',
          repeat: Infinity,
        }}
      >
        {loopItems.map((item, index) => (
          <motion.button
            key={`${item.id}-${direction}-${index}`}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onItemClick(item)}
            className="card-product-cell !w-[calc(100%/12)] !min-w-[calc(100%/12)] !aspect-auto"
          >
            <ProductImage
              src={item.image}
              alt={item.name}
              className={item.category === 'shoes' ? '' : 'card-product-cell-image'}
              loading="lazy"
              mode="strict"
              fit="shoe"
            />
          </motion.button>
        ))}
      </motion.div>
    </div>
  )
}

function StoryStrip({
  items,
  onItemClick,
}: {
  items: WardrobeItem[]
  onItemClick: (item: WardrobeItem) => void
}) {
  return (
    <div className="flex gap-0 overflow-x-auto pb-2 scrollbar-hide">
      {items.map((item) => (
        <motion.button
          key={item.id}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onItemClick(item)}
          className="card-product-strip"
        >
          <div className={`card-product-strip-media bg-transparent ${item.category === 'shoes' ? 'card-product-strip-media-shoe' : 'card-product-strip-media-apparel'}`}>
            <ProductImage
              src={item.image}
              alt={item.name}
              className={item.category === 'shoes' ? '' : 'h-full w-full object-contain'}
              loading="lazy"
              mode={item.subtype === 'Jackets' ? 'jacket' : item.category === 'shoes' ? 'strict' : 'apparel'}
              fit={item.category === 'shoes' ? 'shoe' : 'default'}
            />
          </div>
          <div className="card-product-strip-body">
            <p className="type-body-sm text-text-primary">{item.name}</p>
            <p className="type-caption mt-1 text-text-muted">{item.brand}</p>
          </div>
        </motion.button>
      ))}
    </div>
  )
}

function MiniItemMarquee({
  items,
  onItemClick,
}: {
  items: WardrobeItem[]
  onItemClick: (item: WardrobeItem) => void
}) {
  const gridItems = useMemo(() => {
    if (items.length === 0) return []
    const shuffled = [...items].sort(() => Math.random() - 0.5)
    const target = 25
    if (shuffled.length >= target) return shuffled.slice(0, target)
    return Array.from({ length: target }, (_, index) => shuffled[index % shuffled.length])
  }, [items])

  if (gridItems.length === 0) return null

  return (
    <div className="grid w-full grid-cols-5 gap-2">
      {gridItems.map((item, index) => (
        <div key={`${item.id}-mini-${index}`} className="flex items-center justify-center">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onItemClick(item)}
            className="flex aspect-square w-full items-end justify-center"
          >
            <ProductImage
              src={item.image}
              alt={item.name}
              className={item.category === 'shoes' ? '' : 'h-full w-full object-contain'}
              mode={item.category === 'shoes' ? 'strict' : 'apparel'}
              fit={item.category === 'shoes' ? 'shoe' : 'default'}
            />
          </motion.button>
        </div>
      ))}
    </div>
  )
}

function ItemSlideshow({
  item,
  onClick,
  whiteStage = false,
  slideshow = true,
}: {
  item?: WardrobeItem
  onClick: (item: WardrobeItem) => void
  whiteStage?: boolean
  slideshow?: boolean
}) {
  const images = item ? [item.image, ...item.images].filter(Boolean) : []
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    setActiveIndex(0)
  }, [item?.id])

  useEffect(() => {
    if (!slideshow || images.length <= 1) return
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % images.length)
    }, 1800)
    return () => window.clearInterval(timer)
  }, [images.length, slideshow])

  if (!item) return null

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(item)}
      className={`flex h-[156px] w-full items-end justify-center overflow-hidden ${whiteStage ? 'bg-card' : ''}`}
    >
      <div className="flex h-[142px] w-full items-end justify-center">
        <ProductImage
          src={images[activeIndex] ?? item.image}
          alt={item.name}
          className={item.category === 'shoes' ? '' : 'h-full w-full object-contain'}
          mode={item.subtype === 'Jackets' ? 'jacket' : item.category === 'shoes' ? 'strict' : 'apparel'}
          fit={item.category === 'shoes' ? 'shoe' : 'default'}
        />
      </div>
    </motion.button>
  )
}

function BuilderStackPreview({
  outfit,
  items,
  getItemById,
  onOpen,
}: {
  outfit?: OutfitCombo
  items?: WardrobeItem[]
  getItemById: (id: string) => WardrobeItem | undefined
  onOpen: (outfit?: OutfitCombo) => void
}) {
  const stackItems = items && items.length > 0
    ? items.slice(0, 4)
    : outfit
      ? [outfit.face, outfit.tops, outfit.bottoms, outfit.shoes].filter(Boolean).map((id) => getItemById(id!)).filter(Boolean) as WardrobeItem[]
      : []

  const getPreviewMode = (item: WardrobeItem) => {
    if (item.category === 'shoes') return 'strict' as const
    if (item.category === 'bottoms') return 'strict' as const
    return item.subtype === 'Jackets' ? 'jacket' as const : 'apparel' as const
  }

  const placementByCategory: Record<WardrobeItem['category'], { left: string; top: string; width: string; height: string; zIndex: number; transform?: string }> = {
    face: { left: '120px', top: '30px', width: '118px', height: '76px', zIndex: 4, transform: 'rotate(-7deg)' },
    tops: { left: '18px', top: '64px', width: '166px', height: '126px', zIndex: 2, transform: 'rotate(-3deg)' },
    bottoms: { left: '134px', top: '104px', width: '145px', height: '163px', zIndex: 3, transform: 'rotate(3deg)' },
    shoes: { left: '26px', top: '182px', width: '118px', height: '54px', zIndex: 5, transform: 'rotate(-5deg)' },
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onOpen(outfit)}
      className="relative flex h-full w-full items-center justify-center overflow-hidden pt-4"
    >
      {stackItems.length > 0 ? (
        <div className="relative h-[272px] w-[296px] translate-x-[-12px] translate-y-3">
          {stackItems.slice(0, 4).map((item, index) => (
            <div
              key={`${item.id}-stack-${index}`}
              className="absolute"
              style={{
                ...placementByCategory[item.category],
              }}
            >
              <div className="h-full w-full" style={{ transform: placementByCategory[item.category].transform, transformOrigin: 'center center' }}>
                <ProductImage
                  src={item.image}
                  alt={item.name}
                  className={item.category === 'shoes' ? '' : 'h-full w-full object-contain'}
                  mode={getPreviewMode(item)}
                  fit={item.category === 'shoes' ? 'shoe' : 'default'}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <span className="type-caption text-text-muted">Open builder</span>
      )}
    </motion.button>
  )
}

export default function Home() {
  const nav = useNavigate()
  const { items, savedOutfits, getItemById, getUnderusedItems, loadOutfit } = useWardrobe()

  const goItem = (item: WardrobeItem) => nav(`/item/${item.id}`)

  const allSorted = [...items].sort((a, b) => b.addedAt.localeCompare(a.addedAt))
  const shoes = items.filter((item) => item.category === 'shoes')
  const shoeWall = useMemo(() => {
    if (shoes.length === 0) return []
    const columns = 12
    const total = 84
    const result: WardrobeItem[] = []

    for (let index = 0; index < total; index++) {
      const blocked = new Set<string>()
      const column = index % columns

      if (column > 0) blocked.add(result[index - 1]?.id ?? '')
      if (index >= columns) blocked.add(result[index - columns]?.id ?? '')
      if (index >= columns && column > 0) {
        blocked.add(result[index - columns - 1]?.id ?? '')
      }
      if (index >= columns && column < columns - 1) {
        blocked.add(result[index - columns + 1]?.id ?? '')
      }

      const allowed = shoes.filter((item) => !blocked.has(item.id))
      const source = allowed.length > 0 ? allowed : shoes
      const pick = source[Math.floor(Math.random() * source.length)]
      result.push(pick)
    }

    return result
  }, [shoes])
  const spotlight = getUnderusedItems()[0] ?? allSorted[0]
  const latestAdd = allSorted[0]
  const itemMarqueeItems = useMemo(() => [...allSorted].sort(() => Math.random() - 0.5), [allSorted])
  const featuredOutfit = savedOutfits[0]
  const fallbackBuilderItems = useMemo(() => {
    const pick = (category: WardrobeItem['category']) => {
      const pool = items.filter((item) => item.category === category)
      if (pool.length === 0) return null
      return pool[Math.floor(Math.random() * pool.length)]
    }
    return [pick('face'), pick('tops'), pick('bottoms'), pick('shoes')].filter(Boolean) as WardrobeItem[]
  }, [items])
  const shoeRows = useMemo(() => {
    if (shoeWall.length === 0) return []
    return Array.from({ length: 7 }, (_, rowIndex) => shoeWall.slice(rowIndex * 12, rowIndex * 12 + 12))
  }, [shoeWall])
  const featuredBrands = useMemo(() => {
    const brands = Array.from(new Set(items.map((item) => item.brand)))
    const shuffled = [...brands].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 2)
  }, [items])
  const brandRows = useMemo(
    () =>
      featuredBrands.map((brand) => ({
        brand,
        items: allSorted.filter((item) => item.brand === brand).slice(0, 8),
      })).filter((entry) => entry.items.length > 0),
    [allSorted, featuredBrands],
  )

  return (
    <div className="h-[calc(100vh-96px)] overflow-y-auto snap-y snap-mandatory md:h-[calc(100vh-56px)]">
      <section className="page-header snap-start overflow-hidden">
        <div className="grid h-[calc(100vh-96px)] grid-cols-1 gap-px border-border bg-border md:h-[calc(100vh-56px)] xl:grid-cols-4 xl:grid-rows-2">
          <div className="page-frame flex min-h-0 flex-col justify-center overflow-hidden bg-bg pb-10 pt-4 xl:col-span-2 xl:row-span-1 xl:pb-16 xl:pt-6">
            <p className="type-label text-text-muted">CLOSET ARCHIVE</p>
            <h1 className="type-display mt-4 max-w-[12ch] text-text-primary">Your closet in one place.</h1>
            <p className="type-body-lg mt-4 max-w-xl text-text-secondary">
              Browse your wardrobe through sections, outfit building, quick filtering, and detail pages built from the pieces you actually own.
            </p>
            <div className="mt-8">
              <button
                onClick={() => nav('/add?category=tops')}
                className="type-button-md inline-flex items-center gap-2 whitespace-nowrap text-text-primary"
              >
                Add Apparel:
              </button>
            </div>
          </div>

          <div className="flex h-full min-h-0 flex-col overflow-hidden bg-card px-6 pb-8 pt-4 xl:col-start-3 xl:row-start-1">
              <p className="type-label text-light-secondary">Items</p>
              <p className="type-h1 mt-3 text-text-dark">{items.length}</p>
              <div className="mt-4 flex flex-1 items-start justify-center overflow-hidden">
                <MiniItemMarquee items={itemMarqueeItems} onItemClick={goItem} />
              </div>
            </div>
            <div className="flex h-full min-h-0 flex-col overflow-hidden bg-card px-6 pb-8 pt-4 xl:col-start-4 xl:row-start-1">
              <p className="type-label text-light-secondary">Spotlight</p>
              <p className="type-h3 mt-4 text-text-dark">{spotlight?.name ?? 'Closet taking shape'}</p>
              <div className="mt-3 flex flex-1 items-center justify-center">
                <ItemSlideshow item={spotlight} onClick={goItem} />
              </div>
            </div>
            <div className="hidden bg-card xl:block xl:col-span-2 xl:row-start-2" />
            <div className="flex h-full min-h-0 flex-col overflow-hidden bg-card px-6 pb-8 pt-4 xl:col-start-3 xl:row-start-2">
              <p className="type-label text-light-secondary">Latest Add</p>
              <p className="type-h3 mt-4 text-text-dark">{latestAdd?.name ?? 'None yet'}</p>
              <div className="mt-3 flex flex-1 items-center justify-center">
                <ItemSlideshow item={latestAdd} onClick={goItem} whiteStage slideshow={false} />
              </div>
            </div>
            <div className="flex h-full min-h-0 flex-col overflow-hidden bg-card px-6 pb-8 pt-4 xl:col-start-4 xl:row-start-2">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => nav('/builder')}
                className="type-label w-fit text-left text-light-secondary"
              >
                Outfit Builder &gt;
              </motion.button>
              <p className="type-h3 mt-4 text-text-dark">{featuredOutfit?.name ?? 'Open builder'}</p>
              <div className="mt-3 flex flex-1 items-center justify-center overflow-hidden">
                <BuilderStackPreview
                  outfit={featuredOutfit}
                  items={!featuredOutfit ? fallbackBuilderItems : undefined}
                  getItemById={getItemById}
                  onOpen={(outfit) => {
                    if (outfit) loadOutfit(outfit)
                    nav('/builder')
                  }}
                />
              </div>
            </div>
        </div>
      </section>

      {shoeRows.length > 0 && (
        <section className="flex min-h-[calc(100vh-96px)] snap-start flex-col justify-center bg-card py-8 md:min-h-[calc(100vh-56px)]">
          <div className="space-y-4">
            {shoeRows.map((row, index) => (
              <ShoeMarqueeRow
                key={`shoe-row-${index}`}
                items={row}
                direction={index % 2 === 0 ? 'left' : 'right'}
                onItemClick={goItem}
              />
            ))}
          </div>
        </section>
      )}

      {brandRows.length > 0 && (
        <section className="page-frame flex min-h-[calc(100vh-96px)] snap-start flex-col justify-center py-8 md:min-h-[calc(100vh-56px)]">
          <div className="space-y-8">
            {brandRows.map(({ brand, items: rowItems }) => (
              <div key={brand}>
                <button
                  onClick={() => nav(`/closet?brand=${encodeURIComponent(brand)}`)}
                  className="type-button-md inline-flex items-center gap-2 whitespace-nowrap button-ghost text-text-primary"
                >
                  {brand} <ChevronRight size={18} />
                </button>
                <div className="mt-4">
                  <StoryStrip items={rowItems} onItemClick={goItem} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
