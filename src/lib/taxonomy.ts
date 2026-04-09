import type { Category } from '@/types'

type TreeNode = {
  section: string
  subcategory: string
  detailTypes: string[]
  category: Category
}

export const CLOSET_TREE: Record<'apparel' | 'shoes' | 'accessories', TreeNode[]> = {
  apparel: [
    { section: 'Tops', subcategory: 'T-Shirts', detailTypes: ['Basic Tee', 'Graphic Tee', 'Long Sleeve'], category: 'tops' },
    { section: 'Tops', subcategory: 'Shirts', detailTypes: ['Casual Shirt', 'Formal Shirt', 'Flannel'], category: 'tops' },
    { section: 'Tops', subcategory: 'Hoodies & Sweatshirts', detailTypes: ['Hoodie', 'Sweatshirt'], category: 'tops' },
    { section: 'Tops', subcategory: 'Knitwear', detailTypes: ['Sweaters', 'Cardigans'], category: 'tops' },
    { section: 'Bottoms', subcategory: 'Jeans', detailTypes: ['Skinny', 'Slim', 'Straight', 'Baggy'], category: 'bottoms' },
    { section: 'Bottoms', subcategory: 'Trousers', detailTypes: ['Formal', 'Casual'], category: 'bottoms' },
    { section: 'Bottoms', subcategory: 'Shorts', detailTypes: ['Shorts'], category: 'bottoms' },
    { section: 'Bottoms', subcategory: 'Joggers / Sweatpants', detailTypes: ['Joggers', 'Sweatpants'], category: 'bottoms' },
    { section: 'Outerwear', subcategory: 'Jackets', detailTypes: ['Denim', 'Leather', 'Bomber', 'Puffer'], category: 'tops' },
    { section: 'Outerwear', subcategory: 'Coats', detailTypes: ['Trench', 'Overcoat'], category: 'tops' },
    { section: 'Outerwear', subcategory: 'Blazers', detailTypes: ['Blazer'], category: 'tops' },
    { section: 'Full Body', subcategory: 'Suits', detailTypes: ['Suit'], category: 'tops' },
    { section: 'Full Body', subcategory: 'Sets / Co-ords', detailTypes: ['Set', 'Co-ord'], category: 'tops' },
    { section: 'Full Body', subcategory: 'Dresses', detailTypes: ['Dress'], category: 'tops' },
  ],
  shoes: [
    { section: 'Shoes', subcategory: 'Sneakers', detailTypes: ['Lifestyle', 'Sports', 'High-top', 'Low-top'], category: 'shoes' },
    { section: 'Shoes', subcategory: 'Boots', detailTypes: ['Chelsea', 'Combat', 'Work Boots'], category: 'shoes' },
    { section: 'Shoes', subcategory: 'Formal Shoes', detailTypes: ['Oxford', 'Derby', 'Loafers'], category: 'shoes' },
    { section: 'Shoes', subcategory: 'Casual', detailTypes: ['Slides', 'Sandals', 'Slip-ons'], category: 'shoes' },
  ],
  accessories: [
    { section: 'Accessories', subcategory: 'Watches', detailTypes: ['Analog', 'Digital', 'Smartwatch'], category: 'face' },
    { section: 'Accessories', subcategory: 'Bags', detailTypes: ['Backpack', 'Tote', 'Crossbody', 'Travel'], category: 'face' },
    { section: 'Accessories', subcategory: 'Jewelry', detailTypes: ['Rings', 'Necklaces', 'Bracelets', 'Earrings'], category: 'face' },
    { section: 'Accessories', subcategory: 'Belts', detailTypes: ['Belts'], category: 'face' },
    { section: 'Accessories', subcategory: 'Hats & Caps', detailTypes: ['Caps', 'Beanies', 'Hats'], category: 'face' },
    { section: 'Accessories', subcategory: 'Sunglasses', detailTypes: ['Sunglasses'], category: 'face' },
    { section: 'Accessories', subcategory: 'Scarves', detailTypes: ['Scarves'], category: 'face' },
  ],
}

export const CATEGORY_SUBTYPES: Record<Category, string[]> = {
  shoes: ['Sneakers', 'Boots', 'Formal Shoes', 'Casual'],
  tops: ['T-Shirts', 'Shirts', 'Hoodies & Sweatshirts', 'Knitwear', 'Jackets', 'Coats', 'Blazers', 'Suits', 'Sets / Co-ords', 'Dresses'],
  bottoms: ['Jeans', 'Trousers', 'Shorts', 'Joggers / Sweatpants'],
  face: ['Watches', 'Bags', 'Jewelry', 'Belts', 'Hats & Caps', 'Sunglasses', 'Scarves'],
}

export const CATEGORY_TAGS: Record<Category, string[]> = {
  shoes: ['Streetwear', 'Sport', 'Classic', 'Daily', 'Occasion'],
  tops: ['Layering', 'Formal', 'Casual', 'Statement', 'Minimal', 'Oversized'],
  bottoms: ['Relaxed', 'Slim', 'Wide', 'Essential', 'Tailored'],
  face: ['Minimal', 'Statement', 'Daily', 'Formal', 'Travel'],
}

export const GENDER_OPTIONS = ['Men', 'Women', 'Unisex'] as const
export const PATTERN_OPTIONS = ['Solid', 'Graphic', 'Striped', 'Plaid', 'Checkered', 'Printed', 'Washed'] as const
export const FIT_OPTIONS = ['Slim', 'Regular', 'Oversized'] as const
export const LENGTH_OPTIONS = ['Cropped', 'Regular', 'Long'] as const
export const SEASON_OPTIONS = ['Spring', 'Summer', 'Fall', 'Winter'] as const
export const OCCASION_OPTIONS = ['Casual', 'Formal', 'Gym', 'Travel', 'Date', 'Daily'] as const
export const LAYER_ROLE_OPTIONS = ['Base', 'Mid', 'Outer'] as const
export const STYLE_TAG_OPTIONS = ['Minimal', 'Streetwear', 'Classic', 'Sport', 'Tailored', 'Statement', 'Vintage', 'Luxury'] as const
export const SHOE_CLOSURE_OPTIONS = ['Lace', 'Slip-on', 'Zip'] as const
export const SHOE_USAGE_OPTIONS = ['Daily', 'Sport', 'Occasion'] as const
export const CONDITION_OPTIONS = ['New', 'Excellent', 'Good', 'Worn'] as const
export const ACCESSORY_FUNCTION_OPTIONS = ['Casual', 'Formal'] as const
export const STATEMENT_OPTIONS = ['Statement', 'Minimal'] as const
export const WATCH_MOVEMENT_OPTIONS = ['Quartz', 'Automatic'] as const
export const BAG_CAPACITY_OPTIONS = ['Small', 'Medium', 'Large', 'Travel'] as const
export const METAL_TYPE_OPTIONS = ['Gold', 'Silver', 'Steel', 'Titanium', 'Mixed'] as const

export const ALL_SUBTYPES = Object.values(CATEGORY_SUBTYPES).flat()

export const SUBTYPE_TO_CATEGORY: Record<string, Category> = Object.entries(CATEGORY_SUBTYPES)
  .flatMap(([category, values]) => values.map((value) => [value, category as Category] as const))
  .reduce<Record<string, Category>>((acc, [value, category]) => {
    acc[value] = category
    return acc
  }, {})

export const DETAIL_TYPE_TO_NODE = Object.values(CLOSET_TREE)
  .flat()
  .flatMap((node) => node.detailTypes.map((detailType) => [detailType, node] as const))
  .reduce<Record<string, TreeNode>>((acc, [detailType, node]) => {
    acc[detailType] = node
    return acc
  }, {})

export const SUBCATEGORY_TO_NODE = Object.values(CLOSET_TREE)
  .flat()
  .reduce<Record<string, TreeNode>>((acc, node) => {
    acc[node.subcategory] = node
    return acc
  }, {})

export function getRootOptions() {
  return [
    { key: 'apparel', label: 'Apparel' },
    { key: 'shoes', label: 'Shoes' },
    { key: 'accessories', label: 'Accessories' },
  ] as const
}

export function getSections(root: 'apparel' | 'shoes' | 'accessories') {
  return Array.from(new Set(CLOSET_TREE[root].map((node) => node.section)))
}

export function getSubcategories(root: 'apparel' | 'shoes' | 'accessories', section: string) {
  return Array.from(
    new Set(
      CLOSET_TREE[root]
        .filter((node) => node.section === section)
        .map((node) => node.subcategory),
    ),
  )
}

export function getDetailTypes(root: 'apparel' | 'shoes' | 'accessories', section: string, subcategory: string) {
  return CLOSET_TREE[root].find((node) => node.section === section && node.subcategory === subcategory)?.detailTypes ?? []
}

export function getNodeForSelection(root: 'apparel' | 'shoes' | 'accessories', section: string, subcategory: string) {
  return CLOSET_TREE[root].find((node) => node.section === section && node.subcategory === subcategory) ?? null
}
