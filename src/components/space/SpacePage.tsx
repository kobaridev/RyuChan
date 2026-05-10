'use client'

import { useEffect, useState } from 'react'
import { useSpaceStore } from './stores/space-store'
import { SpaceList } from './components/list'
import { SpaceEditor } from './components/editor'
import { FloatingAddButton } from './components/floating-button'
import { Toaster } from 'sonner'
import { useAuthStore } from '@/components/write/hooks/use-auth'

export default function SpacePage() {
  const { notes, loadNotes, currentNote, isEditing, setCurrentNote, setIsEditing } = useSpaceStore()
  const { isAuth } = useAuthStore()
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (!initialized) {
      loadNotes()
      setInitialized(true)
    }
  }, [initialized, loadNotes])

  const handleNewNote = () => {
    setCurrentNote(null)
    setIsEditing(true)
  }

  const handleEditNote = (note: any) => {
    setCurrentNote(note)
    setIsEditing(true)
  }

  const handleBack = () => {
    setCurrentNote(null)
    setIsEditing(false)
  }

  return (
    <>
      <Toaster
        richColors
        position="top-center"
        offset={120}
        toastOptions={{
          className: 'shadow-xl rounded-2xl border-2 border-primary/20 backdrop-blur-sm',
          style: {
            fontSize: '1rem',
            padding: '14px 20px',
            zIndex: '999999',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
            transition: 'all 0.3s ease-in-out',
          },
          classNames: {
            title: 'text-lg font-semibold tracking-tight',
            description: 'text-sm font-medium opacity-90',
            error: 'bg-error/95 text-error-content border-error/30',
            success: 'bg-success/95 text-success-content border-success/30',
            warning: 'bg-warning/95 text-warning-content border-warning/30',
            info: 'bg-info/95 text-info-content border-info/30',
          },
          duration: 5000,
          closeButton: false,
        }}
      />
      
      <div className="min-h-screen">
        {isEditing ? (
          <SpaceEditor note={currentNote} onBack={handleBack} />
        ) : (
          <SpaceList notes={notes} onEdit={handleEditNote} />
        )}
      </div>

      {!isEditing && isAuth && <FloatingAddButton onClick={handleNewNote} />}
    </>
  )
}
