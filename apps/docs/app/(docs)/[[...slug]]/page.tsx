import type { Metadata } from 'next'

import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page'
import { notFound } from 'next/navigation'

import { getMDXComponents } from '@/components/mdx-components'
import { source } from '@/lib/source'

type PageProps = { params: Promise<{ slug?: string[] }> }

export function generateStaticParams() {
  return source.generateParams()
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { slug } = await props.params
  const page = source.getPage(slug)
  if (!page) notFound()

  return { title: page.data.title, description: page.data.description }
}

export default async function Page(props: PageProps) {
  const { slug } = await props.params
  const page = source.getPage(slug)
  if (!page) notFound()

  const MDXContent = page.data.body

  return (
    <DocsPage toc={page.data.toc}>
      <DocsTitle>{page.data.title}</DocsTitle>
      {page.data.description && <DocsDescription>{page.data.description}</DocsDescription>}
      <DocsBody>
        <MDXContent components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  )
}
