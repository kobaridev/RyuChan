'use client'

import { useWriteStore } from './stores/write-store'
import { usePreviewStore } from './stores/preview-store'
import { WriteEditor } from './components/editor'
import { WriteSidebar } from './components/sidebar'
import { WriteActions } from './components/actions'
import { WritePreview } from './components/preview'
import { useEffect, useState } from 'react'
import { Toaster } from 'sonner'
import { useLoadBlog } from './hooks/use-load-blog'

type WritePageProps = {
    categories?: string[]
}

export default function WritePage({ categories = [] }: WritePageProps) {
	const { form, cover, reset } = useWriteStore()
	const { isPreview, closePreview } = usePreviewStore()
    const [slug, setSlug] = useState<string | null>(null)

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const s = params.get('slug')
        if (s) {
            setSlug(s)
        } else {
            reset()
        }
    }, [])

    const { loading } = useLoadBlog(slug || undefined)

	const coverPreviewUrl = cover ? (cover.type === 'url' ? cover.url : cover.previewUrl) : null

	return (
        <>
            <Toaster 
                richColors 
                position="top-center" 
                toastOptions={{
                    className: 'shadow-2xl border-2 border-base-200',
                    style: {
                        fontSize: '1.1rem',
                        padding: '16px 24px',
                    },
                    classNames: {
                        title: 'text-lg font-bold',
                        description: 'text-base font-medium',
                        error: 'bg-error text-error-content border-error',
                        success: 'bg-success text-success-content border-success',
                        warning: 'bg-warning text-warning-content border-warning',
                        info: 'bg-info text-info-content border-info',
                    }
                }}
            />
            {isPreview ? (
                <WritePreview form={form} coverPreviewUrl={coverPreviewUrl} onClose={closePreview} slug={slug || undefined} />
            ) : (
                <>
                    <div className='flex h-full justify-center gap-6 px-6 pt-24 pb-12'>
                        <WriteEditor />
                        <WriteSidebar categories={categories} />
                    </div>

                    <WriteActions />
                </>
            )}
        </>
	)
}
