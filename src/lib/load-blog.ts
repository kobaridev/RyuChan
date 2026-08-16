import { getAuthToken, hasAuth } from './auth'
import { readTextFileFromRepo, listRepoFilesRecursive } from './github-client'
import { GITHUB_CONFIG } from '@/consts'
import { CONTENT_PATHS } from '@/lib/content-paths'
import { parseFrontmatter } from './frontmatter'
import type { PublishForm } from '@/components/write/types'
import dayjs from 'dayjs'

export async function loadBlog(slug: string): Promise<{ form: PublishForm, cover?: string }> {
    let token: string | undefined
    if (await hasAuth()) {
        try {
            token = await getAuthToken()
        } catch (e) {
            console.warn('Failed to get auth token, trying public access', e)
        }
    }
    
    let path = `${CONTENT_PATHS.blogSrc}/${slug}.md`
    let content = await readTextFileFromRepo(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, path, GITHUB_CONFIG.BRANCH)
    
    if (!content) {
         path = `${CONTENT_PATHS.blogSrc}/${slug}.mdx`
         content = await readTextFileFromRepo(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, path, GITHUB_CONFIG.BRANCH)
    }

    // Fallback: Case-insensitive search
    if (!content) {
        try {
            const files = await listRepoFilesRecursive(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, CONTENT_PATHS.blogSrc, GITHUB_CONFIG.BRANCH)
            const targetMd = `/${slug}.md`.toLowerCase()
            const targetMdx = `/${slug}.mdx`.toLowerCase()
            
            const foundPath = files.find(f => {
                const lower = f.toLowerCase()
                return lower.endsWith(targetMd) || lower.endsWith(targetMdx)
            })

            if (foundPath) {
                path = foundPath
                content = await readTextFileFromRepo(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, path, GITHUB_CONFIG.BRANCH)
            }
        } catch (e) {
            console.warn('Failed to list repo files for fallback search', e)
        }
    }

    if (!content) {
        throw new Error('Blog not found')
    }

    const { data, content: md } = parseFrontmatter(content)

    // 根据文件路径确定文件格式
    const fileFormat = path.endsWith('.mdx') ? 'mdx' : 'md';

    const form: PublishForm = {
        slug,
        title: data.title || '',
        md: md || '',
        tags: data.tags || [],
        date: data.pubDate ? dayjs(data.pubDate).format('YYYY-MM-DDTHH:mm') : '',
        summary: data.description || '',
        hidden: data.draft || false,
        categories: data.categories || [],
        badge: data.badge || '',
        fileFormat
    }

    return { form, cover: data.image }
}
