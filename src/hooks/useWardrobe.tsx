import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import type { WardrobeItem, OutfitCombo, OutfitSelection, OutfitSelectionIds, Category, Occasion, OutfitScoreResult } from '@/types'
import { mockItems, mockSavedOutfits } from '@/data/mockData'
import { normalizeColorLabel } from '@/lib/colors'
import { loadWardrobeItems, saveWardrobeItems } from '@/lib/wardrobeDb'

interface WardrobeCtx {
  items: WardrobeItem[]
  savedOutfits: OutfitCombo[]
  selection: OutfitSelection
  setLayerIndex: (cat: Category, idx: number) => void
  getItemsByCategory: (cat: Category) => WardrobeItem[]
  getItemById: (id: string) => WardrobeItem | undefined
  saveOutfit: (name: string, occasion: Occasion | null) => void
  saveOutfitFromItems: (name: string, occasion: Occasion | null, ids: OutfitSelectionIds) => void
  toggleFavorite: (id: string) => void
  deleteOutfit: (id: string) => void
  loadOutfit: (outfit: OutfitCombo) => void
  shuffleRemaining: (locked: Category[]) => void
  getScoreForSelection: () => OutfitScoreResult
  getScoreForItems: (ids: OutfitSelectionIds) => OutfitScoreResult
  getCurrentSelectionIds: () => OutfitSelectionIds
  getSuggestionsByOccasion: (occasion: Occasion) => OutfitCombo[]
  getUnderusedItems: () => WardrobeItem[]
  addItem: (item: WardrobeItem) => void
  deleteItem: (id: string) => void
  updateItem: (id: string, updates: Partial<WardrobeItem>) => void
}

const WardrobeContext = createContext<WardrobeCtx | null>(null)

export function WardrobeProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WardrobeItem[]>(mockItems)
  const [savedOutfits, setSavedOutfits] = useState<OutfitCombo[]>(mockSavedOutfits)
  const [selection, setSelection] = useState<OutfitSelection>({ face: 0, tops: 0, bottoms: 0, shoes: 0 })
  const hydratedRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    loadWardrobeItems()
      .then((storedItems) => {
        if (cancelled) return
        if (storedItems && storedItems.length > 0) {
          setItems(storedItems)
        }
        hydratedRef.current = true
      })
      .catch(() => {
        hydratedRef.current = true
      })

    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!hydratedRef.current) return
    void saveWardrobeItems(items)
  }, [items])

  const getItemsByCategory = useCallback((cat: Category) => items.filter(i => i.category === cat), [items])

  const getItemById = useCallback((id: string) => items.find(i => i.id === id), [items])

  const setLayerIndex = useCallback((cat: Category, idx: number) => {
    setSelection(prev => ({ ...prev, [cat]: idx }))
  }, [])

  const getSafeIndex = useCallback((cat: Category) => {
    const catItems = getItemsByCategory(cat)
    if (catItems.length === 0) return 0
    return selection[cat] % catItems.length
  }, [getItemsByCategory, selection])

  const getCurrentIds = useCallback((): OutfitSelectionIds => {
    const face = getItemsByCategory('face')
    const tops = getItemsByCategory('tops')
    const bottoms = getItemsByCategory('bottoms')
    const shoes = getItemsByCategory('shoes')
    return {
      face: face[getSafeIndex('face')]?.id ?? null,
      tops: tops[getSafeIndex('tops')]?.id ?? null,
      bottoms: bottoms[getSafeIndex('bottoms')]?.id ?? null,
      shoes: shoes[getSafeIndex('shoes')]?.id ?? null,
    }
  }, [getItemsByCategory, getSafeIndex])

  const saveOutfitFromItems = useCallback((name: string, occasion: Occasion | null, ids: OutfitSelectionIds) => {
    const combo: OutfitCombo = {
      id: `o${Date.now()}`,
      name,
      ...ids,
      tops: ids.tops ?? '',
      bottoms: ids.bottoms ?? '',
      shoes: ids.shoes ?? '',
      occasion,
      score: Math.floor(70 + Math.random() * 30),
      savedAt: new Date().toISOString().split('T')[0],
      isFavorite: false,
    }
    setSavedOutfits(prev => [combo, ...prev])
  }, [])

  const saveOutfit = useCallback((name: string, occasion: Occasion | null) => {
    saveOutfitFromItems(name, occasion, getCurrentIds())
  }, [getCurrentIds, saveOutfitFromItems])

  const buildScore = useCallback((ids: OutfitSelectionIds): OutfitScoreResult => {
    const selectedItems = [ids.face, ids.tops, ids.bottoms, ids.shoes]
      .filter(Boolean)
      .map(id => getItemById(id!))
      .filter(Boolean) as WardrobeItem[]

    const colors = selectedItems.map(i => i.color)
    let harmonies = 0
    let pairs = 0
    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        pairs++
        const matches = colorHarmony[colors[i]] ?? []
        if (matches.includes(colors[j])) harmonies++
      }
    }

    const score = pairs > 0 ? Math.round(60 + (harmonies / pairs) * 40) : 75
    const label = score >= 85 ? 'Great Match' : score >= 70 ? 'Good Look' : 'Try Swapping'
    const tips = [
      'Try pairing neutrals with a bold accessory.',
      'This combination has great tonal balance.',
      'Consider swapping the bottoms for more contrast.',
      'Classic color pairing — very clean.',
      'The textures here complement each other well.',
    ]
    const tip = tips[Math.floor(Math.random() * tips.length)]

    return { score, label, tip }
  }, [getCurrentIds])

  const toggleFavorite = useCallback((id: string) => {
    setSavedOutfits(prev => prev.map(o => o.id === id ? { ...o, isFavorite: !o.isFavorite } : o))
  }, [])

  const deleteOutfit = useCallback((id: string) => {
    setSavedOutfits(prev => prev.filter(o => o.id !== id))
  }, [])

  const loadOutfit = useCallback((outfit: OutfitCombo) => {
    const cats: Category[] = ['face', 'tops', 'bottoms', 'shoes']
    const newSel = { ...selection }
    for (const cat of cats) {
      const catItems = getItemsByCategory(cat)
      const idx = catItems.findIndex(i => i.id === outfit[cat])
      if (idx >= 0) newSel[cat] = idx
    }
    setSelection(newSel)
  }, [getItemsByCategory, selection])

  const shuffleRemaining = useCallback((locked: Category[]) => {
    const cats: Category[] = ['face', 'tops', 'bottoms', 'shoes']
    const newSel = { ...selection }
    for (const cat of cats) {
      if (!locked.includes(cat)) {
        const count = getItemsByCategory(cat).length
        newSel[cat] = count > 0 ? Math.floor(Math.random() * count) : 0
      }
    }
    setSelection(newSel)
  }, [getItemsByCategory, selection])

  const colorHarmony: Record<string, string[]> = {
    'Black': ['White', 'Grey', 'Navy', 'Charcoal', 'Gold', 'Silver', 'Olive'],
    'White': ['Black', 'Navy', 'Khaki', 'Indigo', 'Charcoal', 'Grey', 'Tan'],
    'Navy': ['White', 'Khaki', 'Grey', 'Tan', 'Charcoal', 'Gold'],
    'Grey': ['Black', 'White', 'Navy', 'Charcoal', 'Olive'],
    'Charcoal': ['White', 'Grey', 'Navy', 'Black', 'Gold', 'Tan'],
    'Khaki': ['Navy', 'White', 'Black', 'Indigo', 'Olive'],
    'Indigo': ['White', 'Khaki', 'Black', 'Tan', 'Grey'],
    'Olive': ['Black', 'White', 'Khaki', 'Grey', 'Tan'],
    'Tan': ['Navy', 'Charcoal', 'White', 'Indigo', 'Black'],
    'Gold': ['Black', 'Navy', 'Charcoal', 'White'],
    'Silver': ['Black', 'White', 'Grey', 'Navy'],
    'Grey/White': ['Black', 'Grey', 'Navy', 'White', 'Charcoal'],
  }

  const getScoreForSelection = useCallback((): OutfitScoreResult => {
    return buildScore(getCurrentIds())
  }, [buildScore, getCurrentIds])

  const occasionMap: Record<Occasion, string[]> = {
    casual: ['casual', 'everyday', 'essential', 'comfort'],
    date: ['date', 'smart-casual', 'formal', 'luxury'],
    gym: ['gym', 'sport'],
    formal: ['formal', 'classic', 'luxury'],
    travel: ['casual', 'comfort', 'essential', 'layering'],
  }

  const getSuggestionsByOccasion = useCallback((occasion: Occasion): OutfitCombo[] => {
    const tags = occasionMap[occasion]
    const matching = items.filter(i => i.tags.some(t => tags.includes(t)))
    const byCat = (cat: Category) => matching.filter(i => i.category === cat)

    const results: OutfitCombo[] = []
    const tops = byCat('tops')
    const bottoms = byCat('bottoms')
    const shoes = byCat('shoes')
    const faces = byCat('face')

    if (tops.length === 0 || bottoms.length === 0 || shoes.length === 0) {
      return []
    }

    for (let i = 0; i < Math.min(3, tops.length); i++) {
      results.push({
        id: `sug-${occasion}-${i}`,
        name: `${occasion.charAt(0).toUpperCase() + occasion.slice(1)} Look ${i + 1}`,
        face: faces[i % Math.max(faces.length, 1)]?.id ?? null,
        tops: tops[i % tops.length].id,
        bottoms: bottoms[i % Math.max(bottoms.length, 1)]?.id ?? bottoms[0]?.id ?? '',
        shoes: shoes[i % Math.max(shoes.length, 1)]?.id ?? shoes[0]?.id ?? '',
        occasion,
        score: Math.floor(75 + Math.random() * 25),
        savedAt: new Date().toISOString().split('T')[0],
        isFavorite: false,
      })
    }
    return results
  }, [items])

  const getUnderusedItems = useCallback((): WardrobeItem[] => {
    return [...items].sort((a, b) => a.addedAt.localeCompare(b.addedAt))
  }, [items])

  const addItem = useCallback((item: WardrobeItem) => {
    setItems(prev => [{ ...item, color: normalizeColorLabel(item.color), subtype: item.subtype || '' }, ...prev])
  }, [])

  const deleteItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }, [])

  const updateItem = useCallback((id: string, updates: Partial<WardrobeItem>) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item
      const next = { ...item, ...updates }
      return { ...next, color: normalizeColorLabel(next.color) }
    }))
  }, [])

  return (
    <WardrobeContext.Provider value={{
      items, savedOutfits, selection, setLayerIndex, getItemsByCategory, getItemById,
      saveOutfit, saveOutfitFromItems, toggleFavorite, deleteOutfit, loadOutfit, shuffleRemaining,
      getScoreForSelection, getScoreForItems: buildScore, getCurrentSelectionIds: getCurrentIds, getSuggestionsByOccasion, getUnderusedItems, addItem, deleteItem, updateItem,
    }}>
      {children}
    </WardrobeContext.Provider>
  )
}

export function useWardrobe() {
  const ctx = useContext(WardrobeContext)
  if (!ctx) throw new Error('useWardrobe must be used within WardrobeProvider')
  return ctx
}
