import { putFile } from '@/lib/github-client'
import { getAuthToken, getRepoAuthToken } from '@/lib/auth'
import { GITHUB_CONFIG, FRONTEND_REPO } from '@/consts'
import { toBase64Utf8 } from '@/lib/github-client'
import { toast } from 'sonner'

// About 页面编辑的是 Astro 模板代码（前端专属），
// 因此写入目标固定为前端仓库 RyuChan，而非内容仓库。
const ABOUT_FILE_PATH = 'src/pages/about.astro'

export async function saveAboutCodeToGitHub(code: string): Promise<void> {
  const token = await getRepoAuthToken(GITHUB_CONFIG.OWNER, FRONTEND_REPO)
  const toastId = toast.loading('🚀 正在保存关于页代码...')

  try {
    const base64Content = toBase64Utf8(code)

    await putFile(
      token,
      GITHUB_CONFIG.OWNER,
      FRONTEND_REPO,
      ABOUT_FILE_PATH,
      base64Content,
      'chore(about): update about page code',
      GITHUB_CONFIG.BRANCH,
    )

    toast.success('🎉 保存成功！', {
      id: toastId,
      description: '更改已推送到前端仓库，GitHub Actions 将更新页面。',
    })
  } catch (error: any) {
    console.error(error)
    toast.error('❌ 保存失败', {
      id: toastId,
      description: error.message || '发生未知错误',
    })
    throw error
  }
}