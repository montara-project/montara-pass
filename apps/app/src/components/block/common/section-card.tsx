import Page from '@/components/layout/page'

interface SectionCardProps {
  title: string
  description?: string
  toolbar?: React.ReactNode
  children: React.ReactNode
}

/** A page that holds a table: its heading and tools, then the table on the sheet itself. */
export default function SectionCard({ title, description, toolbar, children }: SectionCardProps) {
  return (
    <Page title={title} description={description} actions={toolbar}>
      {children}
    </Page>
  )
}
