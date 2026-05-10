'use client'

import { Icon } from 'astro-icon/components'

type FloatingAddButtonProps = {
  onClick: () => void
}

export function FloatingAddButton({ onClick }: FloatingAddButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-8 right-8 btn btn-circle btn-primary shadow-lg hover:scale-110 transition-transform z-40"
      aria-label="新建随笔"
    >
      <Icon name="material-symbols:add" className="w-7 h-7" />
    </button>
  )
}
