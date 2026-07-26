import { motion } from 'motion/react'
import type { PublishForm } from '../types'
import { Calendar, Bookmark, BookOpen, Folder, Tag } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import 'katex/dist/katex.min.css'

type InlinePreviewProps = {
	form: PublishForm
}

export function InlinePreview({ form }: InlinePreviewProps) {
	const wordCount = form.md.length
	const readTime = Math.ceil(wordCount / 400) + ' min'

	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.95 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{ duration: 0.3 }}
			className='bg-base-100 flex min-h-[800px] w-full flex-col rounded-[32px] border border-base-200 shadow-xl overflow-hidden'>
			<div className='flex items-center justify-between px-6 py-3 border-b border-base-200 bg-base-100/80 backdrop-blur-sm'>
				<div className='flex items-center gap-2'>
					<div className='w-3 h-3 rounded-full bg-error'></div>
					<div className='w-3 h-3 rounded-full bg-warning'></div>
					<div className='w-3 h-3 rounded-full bg-success'></div>
				</div>
				<span className='text-sm font-medium text-base-content/60'>预览模式</span>
				<div className='text-xs text-base-content/50'>
					{wordCount} 字 · {readTime}
				</div>
			</div>

			<div className='flex-1 overflow-y-auto p-6 md:p-8'>
				{!form.md && !form.title ? (
					<div className='flex h-full items-center justify-center text-base-content/30'>
						<div className='text-center space-y-3'>
							<div className='text-6xl'>📝</div>
							<p className='text-lg font-medium'>开始写作，预览将实时显示在这里</p>
						</div>
					</div>
				) : (
					<article
						className='prose prose-sm md:prose-base prose-code:text-base max-w-none text-justify prose-headings:scroll-mt-20 prose-h1:text-2xl md:prose-h1:text-3xl prose-h2:text-xl md:prose-h2:text-2xl prose-h3:text-lg md:prose-h3:text-xl prose-img:rounded-2xl prose-img:mx-auto prose-img:cursor-pointer'>
						{form.title && (
							<h1 className='text-3xl md:text-4xl font-bold mb-4 text-base-content'>
								{form.title}
							</h1>
						)}

						<div className='flex flex-wrap items-center gap-x-4 gap-y-2 mb-6 text-sm opacity-60'>
							{form.date && (
								<span className='flex items-center gap-1'>
									<Calendar className='w-4 h-4' />
									<span>{form.date.replace('T', ' ')}</span>
								</span>
							)}
							<span className='flex items-center gap-1'>
								<Bookmark className='w-4 h-4' />
								<span>Blog</span>
							</span>
							<span className='flex items-center gap-1'>
								<BookOpen className='w-4 h-4' />
								<span>{wordCount} 字 · {readTime}</span>
							</span>
						</div>

						{(form.categories?.length > 0 || form.tags?.length > 0) && (
							<div className='flex flex-wrap items-center gap-2 mb-6 pb-4 border-b border-base-content/10'>
								{form.categories?.map(cat => (
									<span
										key={cat}
										className='btn btn-xs bg-primary/5 hover:bg-primary text-primary hover:text-primary-content border-none'>
										<Folder className='w-4 h-4' />
										<span>{cat}</span>
									</span>
								))}
								{form.tags?.map(tag => (
									<span
										key={tag}
										className='btn btn-xs bg-secondary/5 hover:bg-secondary text-secondary hover:text-secondary-content border-none'>
										<Tag className='w-4 h-4' />
										<span>{tag}</span>
									</span>
								))}
							</div>
						)}

						<ReactMarkdown
							remarkPlugins={[remarkGfm, remarkMath]}
							rehypePlugins={[rehypeKatex]}
							components={{
								code({ node, inline, className, children, ...props }: any) {
									const match = /language-(\w+)/.exec(className || '')
									return !inline && match ? (
										<SyntaxHighlighter
											style={oneDark}
											language={match[1]}
											PreTag='div'
											{...props}>
											{String(children).replace(/\n$/, '')}
										</SyntaxHighlighter>
									) : (
										<code className={className} {...props}>
											{children}
										</code>
									)
								},
								img: (props: any) => (
									<img
										{...props}
										className='rounded-xl shadow-lg mx-auto'
										loading='lazy'
									/>
								),
							}}>
							{form.md}
						</ReactMarkdown>
					</article>
				)}
			</div>
		</motion.div>
	)
}