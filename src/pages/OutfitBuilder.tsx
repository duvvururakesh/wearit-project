import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, type PanInfo } from 'framer-motion'
import { Bookmark, ChevronLeft, ChevronRight, RotateCcw, Sparkles } from 'lucide-react'
import { useWardrobe } from '@/hooks/useWardrobe'
import ProductImage from '@/components/ProductImage'
import OccasionPicker from '@/components/OccasionPicker'
import SaveOutfitModal from '@/components/SaveOutfitModal'
import type { Category, Occasion, OutfitSelectionIds, WardrobeItem } from '@/types'

const LAYERS: { category: Category; label: string; heightClass: string }[] = [
  { category: 'face', label: 'Accessories', heightClass: 'h-[92px]' },
  { category: 'tops', label: 'Tops', heightClass: 'h-[156px]' },
  { category: 'bottoms', label: 'Bottoms', heightClass: 'h-[220px]' },
  { category: 'shoes', label: 'Shoes', heightClass: 'h-[98px]' },
]

const LAYER_MEDIA_FRAME: Record<Category, string> = {
  face: 'w-[160px] h-[84px]',
  tops: 'w-[236px] h-[148px]',
  bottoms: 'w-[168px] h-[214px]',
  shoes: 'w-[188px] h-[88px]',
}

function selectionEquals(a: OutfitSelectionIds, b: OutfitSelectionIds) {
  return LAYERS.every(({ category }) => a[category] === b[category])
}

function emptySelection(): OutfitSelectionIds {
  return {
    face: null,
    tops: null,
    bottoms: null,
    shoes: null,
  }
}

function LayerCarousel({
  category,
  items,
  selectedId,
  onSelect,
  onNavigate,
  active,
  onFocus,
  heightClass,
}: {
  category: Category
  items: WardrobeItem[]
  selectedId: string | null
  onSelect: (id: string) => void
  onNavigate: (direction: -1 | 1) => void
  active: boolean
  onFocus: () => void
  heightClass: string
}) {
  const selectedIndex = Math.max(0, items.findIndex((item) => item.id === selectedId))

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const offset = info.offset.x
    const velocity = info.velocity.x
    if (Math.abs(velocity) > 250 || Math.abs(offset) > 60) {
      onNavigate(offset < 0 || velocity < 0 ? 1 : -1)
    }
  }

  if (items.length === 0) {
    return (
      <div className="relative flex h-[56px] items-center justify-center overflow-hidden">
        <div className="rounded-full border border-border px-4 py-2">
          <p className="type-caption text-text-muted">No {category} loaded</p>
        </div>
      </div>
    )
  }

  const getLoopedItem = (offset: number) => {
    const nextIndex = (selectedIndex + offset + items.length) % items.length
    return items[nextIndex]
  }

  const visibleOffsets = items.length === 1 ? [-2, -1, 0, 1, 2] : [-2, -1, 0, 1, 2]
  const occurrenceMap = new Map<string, number>()
  const visibleItems = visibleOffsets.map((offset) => {
    const item = getLoopedItem(offset)
    if (!item) return null
    const occurrence = occurrenceMap.get(item.id) ?? 0
    occurrenceMap.set(item.id, occurrence + 1)
    return {
      offset,
      item,
      instanceKey: `${item.id}-${occurrence}`,
    }
  })

  return (
    <div className={`relative overflow-hidden ${heightClass}`} onMouseDown={onFocus}>
      <motion.div
        className="grid h-full grid-cols-5 items-center touch-pan-y cursor-grab gap-1 active:cursor-grabbing md:gap-2"
        drag="x"
        dragElastic={0.08}
        onDragStart={onFocus}
        onDragEnd={handleDragEnd}
      >
        {visibleItems.map((entry) => {
          if (!entry) return <div key={`${category}-empty`} />
          return (
          <LayerItem
            key={`${category}-${entry.instanceKey}`}
            item={entry.item}
            offset={entry.offset}
            active={active && entry.offset === 0}
            category={category}
            onClick={() => {
              onFocus()
              if (entry.offset === 0) onSelect(entry.item.id)
              else onNavigate(entry.offset > 0 ? 1 : -1)
            }}
          />
          )
        })}
      </motion.div>
    </div>
  )
}

function LayerItem({
  item,
  offset,
  active,
  category,
  onClick,
}: {
  item: WardrobeItem
  offset: number
  active: boolean
  category: Category
  onClick: () => void
}) {
  const distance = Math.abs(offset)
  const scale = distance === 0 ? 1 : distance === 1 ? 0.78 : 0.58
  const opacity = distance === 0 ? 1 : distance === 1 ? (active ? 0.36 : 0.28) : 0.12
  const y = distance === 0 ? 0 : distance === 1 ? 6 : 12

  return (
    <motion.button
      className="flex items-center justify-center transition-opacity"
      layout
      animate={{
        scale,
        y,
        opacity,
      }}
      transition={{ layout: { type: 'spring', stiffness: 220, damping: 24 }, type: 'spring', stiffness: 300, damping: 28 }}
      onClick={onClick}
    >
      <div className={`flex items-center justify-center overflow-hidden ${LAYER_MEDIA_FRAME[category]}`}>
        <ProductImage
          src={item.image}
          alt={item.name}
          className={category === 'shoes' ? '' : 'max-h-full max-w-full object-contain'}
          mode={item.subtype === 'Jackets' ? 'jacket' : category === 'shoes' ? 'strict' : 'apparel'}
          fit={category === 'shoes' ? 'shoe' : 'default'}
        />
      </div>
    </motion.button>
  )
}

export default function OutfitBuilder() {
  const nav = useNavigate()
  const {
    getItemsByCategory,
    getItemById,
    getScoreForItems,
    saveOutfitFromItems,
    getSuggestionsByOccasion,
    getCurrentSelectionIds,
  } = useWardrobe()

  const [showSave, setShowSave] = useState(false)
  const [occasion, setOccasion] = useState<Occasion | null>(null)
  const [showScore, setShowScore] = useState(false)
  const [focusedCategory, setFocusedCategory] = useState<Category>('tops')
  const [draftSelection, setDraftSelection] = useState<OutfitSelectionIds>(emptySelection())
  const [savedSelection, setSavedSelection] = useState<OutfitSelectionIds>(emptySelection())
  const [savedOccasion, setSavedOccasion] = useState<Occasion | null>(null)

  useEffect(() => {
    const initial = getCurrentSelectionIds()
    setDraftSelection(initial)
    setSavedSelection(initial)
  }, [getCurrentSelectionIds])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  const itemsByCategory = useMemo(
    () =>
      Object.fromEntries(
        LAYERS.map(({ category }) => [category, getItemsByCategory(category)]),
      ) as Record<Category, WardrobeItem[]>,
    [getItemsByCategory],
  )

  const selectedItems = useMemo(
    () =>
      Object.fromEntries(
        LAYERS.map(({ category }) => [category, draftSelection[category] ? getItemById(draftSelection[category]!) ?? null : null]),
      ) as Record<Category, WardrobeItem | null>,
    [draftSelection, getItemById],
  )

  const orderedItemsByCategory = useMemo(
    () =>
      Object.fromEntries(
        LAYERS.map(({ category }) => [category, itemsByCategory[category]]),
      ) as Record<Category, WardrobeItem[]>,
    [itemsByCategory],
  )

  const score = getScoreForItems(draftSelection)
  const isDirty = occasion !== savedOccasion || !selectionEquals(draftSelection, savedSelection)
  const isComplete = Boolean(draftSelection.tops && draftSelection.bottoms && draftSelection.shoes)

  const selectedFocused = selectedItems[focusedCategory]

  const moveLayer = (category: Category, direction: -1 | 1) => {
    const layerItems = orderedItemsByCategory[category]
    if (layerItems.length <= 1) return

    const currentIndex = Math.max(0, layerItems.findIndex((item) => item.id === draftSelection[category]))
    const nextIndex = (currentIndex + direction + layerItems.length) % layerItems.length
    const next = layerItems[nextIndex]
    if (!next) return

    setFocusedCategory(category)
    setDraftSelection((current) => ({ ...current, [category]: next.id }))
  }

  const handleOccasion = useCallback((nextOccasion: Occasion) => {
    if (occasion === nextOccasion) {
      setOccasion(null)
      return
    }

    setOccasion(nextOccasion)
    const suggestions = getSuggestionsByOccasion(nextOccasion)
    if (suggestions.length > 0) {
      setDraftSelection({
        face: suggestions[0].face,
        tops: suggestions[0].tops,
        bottoms: suggestions[0].bottoms,
        shoes: suggestions[0].shoes,
      })
    }
  }, [getSuggestionsByOccasion, occasion])

  const clearFocusedLayer = () => {
    setDraftSelection((current) => ({ ...current, [focusedCategory]: null }))
  }

  const resetLook = () => {
    setDraftSelection(emptySelection())
    setOccasion(null)
  }

  const handleSaveLook = (name: string, saveOccasion: Occasion | null) => {
    const finalOccasion = saveOccasion ?? occasion
    saveOutfitFromItems(name, finalOccasion, draftSelection)
    setSavedSelection({ ...draftSelection })
    setSavedOccasion(finalOccasion)
  }

  return (
    <div className="page-shell-dark h-[calc(100vh-96px)] overflow-hidden md:h-[calc(100vh-56px)]">
      <div className="flex h-full flex-col">
        <div className="page-frame flex flex-shrink-0 items-center justify-between py-3">
          <div className="min-w-0">
            <p className="type-label text-text-muted">Builder</p>
            <h1 className="type-h4 mt-1">Compose a look</h1>
          </div>

          <div className="hidden flex-1 justify-center px-6 lg:flex">
            <OccasionPicker selected={occasion} onSelect={handleOccasion} />
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setShowScore((current) => !current)} className="button-icon" aria-label="Toggle score">
              <Sparkles size={14} className={showScore ? 'text-gold' : 'text-text-muted'} />
            </button>
            <button onClick={resetLook} className="button-icon" aria-label="Reset look">
              <RotateCcw size={14} className="text-text-muted" />
            </button>
            <button onClick={() => setShowSave(true)} className="type-button-sm button-primary" disabled={!isComplete}>
              <Bookmark size={14} />
              Save Look
            </button>
          </div>
        </div>

        <div className="page-frame py-3 lg:hidden">
          <OccasionPicker selected={occasion} onSelect={handleOccasion} />
        </div>

        <div className="relative flex-1 overflow-hidden bg-bg">
          <div className="pointer-events-none absolute inset-y-0 left-1/2 z-0 w-[360px] -translate-x-1/2 bg-white/[0.02] blur-3xl" />
          <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-24 bg-gradient-to-b from-white/[0.02] to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-24 bg-gradient-to-t from-white/[0.02] to-transparent" />
          <div className="page-frame flex h-full flex-col">
            <div className="relative z-10 flex flex-1 flex-col justify-center gap-6">
              {LAYERS.map(({ category, heightClass }) => (
                <div key={category} className="relative">
                  <button
                    onClick={() => moveLayer(category, -1)}
                    disabled={orderedItemsByCategory[category].length <= 1}
                    className="button-icon absolute left-0 top-1/2 z-20 -translate-y-1/2 text-white/80 disabled:opacity-20"
                    aria-label={`Previous ${category}`}
                  >
                    <ChevronLeft size={34} strokeWidth={1.6} />
                  </button>
                  <button
                    onClick={() => moveLayer(category, 1)}
                    disabled={orderedItemsByCategory[category].length <= 1}
                    className="button-icon absolute right-0 top-1/2 z-20 -translate-y-1/2 text-white/80 disabled:opacity-20"
                    aria-label={`Next ${category}`}
                  >
                    <ChevronRight size={34} strokeWidth={1.6} />
                  </button>
                  <LayerCarousel
                    category={category}
                    items={orderedItemsByCategory[category]}
                    selectedId={draftSelection[category]}
                    onSelect={(id) => setDraftSelection((current) => ({ ...current, [category]: id }))}
                    onNavigate={(direction) => moveLayer(category, direction)}
                    active={focusedCategory === category}
                    onFocus={() => setFocusedCategory(category)}
                    heightClass={heightClass}
                  />
                </div>
              ))}
            </div>

            <div className="flex items-end justify-between py-3">
              <div className="min-w-0">
                <p className="type-caption text-text-primary">{selectedFocused?.name ?? 'No item selected'}</p>
                <p className="type-caption mt-1 text-text-muted">
                  {selectedFocused ? `${selectedFocused.brand} / ${selectedFocused.subtype}` : 'Swipe any layer to build the look'}
                </p>
              </div>
              <div className="flex items-center gap-4">
                {showScore && <span className="badge-neutral-dark">{score.score}/100</span>}
                {selectedFocused && (
                  <>
                    <button onClick={() => nav(`/item/${selectedFocused.id}`)} className="type-button-sm button-ghost text-text-muted">
                      View Item
                    </button>
                    <button onClick={clearFocusedLayer} className="type-button-sm button-ghost text-text-muted">
                      Clear Layer
                    </button>
                  </>
                )}
                {isDirty && <span className="type-caption text-text-muted">Draft</span>}
              </div>
            </div>
          </div>
        </div>

        <SaveOutfitModal
          open={showSave}
          onClose={() => setShowSave(false)}
          onSave={handleSaveLook}
        />
      </div>
    </div>
  )
}
