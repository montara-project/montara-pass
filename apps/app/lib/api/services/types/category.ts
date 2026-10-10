import type { HTTP_METHOD, Resources } from '@/types/api'

import type { Models } from '../../models'

/**
 * The methods `categoryServices` actually builds. Declaring them keeps the
 * type honest: `resource()` only creates the methods it was given.
 */
export type CategoryMethods = [
  HTTP_METHOD.GET,
  HTTP_METHOD.POST,
  HTTP_METHOD.PUT,
  HTTP_METHOD.DELETE,
]

export type CategoryResources = Resources<CategoryMethods, Models.Category>
