import { useEffect, useState, useRef } from 'react'
import { toast, Toaster } from 'sonner'
import { getAuthToken } from '@/lib/auth'
import { GITHUB_CONFIG } from '@/consts'
import { CONTENT_PATHS } from '@/lib/content-paths'
import { synthesizeConfig, buildConfigTreeItems } from '@/lib/config-synthesis'
import {
    readTextFileFromRepo,
    putFile,
    toBase64Utf8,
    createBlob,
    createTree,
    createCommit,
    updateRef,
    getRef,
    getCommit,
    type TreeItem
} from '@/lib/github-client'
import yaml from 'js-yaml'
import { useAuthStore } from './hooks/use-auth'
import { readFileAsText, fileToBase64NoPrefix } from '@/lib/file-utils'
import { CustomSelect } from './components/ui/custom-select'

// Common social icons mapping
const SOCIAL_PRESETS = [
    { label: 'Baidutieba', value: 'ri:baidu-line' },
    { label: 'Bilibili', value: 'ri:bilibili-line' },
    { label: 'CloudMusic', value: 'ri:netease-cloud-music-line' },
    { label: 'Discord', value: 'ri:discord-line' },
    { label: 'Douban', value: 'ri:douban-line' },
    { label: 'Douyin', value: 'ri:tiktok-line' },
    { label: 'Email', value: 'ri:mail-line' },
    { label: 'Facebook', value: 'ri:facebook-line' },
    { label: 'Github', value: 'ri:github-line' },
    { label: 'GitLab', value: 'ri:gitlab-line' },
    { label: 'Instagram', value: 'ri:instagram-line' },
    { label: 'LinkedIn', value: 'ri:linkedin-box-line' },
    { label: 'Mastodon', value: 'ri:mastodon-line' },
    { label: 'Other', value: 'ri:link' },
    { label: 'Pixiv', value: 'simple-icons:pixiv' },
    { label: 'QQ', value: 'ri:qq-line' },
    { label: 'Reddit', value: 'ri:reddit-line' },
    { label: 'Rednote', value: 'simple-icons:xiaohongshu' },
    { label: 'RSS', value: 'ri:rss-fill' },
    { label: 'Spotify', value: 'ri:spotify-line' },
    { label: 'Steam', value: 'ri:steam-line' },
    { label: 'Telegram', value: 'ri:telegram-line' },
    { label: 'Twitch', value: 'ri:twitch-line' },
    { label: 'Twitter (X)', value: 'ri:twitter-line' },
    { label: 'WeChat', value: 'ri:wechat-fill' },
    { label: 'Weibo', value: 'ri:weibo-fill' },
    { label: 'Xianyu', value: 'ri:shopping-bag-line' },
    { label: 'YouTube', value: 'ri:youtube-line' },
    { label: 'Zhihu', value: 'ri:zhihu-line' },
]

const COMMENT_PROVIDERS = [
    { value: 'giscus', label: 'Giscus' },
    { value: 'waline', label: 'Waline' },
    { value: 'twikoo', label: 'Twikoo' }
]

export function ConfigPage() {
    const [configContent, setConfigContent] = useState('')
    const [lastFetchedContent, setLastFetchedContent] = useState<string | null>(null)
    const [isDirty, setIsDirty] = useState(false)
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [mode, setMode] = useState<'visual' | 'code'>('visual')
    const [parsedConfig, setParsedConfig] = useState<any>(null)
    const { isAuth, setPrivateKey } = useAuthStore()
    const keyInputRef = useRef<HTMLInputElement>(null)

    // Image upload state
    const [uploadingImage, setUploadingImage] = useState(false)
    const [uploadTarget, setUploadTarget] = useState<string>('')
    const imageInputRef = useRef<HTMLInputElement>(null)
    // 缓存待上传图片 { [targetKey]: { file, previewUrl } }
    const [pendingImages, setPendingImages] = useState<Record<string, { file: File, previewUrl: string }>>({})

    // 歌单选中状态 - 用于歌单连续上下移动
    const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null)

    // music.json 相关状态
    const [musicData, setMusicData] = useState<any>(null)
    const [musicDataDirty, setMusicDataDirty] = useState(false)
    // 自定义歌单的原始 JSON 文本（未解析），解决编辑时 JSON 解析失败导致输入无法更新的问题
    const [customPlaylistText, setCustomPlaylistText] = useState<Record<string, string>>({})

    useEffect(() => {
        loadConfig()
    }, [isAuth])

    useEffect(() => {
        // 从服务端注入的歌单数据初始化
        const serverPlaylists = (window as any).__SERVER_PLAYLISTS__
        if (serverPlaylists && Array.isArray(serverPlaylists) && serverPlaylists.length > 0) {
            setParsedConfig((prev: any) => {
                if (!prev) return { music: { playlists: serverPlaylists } }
                if (!prev.music?.playlists?.length) {
                    return { ...prev, music: { ...prev.music, playlists: serverPlaylists } }
                }
                return prev
            })
        }
    }, [])

    useEffect(() => {
        if (configContent && mode === 'visual') {
            try {
                const parsed = yaml.load(configContent) as any
                // 确保 music 配置结构完整
                if (!parsed.music) parsed.music = { api: 'https://163.hyc.moe', playlists: [] }
                if (!parsed.music.api) parsed.music.api = 'https://163.hyc.moe'
                if (!parsed.music.playlists) parsed.music.playlists = []
                setParsedConfig(parsed)
            } catch (e) {
                console.error(e)
                toast.error('YAML 解析失败，已切换回代码模式')
                setMode('code')
            }
        }
    }, [configContent, mode])



    const loadMusicData = async () => {
        try {
            let content: string | null | undefined

            // 1. 优先尝试本地 fetch（比 GitHub 快得多）
            try {
                const localRes = await fetch('/data/music.json')
                if (localRes.ok) {
                    content = await localRes.text()
                    console.log('Loaded music.json from local file')
                }
            } catch (e) {
                console.log('Local music.json not available')
            }

            // 2. GitHub 作为后备
            if (!content) {
                let token: string | undefined
                try {
                    token = await getAuthToken()
                } catch (e) {
                    console.log('Public access mode for music data')
                }

                try {
                    content = await readTextFileFromRepo(
                        token,
                        GITHUB_CONFIG.OWNER,
                        GITHUB_CONFIG.REPO,
                        'src/data/music.json',
                        GITHUB_CONFIG.BRANCH
                    )
                    if (content) {
                        console.log('Loaded music.json from GitHub content repo')
                    }
                } catch (e) {
                    console.log('GitHub music.json fetch failed, trying local...')
                }
            }

            if (content) {
                const parsed = JSON.parse(content)
                setMusicData(parsed)
            }
        } catch (error) {
            console.error('加载 music.json 失败:', error)
        }
    }

    const loadConfig = async () => {
        try {
            setLoading(true)
            let content: string | null | undefined

            // 1. 优先从服务器注入获取（config.astro 在构建时读取本地文件注入，无需网络）
            if ((window as any).__SERVER_CONFIG__) {
                content = (window as any).__SERVER_CONFIG__
                console.log('Loaded config from server injection')
            }

            // 2. 尝试本地 fetch（dev 模式可能不可用，但值得一试）
            if (!content) {
                try {
                    const localRes = await fetch('/ryuchan.config.yaml')
                    if (localRes.ok) {
                        content = await localRes.text()
                        console.log('Loaded config from local file')
                    }
                } catch (e) {
                    console.log('Local config not available')
                }
            }

            // 3. 最后尝试从 GitHub 内容仓各模块 config.yaml 合成
            if (!content) {
                let token: string | undefined
                try {
                    token = await getAuthToken()
                } catch (e) {
                    console.log('Public access mode')
                }

                try {
                    const synthesized = await synthesizeConfig(token)
                    if (synthesized && Object.keys(synthesized).length > 0) {
                        content = yaml.dump(synthesized, { lineWidth: -1, noRefs: true })
                        console.log('Loaded config from GitHub content repo (synthesized from modules)')
                    }
                } catch (e) {
                    console.log('GitHub config synthesis failed, using local config...')
                }
            }

            if (content) {
                if (isDirty) {
                    toast.info('检测到本地未保存更改，已跳过远程配置覆盖')
                } else {
                    setConfigContent(content)
                    try {
                        const parsed = yaml.load(content) as any
                        if (!parsed.music) parsed.music = { api: 'https://163.hyc.moe', playlists: [] }
                        if (!parsed.music.api) parsed.music.api = 'https://163.hyc.moe'
                        if (!parsed.music.playlists) parsed.music.playlists = []
                        // 如果远程配置没有歌单，使用服务端注入的本地歌单
                        if (parsed.music.playlists.length === 0) {
                            const serverPlaylists = (window as any).__SERVER_PLAYLISTS__
                            if (serverPlaylists && Array.isArray(serverPlaylists) && serverPlaylists.length > 0) {
                                parsed.music.playlists = serverPlaylists
                            }
                        }
                        setParsedConfig(parsed)
                    } catch (e) {
                        console.error(e)
                    }
                }
                setLastFetchedContent(content)
            }

            // 后台静默加载 music.json（不阻塞页面渲染）
            loadMusicData().catch(console.error)
        } catch (error: any) {
            toast.error('加载配置失败: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    const updateConfigValue = (path: string, value: any) => {
        const baseConfig = parsedConfig || {}
        console.log('[ConfigPage] updateConfigValue', path, value)
        const newConfig = JSON.parse(JSON.stringify(baseConfig))
        const parts = path.split('.')
        let current = newConfig
        for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) current[parts[i]] = {}
            current = current[parts[i]]
        }
        current[parts[parts.length - 1]] = value
        setParsedConfig(newConfig)
        // no localTitleType sync here; UI derives from parsedConfig
        setConfigContent(yaml.dump(newConfig))
        setIsDirty(true)
    }

    const handleSetTitleType = (value: 'image' | 'text') => {
        const baseConfig = parsedConfig || {}
        const newConfig = JSON.parse(JSON.stringify(baseConfig))
        if (!newConfig.site) newConfig.site = {}
        newConfig.site.title_type = value
        newConfig.site.titleType = value
        setParsedConfig(newConfig)
        setConfigContent(yaml.dump(newConfig))
        setIsDirty(true)
    }

    useEffect(() => {
        // Debug helper: allow calling from page context to directly set title_type
        ; (window as any).__updateSiteTitleType = (v: 'image' | 'text') => {
            const baseConfig = parsedConfig || {}
            const newConfig = JSON.parse(JSON.stringify(baseConfig))
            if (!newConfig.site) newConfig.site = {}
            newConfig.site.title_type = v
            newConfig.site.titleType = v
            setParsedConfig(newConfig)
            setConfigContent(yaml.dump(newConfig))
            setIsDirty(true)
        }
        return () => { try { delete (window as any).__updateSiteTitleType } catch (e) { } }
    }, [parsedConfig])


    const handleSocialChange = (index: number, field: string, value: any) => {
        const social = [...(parsedConfig?.user?.sidebar?.social || [])]
        if (!social[index]) social[index] = {}
        social[index][field] = value

        // Auto-set title/ariaLabel when icon changes
        if (field === 'svg') {
            const preset = SOCIAL_PRESETS.find(p => p.value === value)
            if (preset) {
                social[index].title = preset.label
                social[index].ariaLabel = preset.label
            }
        }

        updateConfigValue('user.sidebar.social', social)
    }

    const addSocial = () => {
        const social = [...(parsedConfig?.user?.sidebar?.social || [])]
        social.push({
            href: '',
            title: 'New Link',
            ariaLabel: 'New Link',
            svg: 'ri:link'
        })
        updateConfigValue('user.sidebar.social', social)
    }

    const removeSocial = (index: number) => {
        const social = [...(parsedConfig?.user?.sidebar?.social || [])]
        social.splice(index, 1)
        updateConfigValue('user.sidebar.social', social)
    }

    const moveSocial = (index: number, direction: 'up' | 'down') => {
        const social = [...(parsedConfig?.user?.sidebar?.social || [])]
        if (direction === 'up' && index > 0) {
            [social[index], social[index - 1]] = [social[index - 1], social[index]]
        } else if (direction === 'down' && index < social.length - 1) {
            [social[index], social[index + 1]] = [social[index + 1], social[index]]
        }
        updateConfigValue('user.sidebar.social', social)
    }

    // --- Footer Social Button Handlers ---
    const handleFooterSocialChange = (index: number, field: string, value: any) => {
        const social = [...(parsedConfig?.user?.footer?.social || [])]
        if (!social[index]) social[index] = {}
        social[index][field] = value

        // Auto-set title/ariaLabel when icon changes
        if (field === 'svg') {
            const preset = SOCIAL_PRESETS.find(p => p.value === value)
            if (preset) {
                social[index].title = preset.label
                social[index].ariaLabel = preset.label
            }
        }

        updateConfigValue('user.footer.social', social)
    }

    const addFooterSocial = () => {
        const social = [...(parsedConfig?.user?.footer?.social || [])]
        social.push({
            href: '',
            title: 'New Link',
            ariaLabel: 'New Link',
            svg: 'ri:link'
        })
        updateConfigValue('user.footer.social', social)
    }

    const removeFooterSocial = (index: number) => {
        const social = [...(parsedConfig?.user?.footer?.social || [])]
        social.splice(index, 1)
        updateConfigValue('user.footer.social', social)
    }

    const moveFooterSocial = (index: number, direction: 'up' | 'down') => {
        const social = [...(parsedConfig?.user?.footer?.social || [])]
        if (direction === 'up' && index > 0) {
            [social[index], social[index - 1]] = [social[index - 1], social[index]]
        } else if (direction === 'down' && index < social.length - 1) {
            [social[index], social[index + 1]] = [social[index + 1], social[index]]
        }
        updateConfigValue('user.footer.social', social)
    }

    // --- Playlist CRUD (歌单列表管理 - 管理歌单ID和名称) ---
    const addPlaylistEntry = () => {
        const playlists = [...(parsedConfig?.music?.playlists || [])]
        const newId = `__new_${playlists.length}`
        playlists.push({
            id: newId,
            name: '',
            server: 'netease',
            type: 'id' // 'id' 或 'custom'；新建默认为在线平台歌单
        })
        updateConfigValue('music.playlists', playlists)
        setSelectedPlaylistId(newId)
        toast.success('已添加歌单条目')
    }

    const isTempId = (id: string) => !id || id.startsWith('__')

    // 获取自定义歌单的歌曲数据
    const getCustomPlaylistSongs = (playlistId: string) => {
        if (!musicData?.playlistSongs?.[playlistId]) {
            return ''
        }
        return JSON.stringify({ songs: musicData.playlistSongs[playlistId] }, null, 4)
    }

    // 更新自定义歌单的歌曲数据到 musicData
    const updateCustomPlaylistSongs = (playlistId: string, jsonData: string) => {
        try {
            let songs: any[] = []
            if (jsonData.trim()) {
                const parsed = JSON.parse(jsonData)
                songs = parsed.songs || []
            }

            setMusicData((prev: any) => {
                const newData = JSON.parse(JSON.stringify(prev || { songs: [], playlistCounts: {}, playlistSongs: {} }))

                // 更新 playlistSongs
                if (!newData.playlistSongs) newData.playlistSongs = {}
                newData.playlistSongs[playlistId] = songs

                // 更新 playlistCounts
                if (!newData.playlistCounts) newData.playlistCounts = {}
                newData.playlistCounts[playlistId] = songs.length

                // 更新 songs 数组（合并所有歌单的歌曲，去重）
                const songMap = new Map()
                Object.values(newData.playlistSongs || {}).forEach(plSongs => {
                    (plSongs as any[]).forEach(song => {
                        if (song.url) songMap.set(song.url, song)
                    })
                })
                newData.songs = Array.from(songMap.values())

                return newData
            })

            setMusicDataDirty(true)
            setIsDirty(true)
        } catch (e) {
            console.error('解析自定义歌单数据失败:', e)
        }
    }

    const removePlaylistEntry = (index: number) => {
        const playlists = [...(parsedConfig?.music?.playlists || [])]
        const removed = playlists[index]
        playlists.splice(index, 1)
        updateConfigValue('music.playlists', playlists)
        toast.info(`已移除歌单: ${removed?.name || removed?.id || '未命名'}`)
    }

    const updatePlaylistEntry = (index: number, field: string, value: string) => {
        const playlists = JSON.parse(JSON.stringify(parsedConfig?.music?.playlists || []))
        if (!playlists[index]) playlists[index] = {}

        // 如果是更新ID，并且是自定义歌单，需要同步更新 musicData.playlistSongs 中的键
        if (field === 'id' && playlists[index].type === 'custom' && musicData) {
            const oldId = playlists[index].id
            const isOldIdValid = oldId && !isTempId(oldId)
            if (isOldIdValid && musicData.playlistSongs && musicData.playlistSongs[oldId]) {
                setMusicData((prev: any) => {
                    const newData = JSON.parse(JSON.stringify(prev))
                    // 迁移旧ID的数据到新ID
                    newData.playlistSongs[value] = newData.playlistSongs[oldId]
                    // 删除旧ID的数据
                    delete newData.playlistSongs[oldId]
                    // 同时更新 playlistCounts
                    if (newData.playlistCounts && newData.playlistCounts[oldId]) {
                        newData.playlistCounts[value] = newData.playlistCounts[oldId]
                        delete newData.playlistCounts[oldId]
                    }
                    return newData
                })
                setMusicDataDirty(true)
                // 同步迁移原始 JSON 文本
                setCustomPlaylistText(prev => {
                    if (prev[oldId] !== undefined) {
                        const next = { ...prev }
                        next[value] = next[oldId]
                        delete next[oldId]
                        return next
                    }
                    return prev
                })
            }
        }

        playlists[index][field] = value

        // 自定义歌单不依赖 server，切换类型时清理/补默认值，避免写入无意义字段
        if (field === 'type') {
            if (value === 'custom') {
                delete playlists[index].server
            } else if (!playlists[index].server) {
                playlists[index].server = 'netease'
            }
        }

        updateConfigValue('music.playlists', playlists)
    }

    const movePlaylistEntry = (playlistId: string, direction: 'up' | 'down') => {
        const playlists = [...(parsedConfig?.music?.playlists || [])]
        const currentIndex = playlists.findIndex(p => p.id === playlistId)
        if (currentIndex === -1) return

        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
        if (newIndex < 0 || newIndex >= playlists.length) return

        [playlists[currentIndex], playlists[newIndex]] = [playlists[newIndex], playlists[currentIndex]]
        updateConfigValue('music.playlists', playlists)
    }

    const moveSelectedPlaylist = (direction: 'up' | 'down') => {
        if (selectedPlaylistId) {
            movePlaylistEntry(selectedPlaylistId, direction)
        }
    }
    // --- End Playlist CRUD ---

    const handleSave = async () => {
        if (!window.confirm('确定保存配置吗？这将直接推送到 GitHub 仓库。')) {
            return
        }
        try {
            setSaving(true)
            const token = await getAuthToken()
            if (!token) throw new Error('未授权')

            // 保存前将原始自定义歌单文本刷入 musicData，防止丢失未解析完成的编辑
            // 构建合并后的 musicData 用于保存（不依赖 setState 的异步更新）
            let musicDataForSave = musicData ? JSON.parse(JSON.stringify(musicData)) : { songs: [], playlistCounts: {}, playlistSongs: {} }
            const playlists = parsedConfig?.music?.playlists || []
            for (const pl of playlists) {
                if (pl.type === 'custom' && customPlaylistText[pl.id] !== undefined) {
                    const rawText = customPlaylistText[pl.id]
                    try {
                        let songs: any[] = []
                        if (rawText.trim()) {
                            const parsed = JSON.parse(rawText)
                            songs = parsed.songs || []
                        }
                        if (!musicDataForSave.playlistSongs) musicDataForSave.playlistSongs = {}
                        musicDataForSave.playlistSongs[pl.id] = songs
                        if (!musicDataForSave.playlistCounts) musicDataForSave.playlistCounts = {}
                        musicDataForSave.playlistCounts[pl.id] = songs.length
                    } catch {
                        toast.error(`自定义歌单 "${pl.name || pl.id}" 的 JSON 格式无效，请修正后再保存`)
                        setSaving(false)
                        return
                    }
                }
            }
            // 重建 songs 数组（合并所有歌单，按 url 去重）
            {
                const songMap = new Map()
                Object.values(musicDataForSave.playlistSongs || {}).forEach(plSongs => {
                    (plSongs as any[]).forEach(song => {
                        if (song.url) songMap.set(song.url, song)
                    })
                })
                musicDataForSave.songs = Array.from(songMap.values())
            }
            setMusicData(musicDataForSave)

            const toastId = toast.loading('🚀 正在初始化保存...')

            let configToUpdate = parsedConfig ? JSON.parse(JSON.stringify(parsedConfig)) : null
            const treeItems: TreeItem[] = []

            // 1. Process Images
            if (Object.keys(pendingImages).length > 0) {
                const totalImages = Object.keys(pendingImages).length
                toast.loading(`📤 准备上传 ${totalImages} 张图片...`, { id: toastId })

                let idx = 1
                for (const [target, { file }] of Object.entries(pendingImages)) {
                    toast.loading(`📸 正在处理图片 (${idx}/${totalImages}): ${file.name}...`, { id: toastId })
                    const base64 = await fileToBase64NoPrefix(file)
                    let path, filename, publicPath

                    // 处理favicon和profile.png，直接覆盖原文件
                    if (target === 'site.favicon') {
                        path = 'assets/brand/favicon.ico'
                        filename = 'favicon.ico'
                        publicPath = '/favicon.ico'
                    } else if (target === 'user.avatar') {
                        path = 'assets/brand/profile.png'
                        filename = 'profile.png'
                        publicPath = '/profile.png'
                    } else if (target === 'user.title_image') {
                        path = 'assets/brand/logo.png'
                        filename = 'logo.png'
                        publicPath = '/logo.png'
                    } else if (target === 'user.qr_wechat') {
                        path = 'assets/brand/WeChat.jpg'
                        filename = 'WeChat.jpg'
                        publicPath = '/WeChat.jpg'
                    } else if (target === 'user.qr_alipay') {
                        path = 'assets/brand/Alipay.jpg'
                        filename = 'Alipay.jpg'
                        publicPath = '/Alipay.jpg'
                    } else {
                        // 不处理其他图片类型
                        continue
                    }

                    // Create Blob
                    const { sha } = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, base64, 'base64')
                    treeItems.push({
                        path: path,
                        mode: '100644',
                        type: 'blob',
                        sha: sha
                    })

                    // Update config with new path
                    if (configToUpdate) {
                        const parts = target.split('.')
                        let current = configToUpdate
                        for (let i = 0; i < parts.length - 1; i++) {
                            if (!current[parts[i]]) current[parts[i]] = {}
                            current = current[parts[i]]
                        }
                        current[parts[parts.length - 1]] = publicPath
                    }
                    idx++
                }
                setPendingImages({})
            }

            // 2. Process Config File — 分解为各模块 config.yaml 写入内容仓
            let configToSave = configToUpdate
            let savedConfigContent = configContent  // 用于重置 dirty 状态
            if (mode === 'visual' && configToUpdate) {
                configToSave = configToUpdate
                savedConfigContent = yaml.dump(configToUpdate)
            } else if (mode === 'code') {
                // 代码模式：解析 YAML 得到对象
                try {
                    configToSave = yaml.load(configContent) as any
                    savedConfigContent = configContent
                } catch {
                    toast.error('YAML 格式无效，请检查语法')
                    setSaving(false)
                    return
                }
            }

            if (configToSave) {
                toast.loading('正在分解配置到各模块...', { id: toastId })
                const configTreeItems = await buildConfigTreeItems(configToSave)
                treeItems.push(...configTreeItems)
            }

            // 3. Process Music Data File (if dirty)
            if (musicDataDirty && musicDataForSave) {
                toast.loading('正在创建 music.json Blob...', { id: toastId })
                const musicContent = JSON.stringify(musicDataForSave, null, 4)
                const musicBase64 = toBase64Utf8(musicContent)
                const { sha: musicSha } = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, musicBase64, 'base64')
                treeItems.push({
                    path: 'src/data/music.json',
                    mode: '100644',
                    type: 'blob',
                    sha: musicSha
                })
            }

            // 4. Create Commit
            toast.loading('正在获取分支信息...', { id: toastId })

            // Get current ref
            const refName = `heads/${GITHUB_CONFIG.BRANCH}`
            const ref = await getRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, refName)
            const currentCommitSha = ref.sha

            // Get tree of current commit
            const commit = await getCommit(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, currentCommitSha)
            const baseTreeSha = commit.tree.sha

            // Create new tree
            toast.loading('🌳 正在构建文件树...', { id: toastId })
            const { sha: newTreeSha } = await createTree(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, treeItems, baseTreeSha)

            // Create new commit
            toast.loading('💾 正在创建提交...', { id: toastId })
            const commitMessage = musicDataDirty
                ? 'chore(config): update site configuration and custom playlists'
                : 'chore(config): update site configuration'
            const { sha: newCommitSha } = await createCommit(
                token,
                GITHUB_CONFIG.OWNER,
                GITHUB_CONFIG.REPO,
                commitMessage,
                newTreeSha,
                [currentCommitSha]
            )

            // Update ref
            toast.loading('🔄 正在同步远程分支...', { id: toastId })
            await updateRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, refName, newCommitSha)

            // Reset dirty states
            setIsDirty(false)
            setMusicDataDirty(false)
            setLastFetchedContent(savedConfigContent)

            toast.success('🎉 配置更新成功！', {
                id: toastId,
                description: '更改已推送到仓库，GitHub Actions 将会自动重新部署。'
            })
        } catch (error: any) {
            console.error(error)
            toast.error('❌ 保存配置失败', {
                description: error.message
            })
        } finally {
            setSaving(false)
        }
    }

    const triggerImageUpload = (target: string) => {
        setUploadTarget(target)
        imageInputRef.current?.click()
    }

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !uploadTarget) return

        const previewUrl = URL.createObjectURL(file)
        setPendingImages(prev => ({ ...prev, [uploadTarget]: { file, previewUrl } }))

        // Update preview in UI immediately
        updateConfigValue(uploadTarget, previewUrl)

        setUploadTarget('')
        if (imageInputRef.current) imageInputRef.current.value = ''
        toast.info('图片已缓存，保存配置时会统一上传')
    }

    const handleImportKey = () => {
        keyInputRef.current?.click()
    }

    const onChoosePrivateKey = async (file: File) => {
        try {
            const pem = await readFileAsText(file)
            await setPrivateKey(pem)
            toast.success('密钥导入成功')
        } catch (e) {
            toast.error('密钥导入失败')
        }
    }

    const currentTitleType = parsedConfig?.site?.title_type || parsedConfig?.site?.titleType || 'text'

    return (
        <div className="w-full max-w-4xl mx-auto my-12 font-sans">
            <Toaster
                richColors
                position="top-center"
                toastOptions={{
                    className: 'shadow-xl rounded-2xl border-2 border-primary/20 backdrop-blur-sm',
                    style: {
                        fontSize: '1rem',
                        padding: '14px 20px',
                        zIndex: '999999',
                        borderRadius: '12px',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                        transition: 'all 0.3s ease-in-out',
                    },
                    classNames: {
                        title: 'text-lg font-semibold tracking-tight',
                        description: 'text-sm font-medium opacity-90',
                        error: 'bg-error/95 text-error-content border-error/30',
                        success: 'bg-success/95 text-success-content border-success/30',
                        warning: 'bg-warning/95 text-warning-content border-warning/30',
                        info: 'bg-info/95 text-info-content border-info/30',
                    },
                    duration: 5000,
                    closeButton: false,
                }}
            />

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

            <input
                ref={imageInputRef}
                type='file'
                accept='image/*'
                className='hidden'
                onChange={handleImageSelect}
            />

            <div className="rounded-3xl bg-base-100 shadow-2xl flex flex-col overflow-hidden border border-base-200 min-h-[600px]">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-8 py-5 border-b border-base-200 bg-base-100/50 backdrop-blur-sm sticky top-0 z-10 space-y-3 sm:space-y-0">
                    <div className="flex items-center gap-3">
                        <div className="w-1 h-6 bg-primary rounded-full"></div>
                        <h2 className="text-xl font-bold text-primary">站点配置</h2>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="join bg-base-200 p-1 rounded-lg">
                            <button
                                className={`join-item btn btn-sm border-none ${mode === 'visual' ? 'btn-primary shadow-md' : 'btn-ghost text-base-content/60'}`}
                                onClick={() => setMode('visual')}
                                disabled={false}
                            >
                                可视化
                            </button>
                            <button
                                className={`join-item btn btn-sm border-none ${mode === 'code' ? 'btn-primary shadow-md' : 'btn-ghost text-base-content/60'}`}
                                onClick={() => setMode('code')}
                                disabled={false}
                            >
                                代码
                            </button>
                        </div>
                        {!isAuth && (
                            <button onClick={handleImportKey} className="btn btn-sm btn-ghost bg-base-200 gap-1" title="导入密钥以解锁保存功能">
                                <span className="text-lg">🔑</span>
                                <span className="hidden sm:inline">验证</span>
                            </button>
                        )}
                        <button onClick={handleSave} disabled={saving || loading || !isAuth} className="btn btn-sm btn-primary px-6 shadow-lg shadow-primary/20">
                            {saving ? '保存中...' : '保存配置'}
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex h-64 items-center justify-center text-base-content/50">
                        <span className="loading loading-spinner loading-lg text-primary"></span>
                    </div>
                ) : (!isAuth && !configContent) ? (
                    <div className="flex flex-col items-center justify-center h-full flex-1 p-12 text-center space-y-6">
                        <div className="w-24 h-24 bg-base-200 rounded-full flex items-center justify-center mb-4">
                            <span className="text-4xl">🔒</span>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold">需要身份验证</h3>
                            <p className="text-base-content/60">请导入您的私钥以开始编辑配置</p>
                        </div>
                        <button onClick={handleImportKey} className="btn btn-primary btn-wide shadow-lg shadow-primary/20">
                            导入密钥 (.pem)
                        </button>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto bg-base-200/30 p-4 md:p-8">
                        {mode === 'code' ? (
                            <textarea
                                className="h-[600px] w-full rounded-xl border border-base-300 bg-base-100 p-6 font-mono text-sm focus:border-primary focus:outline-none resize-none shadow-inner"
                                value={configContent}
                                onChange={(e) => { setConfigContent(e.target.value); setIsDirty(true) }}
                                spellCheck={false}
                            />
                        ) : (
                            <div className="max-w-3xl mx-auto space-y-10">
                                {/* Icons */}
                                <div className="grid grid-cols-2 gap-4 md:gap-12">
                                    <div className="space-y-3">
                                        <div className="text-xs font-medium text-base-content/70 ml-1">网站图标</div>
                                        <div className="group relative flex justify-center p-4 md:p-8 bg-base-100 rounded-2xl md:rounded-3xl border border-base-200 shadow-sm hover:shadow-md transition-all duration-300">
                                            <div className="w-16 h-16 md:w-24 md:h-24 rounded-xl md:rounded-2xl overflow-hidden bg-base-200 ring-4 ring-base-100 shadow-xl group-hover:scale-105 transition-transform duration-300">
                                                <img src={parsedConfig?.site?.favicon || '/favicon.ico'} alt="Favicon" className="w-full h-full object-cover" />
                                            </div>
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-base-100/50 backdrop-blur-sm rounded-2xl md:rounded-3xl cursor-pointer" onClick={() => triggerImageUpload('site.favicon')}>
                                                <button className="btn btn-circle btn-primary shadow-lg scale-90 group-hover:scale-100 transition-transform">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>
                                                </button>
                                            </div>
                                            {uploadingImage && uploadTarget === 'site.favicon' && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-base-100/80 rounded-2xl md:rounded-3xl z-10">
                                                    <span className="loading loading-spinner loading-md text-primary"></span>
                                                </div>
                                            )}
                                        </div>
                                        <input
                                            type="text"
                                            className="input input-sm input-bordered w-full text-center text-xs rounded-full bg-base-100 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
                                            value={parsedConfig?.site?.favicon || ''}
                                            onChange={e => updateConfigValue('site.favicon', e.target.value)}
                                            placeholder="图标 URL 或上传图片（将重命名为 favicon.ico）"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <div className="text-xs font-medium text-base-content/70 ml-1">用户头像</div>
                                        <div className="group relative flex justify-center p-4 md:p-8 bg-base-100 rounded-2xl md:rounded-3xl border border-base-200 shadow-sm hover:shadow-md transition-all duration-300">
                                            <div className="w-16 h-16 md:w-24 md:h-24 rounded-xl md:rounded-2xl overflow-hidden bg-base-200 ring-4 ring-base-100 shadow-xl group-hover:scale-105 transition-transform duration-300">
                                                <img src={parsedConfig?.user?.avatar || '/avatar.png'} alt="Avatar" className="w-full h-full object-cover" />
                                            </div>
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-base-100/50 backdrop-blur-sm rounded-2xl md:rounded-3xl cursor-pointer" onClick={() => triggerImageUpload('user.avatar')}>
                                                <button className="btn btn-circle btn-primary shadow-lg scale-90 group-hover:scale-100 transition-transform">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>
                                                </button>
                                            </div>
                                            {uploadingImage && uploadTarget === 'user.avatar' && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-base-100/80 rounded-2xl md:rounded-3xl z-10">
                                                    <span className="loading loading-spinner loading-md text-primary"></span>
                                                </div>
                                            )}
                                        </div>
                                        <input
                                            type="text"
                                            className="input input-sm input-bordered w-full text-center text-xs rounded-full bg-base-100 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
                                            value={parsedConfig?.user?.avatar || ''}
                                            onChange={e => updateConfigValue('user.avatar', e.target.value)}
                                            placeholder="头像 URL"
                                        />
                                    </div>

                                </div>

                                {/* Reward QR Codes */}
                                <div className="space-y-3 mt-6">
                                    <div className="text-xs font-medium text-base-content/70 ml-1">打赏二维码</div>
                                    <div className="grid grid-cols-2 gap-4 md:gap-12">
                                        <div className="space-y-3">
                                            <div className="text-xs text-base-content/50 ml-1">微信赞赏码</div>
                                            <div className="group relative flex justify-center p-4 md:p-8 bg-base-100 rounded-2xl md:rounded-3xl border border-base-200 shadow-sm hover:shadow-md transition-all duration-300">
                                                <div className="w-24 h-24 md:w-32 md:h-32 rounded-xl md:rounded-2xl overflow-hidden bg-base-200 ring-4 ring-base-100 shadow-xl group-hover:scale-105 transition-transform duration-300">
                                                    <img src={parsedConfig?.user?.qr_wechat || '/WeChat.jpg'} alt="微信赞赏码" className="w-full h-full object-cover" />
                                                </div>
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-base-100/50 backdrop-blur-sm rounded-2xl md:rounded-3xl cursor-pointer" onClick={() => triggerImageUpload('user.qr_wechat')}>
                                                    <button className="btn btn-circle btn-primary shadow-lg scale-90 group-hover:scale-100 transition-transform">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>
                                                    </button>
                                                </div>
                                            </div>
                                            <input
                                                type="text"
                                                className="input input-sm input-bordered w-full text-center text-xs rounded-full bg-base-100 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
                                                value={parsedConfig?.user?.qr_wechat || ''}
                                                onChange={e => updateConfigValue('user.qr_wechat', e.target.value)}
                                                placeholder="微信赞赏码 URL 或上传图片"
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <div className="text-xs text-base-content/50 ml-1">支付宝收款码</div>
                                            <div className="group relative flex justify-center p-4 md:p-8 bg-base-100 rounded-2xl md:rounded-3xl border border-base-200 shadow-sm hover:shadow-md transition-all duration-300">
                                                <div className="w-24 h-24 md:w-32 md:h-32 rounded-xl md:rounded-2xl overflow-hidden bg-base-200 ring-4 ring-base-100 shadow-xl group-hover:scale-105 transition-transform duration-300">
                                                    <img src={parsedConfig?.user?.qr_alipay || '/Alipay.jpg'} alt="支付宝收款码" className="w-full h-full object-cover" />
                                                </div>
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-base-100/50 backdrop-blur-sm rounded-2xl md:rounded-3xl cursor-pointer" onClick={() => triggerImageUpload('user.qr_alipay')}>
                                                    <button className="btn btn-circle btn-primary shadow-lg scale-90 group-hover:scale-100 transition-transform">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>
                                                    </button>
                                                </div>
                                            </div>
                                            <input
                                                type="text"
                                                className="input input-sm input-bordered w-full text-center text-xs rounded-full bg-base-100 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
                                                value={parsedConfig?.user?.qr_alipay || ''}
                                                onChange={e => updateConfigValue('user.qr_alipay', e.target.value)}
                                                placeholder="支付宝收款码 URL 或上传图片"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* User Info */}
                                <div className="card bg-base-100 shadow-sm border border-base-200 p-6 rounded-2xl space-y-6">
                                    <h3 className="font-bold text-lg text-primary border-b border-base-200 pb-2">用户信息</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                        <div className="form-control w-full">
                                            <label className="label"><span className="label-text font-medium">用户名称</span></label>
                                            <input type="text" className="input input-bordered w-full bg-base-100 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                                value={parsedConfig?.user?.name || ''}
                                                onChange={e => updateConfigValue('user.name', e.target.value)} />
                                        </div>
                                        <div className="form-control w-full">
                                            <label className="label"><span className="label-text font-medium">个人主页</span></label>
                                            <input type="text" className="input input-bordered w-full bg-base-100 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                                value={parsedConfig?.user?.site || ''}
                                                onChange={e => updateConfigValue('user.site', e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="form-control w-full">
                                        <label className="label"><span className="label-text font-medium">个人描述</span></label>
                                        <input type="text" className="input input-bordered w-full bg-base-100 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                            placeholder="Ciallo～(∠・ω<)⌒★"
                                            value={parsedConfig?.user?.description || ''}
                                            onChange={e => updateConfigValue('user.description', e.target.value)} />
                                    </div>
                                    {/* Social Buttons (moved here) */}
                                    <div className="space-y-4">
                                        <div className="text-sm font-medium text-base-content/70 ml-1">社交按钮</div>
                                        <div className="text-sm font-medium text-base-content/70 ml-1">填写邮箱请用格式'mailto:abc@def.com'</div>
                                        <div className="card bg-base-100 shadow-sm border border-base-200 p-2 rounded-2xl">
                                            <div className="space-y-2 p-2">
                                                {(parsedConfig?.user?.sidebar?.social || []).map((item: any, index: number) => (
                                                    <div key={index} className="flex items-center gap-3 group p-2 hover:bg-base-200/50 rounded-xl transition-colors">
                                                        <div className="w-32">
                                                            <CustomSelect
                                                                value={SOCIAL_PRESETS.find(p => p.value === item.svg)?.value || 'ri:link'}
                                                                onChange={val => handleSocialChange(index, 'svg', val)}
                                                                options={SOCIAL_PRESETS}
                                                            />
                                                        </div>

                                                        <input
                                                            type="text"
                                                            className="input input-sm input-bordered flex-1 bg-base-100 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                                            placeholder="链接地址"
                                                            value={item.href}
                                                            onChange={e => handleSocialChange(index, 'href', e.target.value)}
                                                        />

                                                        <div className="join bg-base-200 rounded-lg p-1">
                                                            <div className="w-8 h-6 flex items-center justify-center text-xs font-mono text-base-content/50">
                                                                {index + 1}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => moveSocial(index, 'up')} className="btn btn-xs btn-ghost btn-square" disabled={index === 0}>↑</button>
                                                            <button onClick={() => moveSocial(index, 'down')} className="btn btn-xs btn-ghost btn-square" disabled={index === (parsedConfig?.user?.sidebar?.social?.length || 0) - 1}>↓</button>
                                                            <button onClick={() => removeSocial(index)} className="btn btn-xs btn-ghost btn-square text-error bg-error/10 hover:bg-error hover:text-white">✕</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="p-2">
                                                <button onClick={addSocial} className="btn btn-outline btn-sm w-full border-dashed border-2 text-base-content/50 hover:text-primary hover:border-primary hover:bg-primary/5">
                                                    + 添加按钮
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                </div>

                                {/* Footer Social Buttons */}
                                <div className="space-y-4 mt-6">
                                    <div className="text-sm font-medium text-base-content/70 ml-1">页脚社交按钮</div>
                                    <div className="card bg-base-100 shadow-sm border border-base-200 p-2 rounded-2xl">
                                        <div className="space-y-2 p-2">
                                            {(parsedConfig?.user?.footer?.social || []).map((item: any, index: number) => (
                                                <div key={index} className="flex items-center gap-3 group p-2 hover:bg-base-200/50 rounded-xl transition-colors">
                                                    <div className="w-32">
                                                        <CustomSelect
                                                            value={SOCIAL_PRESETS.find(p => p.value === item.svg)?.value || 'ri:link'}
                                                            onChange={val => handleFooterSocialChange(index, 'svg', val)}
                                                            options={SOCIAL_PRESETS}
                                                        />
                                                    </div>

                                                    <input
                                                        type="text"
                                                        className="input input-sm input-bordered flex-1 bg-base-100 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                                        placeholder="链接地址"
                                                        value={item.href}
                                                        onChange={e => handleFooterSocialChange(index, 'href', e.target.value)}
                                                    />

                                                    <div className="join bg-base-200 rounded-lg p-1">
                                                        <div className="w-8 h-6 flex items-center justify-center text-xs font-mono text-base-content/50">
                                                            {index + 1}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => moveFooterSocial(index, 'up')} className="btn btn-xs btn-ghost btn-square" disabled={index === 0}>↑</button>
                                                        <button onClick={() => moveFooterSocial(index, 'down')} className="btn btn-xs btn-ghost btn-square" disabled={index === (parsedConfig?.user?.footer?.social?.length || 0) - 1}>↓</button>
                                                        <button onClick={() => removeFooterSocial(index)} className="btn btn-xs btn-ghost btn-square text-error bg-error/10 hover:bg-error hover:text-white">✕</button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="p-2">
                                            <button onClick={addFooterSocial} className="btn btn-outline btn-sm w-full border-dashed border-2 text-base-content/50 hover:text-primary hover:border-primary hover:bg-primary/5">
                                                + 添加按钮
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Basic Info */}
                                <div className="card bg-base-100 shadow-sm border border-base-200 p-6 rounded-2xl space-y-6">
                                    <h3 className="font-bold text-lg text-primary border-b border-base-200 pb-2">站点信息</h3>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-start">
                                            {/* Left: Site image + upload */}
                                            <div className="h-full flex flex-col justify-between">
                                                <label className="label"><span className="label-text font-medium">站点标题图片（若选择图片显示）</span></label>

                                                <div className="group relative flex justify-center p-4 md:p-8 bg-base-100 rounded-2xl md:rounded-3xl border border-base-200 shadow-sm hover:shadow-md transition-all duration-300 w-full h-40 md:h-48">
                                                    <img src={parsedConfig?.user?.title_image || parsedConfig?.user?.titleImage || '/logo.png'} alt="Site Title" className="max-w-full max-h-full object-contain transform scale-125 group-hover:scale-150 transition-transform duration-300" />
                                                </div>

                                                <div className="mt-2">
                                                    <input
                                                        type="text"
                                                        className="input input-bordered h-10 w-full text-center rounded-full bg-base-100 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
                                                        value={parsedConfig?.user?.title_image || parsedConfig?.user?.titleImage || ''}
                                                        onChange={e => updateConfigValue('user.title_image', e.target.value)}
                                                        placeholder="标题图片 URL"
                                                    />
                                                </div>

                                                <div className="flex justify-center">
                                                    <button className="btn btn-sm btn-primary" onClick={() => triggerImageUpload('user.title_image')}>上传图片</button>
                                                </div>
                                            </div>

                                            {/* Right: vertical box with title and tab + toggle at bottom */}
                                            <div className="flex flex-col justify-between space-y-4 w-full md:w-auto p-2 md:p-4 h-full">
                                                {/* normalize title type value for toggles */}
                                                {/**/}
                                                <div className="space-y-4">
                                                    <div className="form-control w-full">
                                                        <label className="label"><span className="label-text font-medium">站点标题</span></label>
                                                        <input type="text" className="input input-bordered h-10 w-full bg-base-100 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                                            value={parsedConfig?.site?.title || ''}
                                                            onChange={e => updateConfigValue('site.title', e.target.value)} />
                                                    </div>

                                                    <div className="form-control w-full">
                                                        <label className="label"><span className="label-text font-medium">浏览器标签</span></label>
                                                        <input type="text" className="input input-bordered h-10 w-full bg-base-100 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                                            value={parsedConfig?.site?.tab || ''}
                                                            onChange={e => updateConfigValue('site.tab', e.target.value)} />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="label"><span className="label-text text-sm">标题显示方式</span></label>

                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center gap-2">
                                                            <label className={`btn btn-sm ${currentTitleType === 'image' ? 'btn-primary shadow-md' : 'btn-ghost text-base-content/60'}`}>
                                                                <input type="radio" name="siteTitleType" value="image" checked={currentTitleType === 'image'} onChange={() => handleSetTitleType('image')} className="sr-only" />
                                                                图片
                                                            </label>
                                                            <label className={`btn btn-sm ${currentTitleType === 'text' ? 'btn-primary shadow-md' : 'btn-ghost text-base-content/60'}`}>
                                                                <input type="radio" name="siteTitleType" value="text" checked={currentTitleType === 'text'} onChange={() => handleSetTitleType('text')} className="sr-only" />
                                                                文本
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="form-control w-full">
                                            <label className="label"><span className="label-text font-medium">站点描述</span></label>
                                            <textarea className="textarea textarea-bordered w-full h-24 bg-base-100 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                                                value={parsedConfig?.site?.description || ''}
                                                onChange={e => updateConfigValue('site.description', e.target.value)} />
                                        </div>
                                    </div>

                                    {/* ICP Info */}
                                    <div className="space-y-3">
                                        <div className="text-sm font-medium text-base-content/70">备案信息</div>
                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                                            <input type="text" className="input input-bordered w-full bg-base-100 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                                placeholder="例如：京ICP备12345678号"
                                                value={parsedConfig?.site?.icp || ''}
                                                onChange={e => updateConfigValue('site.icp', e.target.value)} />
                                            <input type="text" className="input input-bordered w-full bg-base-100 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                                placeholder="https://beian.miit.gov.cn/"
                                                value={parsedConfig?.site?.icp_link || ''}
                                                onChange={e => updateConfigValue('site.icp_link', e.target.value)} />
                                        </div>
                                    </div>
                                </div>


                                {/* Features: Bangumi & TMDB */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 pb-2 border-b border-base-200">
                                        <h3 className="font-bold text-lg text-primary">功能配置</h3>
                                    </div>

                                    <div className="card bg-base-100 shadow-sm border border-base-200 p-6 rounded-2xl space-y-8">
                                        {/* Bilibili Bangumi */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <div className="badge badge-primary badge-outline">Bilibili</div>
                                                <span className="text-sm font-medium">追番列表</span>
                                            </div>
                                            <div className="grid grid-cols-1 gap-4">
                                                <div className="form-control w-full">
                                                    <label className="label"><span className="label-text text-xs text-base-content/60">Bilibili UID</span></label>
                                                    <input type="text" className="input input-bordered w-full bg-base-100 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                                        placeholder="例如：1536411565"
                                                        value={parsedConfig?.anime?.bilibili?.uid || parsedConfig?.site?.bilibili?.uid || ''}
                                                        onChange={e => updateConfigValue('anime.bilibili.uid', e.target.value)} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="divider my-0"></div>

                                        {/* TMDB */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <div className="badge badge-secondary badge-outline">TMDB</div>
                                                <span className="text-sm font-medium">电影/剧集</span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                                <div className="form-control w-full">
                                                    <label className="label"><span className="label-text text-xs text-base-content/60">API Key</span></label>
                                                    <input type="text" className="input input-bordered w-full bg-base-100 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                                        value={parsedConfig?.anime?.tmdb?.apiKey || parsedConfig?.site?.tmdb?.apiKey || ''}
                                                        onChange={e => updateConfigValue('anime.tmdb.apiKey', e.target.value)} />
                                                </div>
                                                <div className="form-control w-full">
                                                    <label className="label"><span className="label-text text-xs text-base-content/60">List ID</span></label>
                                                    <input type="text" className="input input-bordered w-full bg-base-100 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                                        value={parsedConfig?.anime?.tmdb?.listId || parsedConfig?.site?.tmdb?.listId || ''}
                                                        onChange={e => updateConfigValue('anime.tmdb.listId', e.target.value)} />
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </div>

                                {/* 音乐配置 */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 pb-2 border-b border-base-200">
                                        <div className="w-1 h-5 rounded-full" style={{ backgroundColor: 'oklch(var(--p))' }}></div>
                                        <h3 className="font-bold text-lg" style={{ color: 'oklch(var(--p))' }}>音乐配置</h3>
                                    </div>
                                    <div className="card bg-base-100 shadow-sm border border-base-200 p-6 rounded-2xl space-y-8">

                                        {/* Meting API 地址 */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <div className="badge badge-accent badge-outline">API</div>
                                                <span className="text-sm font-medium">音乐 API 地址</span>
                                            </div>
                                            <div className="form-control w-full">
                                                <input
                                                    type="url"
                                                    className="input input-sm input-bordered w-full bg-base-100 focus:border-primary font-mono text-xs"
                                                    placeholder="https://meting.mikus.ink/api"
                                                    value={parsedConfig?.music?.api || ''}
                                                    onChange={e => updateConfigValue('music.api', e.target.value.trim())}
                                                />
                                                <label className="label py-1">
                                                    <span className="label-text-alt text-base-content/50">
                                                        填写可拼接查询参数的 API 基址（不要带 ? 及后面的参数）。请求时会自动追加
                                                        ?server=netease|tencent&amp;type=playlist&amp;id=歌单ID，
                                                        例如 https://meting.mikus.ink/api 或 https://163.hyc.moe
                                                    </span>
                                                </label>
                                            </div>
                                        </div>

                                        {/* 歌单列表管理 */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <div className="badge badge-accent badge-outline">歌单</div>
                                                <span className="text-sm font-medium">歌单列表</span>
                                                <span className="text-xs text-base-content/50 ml-auto">{(parsedConfig?.music?.playlists || []).length} 个歌单</span>
                                            </div>

                                            <div className="space-y-2">
                                                {(parsedConfig?.music?.playlists || []).map((item: any, index: number) => {
                                                    const isSelected = selectedPlaylistId === item.id
                                                    return (
                                                        <div
                                                            key={index}
                                                            onClick={() => setSelectedPlaylistId(item.id || null)}
                                                            className={`collapse collapse-arrow bg-base-200/50 rounded-xl border cursor-pointer transition-all ${isSelected ? 'border-primary/50 bg-primary/5' : 'border-base-300 hover:border-primary/30'}`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => setSelectedPlaylistId(item.id || null)}
                                                                className="peer"
                                                            />
                                                            <div className="collapse-title text-sm font-medium flex items-center gap-3 pr-10 min-h-0 py-3">
                                                                <span className={`badge badge-sm font-mono ${isSelected ? 'badge-primary' : ''}`}>{String(index + 1).padStart(2, '0')}</span>
                                                                <span className="flex-1 truncate">{item.name || '未命名歌单'}</span>
                                                                {item.type !== 'custom' && (
                                                                    <span className="badge badge-xs badge-outline font-mono text-xs shrink-0">
                                                                        {(item.server || 'netease') === 'tencent' ? 'QQ音乐' : '网易云'}
                                                                    </span>
                                                                )}
                                                                <span className={`badge badge-xs font-mono text-xs truncate max-w-[100px] ${item.type === 'custom' ? 'badge-info' : 'badge-ghost'}`}>
                                                                    {item.type === 'custom' ? '自定义' : (isTempId(item.id) ? '未设置' : item.id)}
                                                                </span>
                                                            </div>
                                                            <div className="collapse-content">
                                                                <div className="space-y-3 pt-2 pb-1">
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                        <div className="form-control w-full">
                                                                            <label className="label py-0.5"><span className="label-text text-xs text-base-content/60">歌单名称</span></label>
                                                                            <input type="text" className="input input-sm input-bordered w-full bg-base-100 focus:border-primary"
                                                                                placeholder="例如: 我的最爱"
                                                                                value={item.name || ''}
                                                                                onClick={e => e.stopPropagation()}
                                                                                onChange={e => updatePlaylistEntry(index, 'name', e.target.value)} />
                                                                        </div>
                                                                        <div className="form-control w-full">
                                                                            <label className="label py-0.5"><span className="label-text text-xs text-base-content/60">歌单类型</span></label>
                                                                            <div onClick={e => e.stopPropagation()}>
                                                                                <CustomSelect
                                                                                    value={item.type || 'id'}
                                                                                    onChange={val => updatePlaylistEntry(index, 'type', val)}
                                                                                    options={[
                                                                                        { value: 'id', label: '在线平台歌单 ID' },
                                                                                        { value: 'custom', label: '自定义音乐 (JSON)' }
                                                                                    ]}
                                                                                    className="w-full"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* 在线平台歌单：来源选择 */}
                                                                    {(item.type || 'id') !== 'custom' && (
                                                                        <div className="form-control w-full">
                                                                            <label className="label py-0.5"><span className="label-text text-xs text-base-content/60">音乐来源</span></label>
                                                                            <div onClick={e => e.stopPropagation()}>
                                                                                <CustomSelect
                                                                                    value={item.server || 'netease'}
                                                                                    onChange={val => updatePlaylistEntry(index, 'server', val)}
                                                                                    options={[
                                                                                        { value: 'netease', label: '网易云音乐 (netease)' },
                                                                                        { value: 'tencent', label: 'QQ 音乐 (tencent)' }
                                                                                    ]}
                                                                                    className="w-full"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* 歌单 ID 编辑（两种类型都显示） */}
                                                                    <div className="form-control w-full">
                                                                        <label className="label py-0.5">
                                                                            <span className="label-text text-xs text-base-content/60">
                                                                                {item.type === 'custom'
                                                                                    ? '自定义歌单 ID'
                                                                                    : ((item.server || 'netease') === 'tencent' ? 'QQ 音乐歌单 ID' : '网易云歌单 ID')}
                                                                            </span>
                                                                        </label>
                                                                        <input type="text" className="input input-sm input-bordered w-full bg-base-100 focus:border-primary font-mono text-xs"
                                                                            placeholder={item.type === 'custom'
                                                                                ? '例如: my_playlist_01'
                                                                                : ((item.server || 'netease') === 'tencent' ? '例如: 8252069661' : '例如: 17957187425')}
                                                                            defaultValue={isTempId(item.id) ? '' : (item.id || '')}
                                                                            onClick={e => e.stopPropagation()}
                                                                            onBlur={e => {
                                                                                const newVal = e.target.value || `__new_${index}`
                                                                                updatePlaylistEntry(index, 'id', newVal)
                                                                                setSelectedPlaylistId(newVal)
                                                                            }} />
                                                                    </div>

                                                                    {/* 自定义歌单的 JSON 编辑 */}
                                                                    {item.type === 'custom' && (
                                                                        <div className="form-control w-full">
                                                                            <label className="label py-0.5"><span className="label-text text-xs text-base-content/60">自定义音乐 JSON</span></label>
                                                                            <textarea
                                                                                className="textarea textarea-bordered w-full h-64 bg-base-100 focus:border-primary font-mono text-xs"
                                                                                placeholder='{
  "songs": [
    {
      "title": "歌曲名称",
      "artist": "歌手名",
      "cover": "封面图片URL",
      "url": "音频文件URL",
      "lrc": "歌词URL(可选)",
      "duration": "时长(可选，如04:59) // 部署时自动运行 pnpm prefetch:music 获取时长"
    }
  ]
}'
                                                                                value={customPlaylistText[item.id] ?? getCustomPlaylistSongs(item.id)}
                                                                                onClick={e => e.stopPropagation()}
                                                                                onChange={e => {
                                                                                    const rawText = e.target.value
                                                                                    setCustomPlaylistText(prev => ({ ...prev, [item.id]: rawText }))
                                                                                    setMusicDataDirty(true)
                                                                                    setIsDirty(true)
                                                                                    // 尝试解析 JSON，如果有效则同步更新 musicData
                                                                                    try {
                                                                                        let songs: any[] = []
                                                                                        if (rawText.trim()) {
                                                                                            const parsed = JSON.parse(rawText)
                                                                                            songs = parsed.songs || []
                                                                                        }
                                                                                        setMusicData((prev: any) => {
                                                                                            const newData = JSON.parse(JSON.stringify(prev || { songs: [], playlistCounts: {}, playlistSongs: {} }))
                                                                                            if (!newData.playlistSongs) newData.playlistSongs = {}
                                                                                            newData.playlistSongs[item.id] = songs
                                                                                            if (!newData.playlistCounts) newData.playlistCounts = {}
                                                                                            newData.playlistCounts[item.id] = songs.length
                                                                                            const songMap = new Map()
                                                                                            Object.values(newData.playlistSongs || {}).forEach(plSongs => {
                                                                                                (plSongs as any[]).forEach(song => {
                                                                                                    if (song.url) songMap.set(song.url, song)
                                                                                                })
                                                                                            })
                                                                                            newData.songs = Array.from(songMap.values())
                                                                                            return newData
                                                                                        })
                                                                                    } catch (_) {
                                                                                        // JSON 还不完整，保留原始文本等用户继续编辑
                                                                                    }
                                                                                }}
                                                                                spellCheck={false}
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-base-300">
                                                                    <button onClick={(e) => { e.stopPropagation(); movePlaylistEntry(item.id, 'up'); }} disabled={index === 0} className="btn btn-xs btn-ghost">↑</button>
                                                                    <button onClick={(e) => { e.stopPropagation(); movePlaylistEntry(item.id, 'down'); }} disabled={index === (parsedConfig?.music?.playlists?.length || 0) - 1} className="btn btn-xs btn-ghost">↓</button>
                                                                    <div className="flex-1"></div>
                                                                    <button onClick={() => removePlaylistEntry(index)} className="btn btn-xs btn-outline btn-error">删除</button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                            <button onClick={addPlaylistEntry} className="btn btn-outline btn-sm w-full border-dashed border-2 text-base-content/50 hover:text-accent hover:border-accent hover:bg-accent/5">
                                                + 添加歌单
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Comments */}
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between pb-2 border-b border-base-200">
                                        <h3 className="font-bold text-lg text-primary">评论系统</h3>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-base-content/60">启用</span>
                                            <input type="checkbox" className="toggle toggle-sm toggle-primary"
                                                checked={parsedConfig?.comments?.enable || false}
                                                onChange={e => updateConfigValue('comments.enable', e.target.checked)} />
                                        </div>
                                    </div>

                                    {parsedConfig?.comments?.enable && (
                                        <div className="card bg-base-100 shadow-sm border border-base-200 p-6 rounded-2xl space-y-4">
                                            <div className="form-control w-full">
                                                <label className="label"><span className="label-text font-medium">评论插件</span></label>
                                                <CustomSelect
                                                    value={parsedConfig?.comments?.type || 'giscus'}
                                                    onChange={val => updateConfigValue('comments.type', val)}
                                                    options={COMMENT_PROVIDERS}
                                                />
                                            </div>

                                            {parsedConfig?.comments?.type === 'giscus' && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="form-control w-full">
                                                        <label className="label"><span className="label-text text-xs text-base-content/60">Repo</span></label>
                                                        <input type="text" className="input input-sm input-bordered w-full bg-base-100 focus:border-primary focus:ring-2 focus:ring-primary/20"
                                                            placeholder="owner/repo"
                                                            value={parsedConfig?.comments?.giscus?.repo || ''}
                                                            onChange={e => updateConfigValue('comments.giscus.repo', e.target.value)} />
                                                    </div>
                                                    <div className="form-control w-full">
                                                        <label className="label"><span className="label-text text-xs text-base-content/60">Repo ID</span></label>
                                                        <input type="text" className="input input-sm input-bordered w-full bg-base-100 focus:border-primary focus:ring-2 focus:ring-primary/20"
                                                            value={parsedConfig?.comments?.giscus?.repoId || ''}
                                                            onChange={e => updateConfigValue('comments.giscus.repoId', e.target.value)} />
                                                    </div>
                                                    <div className="form-control w-full">
                                                        <label className="label"><span className="label-text text-xs text-base-content/60">Category</span></label>
                                                        <input type="text" className="input input-sm input-bordered w-full bg-base-100 focus:border-primary focus:ring-2 focus:ring-primary/20"
                                                            value={parsedConfig?.comments?.giscus?.category || ''}
                                                            onChange={e => updateConfigValue('comments.giscus.category', e.target.value)} />
                                                    </div>
                                                    <div className="form-control w-full">
                                                        <label className="label"><span className="label-text text-xs text-base-content/60">Category ID</span></label>
                                                        <input type="text" className="input input-sm input-bordered w-full bg-base-100 focus:border-primary focus:ring-2 focus:ring-primary/20"
                                                            value={parsedConfig?.comments?.giscus?.categoryId || ''}
                                                            onChange={e => updateConfigValue('comments.giscus.categoryId', e.target.value)} />
                                                    </div>
                                                </div>
                                            )}

                                            {parsedConfig?.comments?.type === 'waline' && (
                                                <div className="form-control w-full">
                                                    <label className="label"><span className="label-text text-xs text-base-content/60">Server URL</span></label>
                                                    <input type="text" className="input input-bordered w-full bg-base-100 focus:border-primary focus:ring-2 focus:ring-primary/20"
                                                        placeholder="https://your-waline-server.vercel.app"
                                                        value={parsedConfig?.comments?.waline?.serverURL || ''}
                                                        onChange={e => updateConfigValue('comments.waline.serverURL', e.target.value)} />
                                                </div>
                                            )}

                                            {parsedConfig?.comments?.type === 'twikoo' && (
                                                <div className="form-control w-full">
                                                    <label className="label"><span className="label-text text-xs text-base-content/60">Env ID</span></label>
                                                    <input type="text" className="input input-sm input-bordered w-full bg-base-100 focus:border-primary focus:ring-2 focus:ring-primary/20"
                                                        placeholder="Twikoo environment ID"
                                                        value={parsedConfig?.comments?.twikoo?.envId || ''}
                                                        onChange={e => updateConfigValue('comments.twikoo.envId', e.target.value)} />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Umami Analytics */}
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between pb-2 border-b border-base-200">
                                        <h3 className="font-bold text-lg text-primary">Umami 统计</h3>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-base-content/60">启用</span>
                                            <input type="checkbox" className="toggle toggle-sm toggle-primary"
                                                checked={parsedConfig?.umami?.enable || false}
                                                onChange={e => updateConfigValue('umami.enable', e.target.checked)} />
                                        </div>
                                    </div>

                                    {parsedConfig?.umami?.enable && (
                                        <div className="card bg-base-100 shadow-sm border border-base-200 p-6 rounded-2xl space-y-4">
                                            <div className="form-control w-full">
                                                <label className="label"><span className="label-text text-xs text-base-content/60">Base URL</span></label>
                                                <input type="text" className="input input-bordered w-full bg-base-100 focus:border-primary focus:ring-2 focus:ring-primary/20"
                                                    placeholder="https://cloud.umami.is"
                                                    value={parsedConfig?.umami?.baseUrl || ''}
                                                    onChange={e => updateConfigValue('umami.baseUrl', e.target.value)} />
                                            </div>
                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                                                <div className="form-control w-full">
                                                    <label className="label"><span className="label-text text-xs text-base-content/60">Website ID</span></label>
                                                    <input type="text" className="input input-bordered w-full bg-base-100 focus:border-primary focus:ring-2 focus:ring-primary/20"
                                                        value={parsedConfig?.umami?.websiteId || ''}
                                                        onChange={e => updateConfigValue('umami.websiteId', e.target.value)} />
                                                </div>
                                                <div className="form-control w-full">
                                                    <label className="label"><span className="label-text text-xs text-base-content/60">Share ID</span></label>
                                                    <input type="text" className="input input-bordered w-full bg-base-100 focus:border-primary focus:ring-2 focus:ring-primary/20"
                                                        value={parsedConfig?.umami?.shareId || ''}
                                                        onChange={e => updateConfigValue('umami.shareId', e.target.value)} />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
