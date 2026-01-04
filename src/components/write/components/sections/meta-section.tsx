import { motion } from 'motion/react'
import { useWriteStore } from '../../stores/write-store'
import { TagInput } from '../ui/tag-input'
import { useState } from 'react'

type MetaSectionProps = {
	delay?: number
    categories?: string[]
}

export function MetaSection({ delay = 0, categories = [] }: MetaSectionProps) {
	const { form, updateForm } = useWriteStore()
    const [isCustomCategory, setIsCustomCategory] = useState(false)

	return (
		<motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay }} className='card bg-base-100 border border-base-200 shadow-sm p-4 relative'>
			<h2 className='text-sm font-bold text-primary'>元信息</h2>

			<div className='mt-3 space-y-3'>
				<textarea
					placeholder='为这篇文章写一段简短摘要'
					rows={3}
					className='textarea textarea-bordered w-full bg-base-100 focus:textarea-primary resize-none text-sm'
					value={form.summary}
					onChange={e => updateForm({ summary: e.target.value })}
				/>

                <div className="text-xs font-medium text-base-content/70">标签</div>
				<TagInput tags={form.tags} onChange={tags => updateForm({ tags })} />
                
                <div className="text-xs font-medium text-base-content/70">分类</div>
                {categories.length > 0 && !isCustomCategory ? (
                    <select 
                        className="select select-bordered w-full bg-base-100 focus:select-primary text-sm"
                        value={categories.includes(form.categories[0]) ? form.categories[0] : ''}
                        onChange={e => {
                            const val = e.target.value
                            if (val === '__custom__') {
                                setIsCustomCategory(true)
                            } else {
                                updateForm({ categories: [val] })
                            }
                        }}
                    >
                        <option value="" disabled>选择分类...</option>
                        {categories.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                        <option value="__custom__">+ 自定义/多选...</option>
                    </select>
                ) : (
                    <div className="space-y-1">
                        <TagInput tags={form.categories} onChange={categories => updateForm({ categories })} />
                        {categories.length > 0 && (
                            <button 
                                onClick={() => setIsCustomCategory(false)}
                                className="text-xs text-primary hover:underline"
                            >
                                返回选择已有分类
                            </button>
                        )}
                    </div>
                )}

				<input
					type='datetime-local'
					placeholder='日期'
					className='input input-bordered w-full bg-base-100 focus:input-primary text-sm'
					value={form.date}
					onChange={e => {
						updateForm({ date: e.target.value })
					}}
				/>

				<div className='flex items-center gap-2 pt-1'>
					<input
						type='checkbox'
						id='hidden-check'
						checked={form.hidden || false}
						onChange={e => updateForm({ hidden: e.target.checked })}
						className='checkbox checkbox-primary checkbox-sm'
					/>
					<label htmlFor='hidden-check' className='cursor-pointer text-sm text-base-content/80 select-none'>
						隐藏此文章（草稿）
					</label>
				</div>
			</div>
		</motion.div>
	)
}
