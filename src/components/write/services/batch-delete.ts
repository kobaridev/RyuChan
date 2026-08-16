import { toast } from 'sonner'
import { getAuthToken } from '@/lib/auth'
import { GITHUB_CONFIG } from '@/consts'
import { CONTENT_PATHS } from '@/lib/content-paths'
import { createCommit, createTree, getCommit, getRef, listRepoFilesRecursive, listRepoDir, type TreeItem, updateRef } from '@/lib/github-client'

export async function batchDeleteBlogs(slugs: string[]): Promise<void> {
	if (!slugs || slugs.length === 0) throw new Error('需要 slugs')

	const token = await getAuthToken()
    const toastId = toast.loading('正在初始化删除操作...')

    try {
        toast.loading('正在获取分支信息...', { id: toastId })
        const refData = await getRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`)
        const latestCommitSha = refData.sha
        
        // 获取当前提交的 Tree SHA
        const commitData = await getCommit(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, latestCommitSha)
        const baseTreeSha = commitData.tree.sha

        // 获取博客目录文件列表，用于不区分大小写匹配
        toast.loading('正在扫描博客文件...', { id: toastId })
        const blogFiles = await listRepoFilesRecursive(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, CONTENT_PATHS.blogSrc, GITHUB_CONFIG.BRANCH)
        
        // 获取图片根目录列表，用于查找对应的 slug 目录
        const imagesRootDir = await listRepoDir(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, CONTENT_PATHS.blogImages, GITHUB_CONFIG.BRANCH)

        const treeItems: TreeItem[] = []

        for (const slug of slugs) {
            toast.loading(`正在处理: ${slug}...`, { id: toastId })
            
            // 1. 处理图片
            // 在 public/images 下寻找名字匹配 slug 的目录 (忽略大小写)
            const targetDirItem = imagesRootDir.find((item: any) => item.name.toLowerCase() === slug.toLowerCase() && item.type === 'dir')
            
            if (targetDirItem) {
                // 如果找到了目录，递归列出该目录下的所有文件
                const slugImages = await listRepoFilesRecursive(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, targetDirItem.path, GITHUB_CONFIG.BRANCH)
                for (const path of slugImages) {
                    treeItems.push({
                        path,
                        mode: '100644',
                        type: 'blob',
                        sha: null // Delete
                    })
                }
            }
            
            // 2. 处理文章文件 (.md 或 .mdx)
            const mdPath = `${CONTENT_PATHS.blogSrc}/${slug}.md`
            const mdxPath = `${CONTENT_PATHS.blogSrc}/${slug}.mdx`
            
            // 在 blogFiles 中查找匹配的路径 (忽略大小写)
            const foundMd = blogFiles.find(path => path.toLowerCase() === mdPath.toLowerCase())
            if (foundMd) {
                treeItems.push({
                    path: foundMd,
                    mode: '100644',
                    type: 'blob',
                    sha: null
                })
            }

            const foundMdx = blogFiles.find(path => path.toLowerCase() === mdxPath.toLowerCase())
            if (foundMdx) {
                treeItems.push({
                    path: foundMdx,
                    mode: '100644',
                    type: 'blob',
                    sha: null
                })
            }
            
            if (!foundMd && !foundMdx) {
                console.warn(`未找到文章文件: ${slug}`)
            }
        }

        if (treeItems.length === 0) {
            toast.info('没有需要删除的文件', { id: toastId })
            return
        }

        toast.loading('正在创建文件树...', { id: toastId })
        const treeData = await createTree(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, treeItems, baseTreeSha)
        
        const message = slugs.length === 1 ? `删除文章: ${slugs[0]}` : `批量删除文章: ${slugs.length} 篇`
        toast.loading('正在创建提交...', { id: toastId })
        const newCommitData = await createCommit(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, message, treeData.sha, [latestCommitSha])

        toast.loading('正在更新分支...', { id: toastId })
        await updateRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`, newCommitData.sha)

        toast.success('批量删除成功！请等待页面部署后刷新', { id: toastId })
    } catch (error: any) {
        console.error(error)
        toast.error(error.message || '删除失败', { id: toastId })
        throw error
    }
}
