import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, type PanInfo } from 'framer-motion'
import { Heart, Trash2, ArrowRight, Plus, Minus, RotateCcw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useWardrobe } from '@/hooks/useWardrobe'
import ProductImage from '@/components/ProductImage'
import type { Category, WardrobeItem } from '@/types'

type CanvasLayer = {
  category: Category
  item: WardrobeItem
  left: number
  top: number
  width: number
  height: number
  scale: number
  zIndex: number
}

type SavedCanvasLayout = Record<Category, Pick<CanvasLayer, 'left' | 'top' | 'width' | 'height' | 'scale' | 'zIndex'>>

const CANVAS_LAYOUT_STORAGE_KEY = 'wearit-build-look-layout'

const DEFAULT_LAYER_LAYOUT: Record<Category, Omit<CanvasLayer, 'category' | 'item'>> = {
  face: { left: 360, top: 72, width: 170, height: 108, scale: 1, zIndex: 4 },
  tops: { left: 118, top: 176, width: 292, height: 252, scale: 1, zIndex: 2 },
  bottoms: { left: 338, top: 302, width: 248, height: 292, scale: 1, zIndex: 3 },
  shoes: { left: 126, top: 486, width: 276, height: 90, scale: 1, zIndex: 5 },
}

function getCanvasFit(item: WardrobeItem): 'default' | 'shoe' {
  return item.category === 'shoes' ? 'shoe' : 'default'
}

function getCanvasMode(item: WardrobeItem): 'strict' | 'apparel' {
  return item.category === 'shoes' ? 'strict' : 'apparel'
}

export default function SavedLooks() {
  const nav = useNavigate()
  const {
    savedOutfits,
    getItemById,
    getItemsByCategory,
    getCurrentSelectionIds,
    toggleFavorite,
    deleteOutfit,
    loadOutfit,
  } = useWardrobe()

  const favs = savedOutfits.filter(o => o.isFavorite)
  const others = savedOutfits.filter(o => !o.isFavorite)
  const [selectedLayer, setSelectedLayer] = useState<Category>('tops')
  const [savedLayout, setSavedLayout] = useState<SavedCanvasLayout | null>(null)

  const buildLookItems = useMemo(() => {
    const current = getCurrentSelectionIds()
    const resolve = (category: Category, id: string | null) =>
      (id ? getItemById(id) : undefined) ?? getItemsByCategory(category)[0]

    return [
      resolve('face', current.face),
      resolve('tops', current.tops),
      resolve('bottoms', current.bottoms),
      resolve('shoes', current.shoes),
    ].filter(Boolean) as WardrobeItem[]
  }, [getCurrentSelectionIds, getItemById, getItemsByCategory])

  const [layers, setLayers] = useState<CanvasLayer[]>([])

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CANVAS_LAYOUT_STORAGE_KEY)
      if (stored) setSavedLayout(JSON.parse(stored) as SavedCanvasLayout)
    } catch {
      // ignore bad saved layout
    }
  }, [])

  useEffect(() => {
    setLayers((current) => {
      if (current.length === 0) {
        return buildLookItems.map((item) => ({
          category: item.category,
          item,
          ...(savedLayout?.[item.category] ?? DEFAULT_LAYER_LAYOUT[item.category]),
        }))
      }

      return current.map((layer) => {
        const nextItem = buildLookItems.find((item) => item.category === layer.category)
        return nextItem ? { ...layer, item: nextItem } : layer
      })
    })
  }, [buildLookItems, savedLayout])

  const updateLayer = (category: Category, updates: Partial<CanvasLayer>) => {
    setLayers((current) =>
      current.map((layer) => (layer.category === category ? { ...layer, ...updates } : layer)),
    )
  }

  const selectLayer = (category: Category) => {
    setSelectedLayer(category)
  }

  const adjustScale = (category: Category, delta: number) => {
    const layer = layers.find((entry) => entry.category === category)
    if (!layer) return
    updateLayer(category, { scale: Math.max(0.55, Math.min(1.8, Number((layer.scale + delta).toFixed(2)))) })
  }

  const nudgeLayer = (category: Category, dx: number, dy: number) => {
    const layer = layers.find((entry) => entry.category === category)
    if (!layer) return
    updateLayer(category, {
      left: layer.left + dx,
      top: layer.top + dy,
    })
  }

  const moveLayerOrder = (category: Category, direction: 'forward' | 'backward') => {
    setLayers((current) => {
      const ordered = [...current].sort((a, b) => a.zIndex - b.zIndex)
      const index = ordered.findIndex((layer) => layer.category === category)
      if (index === -1) return current

      const swapIndex = direction === 'forward' ? index + 1 : index - 1
      if (swapIndex < 0 || swapIndex >= ordered.length) return current

      const next = [...ordered]
      const currentLayer = next[index]
      const targetLayer = next[swapIndex]
      ;[currentLayer.zIndex, targetLayer.zIndex] = [targetLayer.zIndex, currentLayer.zIndex]

      return current.map((layer) => {
        if (layer.category === currentLayer.category) return { ...layer, zIndex: currentLayer.zIndex }
        if (layer.category === targetLayer.category) return { ...layer, zIndex: targetLayer.zIndex }
        return layer
      })
    })
  }

  const resetCanvas = () => {
    setLayers(
      buildLookItems.map((item) => ({
        category: item.category,
        item,
        ...DEFAULT_LAYER_LAYOUT[item.category],
      })),
    )
  }

  const saveCanvas = () => {
    const nextLayout = Object.fromEntries(
      layers.map((layer) => [
        layer.category,
        {
          left: Math.round(layer.left),
          top: Math.round(layer.top),
          width: Math.round(layer.width),
          height: Math.round(layer.height),
          scale: Number(layer.scale.toFixed(2)),
          zIndex: layer.zIndex,
        },
      ]),
    ) as SavedCanvasLayout

    setSavedLayout(nextLayout)
    try {
      window.localStorage.setItem(CANVAS_LAYOUT_STORAGE_KEY, JSON.stringify(nextLayout))
    } catch {
      // local save best effort only
    }
  }

  const layoutText = useMemo(() => {
    const source = savedLayout ?? Object.fromEntries(
      layers.map((layer) => [
        layer.category,
        {
          left: Math.round(layer.left),
          top: Math.round(layer.top),
          width: Math.round(layer.width),
          height: Math.round(layer.height),
          scale: Number(layer.scale.toFixed(2)),
          zIndex: layer.zIndex,
        },
      ]),
    ) as SavedCanvasLayout

    return [
      `face: left ${source.face?.left ?? 0} top ${source.face?.top ?? 0} width ${source.face?.width ?? 0} height ${source.face?.height ?? 0} scale ${source.face?.scale ?? 1} z ${source.face?.zIndex ?? 0}`,
      `tops: left ${source.tops?.left ?? 0} top ${source.tops?.top ?? 0} width ${source.tops?.width ?? 0} height ${source.tops?.height ?? 0} scale ${source.tops?.scale ?? 1} z ${source.tops?.zIndex ?? 0}`,
      `bottoms: left ${source.bottoms?.left ?? 0} top ${source.bottoms?.top ?? 0} width ${source.bottoms?.width ?? 0} height ${source.bottoms?.height ?? 0} scale ${source.bottoms?.scale ?? 1} z ${source.bottoms?.zIndex ?? 0}`,
      `shoes: left ${source.shoes?.left ?? 0} top ${source.shoes?.top ?? 0} width ${source.shoes?.width ?? 0} height ${source.shoes?.height ?? 0} scale ${source.shoes?.scale ?? 1} z ${source.shoes?.zIndex ?? 0}`,
    ].join('\n')
  }, [layers, savedLayout])

  const OutfitPreview = ({ outfitId, face, tops, bottoms, shoes }: {
    outfitId: string; face: string | null; tops: string; bottoms: string; shoes: string
  }) => {
    const items = [face, tops, bottoms, shoes].filter(Boolean).map(id => getItemById(id!)).filter(Boolean)
    return (
      <div className="card-outfit-preview">
        {items.map((item, i) => (
          <div
            key={`${outfitId}-${item!.id}-${i}`}
            className="card-outfit-thumb"
          >
            <ProductImage src={item!.image} alt="" className={item!.category === 'shoes' ? '' : 'h-full w-full object-contain'} mode={item!.category === 'shoes' ? 'strict' : 'apparel'} fit={item!.category === 'shoes' ? 'shoe' : 'default'} />
          </div>
        ))}
      </div>
    )
  }

  const OutfitCard = ({ outfit }: { outfit: typeof savedOutfits[0] }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="card-outfit"
    >
      <div className="flex items-center justify-between">
        <OutfitPreview
          outfitId={outfit.id}
          face={outfit.face}
          tops={outfit.tops}
          bottoms={outfit.bottoms}
          shoes={outfit.shoes}
        />
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => toggleFavorite(outfit.id)}
            className="button-icon"
          >
            <Heart
              size={16}
              className={outfit.isFavorite ? 'favorite-fill favorite-color' : 'text-text-muted'}
            />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => deleteOutfit(outfit.id)}
            className="button-icon"
          >
            <Trash2 size={14} className="text-text-muted" />
          </motion.button>
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <h3 className="type-h4 text-text-primary">{outfit.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            {outfit.occasion && (
              <span className="type-caption badge-neutral-dark capitalize">
                {outfit.occasion}
              </span>
            )}
            {outfit.score && (
              <span className={`${
                outfit.score >= 85 ? 'badge-score-good' : outfit.score >= 70 ? 'badge-score-ok' : 'badge-score-low'
              }`}>
                {outfit.score}/100
              </span>
            )}
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => { loadOutfit(outfit); nav('/builder') }}
          className="type-button-sm button-primary"
        >
          Wear <ArrowRight size={12} />
        </motion.button>
      </div>
    </motion.div>
  )

  return (
    <div className="page-shell-dark">
      <header className="page-header">
        <div className="page-frame page-header-inner">
          <div className="page-header-copy">
            <p className="type-label text-text-muted">Saved Looks</p>
            <h1 className="type-h2 mt-3">Store the outfits worth keeping.</h1>
            <p className="type-body-md mt-2 text-text-secondary">{savedOutfits.length} outfit{savedOutfits.length === 1 ? '' : 's'} saved in your archive.</p>
          </div>
        </div>
      </header>

      <div className="page-frame page-section max-w-5xl">
        <div className="card-outfit">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="type-label text-text-muted">Build Look</p>
              <h2 className="type-h2 mt-3 text-text-primary">Align the artboard directly.</h2>
              <p className="type-body-md mt-2 text-text-secondary">Drag pieces freely on the canvas. Scale the selected layer with the controls or trackpad / mouse wheel.</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={saveCanvas} className="type-button-sm button-primary">
                Save Layout
              </button>
              <button type="button" onClick={resetCanvas} className="type-button-sm button-secondary">
                <RotateCcw size={14} />
                Reset
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="relative h-[760px] overflow-visible border border-light bg-card">
              {layers.map((layer) => (
                <div
                  key={layer.category}
                  className="absolute inset-0"
                  style={{ zIndex: selectedLayer === layer.category ? 20 : layer.zIndex }}
                >
                  <motion.button
                    drag
                    dragMomentum={false}
                    onMouseDown={() => selectLayer(layer.category)}
                    onClick={() => selectLayer(layer.category)}
                    onWheel={(event) => {
                      event.preventDefault()
                      adjustScale(layer.category, event.deltaY > 0 ? -0.04 : 0.04)
                    }}
                    onDragEnd={(_, info: PanInfo) => {
                      updateLayer(layer.category, {
                        left: layer.left + info.offset.x,
                        top: layer.top + info.offset.y,
                      })
                    }}
                    className={`absolute cursor-move ${selectedLayer === layer.category ? 'outline outline-2 outline-offset-2 outline-light-strong' : ''}`}
                    style={{
                      left: layer.left,
                      top: layer.top,
                      width: layer.width * layer.scale,
                      height: layer.height * layer.scale,
                    }}
                  >
                    <div className="h-full w-full">
                      <ProductImage
                        src={layer.item.image}
                        alt={layer.item.name}
                        className={layer.item.category === 'shoes' ? '' : 'h-full w-full object-contain'}
                        mode={getCanvasMode(layer.item)}
                        fit={getCanvasFit(layer.item)}
                      />
                    </div>
                  </motion.button>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <div>
                <p className="type-label text-text-muted">Layers</p>
                <div className="mt-3 space-y-2">
                  {layers
                    .slice()
                    .sort((a, b) => a.zIndex - b.zIndex)
                    .map((layer) => (
                      <button
                        key={`select-${layer.category}`}
                        type="button"
                        onClick={() => setSelectedLayer(layer.category)}
                        className={`type-button-sm w-full justify-start ${selectedLayer === layer.category ? 'button-primary' : 'button-secondary'}`}
                      >
                        {layer.category === 'face' ? 'Accessories' : layer.category.charAt(0).toUpperCase() + layer.category.slice(1)}
                      </button>
                    ))}
                </div>
              </div>

              <div className="border border-border p-4">
                <p className="type-label text-text-muted">Scale</p>
                <div className="mt-3 flex items-center gap-2">
                  <button type="button" onClick={() => adjustScale(selectedLayer, -0.05)} className="button-icon">
                    <Minus size={14} />
                  </button>
                  <div className="type-body-sm min-w-0 flex-1 text-center text-text-primary">
                    {Math.round((layers.find((layer) => layer.category === selectedLayer)?.scale ?? 1) * 100)}%
                  </div>
                  <button type="button" onClick={() => adjustScale(selectedLayer, 0.05)} className="button-icon">
                    <Plus size={14} />
                  </button>
                </div>
                <p className="type-caption mt-3 text-text-muted">Selected: {selectedLayer === 'face' ? 'Accessories' : selectedLayer}</p>
              </div>

              <div className="border border-border p-4">
                <p className="type-label text-text-muted">Move</p>
                <div className="mt-3 flex justify-center">
                  <button type="button" onClick={() => nudgeLayer(selectedLayer, 0, -12)} className="button-icon">
                    <ChevronUp size={14} />
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-center gap-2">
                  <button type="button" onClick={() => nudgeLayer(selectedLayer, -12, 0)} className="button-icon">
                    <ChevronLeft size={14} />
                  </button>
                  <button type="button" onClick={() => nudgeLayer(selectedLayer, 12, 0)} className="button-icon">
                    <ChevronRight size={14} />
                  </button>
                </div>
                <div className="mt-2 flex justify-center">
                  <button type="button" onClick={() => nudgeLayer(selectedLayer, 0, 12)} className="button-icon">
                    <ChevronDown size={14} />
                  </button>
                </div>
                <p className="type-caption mt-3 text-text-muted">Step: 12px</p>
              </div>

              <div className="border border-border p-4">
                <p className="type-label text-text-muted">Layer Order</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => moveLayerOrder(selectedLayer, 'backward')} className="type-button-sm button-secondary">
                    Send Back
                  </button>
                  <button type="button" onClick={() => moveLayerOrder(selectedLayer, 'forward')} className="type-button-sm button-secondary">
                    Bring Front
                  </button>
                </div>
              </div>

              <div className="border border-border p-4">
                <p className="type-label text-text-muted">Saved Layout</p>
                <textarea
                  readOnly
                  value={layoutText}
                  className="type-caption field-input-dark mt-3 min-h-[144px] resize-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {savedOutfits.length === 0 ? (
        <div className="page-frame py-20 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center radius-full bg-elevated">
            <Heart size={24} className="text-text-muted" />
          </div>
          <p className="type-body-md text-text-muted">No saved looks yet</p>
          <p className="type-caption text-text-muted mt-1">Build an outfit and save it!</p>
        </div>
      ) : (
        <div className="page-frame page-section max-w-4xl space-y-8">
          {favs.length > 0 && (
            <div>
              <h2 className="type-label text-text-muted mb-4">
                Favorites
              </h2>
              <div className="space-y-3">
                <AnimatePresence>
                  {favs.map(o => <OutfitCard key={o.id} outfit={o} />)}
                </AnimatePresence>
              </div>
            </div>
          )}

          {others.length > 0 && (
            <div>
              <h2 className="type-label text-text-muted mb-4">
                All Looks
              </h2>
              <div className="space-y-3">
                <AnimatePresence>
                  {others.map(o => <OutfitCard key={o.id} outfit={o} />)}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
