import { motion } from 'motion/react'
import { useWriteStore } from '../../stores/write-store'
import { TagInput } from '../ui/tag-input'
import { CustomSelect } from '../ui/custom-select'
import { useState } from 'react'
import { FileText, Tag, Folder, Calendar, Pin, File, EyeOff } from 'lucide-react'

type MetaSectionProps = {
	delay?: number
	categories?: string[]
}

export function MetaSection({ delay = 0, categories = [] }: MetaSectionProps) {
	const { form, updateForm } = useWriteStore()
	const [isCustomCategory, setIsCustomCategory] = useState(() => {
		if (form.categories.length === 0) return false
		return form.categories.length > 1 || (form.categories.length === 1 && !categories.includes(form.categories[0]))
	})

	const categoryOptions = [
		...categories.map(c => ({ value: c, label: c })),
		{ value: '__custom__', label: '+ 自定义/多选...' }
	]

	return (
		<motion.div 
			initial={{ opacity: 0, y: 20 }} 
			animate={{ opacity: 1, y: 0 }} 
			transition={{ delay }} 
			className='bg-base-100 rounded-2xl border border-base-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden'
		>
			<div className='flex items-center justify-between px-4 py-3 bg-gradient-to-r from-secondary/10 to-transparent border-b border-base-200'>
				<div className='flex items-center gap-2'>
					<div className='w-8 h-8 rounded-lg bg-secondary/15 flex items-center justify-center'>
						<FileText className='w-4 h-4 text-secondary' />
					</div>
					<h3 className='text-sm font-semibold text-base-content'>元信息</h3>
				</div>
			</div>

			<div className='p-4 space-y-4'>
				<div>
					<div className='flex items-center gap-1.5 text-xs font-medium text-base-content/60 mb-1.5'>
						<FileText className='w-3 h-3' />
						<span>摘要</span>
					</div>
					<textarea
						placeholder='为这篇文章写一段简短摘要'
						rows={2}
						className='textarea textarea-bordered w-full bg-base-100 focus:textarea-primary resize-none text-xs'
						value={form.summary}
						onChange={e => updateForm({ summary: e.target.value })}
					/>
				</div>

				<div className='grid grid-cols-2 gap-3'>
					<div>
						<div className='flex items-center gap-1.5 text-xs font-medium text-base-content/60 mb-1.5'>
							<Pin className='w-3 h-3' />
							<span>Badge</span>
						</div>
						<input
							placeholder='置顶'
							className='input input-bordered w-full bg-base-100 focus:input-primary text-xs h-9'
							value={form.badge || ''}
							onChange={e => updateForm({ badge: e.target.value })}
						/>
					</div>
					<div>
						<div className='flex items-center gap-1.5 text-xs font-medium text-base-content/60 mb-1.5'>
							<File className='w-3 h-3' />
							<span>格式</span>
						</div>
						<CustomSelect
							value={form.fileFormat}
							onChange={value => updateForm({ fileFormat: value as 'md' | 'mdx' })}
							options={[
								{ value: 'md', label: '.md' },
								{ value: 'mdx', label: '.mdx' }
							]}
							placeholder="选择格式"
						/>
					</div>
				</div>

				<div>
					<div className='flex items-center gap-1.5 text-xs font-medium text-base-content/60 mb-1.5'>
						<Tag className='w-3 h-3' />
						<span>标签</span>
					</div>
					<TagInput tags={form.tags} onChange={tags => updateForm({ tags })} />
				</div>

				<div>
					<div className='flex items-center gap-1.5 text-xs font-medium text-base-content/60 mb-1.5'>
						<Folder className='w-3 h-3' />
						<span>分类</span>
					</div>
					{categories.length > 0 && !isCustomCategory ? (
						<CustomSelect
							value={categories.includes(form.categories[0]) ? form.categories[0] : ''}
							onChange={val => {
								if (val === '__custom__') {
									setIsCustomCategory(true)
								} else {
									updateForm({ categories: [val] })
								}
							}}
							options={categoryOptions}
							placeholder="选择分类..."
						/>
					) : (
						<div className="space-y-1">
							<TagInput tags={form.categories} onChange={categories => updateForm({ categories })} />
							{categories.length > 0 && (
								<button
									onClick={() => setIsCustomCategory(false)}
									className="text-xs text-primary hover:underline"
								>
									← 返回选择已有分类
								</button>
							)}
						</div>
					)}
				</div>

				<div>
					<div className='flex items-center gap-1.5 text-xs font-medium text-base-content/60 mb-1.5'>
						<Calendar className='w-3 h-3' />
						<span>日期</span>
					</div>
					<input
						type='datetime-local'
						placeholder='日期'
						className='input input-bordered w-full bg-base-100 focus:input-primary text-xs h-9'
						value={form.date}
						onChange={e => updateForm({ date: e.target.value })}
					/>
				</div>

				<label className='flex items-center gap-2 px-3 py-2 rounded-lg bg-base-200/30 cursor-pointer hover:bg-base-200/50 transition-colors'>
					<input
						type='checkbox'
						id='hidden-check'
						checked={form.hidden || false}
						onChange={e => updateForm({ hidden: e.target.checked })}
						className='checkbox checkbox-primary checkbox-sm'
					/>
					<span className='flex items-center gap-1.5 text-xs text-base-content/80'>
						<EyeOff className='w-3.5 h-3.5' />
						隐藏此文章（草稿）
					</span>
				</label>
			</div>
		</motion.div>
	)
}