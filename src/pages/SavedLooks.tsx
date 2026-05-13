import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Heart, Trash2 } from 'lucide-react'
import { useWardrobe } from '@/hooks/useWardrobe'
import ProductImage from '@/components/ProductImage'
import type { OutfitCombo } from '@/types'

function getImageMode(category: 'face' | 'tops' | 'bottoms' | 'shoes', subtype: string) {
  if (category === 'shoes') return 'strict' as const
  if (category === 'bottoms') return 'bottoms' as const
  const normalizedSubtype = subtype.toLowerCase()
  if (normalizedSubtype.includes('jacket') || normalizedSubtype.includes('coat') || normalizedSubtype.includes('blazer')) {
    return 'jacket' as const
  }
  return 'apparel' as const
}

function outfitLabel(count: number) {
  return `${count} saved look${count === 1 ? '' : 's'}`
}

export default function SavedLooks() {
  const nav = useNavigate()
  const {
    savedOutfits,
    getItemById,
    toggleFavorite,
    deleteOutfit,
    loadOutfit,
  } = useWardrobe()

  const favoriteLooks = useMemo(
    () => savedOutfits.filter((outfit) => outfit.isFavorite),
    [savedOutfits],
  )
  const recentLooks = useMemo(
    () => savedOutfits.filter((outfit) => !outfit.isFavorite),
    [savedOutfits],
  )

  const OutfitPreview = ({ outfit }: { outfit: OutfitCombo }) => {
    const items = [outfit.face, outfit.tops, outfit.bottoms, outfit.shoes]
      .filter(Boolean)
      .map((id) => getItemById(id!))
      .filter(Boolean)

    return (
      <div className="card-outfit-preview">
        {items.map((item, index) => (
          <div key={`${outfit.id}-${item!.id}-${index}`} className="card-outfit-thumb">
            <ProductImage
              src={item!.image}
              alt={item!.name}
              className={item!.category === 'shoes' ? '' : 'h-full w-full object-contain'}
              mode={getImageMode(item!.category, item!.subtype)}
              fit={item!.category === 'shoes' ? 'shoe' : 'default'}
            />
          </div>
        ))}
      </div>
    )
  }

  const OutfitCard = ({ outfit }: { outfit: OutfitCombo }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="card-outfit"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {outfit.occasion ? (
              <span className="type-caption badge-neutral-dark capitalize">{outfit.occasion}</span>
            ) : null}
            {outfit.score ? (
              <span className={outfit.score >= 85 ? 'badge-score-good' : outfit.score >= 70 ? 'badge-score-ok' : 'badge-score-low'}>
                {outfit.score}/100
              </span>
            ) : null}
          </div>
          <h2 className="type-h3 mt-3 text-text-primary">{outfit.name}</h2>
          <p className="type-caption mt-1 text-text-muted">Saved {outfit.savedAt}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void toggleFavorite(outfit.id)}
            className="button-icon"
            aria-label={outfit.isFavorite ? `Remove ${outfit.name} from favorites` : `Add ${outfit.name} to favorites`}
          >
            <Heart size={16} className={outfit.isFavorite ? 'favorite-fill favorite-color' : 'text-text-muted'} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (!window.confirm(`Delete "${outfit.name}" from saved looks?`)) return
              void deleteOutfit(outfit.id)
            }}
            className="button-icon"
            aria-label={`Delete ${outfit.name}`}
          >
            <Trash2 size={14} className="text-text-muted" />
          </button>
        </div>
      </div>

      <div className="mt-5">
        <OutfitPreview outfit={outfit} />
      </div>

      <div className="mt-5 flex items-center justify-between gap-4">
        <p className="type-body-sm text-text-secondary">
          Load this saved composition back into the builder.
        </p>
        <button
          type="button"
          onClick={() => {
            loadOutfit(outfit)
            nav('/builder')
          }}
          className="type-button-sm button-primary"
        >
          Open Look <ArrowRight size={14} />
        </button>
      </div>
    </motion.div>
  )

  return (
    <div className="page-shell-dark app-viewport app-viewport-scroll">
      <header className="page-header">
        <div className="page-frame page-header-inner">
          <div className="page-header-row">
            <div className="page-header-copy">
              <p className="type-label text-text-muted">Saved Looks</p>
              <h1 className="type-h2 mt-3">Keep the outfits worth returning to.</h1>
              <p className="type-body-md mt-2 text-text-secondary">{outfitLabel(savedOutfits.length)} in your archive.</p>
            </div>
            <div className="hidden md:block">
              <button
                type="button"
                onClick={() => nav('/builder')}
                className="type-button-sm button-secondary"
              >
                Build New Look
              </button>
            </div>
          </div>
        </div>
      </header>

      {savedOutfits.length === 0 ? (
        <div className="page-frame py-24">
          <div className="mx-auto max-w-lg text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-border bg-elevated">
              <Heart size={24} className="text-text-muted" />
            </div>
            <h2 className="type-h3 mt-6 text-text-primary">No saved looks yet</h2>
            <p className="type-body-md mt-3 text-text-secondary">
              Save the outfits you want to revisit, compare, or wear again later.
            </p>
            <div className="mt-8">
              <button
                type="button"
                onClick={() => nav('/builder')}
                className="type-button-sm button-primary"
              >
                Open Builder
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="page-frame page-section max-w-4xl space-y-10">
          {favoriteLooks.length > 0 ? (
            <section>
              <div className="section-header-row">
                <div>
                  <h2 className="type-h4 text-text-primary">Favorites</h2>
                  <p className="type-caption mt-1 text-text-secondary">{favoriteLooks.length} pinned look{favoriteLooks.length === 1 ? '' : 's'}</p>
                </div>
              </div>
              <div className="space-y-4">
                <AnimatePresence>
                  {favoriteLooks.map((outfit) => (
                    <OutfitCard key={outfit.id} outfit={outfit} />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          ) : null}

          {recentLooks.length > 0 ? (
            <section>
              <div className="section-header-row">
                <div>
                  <h2 className="type-h4 text-text-primary">{favoriteLooks.length > 0 ? 'Archive' : 'All Looks'}</h2>
                  <p className="type-caption mt-1 text-text-secondary">{recentLooks.length} look{recentLooks.length === 1 ? '' : 's'} available</p>
                </div>
              </div>
              <div className="space-y-4">
                <AnimatePresence>
                  {recentLooks.map((outfit) => (
                    <OutfitCard key={outfit.id} outfit={outfit} />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  )
}
