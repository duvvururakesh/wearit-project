import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import type { Occasion } from '@/types'
import OccasionPicker from './OccasionPicker'

interface Props {
  open: boolean
  onClose: () => void
  onSave: (name: string, occasion: Occasion | null) => void
}

export default function SaveOutfitModal({ open, onClose, onSave }: Props) {
  const [name, setName] = useState('')
  const [occasion, setOccasion] = useState<Occasion | null>(null)
  const [error, setError] = useState('')

  const handleSave = () => {
    if (!name.trim()) {
      setError('Name is required.')
      return
    }
    onSave(name || 'My Look', occasion)
    setName('')
    setOccasion(null)
    setError('')
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-overlay"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 surface-panel-dark radius-lg"
          >
            <div className="drawer-header border-border">
              <h3 className="type-h4 text-text-primary">Save This Look</h3>
              <button onClick={onClose} className="button-icon">
                <X size={18} className="text-text-muted" />
              </button>
            </div>
            <div className="drawer-body">
              <div className="field-stack">
                <label className="type-label text-text-muted">Name</label>
                <input
                  value={name}
                  onChange={e => {
                    setName(e.target.value)
                    if (error) setError('')
                  }}
                  placeholder="e.g. Casual Friday"
                  className={`type-body-md field-input-dark ${error ? 'is-error' : ''}`}
                />
                {error && <p className="field-error-text">{error}</p>}
              </div>
              <div className="field-stack">
                <label className="type-label text-text-muted mb-2 block">
                  Occasion (optional)
                </label>
                <OccasionPicker selected={occasion} onSelect={o => setOccasion(o === occasion ? null : o)} />
              </div>
              <button
                onClick={handleSave}
                className="type-button-md button-primary w-full"
              >
                Save Look
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
