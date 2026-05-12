'use client'

import { motion } from 'framer-motion'

interface Props {
  onClick?: () => void
}

export function DarkOverlay({ onClick }: Props) {
  return (
    <motion.div
      key="dark-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/30 z-40"
      onClick={onClick}
    />
  )
}
