import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ProductImage from '@/components/ProductImage'
import { useWardrobe } from '@/hooks/useWardrobe'
import type { Category } from '@/types'

const TILE_SIZE = 164
const TILE_GAP = 20
const TILE_PITCH = TILE_SIZE + TILE_GAP
const GRID_BUFFER = 3

function getImageMode(category: Category, subtype: string) {
  if (category === 'shoes') return 'strict' as const
  if (category === 'bottoms') return 'bottoms' as const
  const normalizedSubtype = subtype.toLowerCase()
  if (normalizedSubtype.includes('jacket') || normalizedSubtype.includes('coat') || normalizedSubtype.includes('blazer')) {
    return 'jacket' as const
  }
  return 'apparel' as const
}

function hash2D(x: number, y: number) {
  let hash = x * 374761393 + y * 668265263
  hash = (hash ^ (hash >>> 13)) * 1274126177
  return (hash ^ (hash >>> 16)) >>> 0
}

export default function Collection() {
  const nav = useNavigate()
  const { items } = useWardrobe()
  const viewportRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef<{ active: boolean; x: number; y: number }>({
    active: false,
    x: 0,
    y: 0,
  })

  const [viewport, setViewport] = useState({ width: 0, height: 0 })
  const [camera, setCamera] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const node = viewportRef.current
    if (!node) return

    const updateViewport = () => {
      setViewport({
        width: node.clientWidth,
        height: node.clientHeight,
      })
    }

    updateViewport()
    const observer = new ResizeObserver(updateViewport)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const visibleCells = useMemo(() => {
    if (items.length === 0 || viewport.width === 0 || viewport.height === 0) return []

    const minCol = Math.floor((camera.x - GRID_BUFFER * TILE_PITCH) / TILE_PITCH)
    const maxCol = Math.floor((camera.x + viewport.width + GRID_BUFFER * TILE_PITCH) / TILE_PITCH)
    const minRow = Math.floor((camera.y - GRID_BUFFER * TILE_PITCH) / TILE_PITCH)
    const maxRow = Math.floor((camera.y + viewport.height + GRID_BUFFER * TILE_PITCH) / TILE_PITCH)
    const cells: Array<{
      key: string
      left: number
      top: number
      itemId: string
      itemIndex: number
    }> = []

    for (let row = minRow; row <= maxRow; row += 1) {
      for (let col = minCol; col <= maxCol; col += 1) {
        const index = hash2D(col, row) % items.length
        const item = items[index]
        cells.push({
          key: `${col}:${row}`,
          left: col * TILE_PITCH - camera.x,
          top: row * TILE_PITCH - camera.y,
          itemId: item.id,
          itemIndex: index,
        })
      }
    }

    return cells
  }, [camera.x, camera.y, items, viewport.height, viewport.width])

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    const deltaX = event.deltaX + (event.shiftKey ? event.deltaY : 0)
    const deltaY = event.shiftKey ? 0 : event.deltaY
    setCamera((current) => ({
      x: current.x + deltaX,
      y: current.y + deltaY,
    }))
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = { active: true, x: event.clientX, y: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current.active) return
    const dx = event.clientX - draggingRef.current.x
    const dy = event.clientY - draggingRef.current.y
    draggingRef.current.x = event.clientX
    draggingRef.current.y = event.clientY
    setCamera((current) => ({
      x: current.x - dx,
      y: current.y - dy,
    }))
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current.active = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  if (items.length === 0) {
    return (
      <div className="page-shell-light app-viewport app-viewport-lock">
        <div className="page-frame py-10">
          <h1 className="type-h2 text-text-dark">Collection</h1>
          <p className="type-body-md mt-3 text-light-secondary">No items yet. Add pieces to populate this board.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell-light app-viewport app-viewport-lock">
      <div
        ref={viewportRef}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative h-full w-full cursor-grab overflow-hidden bg-card active:cursor-grabbing"
        style={{ touchAction: 'none' }}
      >
        {visibleCells.map((cell) => {
          const item = items[cell.itemIndex]
          return (
            <button
              key={cell.key}
              onClick={() => nav(`/item/${cell.itemId}`)}
              className="absolute flex items-end justify-center p-2 transition-transform duration-150 hover:scale-[1.02]"
              style={{
                width: TILE_SIZE,
                height: TILE_SIZE,
                left: cell.left,
                top: cell.top,
              }}
              aria-label={item.name}
            >
              <ProductImage
                src={item.image}
                alt={item.name}
                className={item.category === 'shoes' ? '' : 'h-full w-full object-contain'}
                mode={getImageMode(item.category, item.subtype)}
                fit={item.category === 'shoes' ? 'shoe' : 'default'}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
