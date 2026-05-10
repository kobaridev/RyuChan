'use client'

import { create } from 'zustand'
import { toast } from 'sonner'
import { getAuthToken } from '@/lib/auth'
import { putFile, listRepoDir, readTextFileFromRepo, toBase64Utf8 } from '@/lib/github-client'
import { GITHUB_CONFIG } from '@/config'
import { formatDateTimeLocal } from '@/lib/utils'

export interface SpaceNote {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

type SpaceStore = {
  notes: SpaceNote[]
  loading: boolean
  currentNote: SpaceNote | null
  isEditing: boolean

  setNotes: (notes: SpaceNote[]) => void
  setLoading: (loading: boolean) => void
  setCurrentNote: (note: SpaceNote | null) => void
  setIsEditing: (isEditing: boolean) => void

  loadNotes: () => Promise<void>
  createNote: (title: string, content: string) => Promise<void>
  updateNote: (id: string, title: string, content: string) => Promise<void>
  deleteNote: (id: string) => Promise<void>
}

export const useSpaceStore = create<SpaceStore>((set, get) => ({
  notes: [],
  loading: false,
  currentNote: null,
  isEditing: false,

  setNotes: (notes) => set({ notes }),
  setLoading: (loading) => set({ loading }),
  setCurrentNote: (note) => set({ currentNote: note }),
  setIsEditing: (isEditing) => set({ isEditing }),

  loadNotes: async () => {
    try {
      set({ loading: true })
      const token = await getAuthToken()
      if (!token) {
        toast.error('请先配置 GitHub 授权')
        return
      }

      const items = await listRepoDir(
        token,
        GITHUB_CONFIG.OWNER,
        GITHUB_CONFIG.REPO,
        'space',
        GITHUB_CONFIG.BRANCH
      )

      const notes: SpaceNote[] = []
      for (const item of items) {
        if (item.type === 'file' && item.name.endsWith('.json')) {
          try {
            const content = await readTextFileFromRepo(
              token,
              GITHUB_CONFIG.OWNER,
              GITHUB_CONFIG.REPO,
              `space/${item.name}`,
              GITHUB_CONFIG.BRANCH
            )
            if (content) {
              const note = JSON.parse(content) as SpaceNote
              notes.push(note)
            }
          } catch (e) {
            console.error(`Failed to load note: ${item.name}`, e)
          }
        }
      }

      notes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      set({ notes, loading: false })
    } catch (error: any) {
      console.error('Failed to load notes:', error)
      toast.error('加载随笔失败: ' + error.message)
      set({ loading: false })
    }
  },

  createNote: async (title: string, content: string) => {
    try {
      set({ loading: true })
      const token = await getAuthToken()
      if (!token) {
        toast.error('请先配置 GitHub 授权')
        return
      }

      const now = new Date().toISOString()
      const id = Math.random().toString(36).substring(2, 10) + Date.now().toString(36)
      const note: SpaceNote = {
        id,
        title: title || '无标题',
        content,
        createdAt: now,
        updatedAt: now
      }

      const path = `space/${id}.json`
      await putFile(
        token,
        GITHUB_CONFIG.OWNER,
        GITHUB_CONFIG.REPO,
        path,
        toBase64Utf8(JSON.stringify(note, null, 2)),
        `添加随笔: ${note.title}`,
        GITHUB_CONFIG.BRANCH
      )

      set(state => ({
        notes: [note, ...state.notes],
        currentNote: note,
        isEditing: true,
        loading: false
      }))
      toast.success('随笔创建成功')
    } catch (error: any) {
      console.error('Failed to create note:', error)
      toast.error('创建随笔失败: ' + error.message)
      set({ loading: false })
    }
  },

  updateNote: async (id: string, title: string, content: string) => {
    try {
      set({ loading: true })
      const token = await getAuthToken()
      if (!token) {
        toast.error('请先配置 GitHub 授权')
        return
      }

      const { notes } = get()
      const existingNote = notes.find(n => n.id === id)
      if (!existingNote) {
        toast.error('随笔不存在')
        return
      }

      const updatedNote: SpaceNote = {
        ...existingNote,
        title: title || '无标题',
        content,
        updatedAt: new Date().toISOString()
      }

      const path = `space/${id}.json`
      await putFile(
        token,
        GITHUB_CONFIG.OWNER,
        GITHUB_CONFIG.REPO,
        path,
        toBase64Utf8(JSON.stringify(updatedNote, null, 2)),
        `更新随笔: ${updatedNote.title}`,
        GITHUB_CONFIG.BRANCH
      )

      set(state => ({
        notes: state.notes.map(n => n.id === id ? updatedNote : n),
        currentNote: updatedNote,
        loading: false
      }))
      toast.success('随笔保存成功')
    } catch (error: any) {
      console.error('Failed to update note:', error)
      toast.error('保存随笔失败: ' + error.message)
      set({ loading: false })
    }
  },

  deleteNote: async (id: string) => {
    try {
      set({ loading: true })
      const token = await getAuthToken()
      if (!token) {
        toast.error('请先配置 GitHub 授权')
        return
      }

      const path = `space/${id}.json`
      await putFile(
        token,
        GITHUB_CONFIG.OWNER,
        GITHUB_CONFIG.REPO,
        path,
        '',
        `删除随笔: ${id}`,
        GITHUB_CONFIG.BRANCH
      )

      set(state => ({
        notes: state.notes.filter(n => n.id !== id),
        currentNote: state.currentNote?.id === id ? null : state.currentNote,
        isEditing: state.currentNote?.id === id ? false : state.isEditing,
        loading: false
      }))
      toast.success('随笔删除成功')
    } catch (error: any) {
      console.error('Failed to delete note:', error)
      toast.error('删除随笔失败: ' + error.message)
      set({ loading: false })
    }
  }
}))
