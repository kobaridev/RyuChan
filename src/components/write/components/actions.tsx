import { motion } from 'motion/react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { useWriteStore } from '../stores/write-store'
import { usePreviewStore } from '../stores/preview-store'
import { usePublish } from '../hooks/use-publish'
import { Eye, Monitor, FileText, Trash2, X, MoreVertical } from 'lucide-react'

export function WriteActions() {
	const { loading, mode, form, loadBlogForEdit, originalSlug, updateForm } = useWriteStore()
	const { openPreview, isInlinePreview, toggleInlinePreview } = usePreviewStore()
	const { isAuth, onChoosePrivateKey, onPublish, onDelete } = usePublish()
	const [saving, setSaving] = useState(false)
	const [menuOpen, setMenuOpen] = useState(false)
	const keyInputRef = useRef<HTMLInputElement>(null)
	const mdInputRef = useRef<HTMLInputElement>(null)

	const handleImportOrPublish = () => {
		if (!isAuth) {
			keyInputRef.current?.click()
		} else {
			const confirmMsg = mode === 'edit'
				? `确定更新《${form.title}》吗？这将直接推送到 GitHub 仓库。`
				: `确定发布《${form.title}》吗？这将直接推送到 GitHub 仓库。`

			if (window.confirm(confirmMsg)) {
				onPublish()
			}
		}
	}

	const handleCancel = () => {
		if (!window.confirm('确定放弃本次修改吗？未保存的内容将丢失。')) {
			return
		}
		if (mode === 'edit' && originalSlug) {
			window.location.href = `/blog/${originalSlug}`
		} else {
			window.location.href = '/'
		}
	}

	const buttonText = isAuth ? (mode === 'edit' ? '更新' : '发布') : '导入密钥'

	const handleDelete = () => {
		if (!isAuth) {
			toast.info('🔑 请先导入私钥以进行操作')
			return
		}
		const confirmMsg = form?.title ? `⚠️ 确定删除《${form.title}》吗？该操作不可恢复。` : '⚠️ 确定删除当前文章吗？该操作不可恢复。'
		if (window.confirm(confirmMsg)) {
			onDelete()
		}
	}

	const handleImportMd = () => {
		mdInputRef.current?.click()
	}

	const handleMdFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return

		if (form.md && !window.confirm('⚠️ 确定导入 Markdown 文件吗？这将覆盖当前编辑的内容。')) {
			if (e.currentTarget) e.currentTarget.value = ''
			return
		}

		try {
			const text = await file.text()
			updateForm({ md: text })
			toast.success('📄 Markdown 文件导入成功')
		} catch (error) {
			toast.error('❌ 导入失败，请重试')
		} finally {
			if (e.currentTarget) e.currentTarget.value = ''
		}
	}

	return (
		<>
			{loading && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm dark:bg-black/80">
					<div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg flex items-center gap-3">
						<div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
						<div className="text-base font-medium text-zinc-900 dark:text-zinc-100">处理中...</div>
					</div>
				</div>
			)}

			<input
				ref={keyInputRef}
				type='file'
				accept='.pem'
				className='hidden'
				onChange={async e => {
					const f = e.target.files?.[0]
					if (f) await onChoosePrivateKey(f)
					if (e.currentTarget) e.currentTarget.value = ''
				}}
			/>
			<input ref={mdInputRef} type='file' accept='.md' className='hidden' onChange={handleMdFileChange} />

			<div className='absolute top-2 md:top-4 right-2 md:right-6 left-2 md:left-6 flex items-center justify-between gap-2'>
				<div className='flex items-center gap-1.5'>
					{mode === 'edit' && (
						<motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} className='hidden md:flex items-center gap-2'>
							<div className='rounded-lg border bg-blue-50 px-4 py-2 text-sm text-blue-700'>编辑模式</div>
						</motion.div>
					)}
				</div>

				<div className='flex items-center gap-1 md:gap-2'>
					<motion.button
						initial={{ opacity: 0, scale: 0.6 }}
						animate={{ opacity: 1, scale: 1 }}
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						className='btn btn-xs md:btn-sm btn-ghost rounded-lg md:rounded-xl'
						disabled={loading}
						onClick={openPreview}
						title='全屏预览'>
						<Monitor className="w-3.5 h-3.5 md:w-4 md:h-4" />
						<span className='hidden md:inline ml-1'>全屏</span>
					</motion.button>

					<motion.button
						initial={{ opacity: 0, scale: 0.6 }}
						animate={{ opacity: 1, scale: 1 }}
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						className={`btn btn-xs md:btn-sm rounded-lg md:rounded-xl ${isInlinePreview ? 'btn-primary/20 text-primary' : 'btn-ghost'}`}
						disabled={loading}
						onClick={toggleInlinePreview}
						title={isInlinePreview ? '关闭双栏预览' : '开启双栏预览'}>
						<Eye className="w-3.5 h-3.5 md:w-4 md:h-4" />
						<span className='hidden md:inline ml-1'>{isInlinePreview ? '双栏中' : '双栏'}</span>
					</motion.button>

					<div className='md:hidden relative'>
						<button
							className='btn btn-xs btn-ghost rounded-lg'
							onClick={() => setMenuOpen(!menuOpen)}
							title='更多操作'>
							<MoreVertical className='w-4 h-4' />
						</button>
						{menuOpen && (
							<>
								<div className='fixed inset-0 z-40' onClick={() => setMenuOpen(false)} />
								<div className='absolute right-0 top-full mt-1 z-50 bg-base-100 border border-base-200 rounded-xl shadow-lg py-1 min-w-[120px]'>
									{mode === 'edit' && (
										<>
											<button
												onClick={() => { handleDelete(); setMenuOpen(false) }}
												className='flex items-center gap-2 w-full px-3 py-2 text-left text-xs hover:bg-base-200 text-error'>
												<Trash2 className='w-3.5 h-3.5' />
												删除文章
											</button>
											<button
												onClick={() => { handleCancel(); setMenuOpen(false) }}
												className='flex items-center gap-2 w-full px-3 py-2 text-left text-xs hover:bg-base-200'>
												<X className='w-3.5 h-3.5' />
												取消
											</button>
										</>
									)}
									<button
										onClick={() => { handleImportMd(); setMenuOpen(false) }}
										className='flex items-center gap-2 w-full px-3 py-2 text-left text-xs hover:bg-base-200'>
										<FileText className='w-3.5 h-3.5' />
										导入 MD
									</button>
								</div>
							</>
						)}
					</div>

					<div className='hidden md:flex items-center gap-2'>
						{mode === 'edit' && (
							<>
								<motion.button
									initial={{ opacity: 0, scale: 0.6 }}
									animate={{ opacity: 1, scale: 1 }}
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.95 }}
									className='btn btn-sm btn-error btn-outline rounded-xl'
									disabled={loading}
									onClick={handleDelete}
									title='删除文章'>
									删除
								</motion.button>

								<motion.button
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.95 }}
									onClick={handleCancel}
									disabled={saving}
									className='btn btn-sm btn-ghost rounded-xl'
									title='取消'>
									取消
								</motion.button>
							</>
						)}

						<motion.button
							initial={{ opacity: 0, scale: 0.6 }}
							animate={{ opacity: 1, scale: 1 }}
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							className='btn btn-sm btn-ghost rounded-xl'
							disabled={loading}
							onClick={handleImportMd}
							title='导入 Markdown'>
							导入 MD
						</motion.button>
					</div>

					<motion.button
						initial={{ opacity: 0, scale: 0.6 }}
						animate={{ opacity: 1, scale: 1 }}
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						className='btn btn-xs md:btn-sm btn-primary rounded-lg md:rounded-xl px-3 md:px-6 shadow-lg shadow-primary/20 font-semibold'
						disabled={loading}
						onClick={handleImportOrPublish}>
						{buttonText}
					</motion.button>
				</div>
			</div>
		</>
	)
}