'use client'

import { useWriteStore } from './stores/write-store'
import { usePreviewStore } from './stores/preview-store'
import { WriteEditor } from './components/editor'
import { WriteSidebar } from './components/sidebar'
import { WriteActions } from './components/actions'
import { WritePreview } from './components/preview'
import { InlinePreview } from './components/inline-preview'
import { useEffect, useState } from 'react'
import { Toaster } from 'sonner'
import { useLoadBlog } from './hooks/use-load-blog'

type WritePageProps = {
    categories?: string[]
}

export default function WritePage({ categories = [] }: WritePageProps) {
    const { form, cover, reset } = useWriteStore()
    const { isPreview, closePreview, isInlinePreview } = usePreviewStore()
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
            {isPreview ? (
                <WritePreview form={form} coverPreviewUrl={coverPreviewUrl} onClose={closePreview} slug={slug || undefined} />
            ) : (
                <>
                    <div className='flex flex-col h-full justify-center gap-4 md:gap-6 px-3 md:px-6 pt-20 md:pt-24 pb-12 max-w-[1920px] mx-auto w-full'>
                        <div className='flex flex-col xl:flex-row gap-6 w-full'>
                            <div className={`flex-1 min-w-0 ${isInlinePreview ? 'xl:w-1/2' : 'xl:w-full'}`}>
                                <WriteEditor />
                            </div>
                            {isInlinePreview && (
                                <div className='flex-1 min-w-0 xl:w-1/2 xl:block hidden'>
                                    <InlinePreview form={form} />
                                </div>
                            )}
                        </div>
                        <WriteSidebar categories={categories} />
                    </div>

                    <WriteActions />
                </>
            )}
        </>
    )
}