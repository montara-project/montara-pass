import type { ComponentType, ReactNode } from 'react'

import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconBlockquote,
  IconBold,
  IconCode,
  IconH1,
  IconH2,
  IconItalic,
  IconList,
  IconListNumbers,
  IconStrikethrough,
} from '@tabler/icons-react'

import {
  MarkdownEditorContent,
  MarkdownEditorProvider,
  useMarkdownEditor,
} from '@/hooks/use-markdown-editor'
import { cn } from '@/lib/utils'

// The web app's rich text editor: a toolbar and a frame around the Markdown
// editor in hooks/use-markdown-editor.ts.

/** Tailwind resets headings and lists, so the content is styled from here. */
const CONTENT_CLASS = cn(
  'thin-scrollbar max-h-80 min-h-32 overflow-y-auto rounded-b-md px-3 py-2 break-words outline-none',
  '[&_p]:mb-2 [&_p:last-child]:mb-0',
  '[&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-semibold',
  '[&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold',
  '[&_h3]:mb-2 [&_h3]:font-semibold',
  '[&_strong]:font-semibold',
  '[&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-5',
  '[&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5',
  '[&_li>p]:mb-0',
  '[&_blockquote]:border-border [&_blockquote]:text-muted-foreground [&_blockquote]:mb-2 [&_blockquote]:border-l-2 [&_blockquote]:pl-3',
  '[&_code]:bg-muted [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em]',
  '[&_pre]:thin-scrollbar [&_pre]:bg-muted [&_pre]:mb-2 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:p-2 [&_pre_code]:bg-transparent [&_pre_code]:p-0',
  '[&_a]:text-primary [&_a]:underline',
  '[&_hr]:border-border [&_hr]:my-3',
  '[&_table]:mb-2 [&_td]:border-border [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_th]:border-border [&_th]:border [&_th]:px-2 [&_th]:py-1'
)

interface ToolProps {
  label: string
  icon: ComponentType<{ className?: string }>
  active?: boolean
  disabled?: boolean
  onClick: () => void
}

function Tool({ label, icon: Icon, active, disabled, onClick }: ToolProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      // The selection stays in the text while a tool is clicked.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        'text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring/30 inline-flex size-7 items-center justify-center rounded-sm focus-visible:ring-[3px] focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40',
        active && 'bg-accent text-accent-foreground'
      )}
    >
      <Icon className="size-4" />
    </button>
  )
}

function Divider() {
  return <span aria-hidden className="bg-border mx-1 h-4 w-px" />
}

export interface RichTextEditorProps {
  /**
   * The content as Markdown. It is read once, when the editor mounts: give
   * the editor a new `key` to load something else.
   */
  value: string
  /** Called with the content as Markdown whenever it changes. */
  onChange: (markdown: string) => void
  onBlur?: () => void
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
  /** Labels the editing area for assistive technology. */
  'aria-labelledby'?: string
  className?: string
  /** Rendered at the end of the toolbar. */
  toolbarEnd?: ReactNode
}

function EditorBody({
  value,
  onChange,
  onBlur,
  placeholder,
  disabled = false,
  invalid = false,
  className,
  toolbarEnd,
  'aria-labelledby': labelledBy,
}: RichTextEditorProps) {
  const { active, off, tools } = useMarkdownEditor({
    value,
    onChange,
    onBlur,
    disabled,
    labelledBy,
    contentClass: CONTENT_CLASS,
    imageClass: 'text-muted-foreground',
  })

  return (
    <div
      data-slot="rich-text-editor"
      data-invalid={invalid || undefined}
      aria-disabled={disabled}
      className={cn(
        'border-input bg-background focus-within:border-ring focus-within:ring-ring/30 data-invalid:border-destructive/60 data-invalid:ring-destructive/10 w-full rounded-md border text-sm shadow-xs transition-[color,box-shadow] focus-within:ring-[3px] aria-disabled:opacity-60',
        className
      )}
    >
      <div
        role="toolbar"
        aria-label="Formatting"
        className="border-input flex flex-wrap items-center gap-0.5 border-b p-1"
      >
        <Tool
          label="Bold"
          icon={IconBold}
          active={active.bold}
          disabled={off}
          onClick={tools.bold}
        />
        <Tool
          label="Italic"
          icon={IconItalic}
          active={active.italic}
          disabled={off}
          onClick={tools.italic}
        />
        <Tool
          label="Strikethrough"
          icon={IconStrikethrough}
          active={active.strike}
          disabled={off}
          onClick={tools.strikethrough}
        />
        <Tool
          label="Inline code"
          icon={IconCode}
          active={active.code}
          disabled={off}
          onClick={tools.code}
        />
        <Divider />
        <Tool
          label="Heading 1"
          icon={IconH1}
          active={active.h1}
          disabled={off}
          onClick={() => tools.heading(1)}
        />
        <Tool
          label="Heading 2"
          icon={IconH2}
          active={active.h2}
          disabled={off}
          onClick={() => tools.heading(2)}
        />
        <Tool
          label="Quote"
          icon={IconBlockquote}
          active={active.quote}
          disabled={off}
          onClick={tools.quote}
        />
        <Divider />
        <Tool
          label="Bulleted list"
          icon={IconList}
          active={active.bullet}
          disabled={off}
          onClick={tools.bulletList}
        />
        <Tool
          label="Numbered list"
          icon={IconListNumbers}
          active={active.ordered}
          disabled={off}
          onClick={tools.orderedList}
        />
        <Divider />
        <Tool
          label="Undo"
          icon={IconArrowBackUp}
          disabled={off || !active.canUndo}
          onClick={tools.undo}
        />
        <Tool
          label="Redo"
          icon={IconArrowForwardUp}
          disabled={off || !active.canRedo}
          onClick={tools.redo}
        />
        {toolbarEnd && <span className="ml-auto">{toolbarEnd}</span>}
      </div>

      <div className="relative">
        {placeholder && active.empty && (
          <div className="text-muted-foreground/80 pointer-events-none absolute top-2 left-3">
            {placeholder}
          </div>
        )}
        <MarkdownEditorContent />
      </div>
    </div>
  )
}

/** A rich text editor whose value is Markdown. */
export default function RichTextEditor(props: RichTextEditorProps) {
  return (
    <MarkdownEditorProvider>
      <EditorBody {...props} />
    </MarkdownEditorProvider>
  )
}
