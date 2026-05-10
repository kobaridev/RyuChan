'use client'

import { useSpaceStore } from '../stores/space-store'
import { Icon } from 'astro-icon/components'

type SpaceListProps = {
  notes: any[]
  onEdit: (note: any) => void
}

export function SpaceList({ notes, onEdit }: SpaceListProps) {
  const { loading, deleteNote } = useSpaceStore()

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (window.confirm('确定要删除这篇随笔吗？')) {
      await deleteNote(id)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const stripHtml = (html: string) => {
    const tmp = document.createElement('div')
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ''
  }

  const getPreview = (content: string, maxLength = 100) => {
    const text = stripHtml(content)
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  if (loading && notes.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    )
  }

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-base-content/50">
        <Icon name="material-symbols:note-alt-outline" className="w-20 h-20 mb-4 opacity-30" />
        <p className="text-xl font-medium">还没有随笔</p>
        <p className="text-sm mt-2">点击右下角按钮创建第一篇随笔</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="grid gap-4">
        {notes.map((note) => (
          <div
            key={note.id}
            onClick={() => onEdit(note)}
            className="group bg-base-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border border-base-200 hover:border-primary/30"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-base-content group-hover:text-primary transition-colors truncate">
                  {note.title || '无标题'}
                </h3>
                <p className="text-sm text-base-content/60 mt-2 line-clamp-2">
                  {getPreview(note.content)}
                </p>
                <div className="flex items-center gap-4 mt-3 text-xs text-base-content/40">
                  <span>{formatDate(note.updatedAt)}</span>
                </div>
              </div>
              <button
                onClick={(e) => handleDelete(e, note.id)}
                className="btn btn-ghost btn-sm btn-circle opacity-0 group-hover:opacity-100 transition-opacity text-error/50 hover:text-error"
                aria-label="删除随笔"
              >
                <Icon name="material-symbols:delete-outline" className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
