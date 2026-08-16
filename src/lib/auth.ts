import { createInstallationToken, getInstallationId, signAppJwt } from './github-client'
import { GITHUB_CONFIG } from '@/consts'
import { toast } from 'sonner'
import { decrypt,encrypt } from './aes256-util'
import { useAuthStore } from '@/components/write/hooks/use-auth'

const GITHUB_TOKEN_CACHE_KEY = 'github_token'
const GITHUB_PEM_CACHE_KEY = 'p_info'

function getTokenFromCache(): string | null {
	if (typeof sessionStorage === 'undefined') return null
	try {
		return sessionStorage.getItem(GITHUB_TOKEN_CACHE_KEY)
	} catch {
		return null
	}
}

function saveTokenToCache(token: string): void {
	if (typeof sessionStorage === 'undefined') return
	try {
		sessionStorage.setItem(GITHUB_TOKEN_CACHE_KEY, token)
	} catch (error) {
		console.error('Failed to save token to cache:', error)
	}
}

function clearTokenCache(): void {
	if (typeof sessionStorage === 'undefined') return
	try {
		sessionStorage.removeItem(GITHUB_TOKEN_CACHE_KEY)
	} catch (error) {
		console.error('Failed to clear token cache:', error)
	}
}

export async function getPemFromCache(): Promise<string | null> {
	if (typeof sessionStorage === 'undefined') return null
	try {
		// 解密缓存中的 pem
		const encryptedPem = sessionStorage.getItem(GITHUB_PEM_CACHE_KEY)
		if (!encryptedPem) return null
		return await decrypt(encryptedPem, GITHUB_CONFIG.ENCRYPT_KEY)
	} catch {
		return null
	}
}

export async function savePemToCache(pem: string): Promise<void> {
	if (typeof sessionStorage === 'undefined') return
	try {
		// 加密 pem 后存储
		const encryptedPem = await encrypt(pem, GITHUB_CONFIG.ENCRYPT_KEY)
		sessionStorage.setItem(GITHUB_PEM_CACHE_KEY, encryptedPem)
	} catch (error) {
		console.error('Failed to save pem to cache:', error)
	}
}

function clearPemCache(): void {
	if (typeof sessionStorage === 'undefined') return
	try {
		sessionStorage.removeItem(GITHUB_PEM_CACHE_KEY)
	} catch (error) {
		console.error('Failed to clear pem cache:', error)
	}
}

export function clearAllAuthCache(): void {
	clearTokenCache()
	clearPemCache()
}

export async function hasAuth(): Promise<boolean> {
	return !!getTokenFromCache() || !!(await getPemFromCache())
}

/**
 * 统一的认证 Token 获取
 * 自动处理缓存、签发等逻辑
 * @returns GitHub Installation Token
 */
export async function getAuthToken(): Promise<string> {
	// 1. 先尝试从缓存获取 token
	const cachedToken = getTokenFromCache()
	if (cachedToken) {
		return cachedToken
	}

	// 2. 获取私钥（从缓存）
	const privateKey = useAuthStore.getState().privateKey
	if (!privateKey) {
		throw new Error('需要先设置私钥。请使用 useAuth().setPrivateKey()')
	}

	// 使用单个加载提示替代多个连续提示
	const toastId = `auth-loading-${Date.now()}`
	toast.loading('正在进行身份验证...', { id: toastId })

	try {
		const jwt = signAppJwt(GITHUB_CONFIG.APP_ID, privateKey)
		const installationId = await getInstallationId(jwt, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO)
		const token = await createInstallationToken(jwt, installationId)

		saveTokenToCache(token)
		toast.dismiss(toastId)
		return token
	} catch (error) {
		toast.dismiss(toastId)
		throw error
	}
}

/**
 * 获取指定仓库的认证 Token
 * 用于需要写入不同仓库的场景（如 about-service 写入前端仓）
 */
export async function getRepoAuthToken(owner: string, repo: string): Promise<string> {
	const privateKey = useAuthStore.getState().privateKey
	if (!privateKey) {
		throw new Error('需要先设置私钥')
	}
	const jwt = signAppJwt(GITHUB_CONFIG.APP_ID, privateKey)
	const installationId = await getInstallationId(jwt, owner, repo)
	return await createInstallationToken(jwt, installationId)
}
