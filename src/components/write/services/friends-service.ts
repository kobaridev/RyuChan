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
import type { FriendItem } from '@/interface/friend'

export async function loadFriendsFromGitHub(): Promise<FriendItem[]> {
  let token: string | undefined
  try {
    token = await getAuthToken()
  } catch {
    // try public access
  }

  // 从内容仓库的独立 YAML 文件中加载友链
  let files: string[] = []
  try {
    files = await listRepoFilesRecursive(
      token,
      GITHUB_CONFIG.OWNER,
      GITHUB_CONFIG.REPO,
      CONTENT_PATHS.friendsList,
      GITHUB_CONFIG.BRANCH,
    )
  } catch {
    return []
  }

  const yamlFiles = files.filter((f) => f.endsWith('.yaml')).sort()
  const friends: FriendItem[] = []

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
      const data = yaml.load(content) as FriendItem
      if (data && data.name) {
        friends.push(data)
      }
    } catch {
      // skip malformed
    }
  }

  return friends
}

export async function saveFriendsToGitHub(
  friends: FriendItem[],
  pendingAvatars?: Record<number, { file: File; previewUrl: string }>,
): Promise<void> {
  const token = await getAuthToken()
  const toastId = toast.loading('🚀 正在保存友链数据...')

  try {
    const treeItems: TreeItem[] = []

    // 1. Handle avatar image uploads — store in content repo
    if (pendingAvatars && Object.keys(pendingAvatars).length > 0) {
      for (const [indexStr, { file }] of Object.entries(pendingAvatars)) {
        const index = parseInt(indexStr)
        const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
        const avatarPath = `${CONTENT_PATHS.friendsAvatars}/avatar-${index}.${ext}`

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

        friends[index].avatar = `/images/friends/avatar-${index}.${ext}`
      }
    }

    // 2. Replace all individual friend YAML files
    toast.loading('正在生成友链文件...', { id: toastId })
    const fileTreeItems = await replaceIndividualFiles(
      token,
      CONTENT_PATHS.friendsList,
      friends,
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
      'chore(friends): update friends data',
      newTreeSha,
      [currentCommitSha],
    )

    toast.loading('🔄 正在同步远程分支...', { id: toastId })
    await updateRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, refName, newCommitSha)

    toast.success('🎉 友链数据更新成功！', {
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