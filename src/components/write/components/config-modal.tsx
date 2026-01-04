import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getAuthToken } from '@/lib/auth'
import { GITHUB_CONFIG } from '@/consts'
import { readTextFileFromRepo, putFile } from '@/lib/github-client'
import { toBase64Utf8 } from '@/lib/github-client'

// Since we don't have a UI library ready in the context, I'll build a simple modal using Tailwind
export function ConfigModal({ open, onClose }: { open: boolean; onClose: () => void }) {
	const [configContent, setConfigContent] = useState('')
	const [loading, setLoading] = useState(false)
	const [saving, setSaving] = useState(false)

	useEffect(() => {
		if (open) {
			loadConfig()
		}
	}, [open])

	const loadConfig = async () => {
		try {
			setLoading(true)
			const token = await getAuthToken()
			const content = await readTextFileFromRepo(
				token,
				GITHUB_CONFIG.OWNER,
				GITHUB_CONFIG.REPO,
				'ryuchan.config.yaml',
				GITHUB_CONFIG.BRANCH
			)
			if (content) {
				setConfigContent(content)
			} else {
				toast.error('未找到配置文件')
			}
		} catch (error: any) {
			toast.error('加载配置失败: ' + error.message)
		} finally {
			setLoading(false)
		}
	}

	const handleSave = async () => {
		try {
			setSaving(true)
			const token = await getAuthToken()
			await putFile(
				token,
				GITHUB_CONFIG.OWNER,
				GITHUB_CONFIG.REPO,
				'ryuchan.config.yaml',
				toBase64Utf8(configContent), // Base64 encode
				'update: ryuchan.config.yaml',
				GITHUB_CONFIG.BRANCH
			)
			toast.success('配置已更新！等待部署生效')
			onClose()
		} catch (error: any) {
			toast.error('保存配置失败: ' + error.message)
		} finally {
			setSaving(false)
		}
	}

	if (!open) return null

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
			<div className="w-full max-w-4xl rounded-xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
				<div className="mb-4 flex items-center justify-between">
					<h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">修改站点配置 (ryuchan.config.yaml)</h2>
					<button onClick={onClose} className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
						✕
					</button>
				</div>

				{loading ? (
					<div className="flex h-64 items-center justify-center">加载中...</div>
				) : (
					<textarea
						className="h-[60vh] w-full rounded-lg border border-zinc-200 bg-zinc-50 p-4 font-mono text-sm text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
						value={configContent}
						onChange={(e) => setConfigContent(e.target.value)}
						spellCheck={false}
					/>
				)}

				<div className="mt-4 flex justify-end gap-3">
					<button
						onClick={onClose}
						className="rounded-lg px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
					>
						取消
					</button>
					<button
						onClick={handleSave}
						disabled={saving || loading}
						className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
					>
						{saving ? '保存中...' : '保存配置'}
					</button>
				</div>
			</div>
		</div>
	)
}
