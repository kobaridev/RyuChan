import { motion } from 'motion/react'
import { useWriteStore } from '../stores/write-store'
import { INIT_DELAY } from '@/consts'
import { useRef } from 'react'
import {
	Bold,
	Italic,
	Strikethrough,
	Heading1,
	Heading2,
	Heading3,
	Link,
	Image,
	Code,
	List,
	ListOrdered,
	Quote,
	Table,
	Minus,
	CheckSquare,
	Sparkles,
	Eye,
	EyeOff,
} from 'lucide-react'
import { usePreviewStore } from '../stores/preview-store'

const defaultText = '文本'

type ToolbarButtonProps = {
	icon: React.ReactNode
	onClick: () => void
	tooltip: string
	active?: boolean
}

function ToolbarButton({ icon, onClick, tooltip, active }: ToolbarButtonProps) {
	return (
		<button
			type='button'
			title={tooltip}
			onClick={onClick}
			className={`p-1.5 md:p-2 rounded-md md:rounded-lg transition-all duration-200 hover:bg-base-200 hover:scale-110 active:scale-95 ${
				active ? 'bg-primary/20 text-primary' : 'text-base-content/70'
			}`}>
			{icon}
		</button>
	)
}

function ToolbarDivider() {
	return <div className='w-px h-4 md:h-6 bg-base-300 mx-0.5 md:mx-1' />
}

export function WriteEditor() {
	const { form, updateForm, addFiles } = useWriteStore()
	const { isInlinePreview, toggleInlinePreview } = usePreviewStore()
	const textareaRef = useRef<HTMLTextAreaElement>(null)

	const insertText = (text: string, cursorOffset?: number) => {
		const textarea = textareaRef.current
		if (!textarea) return

		textarea.focus()
		const { selectionStart, selectionEnd, value } = textarea
		const before = value.substring(0, selectionStart)
		const after = value.substring(selectionEnd)
		const newCursorPos = cursorOffset !== undefined ? selectionStart + cursorOffset : selectionStart + text.length

		updateForm({ md: before + text + after })

		setTimeout(() => {
			textarea.setSelectionRange(newCursorPos, newCursorPos)
			textarea.focus()
		}, 0)
	}

	const insertLinePrefix = (prefix: string) => {
		const textarea = textareaRef.current
		if (!textarea) return

		textarea.focus()
		const { selectionStart, selectionEnd, value } = textarea
		const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1
		const lineEnd = value.indexOf('\n', selectionEnd)
		const actualLineEnd = lineEnd === -1 ? value.length : lineEnd

		const selectedText = value.substring(lineStart, actualLineEnd)
		const newText = prefix + selectedText
		const newValue = value.substring(0, lineStart) + newText + value.substring(actualLineEnd)

		updateForm({ md: newValue })
		setTimeout(() => {
			textarea.setSelectionRange(lineStart + prefix.length, lineStart + prefix.length + selectedText.length)
			textarea.focus()
		}, 0)
	}

	const toggleMark = (beforeMark: string, afterMark: string) => {
		const textarea = textareaRef.current
		if (!textarea) return

		const { selectionStart, selectionEnd, value } = textarea
		const selectedText = value.substring(selectionStart, selectionEnd)
		const text = selectedText || defaultText

		const before = value.substring(0, selectionStart)
		const after = value.substring(selectionEnd)

		const isActive =
			before.endsWith(beforeMark) && after.startsWith(afterMark)

		if (isActive && selectedText) {
			textarea.setSelectionRange(selectionStart - beforeMark.length, selectionEnd + afterMark.length)
			insertText(selectedText)
		} else {
			insertText(`${beforeMark}${text}${afterMark}`)
			if (!selectedText) {
				setTimeout(() => {
					textarea.setSelectionRange(
						selectionStart + beforeMark.length,
						selectionStart + beforeMark.length + defaultText.length
					)
				}, 0)
			}
		}
	}

	const insertTemplate = (template: string, placeholder?: string) => {
		const textarea = textareaRef.current
		if (!textarea) return

		const { selectionStart } = textarea

		if (placeholder) {
			const placeholderIndex = template.indexOf(placeholder)
			const before = template.substring(0, placeholderIndex)
			const after = template.substring(placeholderIndex + placeholder.length)
			const fullText = before + placeholder + after
			const cursorPos = selectionStart + before.length

			updateForm({ md: form.md + fullText })
			setTimeout(() => {
				textarea.focus()
				textarea.setSelectionRange(cursorPos, cursorPos + placeholder.length)
			}, 0)
		} else {
			insertText(template)
		}
	}

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		const textarea = textareaRef.current
		if (!textarea) return

		const { selectionStart, selectionEnd, value } = textarea
		const selectedText = value.substring(selectionStart, selectionEnd)

		if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
			e.preventDefault()
			toggleMark('**', '**')
			return
		}

		if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
			e.preventDefault()
			toggleMark('*', '*')
			return
		}

		if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'X' || e.key === 'x')) {
			e.preventDefault()
			toggleMark('~~', '~~')
			return
		}

		if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
			e.preventDefault()
			const text = selectedText || '链接文本'
			insertText(`[${text}](url)`, text.length + 3)
			setTimeout(() => {
				const urlStart = selectionStart + text.length + 3
				textarea.setSelectionRange(urlStart, urlStart + 3)
			}, 0)
			return
		}

		if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
			e.preventDefault()
			const text = selectedText || '代码'
			insertText(`\n\`\`\`\n${text}\n\`\`\`\n`)
			return
		}

		if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '.') {
			e.preventDefault()
			insertLinePrefix('> ')
			return
		}

		if (e.key === 'Tab' && !e.shiftKey) {
			e.preventDefault()
			insertText('\t')
			return
		}

		if (e.key === 'Tab' && e.shiftKey) {
			e.preventDefault()
			const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1
			const line = value.substring(lineStart, value.indexOf('\n', selectionStart))

			if (line.startsWith('\t')) {
				textarea.setSelectionRange(lineStart, lineStart + 1)
				insertText('')
			} else if (line.startsWith('  ')) {
				textarea.setSelectionRange(lineStart, lineStart + 2)
				insertText('')
			}
			return
		}
	}

	const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
		const items = e.clipboardData.items
		if (!items) return

		const imageFiles: File[] = []
		for (let i = 0; i < items.length; i++) {
			const item = items[i]
			if (item.type.startsWith('image/')) {
				const file = item.getAsFile()
				if (file) {
					imageFiles.push(file)
				}
			}
		}

		if (imageFiles.length > 0) {
			e.preventDefault()

			const resultImages = await addFiles(imageFiles).catch(() => [])

			if (resultImages && resultImages.length > 0) {
				const markdowns = resultImages
					.map(item => (item.type === 'url' ? `![](${item.url})` : `![](local-image:${item.id})`))
					.join('\n')
				insertText(markdowns)
			}
		}
	}

	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.8 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{ delay: INIT_DELAY }}
			className='bg-base-100 flex min-h-[600px] md:min-h-[800px] w-full flex-col rounded-2xl md:rounded-[32px] border border-base-200 shadow-xl overflow-hidden'>
			<div className='mb-3 md:mb-4 flex flex-col md:flex-row gap-3 md:gap-4 p-3 md:p-4 pb-0'>
				<input
					type='text'
					placeholder='标题'
					className='input input-bordered w-full md:flex-1 bg-base-100 focus:input-primary transition-all h-11 md:h-12 p-3 md:p-4 rounded-lg text-sm md:text-base font-medium'
					value={form.title}
					onChange={e => updateForm({ title: e.target.value })}
				/>
				<input
					type='text'
					placeholder='slug（20260727-a38e5）'
					className='input input-bordered w-full md:w-[200px] bg-base-100 focus:input-primary transition-all h-11 md:h-12 p-3 md:p-4 rounded-lg text-sm md:text-base font-medium'
					value={form.slug}
					onChange={e => updateForm({ slug: e.target.value.toLowerCase() })}
				/>
			</div>

			<div className='flex items-center justify-between px-2 md:px-4 py-1.5 md:py-2 border-b border-base-200 bg-base-100/50 overflow-x-auto scrollbar-hide'>
				<div className='flex items-center gap-0.5 md:gap-1 flex-nowrap md:flex-wrap min-w-max md:min-w-0'>
					<ToolbarButton
						icon={<Bold className='w-4 h-4 md:w-5 md:h-5' />}
						onClick={() => toggleMark('**', '**')}
						tooltip='加粗 (Ctrl+B)'
					/>
					<ToolbarButton
						icon={<Italic className='w-4 h-4 md:w-5 md:h-5' />}
						onClick={() => toggleMark('*', '*')}
						tooltip='斜体 (Ctrl+I)'
					/>
					<ToolbarButton
						icon={<Strikethrough className='w-4 h-4 md:w-5 md:h-5' />}
						onClick={() => toggleMark('~~', '~~')}
						tooltip='删除线 (Ctrl+Shift+X)'
					/>
					<ToolbarDivider />
					<ToolbarButton
						icon={<Heading1 className='w-4 h-4 md:w-5 md:h-5' />}
						onClick={() => insertLinePrefix('# ')}
						tooltip='一级标题'
					/>
					<ToolbarButton
						icon={<Heading2 className='w-4 h-4 md:w-5 md:h-5' />}
						onClick={() => insertLinePrefix('## ')}
						tooltip='二级标题'
					/>
					<ToolbarButton
						icon={<Heading3 className='w-4 h-4 md:w-5 md:h-5' />}
						onClick={() => insertLinePrefix('### ')}
						tooltip='三级标题'
					/>
					<ToolbarDivider />
					<ToolbarButton
						icon={<Link className='w-4 h-4 md:w-5 md:h-5' />}
						onClick={() => {
							const textarea = textareaRef.current
							const currentValue = textarea?.value || form.md
							const cursorPos = textarea?.selectionStart || 0
							const text = currentValue.substring(0, cursorPos).split('\n').pop() || '链接文本'
							insertText(`[${text}](url)`)
						}}
						tooltip='链接 (Ctrl+K)'
					/>
					<ToolbarButton
						icon={<Image className='w-4 h-4 md:w-5 md:h-5' />}
						onClick={() => insertTemplate('![](url)', 'url')}
						tooltip='图片'
					/>
					<ToolbarButton
						icon={<Code className='w-4 h-4 md:w-5 md:h-5' />}
						onClick={() => {
							const textarea = textareaRef.current
							const start = textarea?.selectionStart || 0
							const end = textarea?.selectionEnd || 0
							const text = form.md.substring(start, end) || '代码'
							insertText(`\n\`\`\`\n${text}\n\`\`\`\n`)
						}}
						tooltip='代码块 (Ctrl+E)'
					/>
					<ToolbarDivider />
					<ToolbarButton
						icon={<List className='w-4 h-4 md:w-5 md:h-5' />}
						onClick={() => insertLinePrefix('- ')}
						tooltip='无序列表'
					/>
					<ToolbarButton
						icon={<ListOrdered className='w-4 h-4 md:w-5 md:h-5' />}
						onClick={() => insertLinePrefix('1. ')}
						tooltip='有序列表'
					/>
					<ToolbarButton
						icon={<CheckSquare className='w-4 h-4 md:w-5 md:h-5' />}
						onClick={() => insertLinePrefix('- [ ] ')}
						tooltip='任务列表'
					/>
					<ToolbarButton
						icon={<Quote className='w-4 h-4 md:w-5 md:h-5' />}
						onClick={() => insertLinePrefix('> ')}
						tooltip='引用 (Ctrl+Shift+.)'
					/>
					<ToolbarDivider />
					<ToolbarButton
						icon={<Table className='w-4 h-4 md:w-5 md:h-5' />}
						onClick={() =>
							insertText('\n| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |\n')
						}
						tooltip='表格'
					/>
					<ToolbarButton
						icon={<Minus className='w-4 h-4 md:w-5 md:h-5' />}
						onClick={() => insertText('\n---\n')}
						tooltip='分割线'
					/>
				</div>

				<div className='flex items-center gap-0.5 md:gap-1'>
					<ToolbarButton
						icon={isInlinePreview ? <Eye className='w-4 h-4 md:w-5 md:h-5' /> : <EyeOff className='w-4 h-4 md:w-5 md:h-5' />}
						onClick={toggleInlinePreview}
						tooltip={isInlinePreview ? '隐藏内联预览' : '显示内联预览'}
						active={isInlinePreview}
					/>
				</div>
			</div>

			<div className='relative flex-1 flex flex-col min-h-[400px] md:min-h-[600px]'>
				<textarea
					ref={textareaRef}
					placeholder='Markdown 内容...'
					className='textarea textarea-bordered h-full w-full flex-1 resize-none rounded-none bg-base-100 p-4 md:p-6 text-sm md:text-base leading-relaxed focus:textarea-primary transition-all font-mono'
					value={form.md}
					onChange={e => updateForm({ md: e.target.value })}
					onKeyDown={handleKeyDown}
					onPaste={handlePaste}
				/>
				<div className='absolute bottom-3 md:bottom-4 right-3 md:right-4 flex items-center gap-2 text-xs text-base-content/40 bg-base-100/80 px-2 md:px-3 py-1 rounded-full'>
					<Sparkles className='w-3 h-3' />
					<span>{form.md.length} 字符</span>
				</div>
			</div>

			<div className='hidden md:block px-4 py-2 border-t border-base-200 bg-base-100/50'>
				<div className='flex items-center justify-between text-xs text-base-content/50 flex-wrap gap-2'>
					<span>支持 Markdown 语法 · 粘贴图片自动上传</span>
					<div className='flex items-center gap-3 flex-wrap'>
						<span className='font-mono'>Ctrl+B 加粗</span>
						<span className='font-mono'>Ctrl+I 斜体</span>
						<span className='font-mono'>Ctrl+K 链接</span>
						<span className='font-mono'>Ctrl+E 代码块</span>
					</div>
				</div>
			</div>
		</motion.div>
	)
}