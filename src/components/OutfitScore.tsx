import { motion } from 'framer-motion'
import type { OutfitScoreResult } from '@/types'

export default function OutfitScore({ score, label, tip }: OutfitScoreResult) {
  const color = score >= 85 ? 'text-score-good' : score >= 70 ? 'text-score-ok' : 'text-score-low'
  const circumference = 2 * Math.PI * 28
  const dashOffset = circumference - (score / 100) * circumference

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card-outfit flex items-center gap-4"
    >
      <div className="relative w-16 h-16 flex-shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="28" fill="none" stroke="var(--color-border)" strokeWidth="3" />
          <motion.circle
            cx="32" cy="32" r="28" fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className={color}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`type-button-md font-bold ${color}`}>{score}</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`${
            score >= 85 ? 'badge-score-good' : score >= 70 ? 'badge-score-ok' : 'badge-score-low'
          }`}>
            {label}
          </span>
        </div>
        <p className="type-body-sm text-text-secondary mt-1.5">{tip}</p>
      </div>
    </motion.div>
  )
}
