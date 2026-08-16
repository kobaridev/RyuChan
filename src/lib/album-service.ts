'use client'

import {
  readTextFileFromRepo,
  listRepoFilesRecursive,
  createBlob,
  createTree,
  createCommit,
  updateRef,
  getRef,
  getCommit,
  getTreeRecursive,
  type TreeItem,
} from '@/lib/github-client'
import { replaceIndividualFiles } from '@/lib/individual-files'
import { fileToBase64NoPrefix } from '@/lib/file-utils'
import { getAuthToken } from '@/lib/auth'
import { GITHUB_CONFIG } from '@/consts'
import { CONTENT_PATHS } from '@/lib/content-paths'
import yaml from 'js-yaml'
import { toast } from 'sonner'
import type { AlbumItem } from '@/data/albums'

export async function loadAlbumsFromGitHub(): Promise<AlbumItem[]> {
  let token: string | undefined
  try {
    token = await getAuthToken()
  } catch {
    // try public access
  }

  // 从内容仓库的独立 YAML 文件中加载相册
  let files: string[] = []
  try {
    files = await listRepoFilesRecursive(
      token,
      GITHUB_CONFIG.OWNER,
      GITHUB_CONFIG.REPO,
      CONTENT_PATHS.albumCategories,
      GITHUB_CONFIG.BRANCH,
    )
  } catch {
    return []
  }

  const yamlFiles = files.filter((f) => f.endsWith('.yaml')).sort()
  const albums: AlbumItem[] = []

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
      const data = yaml.load(content) as any
      if (data) {
        albums.push({
          id: data.id || filePath.split('/').pop()?.replace('.yaml', '') || '',
          date: data.date || '',
          event: data.event || data.title || '',
          title: data.title || '',
          description: data.description || '',
          icon: data.icon || '',
          photos: data.photos || [],
        })
      }
    } catch {
      // skip malformed
    }
  }

  return albums
}

/**
 * Save albums data to GitHub content repo.
 * Handles pending photo file uploads (newly added local files).
 * Photos with regular paths or external URLs are left unchanged.
 */
export async function saveAlbumsToGitHub(
  albums: AlbumItem[],
  pendingPhotos?: Record<string, { file: File; previewUrl: string }>,
): Promise<AlbumItem[]> {
  const token = await getAuthToken()
  const toastId = toast.loading('🚀 正在保存相册数据...')

  try {
    const treeItems: TreeItem[] = []

    // Deep clone so we can mutate photo srcs
    const albumsToSave: AlbumItem[] = JSON.parse(JSON.stringify(albums))

    // Handle pending photo uploads first
    if (pendingPhotos && Object.keys(pendingPhotos).length > 0) {
      let uploadCount = 0
      for (const [key, { file }] of Object.entries(pendingPhotos)) {
        // Key format: "albumId::photoIndex"
        const [albumId, photoIdxStr] = key.split('::')
        const photoIdx = parseInt(photoIdxStr)
        const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
        const timestamp = Date.now()
        const fileName = `${albumId}-${photoIdx}-${timestamp}.${ext}`
        const imagePath = `${CONTENT_PATHS.albumImages}/${fileName}`

        uploadCount++
        toast.loading(`正在上传照片 ${uploadCount}...`, { id: toastId })

        const base64Content = await fileToBase64NoPrefix(file)
        const { sha: blobSha } = await createBlob(
          token,
          GITHUB_CONFIG.OWNER,
          GITHUB_CONFIG.REPO,
          base64Content,
          'base64',
        )

        treeItems.push({
          path: imagePath,
          mode: '100644',
          type: 'blob',
          sha: blobSha,
        })

        // Update the photo src in the save copy
        const album = albumsToSave.find((a) => a.id === albumId)
        if (album?.photos && album.photos[photoIdx]) {
          album.photos[photoIdx].src = `/image/albums/${fileName}`
        }
      }
    }

    // Also handle any remaining data-URL photos not tracked in pendingPhotos
    for (const album of albumsToSave) {
      if (!album.photos) continue
      for (let i = 0; i < album.photos.length; i++) {
        const photo = album.photos[i]
        if (!photo.src.startsWith('data:')) continue

        const match = photo.src.match(/^data:image\/(\w+);base64,(.+)$/)
        if (!match) continue

        const ext = match[1] === 'jpeg' ? 'jpg' : match[1]
        const fileName = `${album.event}-${i}-${Date.now()}.${ext}`
        const imagePath = `${CONTENT_PATHS.albumImages}/${fileName}`

        toast.loading('正在上传照片...', { id: toastId })

        const { sha: blobSha } = await createBlob(
          token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO,
          match[2], 'base64',
        )

        treeItems.push({ path: imagePath, mode: '100644', type: 'blob', sha: blobSha })
        photo.src = `/image/albums/${fileName}`
      }
    }

    // Replace all individual album category YAML files
    toast.loading('正在生成相册文件...', { id: toastId })
    const fileTreeItems = await replaceIndividualFiles(
      token,
      CONTENT_PATHS.albumCategories,
      albumsToSave,
      (album: AlbumItem) => ({
        id: album.id,
        date: album.date,
        event: album.event,
        title: album.title,
        description: album.description,
        icon: album.icon,
        photos: album.photos,
      }),
    )
    treeItems.push(...fileTreeItems)

    // Get current branch state
    toast.loading('正在获取分支信息...', { id: toastId })
    const refName = `heads/${GITHUB_CONFIG.BRANCH}`
    const ref = await getRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, refName)
    const currentCommitSha = ref.sha

    const commit = await getCommit(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, currentCommitSha)
    const baseTreeSha = commit.tree.sha

    // Detect orphaned photo files — paths under albumImages that are no longer
    // referenced by the current albums data. We add sha:null items to remove
    // them from the tree when they were deleted in this edit session.
    toast.loading('🔍 正在检查已删除的照片...', { id: toastId })
    const currentTreeItems = await getTreeRecursive(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, baseTreeSha)

    const referencedImagePaths = new Set<string>()
    for (const album of albumsToSave) {
      for (const photo of album.photos || []) {
        if (photo.src.startsWith('/image/albums/')) {
          referencedImagePaths.add(`public${photo.src}`)
        }
      }
    }

    let removedCount = 0
    for (const item of currentTreeItems) {
      if (item.type !== 'blob') continue
      if (!item.path.startsWith(CONTENT_PATHS.albumImages + '/')) continue
      if (referencedImagePaths.has(item.path)) continue
      treeItems.push({
        path: item.path,
        mode: '100644',
        type: 'blob',
        sha: null,
      })
      removedCount++
    }
    if (removedCount > 0) {
      toast.loading(`🗑️ 发现 ${removedCount} 张已删除的照片，同步清理中...`, { id: toastId })
    }

    toast.loading('🌳 正在构建文件树...', { id: toastId })
    const { sha: newTreeSha } = await createTree(
      token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO,
      treeItems, baseTreeSha,
    )

    toast.loading('💾 正在提交更改...', { id: toastId })
    const { sha: newCommitSha } = await createCommit(
      token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO,
      'chore(albums): update albums data',
      newTreeSha,
      [currentCommitSha],
    )

    toast.loading('🔄 正在同步远程分支...', { id: toastId })
    await updateRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, refName, newCommitSha)

    toast.success('🎉 相册数据更新成功！', {
      id: toastId,
      description: '更改已推送到内容仓库，重新部署后即可生效。',
    })

    return albumsToSave
  } catch (error: any) {
    console.error(error)
    toast.error('❌ 保存失败', {
      id: toastId,
      description: error.message || '发生了未知错误，请重试',
    })
    throw error
  }
}