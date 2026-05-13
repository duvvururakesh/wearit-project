import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { WardrobeItem, OutfitCombo, OutfitSelection, OutfitSelectionIds, Category, Occasion, OutfitScoreResult } from '@/types'
import { mockItems, mockSavedOutfits } from '@/data/mockData'
import { normalizeColorLabel } from '@/lib/colors'
import { loadSavedOutfits, loadWardrobeItems, saveSavedOutfits, saveWardrobeItems } from '@/lib/wardrobeDb'

type WardrobeBackup = {
  version: 1
  exportedAt: string
  items: WardrobeItem[]
  savedOutfits: OutfitCombo[]
}

interface WardrobeCtx {
  items: WardrobeItem[]
  savedOutfits: OutfitCombo[]
  selection: OutfitSelection
  loading: boolean
  setLayerIndex: (cat: Category, idx: number) => void
  getItemsByCategory: (cat: Category) => WardrobeItem[]
  getItemById: (id: string) => WardrobeItem | undefined
  saveOutfit: (name: string, occasion: Occasion | null) => Promise<void>
  saveOutfitFromItems: (name: string, occasion: Occasion | null, ids: OutfitSelectionIds) => Promise<void>
  toggleFavorite: (id: string) => Promise<void>
  toggleItemFavorite: (id: string) => Promise<void>
  deleteOutfit: (id: string) => Promise<void>
  loadOutfit: (outfit: OutfitCombo) => void
  shuffleRemaining: (locked: Category[]) => void
  getScoreForSelection: () => OutfitScoreResult
  getScoreForItems: (ids: OutfitSelectionIds) => OutfitScoreResult
  getCurrentSelectionIds: () => OutfitSelectionIds
  getSuggestionsByOccasion: (occasion: Occasion) => OutfitCombo[]
  getUnderusedItems: () => WardrobeItem[]
  addItem: (item: WardrobeItem) => Promise<void>
  deleteItem: (id: string) => Promise<void>
  updateItem: (id: string, updates: Partial<WardrobeItem>) => Promise<void>
  exportBackup: () => WardrobeBackup
  importBackup: (backup: WardrobeBackup) => Promise<void>
}

const WardrobeContext = createContext<WardrobeCtx | null>(null)

function normalizeItem(item: WardrobeItem): WardrobeItem {
  return {
    ...item,
    color: normalizeColorLabel(item.color),
    subtype: item.subtype || '',
  }
}

export function WardrobeProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WardrobeItem[]>(mockItems.map(normalizeItem))
  const [savedOutfits, setSavedOutfits] = useState<OutfitCombo[]>(mockSavedOutfits)
  const [selection, setSelection] = useState<OutfitSelection>({ face: 0, tops: 0, bottoms: 0, shoes: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    setLoading(true)

    Promise.all([loadWardrobeItems(), loadSavedOutfits()])
      .then(([nextItems, nextOutfits]) => {
        if (cancelled) return
        if (nextItems && nextItems.length > 0) {
          setItems(nextItems.map(normalizeItem))
        }
        if (nextOutfits && nextOutfits.length > 0) {
          setSavedOutfits(nextOutfits)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (loading) return
    void saveWardrobeItems(items)
  }, [items, loading])

  useEffect(() => {
    if (loading) return
    void saveSavedOutfits(savedOutfits)
  }, [loading, savedOutfits])

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
  }, [getItemById])

  const saveOutfitFromItems = useCallback(async (name: string, occasion: Occasion | null, ids: OutfitSelectionIds) => {
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

  const saveOutfit = useCallback(async (name: string, occasion: Occasion | null) => {
    await saveOutfitFromItems(name, occasion, getCurrentIds())
  }, [getCurrentIds, saveOutfitFromItems])

  const toggleFavorite = useCallback(async (id: string) => {
    setSavedOutfits(prev => prev.map(o => o.id === id ? { ...o, isFavorite: !o.isFavorite } : o))
  }, [])

  const toggleItemFavorite = useCallback(async (id: string) => {
    setItems(prev => prev.map((item) => (
      item.id === id ? normalizeItem({ ...item, favoriteItem: !item.favoriteItem }) : item
    )))
  }, [])

  const deleteOutfit = useCallback(async (id: string) => {
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

  const addItem = useCallback(async (item: WardrobeItem) => {
    setItems(prev => [normalizeItem(item), ...prev])
  }, [])

  const deleteItem = useCallback(async (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }, [])

  const updateItem = useCallback(async (id: string, updates: Partial<WardrobeItem>) => {
    const current = items.find((item) => item.id === id)
    if (!current) return
    const updated = normalizeItem({ ...current, ...updates })
    setItems(prev => prev.map(item => item.id !== id ? item : updated))
  }, [items])

  const exportBackup = useCallback((): WardrobeBackup => ({
    version: 1,
    exportedAt: new Date().toISOString(),
    items,
    savedOutfits,
  }), [items, savedOutfits])

  const importBackup = useCallback(async (backup: WardrobeBackup) => {
    const nextItems = Array.isArray(backup.items) ? backup.items.map(normalizeItem) : []
    const nextOutfits = Array.isArray(backup.savedOutfits) ? backup.savedOutfits : []
    setItems(nextItems)
    setSavedOutfits(nextOutfits)
    await saveWardrobeItems(nextItems)
    await saveSavedOutfits(nextOutfits)
  }, [])

  const colorHarmony: Record<string, string[]> = {
    Black: ['White', 'Grey', 'Navy', 'Charcoal', 'Gold', 'Silver', 'Olive'],
    White: ['Black', 'Navy', 'Khaki', 'Indigo', 'Charcoal', 'Grey', 'Tan'],
    Navy: ['White', 'Khaki', 'Grey', 'Tan', 'Charcoal', 'Gold'],
    Grey: ['Black', 'White', 'Navy', 'Charcoal', 'Olive'],
    Charcoal: ['White', 'Grey', 'Navy', 'Black', 'Gold', 'Tan'],
    Khaki: ['Navy', 'White', 'Black', 'Indigo', 'Olive'],
    Indigo: ['White', 'Khaki', 'Black', 'Tan', 'Grey'],
    Olive: ['Black', 'White', 'Khaki', 'Grey', 'Tan'],
    Tan: ['Navy', 'Charcoal', 'White', 'Indigo', 'Black'],
    Gold: ['Black', 'Navy', 'Charcoal', 'White'],
    Silver: ['Black', 'White', 'Grey', 'Navy'],
    'Grey/White': ['Black', 'Grey', 'Navy', 'White', 'Charcoal'],
  }

  const getScoreForSelection = useCallback((): OutfitScoreResult => {
    return buildScore(getCurrentIds())
  }, [buildScore, getCurrentIds])

  return (
    <WardrobeContext.Provider value={{
      items,
      savedOutfits,
      selection,
      loading,
      setLayerIndex,
      getItemsByCategory,
      getItemById,
      saveOutfit,
      saveOutfitFromItems,
      toggleFavorite,
      toggleItemFavorite,
      deleteOutfit,
      loadOutfit,
      shuffleRemaining,
      getScoreForSelection,
      getScoreForItems: buildScore,
      getCurrentSelectionIds: getCurrentIds,
      getSuggestionsByOccasion,
      getUnderusedItems,
      addItem,
      deleteItem,
      updateItem,
      exportBackup,
      importBackup,
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
