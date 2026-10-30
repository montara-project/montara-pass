import { createRouter } from '@tanstack/react-router'
import { HomeLayout } from 'fumadocs-ui/layouts/home'
import { DefaultNotFound } from 'fumadocs-ui/layouts/home/not-found'

import { baseOptions } from '@/lib/layout.shared'

import { routeTree } from './routeTree.gen'

function NotFound() {
  return (
    <HomeLayout {...baseOptions()}>
      <DefaultNotFound />
    </HomeLayout>
  )
}

export function getRouter() {
  return createRouter({
    routeTree,
    defaultPreload: 'intent',
    scrollRestoration: true,
    defaultNotFoundComponent: NotFound,
  })
}
