'use client'

import { useRef, useState } from 'react'
import { motion } from 'motion/react'
import { useWriteStore } from '../../stores/write-store'
import { Image as ImageIcon, Plus, Link2, Trash2 } from 'lucide-react'

type ImagesSectionProps = {
	delay?: number
}

export function ImagesSection({ delay = 0 }: ImagesSectionProps) {
	const { images, cover, addUrlImage, addFiles, deleteImage } = useWriteStore()
	const [urlInput, setUrlInput] = useState<string>('')
	const fileInputRef = useRef<HTMLInputElement>(null)

	const coverId = cover?.id ?? null

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay }}
			className='bg-base-100 rounded-2xl border border-base-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col'
		>
			<div className='flex items-center justify-between px-3 md:px-4 py-2.5 md:py-3 bg-gradient-to-r from-accent/10 to-transparent border-b border-base-200'>
				<div className='flex items-center gap-2'>
					<div className='w-7 h-7 md:w-8 md:h-8 rounded-lg bg-accent/15 flex items-center justify-center'>
						<ImageIcon className='w-3.5 h-3.5 md:w-4 md:h-4 text-accent' />
					</div>
					<div>
						<h3 className='text-xs md:text-sm font-semibold text-base-content'>图片管理</h3>
						<p className='text-[9px] md:text-[10px] text-base-content/50 mt-0.5'>{images.length} 张图片</p>
					</div>
				</div>
			</div>

			<div className='p-3 md:p-4 flex flex-col flex-1'>
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

				<div className='flex gap-2 mb-2 md:mb-3'>
					<div className='relative flex-1'>
						<Link2 className='absolute left-2 md:left-2.5 top-1/2 -translate-y-1/2 w-3 md:w-3.5 h-3 md:h-3.5 text-base-content/40' />
						<input
							type="text"
							className="input input-sm input-bordered w-full pl-7 md:pl-8 pr-2 bg-base-100 focus:input-primary text-[10px] md:text-xs h-8 md:h-9"
							placeholder="粘贴图片 URL"
							value={urlInput}
							onChange={e => setUrlInput(e.target.value)}
							onKeyDown={e => {
								if (e.key === 'Enter' && urlInput.trim()) {
									addUrlImage(urlInput.trim())
									setUrlInput('')
								}
							}}
						/>
					</div>
					<button
						className='btn btn-sm btn-ghost border-base-300 h-8 md:h-9 px-2.5 md:px-3 hover:bg-accent/10 hover:border-accent/30 transition-colors'
						onClick={() => {
							const v = urlInput.trim()
							if (!v) return
							addUrlImage(v)
							setUrlInput('')
						}}
					>
						<Plus className='w-3.5 h-3.5 md:w-4 md:h-4' />
					</button>
				</div>

				<div className='grid grid-cols-3 md:grid-cols-4 gap-1.5 md:gap-2 max-h-[150px] md:max-h-[180px] overflow-y-auto pr-1 custom-scrollbar flex-1'>
					<div
						className='group bg-base-100 hover:bg-base-200 relative grid aspect-square cursor-pointer place-items-center rounded-lg md:rounded-xl border-2 border-dashed border-base-300 hover:border-accent/50 transition-all'
						onClick={() => fileInputRef.current?.click()}
						onDragOver={e => e.preventDefault()}
						onDrop={e => {
							e.preventDefault()
							const files = e.dataTransfer.files
							if (files && files.length) addFiles(files)
						}}
					>
						<Plus className='w-4 h-4 md:w-5 md:h-5 text-base-content/30 group-hover:text-accent/60 transition-colors' />
					</div>

					{images.map(item => {
						const isUrl = item.type === 'url'
						const src = isUrl ? item.url : item.previewUrl
						const markdown = isUrl ? `![](${item.url})` : `![](local-image:${item.id})`
						const isCover = coverId === item.id

						return (
							<div
								key={item.id}
								className={`group relative aspect-square overflow-hidden rounded-lg border border-base-200 bg-base-100 ${isCover ? 'ring-2 ring-primary ring-offset-1 ring-offset-base-100' : 'hover:border-accent/30'}`}
							>
								<img
									src={src}
									className='h-full w-full object-cover'
									draggable
									onDragStart={e => {
										e.dataTransfer.setData('text/plain', markdown)
										e.dataTransfer.setData('text/markdown', markdown)
									}}
								/>
								{isCover && (
									<div className='absolute top-0.5 md:top-1 left-0.5 md:left-1 rounded-md bg-primary px-1 md:px-1.5 py-0.5 text-primary-content shadow text-[8px] md:text-[10px] font-medium'>
										封面
									</div>
								)}
								<div className='absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center'>
									<button
										type='button'
										className='opacity-0 group-hover:opacity-100 w-5 h-5 md:w-6 md:h-6 rounded-md bg-white/90 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all shadow'
										onClick={() => deleteImage(item.id)}
									>
										<Trash2 className='w-2.5 h-2.5 md:w-3 md:h-3' />
									</button>
								</div>
							</div>
						)
					})}
				</div>
			</div>
		</motion.div>
	)
}