import { motion } from 'motion/react'
import { useWriteStore } from '../stores/write-store'
import { INIT_DELAY } from '@/consts'
import { lazy, Suspense, useRef, useCallback } from 'react'
import 'easymde/dist/easymde.min.css'

const SimpleMDE = lazy(() => import('react-simplemde-editor'))

export function WriteEditor() {
	const { form, updateForm, images, addFiles } = useWriteStore()
	const cmRef = useRef<any>(null)

	const getCmInstance = useCallback((editor: any) => {
		cmRef.current = editor
	}, [])

	const handlePaste = async (e: React.ClipboardEvent) => {
		const items = e.clipboardData?.items
		if (!items) return

		const imageFiles: File[] = []
		for (let i = 0; i < items.length; i++) {
			const item = items[i]
			if (item.type.startsWith('image/')) {
				const file = item.getAsFile()
				if (file) imageFiles.push(file)
			}
		}

		if (imageFiles.length > 0) {
			e.preventDefault()
			const resultImages = await addFiles(imageFiles).catch(() => [])
			if (resultImages && resultImages.length > 0) {
				const markdowns = resultImages.map(item =>
					item.type === 'url' ? `![](${item.url})` : `![](local-image:${item.id})`
				).join('\n')
				const cm = cmRef.current
				if (cm) {
					const doc = cm.getDoc()
					const cursor = doc.getCursor()
					doc.replaceRange(markdowns, cursor)
				}
			}
		}
	}

	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.8 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{ delay: INIT_DELAY }}
			className='bg-base-100 flex min-h-[800px] w-full max-w-[800px] flex-col rounded-[40px] border border-base-200 p-8 shadow-xl'
			onPaste={handlePaste}
		>
			<div className='mb-4 flex flex-col md:flex-row gap-4'>
				<input
					type='text'
					placeholder='标题'
					className='input input-bordered w-full md:flex-1 bg-base-100 focus:input-primary transition-all h-12 p-4 rounded-lg text-base font-medium'
					value={form.title}
					onChange={e => updateForm({ title: e.target.value })}
				/>
				<input
					type='text'
					placeholder='slug（xx-xx）'
					className='input input-bordered w-full md:w-[200px] bg-base-100 focus:input-primary transition-all h-12 p-4 rounded-lg text-base font-medium'
					value={form.slug}
					onChange={e => updateForm({ slug: e.target.value.toLowerCase() })}
				/>
			</div>
			<Suspense fallback={
				<div className="h-[600px] w-full flex items-center justify-center bg-base-200 rounded-2xl">
					<span className="loading loading-spinner loading-lg text-primary"></span>
				</div>
			}>
				<SimpleMDE
					value={form.md}
					onChange={(value: string) => updateForm({ md: value })}
					getMdeInstance={getCmInstance}
					options={{
						placeholder: 'Markdown 内容',
						spellChecker: false,
						autosave: {
							enabled: true,
							uniqueId: 'ryuchan-write-editor',
							delay: 1000,
						},
						toolbar: [
							'bold',
							'italic',
							'heading',
							'|',
							'quote',
							'unordered-list',
							'ordered-list',
							'|',
							'link',
							'image',
							'code',
							'|',
							'preview',
							'side-by-side',
							'fullscreen',
							'|',
							'guide',
						],
						status: false,
						tabSize: 4,
					}}
				/>
			</Suspense>
		</motion.div>
	)
}
