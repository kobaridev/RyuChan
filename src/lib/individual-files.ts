import {
  listRepoFilesRecursive,
  createBlob,
  toBase64Utf8,
  type TreeItem,
} from './github-client'
import { GITHUB_CONFIG } from '@/consts'
import yaml from 'js-yaml'

/**
 * 生成替换目标目录中所有独立 YAML 文件的 tree items。
 *
 * 先删除目录下所有已存在的 .yaml 文件（sha: null），
 * 再为 items 数组中的每个元素生成新的 `01.yaml`, `02.yaml`, ...。
 *
 * @param token    - GitHub 认证 token
 * @param dirPath  - 内容仓库中的目录路径（如 'src/content/friends/list'）
 * @param items    - 要写入的数据数组
 * @param serializer - 可选，将每个 item 转换为要序列化的对象（如格式映射）
 * @returns 可合并到 commit tree 中的 TreeItem[]
 */
export async function replaceIndividualFiles<T>(
  token: string,
  dirPath: string,
  items: T[],
  serializer?: (item: T, index: number) => Record<string, unknown>,
): Promise<TreeItem[]> {
  const treeItems: TreeItem[] = []

  // 1. 删除目录下所有已存在的 .yaml 文件
  let existingFiles: string[] = []
  try {
    existingFiles = await listRepoFilesRecursive(
      token,
      GITHUB_CONFIG.OWNER,
      GITHUB_CONFIG.REPO,
      dirPath,
      GITHUB_CONFIG.BRANCH,
    )
  } catch {
    // 目录不存在或为空，忽略
  }

  for (const filePath of existingFiles.filter((f) => f.endsWith('.yaml'))) {
    treeItems.push({
      path: filePath,
      mode: '100644',
      type: 'blob',
      sha: null,
    })
  }

  // 2. 为每个 item 创建新的 .yaml 文件
  for (let i = 0; i < items.length; i++) {
    const filePath = `${dirPath}/${String(i + 1).padStart(2, '0')}.yaml`
    const data = serializer ? serializer(items[i], i) : items[i]
    const content = yaml.dump(data, { lineWidth: -1, noRefs: true })
    const base64Content = toBase64Utf8(content)
    const { sha: blobSha } = await createBlob(
      token,
      GITHUB_CONFIG.OWNER,
      GITHUB_CONFIG.REPO,
      base64Content,
      'base64',
    )
    treeItems.push({
      path: filePath,
      mode: '100644',
      type: 'blob',
      sha: blobSha,
    })
  }

  return treeItems
}