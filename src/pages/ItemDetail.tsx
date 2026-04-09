import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useWardrobe } from '@/hooks/useWardrobe'
import { normalizeColorLabel } from '@/lib/colors'
import { processImageSource, type ImageProcessingMode } from '@/lib/imageProcessing'
import { ALL_SUBTYPES, SUBTYPE_TO_CATEGORY } from '@/lib/taxonomy'
import ProductImage from '@/components/ProductImage'
import SizeSelector from '@/components/SizeSelector'
import type { WardrobeItem } from '@/types'

const mergeOptions = (...groups: (string | undefined)[][]) =>
  Array.from(
    new Set(
      groups
        .flat()
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort((a, b) => a.localeCompare(b))

function getImageProcessingMode(item: WardrobeItem): ImageProcessingMode {
  if (item.category === 'tops' || item.category === 'bottoms') {
    const subtype = item.subtype.toLowerCase()
    if (subtype.includes('jacket') || subtype.includes('coat') || subtype.includes('blazer')) {
      return 'jacket'
    }
    return 'apparel'
  }
  return 'strict'
}

function getImageFit(item: WardrobeItem): 'default' | 'shoe' {
  return item.category === 'shoes' ? 'shoe' : 'default'
}

export default function ItemDetail() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const nav = useNavigate()
  const { getItemById, items, updateItem } = useWardrobe()
  const [activeImage, setActiveImage] = useState(0)
  const [draft, setDraft] = useState<WardrobeItem | null>(null)
  const [customBrand, setCustomBrand] = useState('')
  const [customColor, setCustomColor] = useState('')
  const [customSubtype, setCustomSubtype] = useState('')
  const [customMaterial, setCustomMaterial] = useState('')
  const [factsOpen, setFactsOpen] = useState(false)
  const [pickedImageIndex, setPickedImageIndex] = useState<number | null>(null)
  const moreFileRef = useRef<HTMLInputElement>(null)

  const item = getItemById(id ?? '')
  const isEditing = params.get('edit') === '1'

  useEffect(() => {
    if (item) setDraft(item)
  }, [item])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  const relatedByBrand = useMemo(
    () => (item ? items.filter((entry) => entry.brand === item.brand && entry.id !== item.id) : []),
    [item, items],
  )
  const relatedByCategory = useMemo(
    () => (item ? items.filter((entry) => entry.category === item.category && entry.id !== item.id) : []),
    [item, items],
  )
  const factsItems = useMemo(
    () => [...relatedByBrand, ...relatedByCategory.filter((entry) => entry.brand !== item?.brand)].slice(0, 4),
    [item?.brand, relatedByBrand, relatedByCategory],
  )
  if (!item || !draft) {
    return (
      <div className="min-h-screen bg-card flex items-center justify-center">
        <p className="text-light-muted">Item not found</p>
      </div>
    )
  }

  const mediaItem = isEditing ? draft : item
  const allImages = [mediaItem.image, ...mediaItem.images].filter(Boolean)
  const brandOptions = mergeOptions(items.map((entry) => entry.brand), [draft.brand])
  const colorOptions = mergeOptions(items.map((entry) => entry.color), [draft.color])
  const materialOptions = mergeOptions(items.map((entry) => entry.material), [draft.material])
  const categoryOptions = mergeOptions(ALL_SUBTYPES, items.map((entry) => entry.subtype), [draft.subtype])
  const genderOptions = mergeOptions(['Men', 'Women', 'Unisex'], items.map((entry) => entry.gender), [draft.gender ?? 'Unisex'])

  const setField = <K extends keyof WardrobeItem>(field: K, value: WardrobeItem[K]) => {
    setDraft((current) => (current ? { ...current, [field]: value } : current))
  }

  const setSubtype = (subtype: string) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            subtype,
            category: SUBTYPE_TO_CATEGORY[subtype] ?? current.category,
          }
        : current,
    )
  }

  const readFile = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve((e.target?.result as string) ?? '')
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })

  const commitMedia = (all: string[], nextActive = 0) => {
    const nextImage = all[0] ?? ''
    const nextImages = all.slice(1)
    setDraft((current) => (current ? { ...current, image: nextImage, images: nextImages } : current))
    updateItem(item.id, { image: nextImage, images: nextImages })
    setActiveImage(Math.max(0, Math.min(nextActive, Math.max(all.length - 1, 0))))
  }

  const appendImages = async (files: FileList | File[]) => {
    const list = Array.from(files)
    if (list.length === 0) return
    const processingMode = getImageProcessingMode(draft)
    const loaded = (await Promise.all(
      list.map(async (file) => {
        const raw = await readFile(file)
        if (!raw) return ''
        try {
          return await processImageSource(raw, processingMode)
        } catch {
          return raw
        }
      }),
    )).filter(Boolean)
    if (loaded.length === 0) return

    if (isEditing) {
      setDraft((current) => (current ? { ...current, images: [...current.images, ...loaded] } : current))
      return
    }

    commitMedia([...allImages, ...loaded], activeImage)
  }

  const saveDraft = () => {
    updateItem(item.id, {
      ...draft,
    })
    setPickedImageIndex(null)
    params.delete('edit')
    setParams(params, { replace: true })
  }

  const movePickedImage = (targetIndex: number) => {
    if (pickedImageIndex === null || pickedImageIndex === targetIndex) return
    const next = [...allImages]
    const [picked] = next.splice(pickedImageIndex, 1)
    next.splice(targetIndex, 0, picked)
    setDraft((current) => (current ? { ...current, image: next[0], images: next.slice(1) } : current))
    setActiveImage(targetIndex)
    setPickedImageIndex(targetIndex)
  }

  const OptionCards = ({
    title,
    options,
    selected,
    onSelect,
    customValue,
    setCustomValue,
    addCustom,
    allowCustom = true,
  }: {
    title: string
    options: string[]
    selected: string
    onSelect: (value: string) => void
    customValue: string
    setCustomValue: (value: string) => void
    addCustom: () => void
    allowCustom?: boolean
  }) => (
    <div>
      <label className="type-label text-light-secondary">{title}</label>
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
      </div>
      {allowCustom && (
        <div className="mt-3 flex gap-2">
          <input
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            className="type-body-md field-input-light"
            placeholder={`Add ${title.toLowerCase()}`}
          />
          <button type="button" onClick={addCustom} className="type-button-sm button-light">
            Add
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div className="h-[calc(100vh-96px)] overflow-hidden bg-card text-text-dark md:h-[calc(100vh-56px)]">
      <div className="flex h-full flex-col">
        <div className="page-frame flex items-center justify-between border-b border-light-soft py-3">
          <div className="type-caption flex items-center gap-3 text-light-secondary">
            <button onClick={() => nav(-1)} className="type-button-sm button-ghost text-light-secondary">
              Back
            </button>
            <span>{item.brand} {item.name}</span>
          </div>
          <div />
        </div>

        <input
          ref={moreFileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void appendImages(e.target.files)
            e.target.value = ''
          }}
        />

        <div className="relative flex flex-1 flex-col overflow-hidden bg-card">
            <div className="relative flex min-h-0 flex-1 items-center justify-center px-8 pb-22 pt-5">
              <ProductImage src={allImages[activeImage]} alt={item.name} className={mediaItem.category === 'shoes' ? '' : 'max-h-[65vh] max-w-full object-contain'} mode={getImageProcessingMode(mediaItem)} fit={getImageFit(mediaItem)} />

              {allImages.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImage((current) => (current === 0 ? allImages.length - 1 : current - 1))}
                    className="button-icon absolute left-5 top-1/2 -translate-y-1/2 text-light-secondary"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={() => setActiveImage((current) => (current === allImages.length - 1 ? 0 : current + 1))}
                    className="button-icon absolute right-5 top-1/2 -translate-y-1/2 text-light-secondary"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
            </div>

            {factsOpen && (
              <div className="drawer-panel absolute bottom-[68px] right-4 max-h-[calc(100vh-228px)] w-[292px]">
                <div className="drawer-header">
                  <p className="type-label text-light-strong">Details</p>
                  <button
                    onClick={() => setFactsOpen(false)}
                    className="type-button-sm button-ghost text-light-secondary"
                  >
                    Close
                  </button>
                </div>

                <div className="border-b border-light px-3 py-2">
                  <p className="type-caption text-light-secondary">{item.brand}</p>
                  <h1 className="type-h4 mt-1 max-w-[15ch] text-text-dark">{item.name}</h1>
                </div>

                {factsItems.length > 0 && (
                  <div className="border-b border-light px-3 py-2">
                    <p className="type-label text-light-secondary">Closet</p>
                    <div className="mt-2 grid grid-cols-4 gap-1.5">
                      {factsItems.map((related) => (
                        <button
                          key={related.id}
                          onClick={() => nav(`/item/${related.id}`)}
                          className="media-canvas media-thumb radius-md border border-light bg-card"
                        >
                          <ProductImage src={related.image} alt={related.name} className={related.category === 'shoes' ? '' : 'max-h-full max-w-full object-contain'} mode={getImageProcessingMode(related)} fit={getImageFit(related)} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="type-caption">
                  {[
                    ['Brand', item.brand],
                    ['Color', item.color],
                    ['Category', item.subtype],
                    ['Gender', item.gender ?? 'Unisex'],
                    ['Size', item.size],
                    ['Price', `$${item.price}`],
                    ['Material', item.material],
                    ['Added', item.addedAt],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-start justify-between gap-4 border-b border-light px-3 py-1.5 last:border-b-0">
                      <span className="text-light-secondary">{label}</span>
                      <span className="max-w-[14ch] text-right text-text-dark">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isEditing && (
              <div className="drawer-panel absolute bottom-[68px] right-4 max-h-[calc(100vh-228px)] w-[336px]">
                <div className="drawer-header">
                  <p className="type-label text-light-strong">Edit</p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        params.delete('edit')
                        setParams(params, { replace: true })
                        setDraft(item)
                        setPickedImageIndex(null)
                      }}
                      className="type-button-sm button-ghost text-light-secondary"
                    >
                      Close
                    </button>
                    <button
                      onClick={saveDraft}
                      className="type-button-sm button-light"
                    >
                      Save
                    </button>
                  </div>
                </div>

                <div className="drawer-body">
                  <div className="field-stack">
                    <label className="type-label text-light-secondary">Name</label>
                    <input value={draft.name} onChange={(e) => setField('name', e.target.value)} className="type-body-md field-input-light" placeholder="Item name" />
                  </div>
                  <OptionCards
                    title="Brand"
                    options={brandOptions}
                    selected={draft.brand}
                    onSelect={(value) => setField('brand', value)}
                    customValue={customBrand}
                    setCustomValue={setCustomBrand}
                    addCustom={() => {
                      const next = customBrand.trim()
                      if (!next) return
                      setField('brand', next)
                      setCustomBrand('')
                    }}
                  />
                  <OptionCards
                    title="Color"
                    options={colorOptions}
                    selected={draft.color}
                    onSelect={(value) => setField('color', value)}
                    customValue={customColor}
                    setCustomValue={setCustomColor}
                    addCustom={() => {
                      const next = normalizeColorLabel(customColor.trim())
                      if (!next) return
                      setField('color', next)
                      setCustomColor('')
                    }}
                  />
                  <div className="field-stack">
                    <label className="type-label text-light-secondary">Price</label>
                    <input
                      value={draft.price === 0 ? '' : String(draft.price)}
                      inputMode="decimal"
                      onChange={(e) => {
                        const nextValue = e.target.value.trim()
                        setField('price', nextValue === '' ? 0 : Number(nextValue.replace(/[^\d.]/g, '')) || 0)
                      }}
                      className="type-body-md field-input-light"
                      placeholder="Price"
                    />
                  </div>
                  <OptionCards
                    title="Category"
                    options={categoryOptions}
                    selected={draft.subtype}
                    onSelect={setSubtype}
                    customValue={customSubtype}
                    setCustomValue={setCustomSubtype}
                    addCustom={() => {
                      const next = customSubtype.trim()
                      if (!next) return
                      setSubtype(next)
                      setCustomSubtype('')
                    }}
                  />
                  <OptionCards
                    title="Gender"
                    options={genderOptions}
                    selected={draft.gender ?? 'Unisex'}
                    onSelect={(value) => setField('gender', value)}
                    customValue=""
                    setCustomValue={() => {}}
                    addCustom={() => {}}
                    allowCustom={false}
                  />
                  <SizeSelector
                    category={draft.category}
                    subtype={draft.subtype}
                    size={draft.size}
                    onChange={(value) => setField('size', value)}
                  />
                  <OptionCards
                    title="Material"
                    options={materialOptions}
                    selected={draft.material}
                    onSelect={(value) => setField('material', value)}
                    customValue={customMaterial}
                    setCustomValue={setCustomMaterial}
                    addCustom={() => {
                      const next = customMaterial.trim()
                      if (!next) return
                      setField('material', next)
                      setCustomMaterial('')
                    }}
                  />
                  <div className="field-stack">
                    <label className="type-label text-light-secondary">Added At</label>
                    <input value={draft.addedAt} type="date" onChange={(e) => setField('addedAt', e.target.value)} className="type-body-md field-input-light" />
                  </div>
                </div>
              </div>
            )}

            <div className="border-t border-light-soft bg-card">
              <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_auto] items-end gap-4 px-4 py-2">
                <div className="min-w-0">
                  <p className="type-caption text-text-dark">{item.name}</p>
                  <p className="type-caption mt-1 text-light-secondary">
                    {item.brand} / {item.category === 'shoes' ? 'Sneakers' : item.category === 'tops' ? 'Apparel' : item.category === 'bottoms' ? 'Bottoms' : 'Accessories'} / {item.subtype}
                  </p>
                </div>

                <div className="min-w-0">
                  <div className="flex gap-1 overflow-x-auto pb-0.5">
                    {allImages.map((image, index) => (
                      <button
                        key={`${image}-${index}-dock`}
                        onClick={() => {
                          if (isEditing && pickedImageIndex !== null && pickedImageIndex !== index) {
                            movePickedImage(index)
                            return
                          }
                          if (isEditing) {
                            setPickedImageIndex(index)
                          }
                          setActiveImage(index)
                        }}
                        className={`media-thumb radius-md border ${
                          pickedImageIndex === index
                            ? 'border-light-strong shadow-[0_0_0_1px_rgba(0,0,0,0.05)] bg-light-hover'
                            : index === activeImage
                              ? 'border-light-strong shadow-[0_0_0_1px_rgba(0,0,0,0.025)]'
                              : 'border-light'
                        }`}
                      >
                        <ProductImage src={image} alt="" className={mediaItem.category === 'shoes' ? '' : 'max-h-full max-w-full object-contain'} mode={getImageProcessingMode(mediaItem)} fit={getImageFit(mediaItem)} />
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => moreFileRef.current?.click()}
                      className="type-button-md button-ghost flex h-14 w-14 items-center justify-center radius-md border border-dashed border-light text-light-secondary"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 pb-0.5">
                  <button
                    onClick={() => setFactsOpen((current) => !current)}
                    className={`type-button-sm button-ghost ${factsOpen ? 'text-text-dark' : 'text-light-secondary'}`}
                  >
                    Details
                  </button>
                  <button
                    onClick={() => {
                      setFactsOpen(false)
                      setParams({ edit: '1' })
                    }}
                    className="type-button-sm button-ghost text-light-secondary"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          </div>
      </div>
    </div>
  )
}
