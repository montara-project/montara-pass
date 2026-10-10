import { HTTP_METHOD } from '@/types/api'

import type { FolderMethods, FolderResources } from './types/folder'

import { clientResource } from '../resource'

const path = '/api/v1/folders'

const methods: FolderMethods = [
  HTTP_METHOD.GET,
  HTTP_METHOD.POST,
  HTTP_METHOD.PUT,
  HTTP_METHOD.DELETE,
]

const resources = (): FolderResources => {
  return {
    ...clientResource(path, methods),
  }
}

export const folderServices = resources()
