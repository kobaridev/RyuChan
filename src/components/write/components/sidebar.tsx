import { CoverSection } from './sections/cover-section'
import { MetaSection } from './sections/meta-section'
import { ImagesSection } from './sections/images-section'
import { ANIMATION_DELAY, INIT_DELAY } from '@/consts'

type WriteSidebarProps = {
	categories?: string[]
}

export function WriteSidebar({ categories = [] }: WriteSidebarProps) {
	return (
		<div className='w-full'>
			<div className='grid grid-cols-1 md:grid-cols-3 gap-5'>
				<CoverSection delay={INIT_DELAY + ANIMATION_DELAY * 0} />
				<MetaSection delay={INIT_DELAY + ANIMATION_DELAY * 1} categories={categories} />
				<ImagesSection delay={INIT_DELAY + ANIMATION_DELAY * 2} />
			</div>
		</div>
	)
}