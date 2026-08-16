import { toast } from 'sonner'
import { getAuthToken } from '@/lib/auth'
import { GITHUB_CONFIG } from '@/consts'
import { CONTENT_PATHS } from '@/lib/content-paths'
import { createCommit, createTree, getRef, getCommit, listRepoFilesRecursive, listRepoDir, type TreeItem, updateRef } from '@/lib/github-client'

export async function deleteBlog(slug: string): Promise<void> {
	if (!slug) throw new Error('需要 slug')

	const token = await getAuthToken()
    const toastId = toast.loading('正在初始化删除...')

    try {
        toast.loading('正在获取分支信息...', { id: toastId })
        const refData = await getRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`)
        const latestCommitSha = refData.sha

        // 获取当前提交对应的 tree SHA，作为创建 tree 的 base
        const commitData = await getCommit(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, latestCommitSha)
        const baseTreeSha = commitData.tree.sha

        // 获取博客文件列表用于忽略大小写匹配
        toast.loading('正在扫描博客文件...', { id: toastId })
        const blogFiles = await listRepoFilesRecursive(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, CONTENT_PATHS.blogSrc, GITHUB_CONFIG.BRANCH)

        // 在 public/images 下寻找名字匹配 slug 的目录 (忽略大小写)
        const imagesRootDir = await listRepoDir(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, CONTENT_PATHS.blogImages, GITHUB_CONFIG.BRANCH)

        const treeItems: TreeItem[] = []

        if (Array.isArray(imagesRootDir) && imagesRootDir.length > 0) {
            const targetDirItem = imagesRootDir.find((item: any) => item.name.toLowerCase() === slug.toLowerCase() && item.type === 'dir')
            if (targetDirItem) {
                const slugImages = await listRepoFilesRecursive(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, targetDirItem.path, GITHUB_CONFIG.BRANCH)
                for (const path of slugImages) {
                    treeItems.push({ path, mode: '100644', type: 'blob', sha: null })
                }
            }
        }

        // 在 blogFiles 中查找匹配的路径 (忽略大小写)
        const mdPath = `${CONTENT_PATHS.blogSrc}/${slug}.md`
        const mdxPath = `${CONTENT_PATHS.blogSrc}/${slug}.mdx`
        const foundMd = blogFiles.find(path => path.toLowerCase() === mdPath.toLowerCase())
        if (foundMd) {
            treeItems.push({ path: foundMd, mode: '100644', type: 'blob', sha: null })
        }
        const foundMdx = blogFiles.find(path => path.toLowerCase() === mdxPath.toLowerCase())
        if (foundMdx) {
            treeItems.push({ path: foundMdx, mode: '100644', type: 'blob', sha: null })
        }

        if (treeItems.length === 0) {
            toast.info('没有找到需要删除的文件', { id: toastId })
            return
        }

        toast.loading('正在创建文件树...', { id: toastId })
        const treeData = await createTree(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, treeItems, baseTreeSha)
        
        toast.loading('正在创建提交...', { id: toastId })
        const newCommitData = await createCommit(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `删除文章: ${slug}`, treeData.sha, [latestCommitSha])

        toast.loading('正在更新分支...', { id: toastId })
        await updateRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`, newCommitData.sha)

        toast.success('删除成功！请等待部署完成后刷新页面', { id: toastId })
    } catch (error: any) {
        console.error(error)
        toast.error(error.message || '删除失败', { id: toastId })
        throw error
    }
}
