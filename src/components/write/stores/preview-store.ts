import { create } from 'zustand'

type PreviewStore = {
	isPreview: boolean
	isInlinePreview: boolean
	openPreview: () => void
	closePreview: () => void
	togglePreview: () => void
	toggleInlinePreview: () => void
	setInlinePreview: (value: boolean) => void
}

export const usePreviewStore = create<PreviewStore>(set => ({
	isPreview: false,
	isInlinePreview: true,
	openPreview: () => set({ isPreview: true }),
	closePreview: () => set({ isPreview: false }),
	togglePreview: () => set(state => ({ isPreview: !state.isPreview })),
	toggleInlinePreview: () => set(state => ({ isInlinePreview: !state.isInlinePreview })),
	setInlinePreview: (value: boolean) => set({ isInlinePreview: value }),
}))