import { motion } from 'motion/react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { useWriteStore } from '../stores/write-store'
import { usePreviewStore } from '../stores/preview-store'
import { usePublish } from '../hooks/use-publish'

export function WriteActions() {
	const { loading, mode, form, loadBlogForEdit, originalSlug, updateForm } = useWriteStore()
	const { openPreview } = usePreviewStore()
	const { isAuth, onChoosePrivateKey, onPublish, onDelete } = usePublish()
	const [saving, setSaving] = useState(false)
	const keyInputRef = useRef<HTMLInputElement>(null)
	const mdInputRef = useRef<HTMLInputElement>(null)

	const handleImportOrPublish = () => {
		if (!isAuth) {
			keyInputRef.current?.click()
		} else {
			onPublish()
		}
	}

	const handleCancel = () => {
		if (!window.confirm('放弃本次修改吗？')) {
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
			toast.info('请先导入密钥')
			return
		}
		const confirmMsg = form?.title ? `确定删除《${form.title}》吗？该操作不可恢复。` : '确定删除当前文章吗？该操作不可恢复。'
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

		try {
			const text = await file.text()
			updateForm({ md: text })
			toast.success('已导入 Markdown 文件')
		} catch (error) {
			toast.error('导入失败，请重试')
		} finally {
			if (e.currentTarget) e.currentTarget.value = ''
		}
	}

	return (
		<>
			{loading && (
				<div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm dark:bg-black/80">
					<div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
					<div className="mt-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">处理中...</div>
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

			<ul className='absolute top-4 right-6 flex items-center gap-2'>
				{mode === 'edit' && (
					<>
						<motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} className='flex items-center gap-2'>
							<div className='rounded-lg border bg-blue-50 px-4 py-2 text-sm text-blue-700'>编辑模式</div>
						</motion.div>

						<motion.button
							initial={{ opacity: 0, scale: 0.6 }}
							animate={{ opacity: 1, scale: 1 }}
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							className='btn btn-sm btn-error btn-outline rounded-xl'
							disabled={loading}
							onClick={handleDelete}>
							删除
						</motion.button>

						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={handleCancel}
							disabled={saving}
							className='btn btn-sm btn-ghost rounded-xl'>
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
					onClick={handleImportMd}>
					导入 MD
				</motion.button>
				<motion.button
					initial={{ opacity: 0, scale: 0.6 }}
					animate={{ opacity: 1, scale: 1 }}
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					className='btn btn-sm btn-ghost rounded-xl'
					disabled={loading}
					onClick={openPreview}>
					预览
				</motion.button>
				<motion.button
					initial={{ opacity: 0, scale: 0.6 }}
					animate={{ opacity: 1, scale: 1 }}
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					className='btn btn-sm btn-primary rounded-xl px-6 shadow-lg shadow-primary/20'
					disabled={loading}
					onClick={handleImportOrPublish}>
					{buttonText}
				</motion.button>
			</ul>
		</>
	)
}
