import { createFromSource } from 'fumadocs-core/search/server'

import { source } from '@/lib/source'

// Backs the search dialog that RootProvider mounts.
export const { GET } = createFromSource(source, { language: 'english' })
