'use client'

import { useRef, useState } from 'react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { useWriteStore } from '../../stores/write-store'
import { ImagePlus, X, Link2 } from 'lucide-react'

type CoverSectionProps = {
	delay?: number
}

export function CoverSection({ delay = 0 }: CoverSectionProps) {
	const { images, setCover, cover, addFiles } = useWriteStore()
	const fileInputRef = useRef<HTMLInputElement>(null)
	const [urlInput, setUrlInput] = useState('')

	const coverPreviewUrl = cover ? (cover.type === 'url' ? cover.url : cover.previewUrl) : null

	const handleUrlSubmit = () => {
		if (!urlInput.trim()) return
		const trimmed = urlInput.trim()
		if (trimmed.startsWith('blob:')) {
			toast.error('blob: 链接仅限本地预览，请上传图片或使用远程 URL')
			return
		}
		setCover({
			id: Date.now().toString(),
			type: 'url',
			url: trimmed
		})
		setUrlInput('')
		toast.success('已设置封面')
	}

	const handleCoverDrop = async (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()

		const md = e.dataTransfer.getData('text/markdown') || e.dataTransfer.getData('text/plain') || ''
		const m = /!\[\]\(([^)]+)\)/.exec(md.trim())
		if (m) {
			const target = m[1]
			let foundItem

			if (target.startsWith('local-image:')) {
				const id = target.replace(/^local-image:/, '')
				foundItem = images.find(it => it.id === id)
			} else {
				foundItem = images.find(it => it.type === 'url' && it.url === target)
			}

			if (foundItem) {
				setCover(foundItem)
				toast.success('已设置封面')
				return
			}
		}

		const files = e.dataTransfer.files
		if (files && files.length > 0) {
			const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'))
			if (imageFiles.length === 0) {
				toast.error('请拖入图片文件')
				return
			}

			const resultImages = await addFiles(imageFiles as unknown as FileList)
			if (resultImages && resultImages.length > 0) {
				setCover(resultImages[0])
				toast.success('已设置封面')
			}
			return
		}
	}

	const handleClickUpload = () => {
		fileInputRef.current?.click()
	}

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files
		if (!files || files.length === 0) return

		const resultImages = await addFiles(files)
		if (resultImages && resultImages.length > 0) {
			setCover(resultImages[0])
			toast.success('已设置封面')
		}

		e.target.value = ''
	}

	const handleClearCover = () => {
		setCover(null)
		toast.success('已清除封面')
	}

	return (
		<motion.div 
			initial={{ opacity: 0, y: 20 }} 
			animate={{ opacity: 1, y: 0 }} 
			transition={{ delay }} 
			className='bg-base-100 rounded-2xl border border-base-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden'
		>
			<div className='flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary/10 to-transparent border-b border-base-200'>
				<div className='flex items-center gap-2'>
					<div className='w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center'>
						<ImagePlus className='w-4 h-4 text-primary' />
					</div>
					<h3 className='text-sm font-semibold text-base-content'>封面</h3>
				</div>
				{cover && (
					<button 
						onClick={handleClearCover} 
						className='w-6 h-6 rounded-md hover:bg-error/10 flex items-center justify-center transition-colors group'
						title="清除封面"
					>
						<X className='w-3 h-3 text-base-content/40 group-hover:text-error' />
					</button>
				)}
			</div>

			<div className='p-4'>
				<input ref={fileInputRef} type='file' accept='image/*' className='hidden' onChange={handleFileChange} />
				<div
					className='relative group h-[140px] overflow-hidden rounded-xl border-2 border-dashed border-base-300 hover:border-primary/50 hover:bg-base-200/30 transition-all cursor-pointer'
					onDragOver={e => e.preventDefault()}
					onDrop={handleCoverDrop}
					onClick={handleClickUpload}
				>
					{!!coverPreviewUrl ? (
						<>
							<img src={coverPreviewUrl} alt='cover preview' className='h-full w-full object-cover' />
							<div className='absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center'>
								<span className='text-sm text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 px-3 py-1.5 rounded-lg'>
									点击更换
								</span>
							</div>
						</>
					) : (
						<div className='flex flex-col items-center justify-center h-full text-base-content/30 group-hover:text-primary/50 transition-colors'>
							<ImagePlus className='w-8 h-8 mb-2' />
							<span className='text-xs'>点击或拖入图片</span>
						</div>
					)}
				</div>

				<div className='flex gap-2 mt-3'>
					<div className='relative flex-1'>
						<Link2 className='absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-base-content/40' />
						<input
							type="text"
							className="input input-sm input-bordered w-full pl-8 pr-2 bg-base-100 focus:input-primary text-xs h-9"
							placeholder="粘贴图片 URL"
							value={urlInput}
							onChange={e => setUrlInput(e.target.value)}
							onKeyDown={e => e.key === 'Enter' && handleUrlSubmit()}
						/>
					</div>
					<button 
						className="btn btn-sm btn-primary h-9 px-3 min-w-[3rem]" 
						onClick={handleUrlSubmit}
					>
						<span className="text-xs">确定</span>
					</button>
				</div>
			</div>
		</motion.div>
	)
}