import { useState } from 'react'

type TagInputProps = {
	tags: string[]
	onChange: (tags: string[]) => void
}

export function TagInput({ tags, onChange }: TagInputProps) {
	const [tagInput, setTagInput] = useState<string>('')

	const handleAddTag = () => {
		if (tagInput.trim() && !tags.includes(tagInput.trim())) {
			onChange([...tags, tagInput.trim()])
			setTagInput('')
		}
	}

	const handleRemoveTag = (index: number) => {
		onChange(tags.filter((_, i) => i !== index))
	}

	return (
		<div className='w-full rounded-lg border border-base-300 bg-base-100 px-3 py-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all'>
			{tags.length > 0 && (
				<div className='mb-2 flex flex-wrap gap-2'>
					{tags.map((tag, index) => (
						<span key={index} className='badge badge-primary badge-outline gap-1.5 py-3'>
							#{tag}
							<button type='button' onClick={() => handleRemoveTag(index)} className='hover:text-error transition-colors'>
								×
							</button>
						</span>
					))}
				</div>
			)}
			<input
				type='text'
				placeholder='添加标签（按回车）'
				className='w-full bg-transparent text-sm outline-none placeholder:text-base-content/40'
				value={tagInput}
				onChange={e => setTagInput(e.target.value)}
				onKeyDown={e => {
					if (e.key === 'Enter') {
						e.preventDefault()
						handleAddTag()
					}
				}}
			/>
		</div>
	)
}
