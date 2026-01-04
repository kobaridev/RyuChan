'use client'

import { useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { useWriteStore } from '../../stores/write-store'

type ImagesSectionProps = {
	delay?: number
}

export function ImagesSection({ delay = 0 }: ImagesSectionProps) {
	const { images, cover, addUrlImage, addFiles, deleteImage } = useWriteStore()
	const [urlInput, setUrlInput] = useState<string>('')
	const fileInputRef = useRef<HTMLInputElement>(null)

	const coverId = cover?.id ?? null

	return (
		<motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay }} className='card bg-base-100 border border-base-200 shadow-sm p-4 relative'>
			<div className='flex items-center justify-between'>
				<h2 className='text-sm font-bold text-primary'>图片管理</h2>
			</div>

			<div className='mt-3 flex items-center gap-2'>
				<input
					type='text'
					placeholder='https://...'
					className='input input-bordered input-sm flex-1 bg-base-100 focus:input-primary'
					value={urlInput}
					onChange={e => setUrlInput(e.target.value)}
				/>
				<button
					className='btn btn-sm btn-ghost border-base-300'
					onClick={() => {
						const v = urlInput.trim()
						if (!v) return
						addUrlImage(v)
						setUrlInput('')
					}}>
					添加
				</button>
			</div>

			<input
				ref={fileInputRef}
				type='file'
				accept='image/*'
				multiple
				className='hidden'
				onChange={e => {
					const files = e.target.files
					if (files && files.length > 0) {
						addFiles(files)
					}
					if (e.currentTarget) e.currentTarget.value = ''
				}}
			/>

			<div className='mt-3 grid grid-cols-4 gap-2'>
				{/* plus tile */}
				<div
					className='group bg-base-100 hover:bg-base-200 relative grid aspect-square cursor-pointer place-items-center rounded-lg border border-base-200 border-dashed transition-colors'
					onClick={() => fileInputRef.current?.click()}
					onDragOver={e => {
						e.preventDefault()
					}}
					onDrop={e => {
						e.preventDefault()
						const files = e.dataTransfer.files
						if (files && files.length) addFiles(files)
					}}>
					<span className='text-2xl leading-none text-base-content/20'>+</span>
				</div>

				{images.map(item => {
					const isUrl = item.type === 'url'
					const src = isUrl ? item.url : item.previewUrl
					const markdown = isUrl ? `![](${item.url})` : `![](local-image:${item.id})`
					const isCover = coverId === item.id

					return (
						<div
							key={item.id}
							className={`group relative aspect-square overflow-hidden rounded-lg border border-base-200 bg-base-100 text-xs ${isCover ? 'ring-2 ring-primary' : ''}`}>
							<img
								src={src}
								className='h-full w-full object-cover'
								draggable
								onDragStart={e => {
									e.dataTransfer.setData('text/plain', markdown)
									e.dataTransfer.setData('text/markdown', markdown)
								}}
							/>
							{isCover && <div className='absolute top-1 left-1 rounded-md bg-primary px-1.5 py-0.5 text-primary-content shadow text-[10px]'>封面</div>}
							<div className='absolute top-1 right-1 hidden group-hover:flex'>
								<button type='button' className='rounded-md bg-base-100/80 px-1.5 py-0.5 shadow hover:bg-base-100 text-base-content' onClick={() => deleteImage(item.id)}>
									×
								</button>
							</div>
						</div>
					)
				})}
			</div>
		</motion.div>
	)
}
