import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AlbumItem, Photo } from '@/data/albums'
import { albums as defaultAlbums } from '@/data/albums'
import { saveAlbumsToGitHub } from '@/lib/album-service'
import { toast } from 'sonner'

interface UnsavedChange {
  type: 'album_update' | 'album_add' | 'album_delete' | 'album_move' | 'photo_add' | 'photo_update' | 'photo_delete' | 'photo_move'
  albumId: string
  timestamp: number
}

interface PendingPhotoEntry {
  file: File
  previewUrl: string
}

interface AlbumStore {
  albums: AlbumItem[]
  isEditMode: boolean
  isSaving: boolean
  adminAlbumId: string | null

  // Track uploaded files that need to be pushed to GitHub on save
  // Key: "albumId::photoIndex"
  pendingPhotos: Record<string, PendingPhotoEntry>

  toggleEditMode: () => void
  enterEditMode: () => void
  exitEditMode: () => void
  openAdmin: (id: string) => void
  closeAdmin: () => void
  saveAlbums: () => Promise<void>
  resetToDefaults: () => void

  // Album CRUD
  addAlbum: (album: AlbumItem) => void
  updateAlbum: (id: string, album: AlbumItem) => void
  deleteAlbum: (id: string) => void
  moveAlbum: (fromIndex: number, toIndex: number) => void

  // Photo CRUD
  addPhoto: (id: string, photo: Photo, file?: File) => void
  addPhotos: (id: string, photos: Photo[], files?: File[]) => void
  updatePhoto: (id: string, photoIndex: number, photo: Photo, file?: File) => void
  deletePhoto: (id: string, photoIndex: number) => void
  reorderPhotos: (id: string, fromIndex: number, toIndex: number) => void

  // Pending photo tracking
  addPendingPhoto: (key: string, entry: PendingPhotoEntry) => void
  clearPendingPhotos: () => void
}

export const useAlbumStore = create<AlbumStore>()(
  persist(
    (set, get) => ({
      albums: defaultAlbums,
      isEditMode: false,
      isSaving: false,
      adminAlbumId: null,
      pendingPhotos: {},

      toggleEditMode: () => {
        const current = get().isEditMode
        if (current) {
          set({ isEditMode: false, adminAlbumId: null })
        } else {
          set({ isEditMode: true })
        }
      },

      enterEditMode: () => set({ isEditMode: true }),
      exitEditMode: () => set({ isEditMode: false, adminAlbumId: null }),

      openAdmin: (id: string) => set({ adminAlbumId: id }),
      closeAdmin: () => set({ adminAlbumId: null }),

      saveAlbums: async () => {
        const { albums, pendingPhotos } = get()
        set({ isSaving: true })
        try {
          const savedAlbums = await saveAlbumsToGitHub(albums, pendingPhotos)
          // Clean up pending photo previews
          Object.values(pendingPhotos).forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl))
          set({
            albums: savedAlbums,
            isSaving: false,
            isEditMode: false,
            adminAlbumId: null,
            pendingPhotos: {},
          })
        } catch (error: any) {
          set({ isSaving: false })
          console.error('GitHub sync failed:', error)
          toast.error('❌ 保存失败', {
            description: error.message || '发生了未知错误，请重试'
          })
        }
      },

      resetToDefaults: () => set({ albums: defaultAlbums }),

      addAlbum: (album: AlbumItem) => {
        set((state) => ({ albums: [...state.albums, album] }))
        toast.success('相册已添加')
      },

      updateAlbum: (id: string, album: AlbumItem) => {
        set((state) => ({
          albums: state.albums.map((a) => (a.id === id ? album : a))
        }))
      },

      deleteAlbum: (id: string) => {
        set((state) => ({
          albums: state.albums.filter((a) => a.id !== id)
        }))
        toast.success('相册已删除')
      },

      moveAlbum: (fromIndex: number, toIndex: number) => {
        set((state) => {
          const updated = [...state.albums]
          const [moved] = updated.splice(fromIndex, 1)
          updated.splice(toIndex, 0, moved)
          return { albums: updated }
        })
      },

      addPhoto: (id: string, photo: Photo, _file?: File) => {
        set((state) => ({
          albums: state.albums.map((a) => {
            if (a.id !== id) return a
            return { ...a, photos: [photo, ...(a.photos || [])] }
          })
        }))
        toast.success('照片已添加')
      },

      addPhotos: (id: string, photos: Photo[], _files?: File[]) => {
        set((state) => ({
          albums: state.albums.map((a) => {
            if (a.id !== id) return a
            return { ...a, photos: [...photos, ...(a.photos || [])] }
          })
        }))
        toast.success(`已添加 ${photos.length} 张照片`)
      },

      updatePhoto: (id: string, photoIndex: number, photo: Photo, _file?: File) => {
        set((state) => ({
          albums: state.albums.map((a) => {
            if (a.id !== id) return a
            const photos = [...(a.photos || [])]
            photos[photoIndex] = photo
            return { ...a, photos }
          })
        }))
      },

      deletePhoto: (id: string, photoIndex: number) => {
        set((state) => ({
          albums: state.albums.map((a) => {
            if (a.id !== id) return a
            return { ...a, photos: (a.photos || []).filter((_, i) => i !== photoIndex) }
          })
        }))
      },

      reorderPhotos: (id: string, fromIndex: number, toIndex: number) => {
        set((state) => ({
          albums: state.albums.map((a) => {
            if (a.id !== id) return a
            const photos = [...(a.photos || [])]
            const [moved] = photos.splice(fromIndex, 1)
            photos.splice(toIndex, 0, moved)
            return { ...a, photos }
          })
        }))
      },

      hasUnsavedChanges: () => {
        const { albums } = get()
        return JSON.stringify(albums) !== JSON.stringify(defaultAlbums)
      },

      addPendingPhoto: (key: string, entry: PendingPhotoEntry) => {
        set((state) => ({
          pendingPhotos: { ...state.pendingPhotos, [key]: entry }
        }))
      },

      clearPendingPhotos: () => {
        const { pendingPhotos } = get()
        Object.values(pendingPhotos).forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl))
        set({ pendingPhotos: {} })
      },
    }),
    {
      name: 'album-store-v3',
      partialize: (state) => ({ albums: state.albums }),
      merge: (persisted, current) => {
        const persistedAlbums = (persisted as { albums?: AlbumItem[] })?.albums

        // Use persisted data as the source of truth once the user has made edits.
        // Avoids duplicates when albums are renamed (old event name in defaults
        // would otherwise be re-added as a separate album).
        if (persistedAlbums && persistedAlbums.length > 0) {
          const currentAlbums = current.albums || []

          const defaultById = new Map<string, AlbumItem>()
          for (const a of currentAlbums) { defaultById.set(a.id, a) }

          const merged: AlbumItem[] = persistedAlbums.map((a) => {
            const def = defaultById.get(a.id)
            if (def?.photos?.length && (!a.photos || a.photos.length === 0)) {
              return { ...a, photos: [...def.photos] }
            }
            return a
          })

          return { ...current, albums: merged }
        }

        return current
      },
    }
  )
)
