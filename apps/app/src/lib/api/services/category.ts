import { HTTP_METHOD } from '@/types/api'

import type { CategoryMethods, CategoryResources } from './types/category'

import { clientResource } from '../resource'

const path = '/api/v1/categories'

const methods: CategoryMethods = [
  HTTP_METHOD.GET,
  HTTP_METHOD.POST,
  HTTP_METHOD.PUT,
  HTTP_METHOD.DELETE,
]

const resources = (): CategoryResources => {
  return {
    ...clientResource(path, methods),
  }
}

export const categoryServices = resources()
