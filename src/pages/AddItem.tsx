import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Camera, Sparkles, Upload, X } from 'lucide-react'
import { useWardrobe } from '@/hooks/useWardrobe'
import { extractBasicColors, normalizeColorLabel } from '@/lib/colors'
import {
  ACCESSORY_FUNCTION_OPTIONS,
  addCustomSubcategory,
  BAG_CAPACITY_OPTIONS,
  CONDITION_OPTIONS,
  FIT_OPTIONS,
  GENDER_OPTIONS,
  getDetailTypes,
  getNodeForSelection,
  getRootOptions,
  getSections,
  getSubcategories,
  LENGTH_OPTIONS,
  METAL_TYPE_OPTIONS,
  OCCASION_OPTIONS,
  PATTERN_OPTIONS,
  SEASON_OPTIONS,
  SHOE_CLOSURE_OPTIONS,
  SHOE_USAGE_OPTIONS,
  STATEMENT_OPTIONS,
  STYLE_TAG_OPTIONS,
  WATCH_MOVEMENT_OPTIONS,
} from '@/lib/taxonomy'
import { processImageSource, type ImageProcessingMode } from '@/lib/imageProcessing'
import { generateMannequinImage, mannequinCategoryFromRoot } from '@/lib/mannequinClient'
import ProductImage from '@/components/ProductImage'
import SizeSelector from '@/components/SizeSelector'
import type { Category } from '@/types'

type RootCategory = 'apparel' | 'shoes' | 'accessories'

const STUDIO_3D_PROMPT =
  "Transform this photo into a photorealistic studio shot in the 1:1 aspect ratio, reconstructed as a high-volume 3D form as if worn by a male invisible body, captured from a front perspective. Preserve every original product detail exactly as shown: all colors, patterns, logos, stitching, textures, fabric types, seams, labels, and design elements must remain completely unchanged with nothing added or removed. The fabric is stretched taut across the chest, shoulders, and limbs, showing clear structural tension and smooth, rounded anatomical curves appropriate to the body type. Fine surface wrinkles are reduced but original details are preserved, replaced by a sleek, filled-out appearance with only deep, natural folds at the joints to emphasize the internal natural mass. Maintain the exact same garment version without any alterations to its original design or features. Keep the original fabric texture and detail in high fidelity. The item is isolated against a seamless white studio background with soft global illumination that highlights the smooth, volumetric surfaces and casts a soft contact shadow beneath."

const mergeOptions = (...groups: (string | undefined)[][]) =>
  Array.from(
    new Set(
      groups
        .flat()
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort((a, b) => a.localeCompare(b))

const BASIC_COLOR_OPTIONS = [
  'Black',
  'White',
  'Grey',
  'Red',
  'Blue',
  'Green',
  'Yellow',
  'Purple',
  'Orange',
  'Pink',
  'Multi',
] as const

const COLOR_SWATCH_MAP: Record<(typeof BASIC_COLOR_OPTIONS)[number], string> = {
  Black: '#0a0a0a',
  White: '#ffffff',
  Grey: '#9ca3af',
  Red: '#ef4444',
  Blue: '#2563eb',
  Green: '#22c55e',
  Yellow: '#facc15',
  Purple: '#a855f7',
  Orange: '#f97316',
  Pink: '#ec4899',
  Multi: 'linear-gradient(135deg, #c63b3b 0%, #f08a24 22%, #d8b11e 42%, #4b8b4f 62%, #3d63c9 80%, #7b57c8 100%)',
}

function rootFromCategory(category: Category): RootCategory {
  if (category === 'shoes') return 'shoes'
  if (category === 'face') return 'accessories'
  return 'apparel'
}

function fallbackCategoryFromRoot(root: RootCategory): Category {
  if (root === 'shoes') return 'shoes'
  if (root === 'accessories') return 'face'
  return 'tops'
}

function defaultPath(root: RootCategory) {
  const section = getSections(root)[0] ?? ''
  const subcategory = getSubcategories(root, section)[0] ?? ''
  const detailType = getDetailTypes(root, section, subcategory)[0] ?? ''
  return { section, subcategory, detailType }
}

function normalizeSingleColor(value: string) {
  return extractBasicColors(value)[0] ?? 'Multi'
}

function getImageProcessingMode(root: RootCategory, section: string): ImageProcessingMode {
  if (root === 'apparel') {
    if (section === 'Bottoms') return 'bottoms'
    return section === 'Outerwear' ? 'jacket' : 'apparel'
  }
  return 'strict'
}

function SingleSelectCards({
  title,
  options,
  selected,
  onSelect,
  error,
  customValue,
  setCustomValue,
  onAddCustom,
  allowAdd = false,
  hideLabel = false,
}: {
  title: string
  options: readonly string[] | string[]
  selected: string
  onSelect: (value: string) => void
  error?: string
  customValue?: string
  setCustomValue?: (value: string) => void
  onAddCustom?: (value: string) => void
  allowAdd?: boolean
  hideLabel?: boolean
}) {
  return (
    <div className="field-stack">
      {!hideLabel && <label className="type-label text-light-secondary">{title}</label>}
      <div className="option-grid mt-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            className={`type-button-sm option-card-light ${selected === option ? 'is-selected' : ''}`}
          >
            {option}
          </button>
        ))}
        {allowAdd && setCustomValue && onAddCustom && (
          customValue && customValue !== '' ? (
            <input
              autoFocus
              value={customValue === ' ' ? '' : customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const next = (customValue === ' ' ? '' : customValue).trim()
                  if (!next) return
                  onAddCustom(next)
                }
              }}
              onBlur={() => {
                const next = (customValue === ' ' ? '' : customValue).trim()
                if (!next) {
                  setCustomValue('')
                  return
                }
                onAddCustom(next)
              }}
              className="type-button-sm field-input-light option-card-add-input"
              placeholder="+"
            />
          ) : (
            <button
              type="button"
              onClick={() => setCustomValue(' ')}
              className="type-button-sm option-card-light option-card-add"
            >
              +
            </button>
          )
        )}
      </div>
      {error && <p className="field-error-text">{error}</p>}
    </div>
  )
}

function MultiSelectCards({
  title,
  options,
  selected,
  onToggle,
  hideLabel = false,
}: {
  title: string
  options: readonly string[] | string[]
  selected: string[]
  onToggle: (value: string) => void
  hideLabel?: boolean
}) {
  return (
    <div className="field-stack">
      {!hideLabel && <label className="type-label text-light-secondary">{title}</label>}
      <div className="option-grid mt-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onToggle(option)}
            className={`type-button-sm option-card-light ${selected.includes(option) ? 'is-selected' : ''}`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

function ColorSwatchCards({
  title,
  selected,
  onSelect,
  error,
}: {
  title: string
  selected: string
  onSelect: (value: string) => void
  error?: string
}) {
  return (
    <div className="field-stack">
      <label className="type-label text-light-secondary">{title}</label>
      <div className="mt-2 flex flex-wrap gap-2">
        {BASIC_COLOR_OPTIONS.map((option) => {
          const isSelected = normalizeColorLabel(selected) === option
          const background = COLOR_SWATCH_MAP[option]
          return (
            <button
              key={option}
              type="button"
              onClick={() => onSelect(option)}
              aria-label={option}
              className={`type-button-sm flex h-[44px] w-[44px] items-center justify-center border p-0 ${
                isSelected ? 'border-text-dark shadow-[0_0_0_1px_rgba(21,21,21,0.12)]' : 'border-light hover:border-light-strong'
              }`}
              style={{ background }}
            >
              {option === 'White' ? <div className="h-full w-full border border-black/10" /> : null}
            </button>
          )
        })}
      </div>
      {error && <p className="field-error-text">{error}</p>}
    </div>
  )
}

function FieldSection({
  children,
}: {
  children: ReactNode
}) {
  return (
    <section className="field-section">
      <div className="field-section-body">{children}</div>
    </section>
  )
}

export default function AddItem() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const { addItem, items } = useWardrobe()
  const fileRef = useRef<HTMLInputElement>(null)
  const moreFileRef = useRef<HTMLInputElement>(null)

  const initialRoot = rootFromCategory(((params.get('category') as Category) || 'tops'))
  const initialPath = defaultPath(initialRoot)

  const [root, setRoot] = useState<RootCategory>(initialRoot)
  const [section, setSection] = useState(initialPath.section)
  const [subcategory, setSubcategory] = useState(initialPath.subcategory)
  const [detailType, setDetailType] = useState(initialPath.detailType)

  const [preview, setPreview] = useState<string | null>(null)
  const [extraPreviews, setExtraPreviews] = useState<string[]>([])
  const [processing, setProcessing] = useState(false)
  const [useStudio3DPrompt, setUseStudio3DPrompt] = useState(true)

  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [gender, setGender] = useState<string>('Men')
  const [price, setPrice] = useState('')
  const [size, setSize] = useState('')
  const [material, setMaterial] = useState('')
  const [purchaseYear, setPurchaseYear] = useState('')
  const [addedAt, setAddedAt] = useState(() => new Date().toISOString().split('T')[0])

  const [primaryColor, setPrimaryColor] = useState('')
  const [pattern, setPattern] = useState('')
  const [fit, setFit] = useState('')
  const [length, setLength] = useState('')
  const [season, setSeason] = useState<string[]>([])
  const [occasionTags, setOccasionTags] = useState<string[]>([])
  const [styleTags, setStyleTags] = useState<string[]>([])
  const [favoriteItem, setFavoriteItem] = useState(false)

  const [closure, setClosure] = useState('')
  const [usageType, setUsageType] = useState('')
  const [condition, setCondition] = useState('')

  const [statementLevel, setStatementLevel] = useState('')
  const [movement, setMovement] = useState('')
  const [bagCapacity, setBagCapacity] = useState('')
  const [metalType, setMetalType] = useState('')

  const [customBrand, setCustomBrand] = useState('')
  const [customSubcategory, setCustomSubcategory] = useState('')
  const [customMaterial, setCustomMaterial] = useState('')
  const [customStyleTag, setCustomStyleTag] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const node = getNodeForSelection(root, section, subcategory)
  const resolvedCategory: Category = node?.category ?? fallbackCategoryFromRoot(root)

  useEffect(() => {
    const nextSection = getSections(root)[0] ?? ''
    const nextSubcategory = getSubcategories(root, nextSection)[0] ?? ''
    const nextDetailType = getDetailTypes(root, nextSection, nextSubcategory)[0] ?? ''
    setSection(nextSection)
    setSubcategory(nextSubcategory)
    setDetailType(nextDetailType)
    setSize('')
    setCustomSubcategory('')
  }, [root])

  useEffect(() => {
    const nextSubcategory = getSubcategories(root, section)[0] ?? ''
    const nextDetailType = getDetailTypes(root, section, nextSubcategory)[0] ?? ''
    setSubcategory(nextSubcategory)
    setDetailType(nextDetailType)
    setSize('')
    setCustomSubcategory('')
  }, [root, section])

  useEffect(() => {
    const nextDetailType = getDetailTypes(root, section, subcategory)[0] ?? ''
    setDetailType(nextDetailType)
    setSize('')
  }, [root, section, subcategory])

  const brandOptions = useMemo(() => mergeOptions(items.map((entry) => entry.brand), [brand]), [brand, items])
  const materialOptions = useMemo(() => mergeOptions(items.map((entry) => entry.material), [material]), [items, material])

  const readFile = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve((e.target?.result as string) ?? '')
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })

  const clearError = (key: string) => {
    setErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  const handleFileBatch = async (files: FileList | File[], mode: 'initial' | 'append') => {
    const list = Array.from(files)
    if (list.length === 0) return
    setProcessing(true)
    const processingMode = getImageProcessingMode(root, section)
    const mannequinCategory = mannequinCategoryFromRoot(root, section)
    const fallbackPrompt = detailType || subcategory || name.trim() || undefined
    const mannequinPrompt = useStudio3DPrompt ? STUDIO_3D_PROMPT : fallbackPrompt
    const loaded = (await Promise.all(
      list.map(async (file) => {
        const raw = await readFile(file)
        if (!raw) return ''
        if (mannequinCategory) {
          try {
            return await generateMannequinImage({
              category: mannequinCategory,
              imageDataUrl: raw,
              prompt: mannequinPrompt,
            })
          } catch {
            // If backend is unavailable or generation fails, keep existing local processing behavior.
          }
        }
        try {
          return await processImageSource(raw, processingMode)
        } catch {
          return raw
        }
      }),
    )).filter(Boolean)
    setProcessing(false)
    if (loaded.length === 0) return

    if (mode === 'initial') {
      setPreview(loaded[0])
      setExtraPreviews(loaded.slice(1))
      clearError('preview')
      return
    }

    setExtraPreviews((current) => [...current, ...loaded])
  }

  const moveExtraPreview = (index: number, direction: -1 | 1) => {
    setExtraPreviews((current) => {
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= current.length) return current
      const next = [...current]
      ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
      return next
    })
  }

  const removeExtraPreview = (index: number) => {
    setExtraPreviews((current) => current.filter((_, currentIndex) => currentIndex !== index))
  }

  const toggleMultiValue = (values: string[], setter: (value: string[]) => void, value: string) => {
    setter(values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value])
  }

  const normalizedPrimary = normalizeSingleColor(primaryColor || 'Multi')
  const handleSave = async () => {
    const nextErrors: Record<string, string> = {}
    if (!preview) nextErrors.preview = 'Add a primary photo.'
    if (!name.trim()) nextErrors.name = 'Name is required.'
    if (!brand.trim()) nextErrors.brand = 'Brand is required.'
    if (!section.trim()) nextErrors.section = 'Section is required.'
    if (!subcategory.trim()) nextErrors.subcategory = 'Subcategory is required.'
    if (!detailType.trim()) nextErrors.detailType = 'Type is required.'
    if (!primaryColor.trim()) nextErrors.primaryColor = 'Primary color is required.'

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    const finalName = name.trim()
    const finalStyleTags = styleTags

    await addItem({
      id: `custom-${Date.now()}`,
      name: finalName,
      brand: brand.trim(),
      category: resolvedCategory,
      section,
      subcategory,
      detailType,
      subtype: subcategory,
      gender,
      size: size.trim() || 'One Size',
      material: material.trim() || 'Mixed',
      image: preview ?? '',
      images: extraPreviews,
      price: Number(price.replace(/[^\d.]/g, '')) || 0,
      addedAt,
      color: normalizedPrimary,
      primaryColor: normalizedPrimary,
      pattern: pattern || undefined,
      fit: root === 'apparel' ? fit || undefined : undefined,
      length: root === 'apparel' ? length || undefined : undefined,
      season: root === 'apparel' ? season : undefined,
      occasionTags,
      styleTags: finalStyleTags,
      favoriteItem,
      shoeCategory: root === 'shoes' ? subcategory : undefined,
      closure: root === 'shoes' ? closure || undefined : undefined,
      usageType: root === 'shoes' ? usageType || undefined : undefined,
      condition: root === 'shoes' ? condition || undefined : undefined,
      accessoryType: root === 'accessories' ? subcategory : undefined,
      statementLevel: root === 'accessories' ? statementLevel || undefined : undefined,
      movement: root === 'accessories' && subcategory === 'Watches' ? movement || undefined : undefined,
      bagCapacity: root === 'accessories' && subcategory === 'Bags' ? bagCapacity || undefined : undefined,
      metalType: root === 'accessories' && subcategory === 'Jewelry' ? metalType || undefined : undefined,
      purchaseYear: purchaseYear.trim() || undefined,
      tags: finalStyleTags.map((tag) => tag.toLowerCase()),
    })
    nav('/closet')
  }

  return (
    <div className="page-shell-workstation app-viewport app-viewport-lock add-item-shell">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        multiple
        onChange={(e) => {
          if (e.target.files) void handleFileBatch(e.target.files, 'initial')
          e.target.value = ''
        }}
      />
      <input
        ref={moreFileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void handleFileBatch(e.target.files, 'append')
          e.target.value = ''
        }}
      />

      <div className="add-item-content h-full min-h-0 overflow-hidden">
        <div className="add-item-grid grid h-full min-h-0 lg:grid-cols-[minmax(0,1fr)_390px]">
          <section className="add-item-left-column min-h-0 border-b border-light-soft lg:border-b-0 lg:border-r lg:border-light-soft">
            <div className="page-frame add-item-breadcrumb-row">
              <button onClick={() => nav('/')} className="type-button-sm button-ghost text-light-secondary">
                Home
              </button>
              <span className="type-caption text-light-muted">/</span>
              <button onClick={() => nav('/add')} className="type-button-sm button-ghost text-light-secondary">
                Add Item
              </button>
            </div>

            <div className="add-item-media-column min-h-0">
              <div className="add-item-media-stage relative flex min-h-0 flex-1 items-center justify-center">
                <div className="add-item-media-canvas media-canvas media-canvas-dark relative h-full w-full max-w-[400px] radius-xl border border-border bg-surface">
                {preview ? (
                  <ProductImage
                    src={preview}
                    alt=""
                    className={root === 'shoes' ? '' : 'h-full w-full object-contain'}
                    mode={getImageProcessingMode(root, section)}
                    fit={root === 'shoes' ? 'shoe' : 'default'}
                  />
                ) : (
                  <button type="button" onClick={() => fileRef.current?.click()} className="flex h-full w-full flex-col items-center justify-center gap-4 text-center">
                    <div className="radius-full flex h-16 w-16 items-center justify-center bg-bg">
                      <Camera size={24} className="text-text-muted" />
                    </div>
                    <div>
                      <p className="type-h4 text-text-primary">Tap to upload photo</p>
                      <p className="type-caption mt-1 text-text-muted">JPG, PNG</p>
                    </div>
                  </button>
                )}

                {processing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg/70">
                    <Sparkles size={24} className="text-gold" />
                    <p className="type-button-sm mt-3 text-text-primary">Processing</p>
                    <p className="type-caption mt-1 text-text-muted">Preparing item for closet view</p>
                  </div>
                )}

                {preview && (
                  <button type="button" onClick={() => { setPreview(null); setExtraPreviews([]) }} className="button-icon absolute right-3 top-3 radius-full bg-bg/80">
                    <X size={14} className="text-text-primary" />
                  </button>
                )}
                </div>
              </div>

              <div className="add-item-media-band border-t border-light-soft px-6 py-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="type-label text-light-secondary">Views</p>
                    {errors.preview && <p className="field-error-text mt-1">{errors.preview}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => fileRef.current?.click()} className="type-button-sm button-secondary">
                      <Upload size={14} />
                      {preview ? 'Replace' : 'Choose Photo'}
                    </button>
                    <button type="button" onClick={() => moreFileRef.current?.click()} className="type-button-sm button-secondary" disabled={!preview}>
                      Add More
                    </button>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="type-caption text-light-secondary">Make it 3D?</p>
                  <button
                    type="button"
                    onClick={() => setUseStudio3DPrompt((current) => !current)}
                    className={`type-button-sm option-card-light ${useStudio3DPrompt ? 'is-selected' : ''}`}
                    aria-pressed={useStudio3DPrompt}
                  >
                    {useStudio3DPrompt ? 'On' : 'Off'}
                  </button>
                </div>

                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {preview && (
                    <div className="media-thumb radius-md border border-light bg-card">
                      <ProductImage src={preview} alt="" className={root === 'shoes' ? '' : 'h-full w-full object-contain'} mode={getImageProcessingMode(root, section)} fit={root === 'shoes' ? 'shoe' : 'default'} />
                    </div>
                  )}
                  {extraPreviews.map((image, index) => (
                    <div key={`${image}-${index}`} className="space-y-1.5">
                      <div className="media-thumb radius-md border border-light bg-card">
                        <ProductImage src={image} alt="" className={root === 'shoes' ? '' : 'h-full w-full object-contain'} mode={getImageProcessingMode(root, section)} fit={root === 'shoes' ? 'shoe' : 'default'} />
                      </div>
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => moveExtraPreview(index, -1)} className="type-button-sm button-light flex-1">Up</button>
                        <button type="button" onClick={() => moveExtraPreview(index, 1)} className="type-button-sm button-light flex-1">Down</button>
                      </div>
                      <button type="button" onClick={() => removeExtraPreview(index)} className="type-button-sm button-danger w-full">Delete</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <aside className="add-item-detail-drawer min-h-0 bg-card">
            <div className="drawer-header add-item-drawer-header">
              <h2 className="type-h4 text-text-dark">Details</h2>
              <button onClick={handleSave} className="type-button-sm button-primary">
                Save
              </button>
            </div>

            <div className="drawer-body add-item-form min-h-0 flex-1 overflow-y-auto">
              <FieldSection>
                <SingleSelectCards
                  title="Category"
                  options={getRootOptions().map((entry) => entry.label)}
                  selected={getRootOptions().find((entry) => entry.key === root)?.label ?? 'Apparel'}
                  onSelect={(value) => {
                    const next = getRootOptions().find((entry) => entry.label === value)?.key ?? 'apparel'
                    setRoot(next)
                  }}
                />
                <SingleSelectCards
                  title="Section"
                  options={getSections(root)}
                  selected={section}
                  onSelect={(value) => {
                    setSection(value)
                    clearError('section')
                  }}
                  error={errors.section}
                />
                <SingleSelectCards
                  title="Subcategory"
                  options={getSubcategories(root, section)}
                  selected={subcategory}
                  onSelect={(value) => {
                    setSubcategory(value)
                    clearError('subcategory')
                  }}
                  error={errors.subcategory}
                  allowAdd
                  customValue={customSubcategory}
                  setCustomValue={setCustomSubcategory}
                  onAddCustom={(value) => {
                    addCustomSubcategory(root, section, value)
                    setSubcategory(value)
                    setCustomSubcategory('')
                    clearError('subcategory')
                  }}
                />
                <SingleSelectCards
                  title="Type"
                  options={getDetailTypes(root, section, subcategory)}
                  selected={detailType}
                  onSelect={(value) => {
                    setDetailType(value)
                    clearError('detailType')
                  }}
                  error={errors.detailType}
                />
              </FieldSection>

              <FieldSection>
                <div className="field-stack">
                  <label className="type-label text-light-secondary">Name</label>
                  <input
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      clearError('name')
                    }}
                    placeholder="Item name"
                    className={`type-body-md field-input-light ${errors.name ? 'is-error' : ''}`}
                  />
                  {errors.name && <p className="field-error-text">{errors.name}</p>}
                </div>

                <SingleSelectCards
                  title="Brand"
                  options={brandOptions}
                  selected={brand}
                  onSelect={(value) => { setBrand(value); clearError('brand') }}
                  error={errors.brand}
                  allowAdd
                  customValue={customBrand}
                  setCustomValue={setCustomBrand}
                  onAddCustom={(value) => {
                    setBrand(value)
                    setCustomBrand('')
                    clearError('brand')
                  }}
                />

                <div className="field-row-2">
                  <div className="field-inline-item">
                    <p className="field-inline-label type-caption text-light-muted">Gender</p>
                    <SingleSelectCards title="Gender" options={GENDER_OPTIONS} selected={gender} onSelect={setGender} hideLabel />
                  </div>
                  <div className="field-inline-item">
                    <p className="field-inline-label type-caption text-light-muted">Size</p>
                    <SizeSelector category={resolvedCategory} subtype={subcategory} size={size} onChange={setSize} hideLabel />
                  </div>
                </div>
              </FieldSection>

              <FieldSection>
                <ColorSwatchCards
                  title="Primary Color"
                  selected={normalizeColorLabel(primaryColor)}
                  onSelect={(value) => { setPrimaryColor(value); clearError('primaryColor') }}
                  error={errors.primaryColor}
                />

                <SingleSelectCards
                  title="Pattern"
                  options={PATTERN_OPTIONS}
                  selected={pattern}
                  onSelect={setPattern}
                />

                <SingleSelectCards
                  title="Material"
                  options={materialOptions}
                  selected={material}
                  onSelect={setMaterial}
                  allowAdd
                  customValue={customMaterial}
                  setCustomValue={setCustomMaterial}
                  onAddCustom={(value) => {
                    setMaterial(value)
                    setCustomMaterial('')
                  }}
                />
              </FieldSection>

              <FieldSection>
                {root === 'apparel' && (
                  <>
                    <div className="field-row-2">
                      <div className="field-inline-item">
                        <p className="field-inline-label type-caption text-light-muted">Fit</p>
                        <SingleSelectCards title="Fit" options={FIT_OPTIONS} selected={fit} onSelect={setFit} hideLabel />
                      </div>
                      <div className="field-inline-item">
                        <p className="field-inline-label type-caption text-light-muted">Length</p>
                        <SingleSelectCards title="Length" options={LENGTH_OPTIONS} selected={length} onSelect={setLength} hideLabel />
                      </div>
                    </div>
                    <div className="field-inline-item">
                      <p className="field-inline-label type-caption text-light-muted">Season</p>
                      <MultiSelectCards title="Season" options={SEASON_OPTIONS} selected={season} onToggle={(value) => toggleMultiValue(season, setSeason, value)} hideLabel />
                    </div>
                  </>
                )}

                <MultiSelectCards
                  title="Occasion"
                  options={root === 'accessories' ? ACCESSORY_FUNCTION_OPTIONS : OCCASION_OPTIONS}
                  selected={occasionTags}
                  onToggle={(value) => toggleMultiValue(occasionTags, setOccasionTags, value)}
                />

                <MultiSelectCards title="Style Tags" options={STYLE_TAG_OPTIONS} selected={styleTags} onToggle={(value) => toggleMultiValue(styleTags, setStyleTags, value)} />
                <div className="field-stack">
                  <div className="option-card-add-row mt-2">
                    {customStyleTag !== '' ? (
                      <input
                        autoFocus
                        value={customStyleTag === ' ' ? '' : customStyleTag}
                        onChange={(e) => setCustomStyleTag(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const next = (customStyleTag === ' ' ? '' : customStyleTag).trim()
                            if (!next) return
                            if (!styleTags.includes(next)) setStyleTags((current) => [...current, next])
                            setCustomStyleTag('')
                          }
                        }}
                        onBlur={() => {
                          const next = (customStyleTag === ' ' ? '' : customStyleTag).trim()
                          if (!next) {
                            setCustomStyleTag('')
                            return
                          }
                          if (!styleTags.includes(next)) setStyleTags((current) => [...current, next])
                          setCustomStyleTag('')
                        }}
                        className="type-button-sm field-input-light option-card-add-input"
                        placeholder="+"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCustomStyleTag(' ')}
                        className="type-button-sm option-card-light option-card-add"
                      >
                        +
                      </button>
                    )}
                  </div>
                </div>
              </FieldSection>

              {root !== 'apparel' && (
                <FieldSection>
                  {root === 'shoes' && (
                    <>
                      <SingleSelectCards title="Closure" options={SHOE_CLOSURE_OPTIONS} selected={closure} onSelect={setClosure} />
                      <SingleSelectCards title="Usage Type" options={SHOE_USAGE_OPTIONS} selected={usageType} onSelect={setUsageType} />
                      <SingleSelectCards title="Condition" options={CONDITION_OPTIONS} selected={condition} onSelect={setCondition} />
                    </>
                  )}

                  {root === 'accessories' && (
                    <>
                      <SingleSelectCards title="Statement" options={STATEMENT_OPTIONS} selected={statementLevel} onSelect={setStatementLevel} />
                      {subcategory === 'Watches' && <SingleSelectCards title="Movement" options={WATCH_MOVEMENT_OPTIONS} selected={movement} onSelect={setMovement} />}
                      {subcategory === 'Bags' && <SingleSelectCards title="Capacity" options={BAG_CAPACITY_OPTIONS} selected={bagCapacity} onSelect={setBagCapacity} />}
                      {subcategory === 'Jewelry' && <SingleSelectCards title="Metal Type" options={METAL_TYPE_OPTIONS} selected={metalType} onSelect={setMetalType} />}
                    </>
                  )}
                </FieldSection>
              )}

              <FieldSection>
                <div className="field-inline-item">
                  <p className="field-inline-label type-caption text-light-muted">Favorite</p>
                  <SingleSelectCards title="Favorite" options={['No', 'Yes']} selected={favoriteItem ? 'Yes' : 'No'} onSelect={(value) => setFavoriteItem(value === 'Yes')} hideLabel />
                </div>

                <div className="field-row-2">
                  <div className="field-stack">
                    <label className="type-label text-light-secondary">Price</label>
                    <input value={price} inputMode="decimal" onChange={(e) => setPrice(e.target.value)} className="type-body-md field-input-light" placeholder="$ Optional" />
                  </div>

                  <div className="field-stack">
                    <label className="type-label text-light-secondary">Purchase Year</label>
                    <input
                      value={purchaseYear}
                      type="number"
                      min="1900"
                      max="2100"
                      step="1"
                      onChange={(e) => setPurchaseYear(e.target.value.replace(/[^\d]/g, '').slice(0, 4))}
                      className="type-body-md field-input-light"
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div className="field-stack">
                  <label className="type-label text-light-secondary">Added Date</label>
                  <p className="type-caption text-light-muted">Auto-filled for new items. Change only when backfilling older pieces.</p>
                  <input value={addedAt} type="date" onChange={(e) => setAddedAt(e.target.value)} className="type-body-md field-input-light" />
                </div>
              </FieldSection>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
