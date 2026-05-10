'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSpaceStore, SpaceNote } from '../stores/space-store'
import { Icon } from 'astro-icon/components'
import { toast } from 'sonner'

type SpaceEditorProps = {
  note: SpaceNote | null
  onBack: () => void
}

export function SpaceEditor({ note, onBack }: SpaceEditorProps) {
  const { createNote, updateNote, loading } = useSpaceStore()
  const [title, setTitle] = useState(note?.title || '')
  const editorRef = useRef<HTMLDivElement>(null)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (editorRef.current && note?.content) {
      editorRef.current.innerHTML = note.content
    } else if (editorRef.current && !note) {
      editorRef.current.innerHTML = ''
    }
  }, [note])

  const handleContentChange = useCallback(() => {
    setHasChanges(true)
  }, [])

  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    setHasChanges(true)
  }, [])

  const handleSave = async () => {
    const content = editorRef.current?.innerHTML || ''
    
    if (!content.trim()) {
      toast.error('请输入内容')
      return
    }

    if (note?.id) {
      await updateNote(note.id, title, content)
    } else {
      await createNote(title, content)
    }
  }

  const handleBack = () => {
    if (hasChanges) {
      if (window.confirm('有未保存的更改，确定要离开吗？')) {
        onBack()
      }
    } else {
      onBack()
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-base-100 rounded-2xl shadow-sm border border-base-200 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-base-200">
          <button
            onClick={handleBack}
            className="btn btn-ghost btn-sm gap-2"
          >
            <Icon name="material-symbols:arrow-back" className="w-5 h-5" />
            返回
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={loading}
              className="btn btn-primary btn-sm gap-2"
            >
              {loading ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <Icon name="material-symbols:save-outline" className="w-5 h-5" />
              )}
              保存
            </button>
          </div>
        </div>

        <div className="p-4">
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              setHasChanges(true)
            }}
            placeholder="标题（可选）"
            className="input input-ghost w-full text-2xl font-bold focus:outline-none placeholder:text-base-content/30"
          />
        </div>

        <div className="border-t border-base-200">
          <div className="flex items-center gap-1 p-2 bg-base-200/50 border-b border-base-200 flex-wrap">
            <button
              onClick={() => execCommand('bold')}
              className="btn btn-ghost btn-sm btn-square"
              title="粗体"
            >
              <Icon name="material-symbols:format-bold" className="w-5 h-5" />
            </button>
            <button
              onClick={() => execCommand('italic')}
              className="btn btn-ghost btn-sm btn-square"
              title="斜体"
            >
              <Icon name="material-symbols:format-italic" className="w-5 h-5" />
            </button>
            <button
              onClick={() => execCommand('underline')}
              className="btn btn-ghost btn-sm btn-square"
              title="下划线"
            >
              <Icon name="material-symbols:format-underlined" className="w-5 h-5" />
            </button>
            
            <div className="divider divider-horizontal divider-xs mx-1"></div>
            
            <button
              onClick={() => execCommand('foreColor', '#ef4444')}
              className="btn btn-ghost btn-sm btn-square"
              title="红色"
            >
              <div className="w-5 h-5 rounded bg-red-500"></div>
            </button>
            <button
              onClick={() => execCommand('foreColor', '#22c55e')}
              className="btn btn-ghost btn-sm btn-square"
              title="绿色"
            >
              <div className="w-5 h-5 rounded bg-green-500"></div>
            </button>
            <button
              onClick={() => execCommand('foreColor', '#3b82f6')}
              className="btn btn-ghost btn-sm btn-square"
              title="蓝色"
            >
              <div className="w-5 h-5 rounded bg-blue-500"></div>
            </button>
            <button
              onClick={() => execCommand('foreColor', '#a855f7')}
              className="btn btn-ghost btn-sm btn-square"
              title="紫色"
            >
              <div className="w-5 h-5 rounded bg-purple-500"></div>
            </button>
            <button
              onClick={() => execCommand('foreColor', '#f59e0b')}
              className="btn btn-ghost btn-sm btn-square"
              title="橙色"
            >
              <div className="w-5 h-5 rounded bg-amber-500"></div>
            </button>
            
            <div className="divider divider-horizontal divider-xs mx-1"></div>
            
            <button
              onClick={() => execCommand('insertUnorderedList')}
              className="btn btn-ghost btn-sm btn-square"
              title="无序列表"
            >
              <Icon name="material-symbols:format-list-bulleted" className="w-5 h-5" />
            </button>
            <button
              onClick={() => execCommand('insertOrderedList')}
              className="btn btn-ghost btn-sm btn-square"
              title="有序列表"
            >
              <Icon name="material-symbols:format-list-numbered" className="w-5 h-5" />
            </button>
            
            <div className="divider divider-horizontal divider-xs mx-1"></div>
            
            <button
              onClick={() => execCommand('justifyLeft')}
              className="btn btn-ghost btn-sm btn-square"
              title="左对齐"
            >
              <Icon name="material-symbols:format-align-left" className="w-5 h-5" />
            </button>
            <button
              onClick={() => execCommand('justifyCenter')}
              className="btn btn-ghost btn-sm btn-square"
              title="居中"
            >
              <Icon name="material-symbols:format-align-center" className="w-5 h-5" />
            </button>
            <button
              onClick={() => execCommand('justifyRight')}
              className="btn btn-ghost btn-sm btn-square"
              title="右对齐"
            >
              <Icon name="material-symbols:format-align-right" className="w-5 h-5" />
            </button>
            
            <div className="divider divider-horizontal divider-xs mx-1"></div>
            
            <button
              onClick={() => execCommand('removeFormat')}
              className="btn btn-ghost btn-sm btn-square"
              title="清除格式"
            >
              <Icon name="material-symbols:format-clear" className="w-5 h-5" />
            </button>
          </div>
          
          <div
            ref={editorRef}
            contentEditable
            onInput={handleContentChange}
            className="min-h-[400px] p-6 focus:outline-none prose prose-sm max-w-none"
            style={{ whiteSpace: 'pre-wrap' }}
            data-placeholder="写下你的随笔..."
          ></div>
        </div>
      </div>
    </div>
  )
}
