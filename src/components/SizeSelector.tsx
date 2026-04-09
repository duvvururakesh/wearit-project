import { useEffect, useState } from 'react'
import type { Category } from '@/types'

const ALPHA_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as string[]
const TOP_NUMERIC_SIZES = ['40', '42', '43', '45'] as string[]
const BOTTOM_NUMERIC_SIZES = ['32', '34', '36', '38', '40'] as string[]
const SHOE_UNITS = ['US', 'UK'] as const
const SHOE_SIZES = Array.from({ length: 13 }, (_, index) => String(index + 1))

function isShoeSize(category: Category, subtype: string) {
  return category === 'shoes' || subtype === 'Sneakers'
}

function isBottomSize(category: Category, subtype: string) {
  return category === 'bottoms' || ['Pants', 'Jeans', 'Shorts'].includes(subtype)
}

function parseShoeSize(size: string) {
  const parts = size.trim().split(/\s+/)
  const first = parts[0]?.toUpperCase()
  const second = parts[1]
  if ((first === 'US' || first === 'UK') && second) {
    return { unit: first, number: second }
  }
  return { unit: 'US', number: size.trim() }
}

export default function SizeSelector({
  category,
  subtype,
  size,
  onChange,
}: {
  category: Category
  subtype: string
  size: string
  onChange: (value: string) => void
}) {
  const shoeMode = isShoeSize(category, subtype)
  const bottomMode = isBottomSize(category, subtype)
  const numericSizes = bottomMode ? BOTTOM_NUMERIC_SIZES : TOP_NUMERIC_SIZES

  const [shoeUnit, setShoeUnit] = useState<'US' | 'UK'>(parseShoeSize(size).unit as 'US' | 'UK')
  const [customNumber, setCustomNumber] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  useEffect(() => {
    if (shoeMode) {
      const parsed = parseShoeSize(size)
      setShoeUnit((parsed.unit === 'UK' ? 'UK' : 'US'))
      if (!SHOE_SIZES.includes(parsed.number)) {
        setCustomNumber(parsed.number)
        setShowCustom(Boolean(parsed.number))
      } else {
        setCustomNumber('')
        setShowCustom(false)
      }
      return
    }
    if (!ALPHA_SIZES.includes(size) && !numericSizes.includes(size)) {
      setCustomNumber(size)
      setShowCustom(Boolean(size))
    } else {
      setCustomNumber('')
      setShowCustom(false)
    }
  }, [numericSizes, shoeMode, size])

  if (shoeMode) {
    const parsed = parseShoeSize(size)
    return (
      <div className="field-stack">
        <label className="type-label text-light-secondary">Size</label>
        <div className="option-grid mt-2">
          {SHOE_UNITS.map((unit) => (
            <button
              key={unit}
              type="button"
              onClick={() => {
                setShoeUnit(unit)
                onChange(`${unit} ${parsed.number || '10'}`)
              }}
              className={`type-button-sm option-card-light ${shoeUnit === unit ? 'is-selected' : ''}`}
            >
              {unit}
            </button>
          ))}
        </div>
        <div className="option-grid mt-2">
          {SHOE_SIZES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange(`${shoeUnit} ${value}`)}
              className={`type-button-sm option-card-light ${parsed.number === value ? 'is-selected' : ''}`}
            >
              {value}
            </button>
          ))}
          {showCustom ? (
            <input
              autoFocus
              value={customNumber}
              onChange={(e) => {
                const next = e.target.value.replace(/[^\d]/g, '')
                setCustomNumber(next)
                if (next) onChange(`${shoeUnit} ${next}`)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur()
                }
              }}
              onBlur={() => {
                if (!customNumber.trim()) setShowCustom(false)
              }}
              className="type-button-sm field-input-light h-11 text-center"
              placeholder="+"
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowCustom(true)}
              className="type-button-sm option-card-light"
            >
              +
            </button>
          )}
        </div>
      </div>
    )
  }

  const isAlphaSelected = ALPHA_SIZES.includes(size)
  const isNumericSelected = numericSizes.includes(size)

  return (
    <div className="field-stack">
      <label className="type-label text-light-secondary">Size</label>
      <div className="option-grid mt-2">
        {ALPHA_SIZES.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            className={`type-button-sm option-card-light ${size === value ? 'is-selected' : ''}`}
          >
            {value}
          </button>
        ))}
      </div>
      <div className="option-grid mt-2">
        {numericSizes.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            className={`type-button-sm option-card-light ${size === value ? 'is-selected' : ''}`}
          >
            {value}
          </button>
        ))}
        {showCustom ? (
          <input
            autoFocus
            value={isAlphaSelected || isNumericSelected ? customNumber : customNumber}
            onChange={(e) => {
              const next = e.target.value.replace(/[^\d]/g, '')
              setCustomNumber(next)
              onChange(next)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur()
              }
            }}
            onBlur={() => {
              if (!customNumber.trim()) setShowCustom(false)
            }}
            className="type-button-sm field-input-light h-11 text-center"
            placeholder="+"
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowCustom(true)}
            className="type-button-sm option-card-light"
          >
            +
          </button>
        )}
      </div>
    </div>
  )
}
