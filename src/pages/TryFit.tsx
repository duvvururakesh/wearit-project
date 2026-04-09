import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Shuffle, Lock, Unlock, Sparkles, ArrowRight } from 'lucide-react'
import { useWardrobe } from '@/hooks/useWardrobe'
import OccasionPicker from '@/components/OccasionPicker'
import OutfitScore from '@/components/OutfitScore'
import ProductImage from '@/components/ProductImage'
import type { Category, Occasion } from '@/types'

const LAYERS: { category: Category; label: string }[] = [
  { category: 'face', label: 'Accessories' },
  { category: 'tops', label: 'Tops' },
  { category: 'bottoms', label: 'Bottoms' },
  { category: 'shoes', label: 'Shoes' },
]

export default function TryFit() {
  const nav = useNavigate()
  const {
    selection, getItemsByCategory, shuffleRemaining,
    getScoreForSelection, getSuggestionsByOccasion, loadOutfit,
  } = useWardrobe()

  const [locked, setLocked] = useState<Set<Category>>(new Set())
  const [occasion, setOccasion] = useState<Occasion | null>(null)
  const [shuffleCount, setShuffleCount] = useState(0)

  const toggleLock = (cat: Category) => {
    setLocked(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const handleShuffle = useCallback(() => {
    if (occasion) {
      const suggestions = getSuggestionsByOccasion(occasion)
      const idx = shuffleCount % Math.max(suggestions.length, 1)
      if (suggestions[idx]) loadOutfit(suggestions[idx])
    } else {
      shuffleRemaining(Array.from(locked))
    }
    setShuffleCount(c => c + 1)
  }, [locked, occasion, shuffleCount, shuffleRemaining, getSuggestionsByOccasion, loadOutfit])

  const score = getScoreForSelection()

  return (
    <div className="page-shell-dark">
      <header className="page-header">
        <div className="page-frame page-header-inner">
          <div className="page-header-copy">
            <p className="type-label text-text-muted">Quick Mix</p>
            <h1 className="type-h2 mt-3">Lock pieces and reshuffle the rest.</h1>
            <p className="type-body-md mt-2 text-text-secondary">Use the same product structure as the builder, with lighter controls for fast combinations.</p>
          </div>
        </div>
      </header>

      <div className="page-frame page-section max-w-3xl">
        {/* Occasion Filter */}
        <OccasionPicker
          selected={occasion}
          onSelect={o => setOccasion(o === occasion ? null : o)}
        />

        {/* Current Selection */}
        <div className="mt-6 space-y-3">
          {LAYERS.map(({ category, label }) => {
            const items = getItemsByCategory(category)
            const item = items.length > 0 ? items[selection[category] % items.length] : undefined
            const isLocked = locked.has(category)

            return (
              <motion.div
                key={category}
                layout
                className={`card-selection-row transition-all ${
                  isLocked
                    ? 'border-text-primary'
                    : ''
                }`}
              >
                <div
                  className="media-canvas card-selection-thumb cursor-pointer"
                  onClick={() => item && nav(`/item/${item.id}`)}
                >
                  {item && <ProductImage src={item.image} alt={item.name} className={item.category === 'shoes' ? '' : 'h-full w-full object-contain'} mode={item.category === 'shoes' ? 'strict' : 'apparel'} fit={item.category === 'shoes' ? 'shoe' : 'default'} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="type-label text-text-muted">{label}</p>
                  <p className="type-h4 text-text-primary truncate">{item?.name ?? 'None'}</p>
                  <p className="type-caption text-text-muted">{item ? `${item.subtype} · ${item.brand}` : ''}</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => toggleLock(category)}
                  className={`button-icon ${
                    isLocked ? 'bg-text-primary text-bg' : 'bg-surface text-text-muted hover:text-text-primary'
                  }`}
                >
                  {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                </motion.button>
              </motion.div>
            )
          })}
        </div>

        {/* Score */}
        <div className="mt-6">
          <OutfitScore {...score} />
        </div>

        {/* Shuffle Button */}
        <div className="mt-6">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleShuffle}
            className="type-button-md button-primary w-full"
          >
            <Shuffle size={16} />
            Shuffle {locked.size > 0 ? `(${4 - locked.size} unlocked)` : 'All'}
          </motion.button>
        </div>

        {/* Quick Actions */}
        <div className="mt-3 flex gap-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => nav('/builder')}
            className="type-button-sm button-secondary flex-1"
          >
            <ArrowRight size={14} /> Open in Builder
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => { setLocked(new Set()); setOccasion(null) }}
            className="type-button-sm button-secondary px-4 text-text-muted"
          >
            Reset
          </motion.button>
        </div>

        {/* AI Suggestions */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={14} className="text-gold" />
            <h3 className="type-label text-text-muted">
              Older Pieces
            </h3>
          </div>
          <UnderusedItems />
        </div>
      </div>
    </div>
  )
}

function UnderusedItems() {
  const { getUnderusedItems } = useWardrobe()
  const nav = useNavigate()
  const underused = getUnderusedItems().slice(0, 6)

  if (underused.length === 0) return null

  return (
    <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
      {underused.map(item => (
        <motion.button
          key={item.id}
          whileTap={{ scale: 0.95 }}
          onClick={() => nav(`/item/${item.id}`)}
          className="card-product-micro group"
        >
          <div className="media-canvas card-product-micro-media group-hover:bg-surface transition-colors">
            <ProductImage src={item.image} alt={item.name} className={item.category === 'shoes' ? '' : 'h-full w-full object-contain'} mode={item.category === 'shoes' ? 'strict' : 'apparel'} fit={item.category === 'shoes' ? 'shoe' : 'default'} />
          </div>
          <div className="card-product-micro-body">
            <p className="type-caption truncate text-text-secondary">{item.name}</p>
          </div>
        </motion.button>
      ))}
    </div>
  )
}
