export type Category = 'face' | 'tops' | 'bottoms' | 'shoes'

export type Occasion = 'casual' | 'date' | 'gym' | 'formal' | 'travel'

export interface WardrobeItem {
  id: string
  name: string
  category: Category
  brand: string
  color: string
  subtype: string
  gender: string
  size: string
  material: string
  image: string
  images: string[]
  price: number
  addedAt: string
  tags: string[]
  section?: string
  subcategory?: string
  detailType?: string
  modelName?: string
  primaryColor?: string
  secondaryColor?: string
  pattern?: string
  fit?: string
  length?: string
  season?: string[]
  occasionTags?: string[]
  layerRole?: string
  styleTags?: string[]
  versatilityScore?: number | null
  favoriteItem?: boolean
  shoeCategory?: string
  closure?: string
  comfortRating?: number | null
  usageType?: string
  condition?: string
  wornCount?: number | null
  accessoryType?: string
  statementLevel?: string
  movement?: string
  bagCapacity?: string
  metalType?: string
  purchaseYear?: string
}

export interface OutfitCombo {
  id: string
  name: string
  face: string | null
  tops: string
  bottoms: string
  shoes: string
  occasion: Occasion | null
  score: number | null
  savedAt: string
  isFavorite: boolean
}

export interface OutfitSelection {
  face: number
  tops: number
  bottoms: number
  shoes: number
}

export interface OutfitSelectionIds {
  face: string | null
  tops: string | null
  bottoms: string | null
  shoes: string | null
}

export interface OutfitScoreResult {
  score: number
  label: string
  tip: string
}
