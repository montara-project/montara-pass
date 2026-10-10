import type { HTTP_METHOD, Resources } from '@/types/api'

import type { Models } from '../../models'

export type FolderMethods = [HTTP_METHOD.GET, HTTP_METHOD.POST, HTTP_METHOD.PUT, HTTP_METHOD.DELETE]

export type FolderResources = Resources<FolderMethods, Models.Folder>
