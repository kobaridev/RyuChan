import {
  readTextFileFromRepo,
  listRepoFilesRecursive,
  createBlob,
  createTree,
  createCommit,
  updateRef,
  getRef,
  getCommit,
  type TreeItem,
} from '@/lib/github-client'
import { replaceIndividualFiles } from '@/lib/individual-files'
import { fileToBase64NoPrefix } from '@/lib/file-utils'
import { getAuthToken } from '@/lib/auth'
import { GITHUB_CONFIG } from '@/consts'
import { CONTENT_PATHS } from '@/lib/content-paths'
import yaml from 'js-yaml'
import { toast } from 'sonner'
import type { ProjectItem } from '@/interface/project'

export async function loadProjectsFromGitHub(): Promise<ProjectItem[]> {
  let token: string | undefined
  try {
    token = await getAuthToken()
  } catch {
    // try public access
  }

  // 从内容仓库的独立 YAML 文件中加载项目
  let files: string[] = []
  try {
    files = await listRepoFilesRecursive(
      token,
      GITHUB_CONFIG.OWNER,
      GITHUB_CONFIG.REPO,
      CONTENT_PATHS.projectSrc,
      GITHUB_CONFIG.BRANCH,
    )
  } catch {
    return []
  }

  const yamlFiles = files.filter((f) => f.endsWith('.yaml')).sort()
  const projects: ProjectItem[] = []

  for (const filePath of yamlFiles) {
    const content = await readTextFileFromRepo(
      token,
      GITHUB_CONFIG.OWNER,
      GITHUB_CONFIG.REPO,
      filePath,
      GITHUB_CONFIG.BRANCH,
    )
    if (!content) continue
    try {
      const data = yaml.load(content) as ProjectItem
      if (data && data.name) {
        projects.push(data)
      }
    } catch {
      // skip malformed
    }
  }

  return projects
}

export async function saveProjectsToGitHub(
  projects: ProjectItem[],
  pendingAvatars?: Record<number, { file: File; previewUrl: string }>,
): Promise<void> {
  const token = await getAuthToken()
  const toastId = toast.loading('🚀 正在保存项目数据...')

  try {
    const treeItems: TreeItem[] = []

    // 1. Handle avatar image uploads — store in content repo
    if (pendingAvatars && Object.keys(pendingAvatars).length > 0) {
      for (const [indexStr, { file }] of Object.entries(pendingAvatars)) {
        const index = parseInt(indexStr)
        const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
        const avatarPath = `${CONTENT_PATHS.projectAvatars}/avatar-${index}.${ext}`

        toast.loading(`正在上传头像 ${index + 1}...`, { id: toastId })

        const base64Content = await fileToBase64NoPrefix(file)
        const { sha: blobSha } = await createBlob(
          token,
          GITHUB_CONFIG.OWNER,
          GITHUB_CONFIG.REPO,
          base64Content,
          'base64',
        )

        treeItems.push({
          path: avatarPath,
          mode: '100644',
          type: 'blob',
          sha: blobSha,
        })

        // Update project avatar to the new path (strip public/ for Astro serving)
        projects[index].avatar = `/images/projects/avatar-${index}.${ext}`
      }
    }

    // 2. Replace all individual project YAML files
    toast.loading('正在生成项目文件...', { id: toastId })
    const fileTreeItems = await replaceIndividualFiles(
      token,
      CONTENT_PATHS.projectSrc,
      projects,
    )
    treeItems.push(...fileTreeItems)

    // 3. Commit
    toast.loading('正在获取分支信息...', { id: toastId })
    const refName = `heads/${GITHUB_CONFIG.BRANCH}`
    const ref = await getRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, refName)
    const currentCommitSha = ref.sha

    const commit = await getCommit(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, currentCommitSha)
    const baseTreeSha = commit.tree.sha

    toast.loading('🌳 正在构建文件树...', { id: toastId })
    const { sha: newTreeSha } = await createTree(
      token,
      GITHUB_CONFIG.OWNER,
      GITHUB_CONFIG.REPO,
      treeItems,
      baseTreeSha,
    )

    toast.loading('💾 正在提交更改...', { id: toastId })
    const { sha: newCommitSha } = await createCommit(
      token,
      GITHUB_CONFIG.OWNER,
      GITHUB_CONFIG.REPO,
      'chore(projects): update projects data',
      newTreeSha,
      [currentCommitSha],
    )

    toast.loading('🔄 正在同步远程分支...', { id: toastId })
    await updateRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, refName, newCommitSha)

    toast.success('🎉 项目数据更新成功！', {
      id: toastId,
      description: '更改已推送到内容仓库，重新部署后即可生效。',
    })
  } catch (error: any) {
    console.error(error)
    toast.error('❌ 保存失败', {
      id: toastId,
      description: error.message || '发生了未知错误，请重试',
    })
    throw error
  }
}