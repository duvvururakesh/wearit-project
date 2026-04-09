import { motion } from 'framer-motion'
import { Coffee, Heart, Dumbbell, Briefcase, Plane } from 'lucide-react'
import type { Occasion } from '@/types'

interface Props {
  selected: Occasion | null
  onSelect: (o: Occasion) => void
}

const occasions: { key: Occasion; label: string; icon: typeof Coffee }[] = [
  { key: 'casual', label: 'Casual', icon: Coffee },
  { key: 'date', label: 'Date', icon: Heart },
  { key: 'gym', label: 'Gym', icon: Dumbbell },
  { key: 'formal', label: 'Formal', icon: Briefcase },
  { key: 'travel', label: 'Travel', icon: Plane },
]

export default function OccasionPicker({ selected, onSelect }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
      {occasions.map(({ key, label, icon: Icon }) => {
        const active = selected === key
        return (
          <motion.button
            key={key}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(key)}
            className={`type-button-sm flex items-center gap-2 whitespace-nowrap transition-all ${active ? 'option-card-dark is-selected' : 'option-card-dark'} ${
              active
                ? ''
                : 'hover:border-text-muted'
            }`}
          >
            <Icon size={14} strokeWidth={1.75} />
            {label}
          </motion.button>
        )
      })}
    </div>
  )
}
