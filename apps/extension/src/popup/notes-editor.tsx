import { useEffect, useRef } from 'react'

import {
  MarkdownEditorContent,
  MarkdownEditorProvider,
  useMarkdownEditor,
} from '@/hooks/use-markdown-editor'

// The extension's rich text editor for a secure note: its own toolbar around
// the Markdown editor the web app uses, so both write the same notes.

interface NotesEditorProps {
  /** The notes as Markdown, read once when the editor mounts. */
  value: string
  /** Called with the notes as Markdown whenever they change. */
  onChange: (markdown: string) => void
  placeholder?: string
  /** Id of the element that labels the editor. */
  labelledBy: string
}

interface ToolProps {
  label: string
  /** What the button shows; the label is what it is called. */
  glyph: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
}

function Tool({ label, glyph, active, disabled, onClick }: ToolProps) {
  return (
    <button
      type="button"
      className="notes-tool"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      // The selection stays in the text while a tool is clicked.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      <span aria-hidden="true">{glyph}</span>
    </button>
  )
}

function Editor({ value, onChange, placeholder, labelledBy }: NotesEditorProps) {
  const { active, off, tools } = useMarkdownEditor({
    value,
    onChange,
    labelledBy,
    contentClass: 'notes-content',
    imageClass: 'muted',
  })

  return (
    <div className="notes-editor">
      <div className="notes-toolbar" role="toolbar" aria-label="Formatting">
        <Tool label="Bold" glyph="B" active={active.bold} disabled={off} onClick={tools.bold} />
        <Tool
          label="Italic"
          glyph="I"
          active={active.italic}
          disabled={off}
          onClick={tools.italic}
        />
        <Tool
          label="Strikethrough"
          glyph="S"
          active={active.strike}
          disabled={off}
          onClick={tools.strikethrough}
        />
        <Tool
          label="Inline code"
          glyph="</>"
          active={active.code}
          disabled={off}
          onClick={tools.code}
        />
        <span className="notes-divider" aria-hidden="true" />
        <Tool
          label="Heading 1"
          glyph="H1"
          active={active.h1}
          disabled={off}
          onClick={() => tools.heading(1)}
        />
        <Tool
          label="Heading 2"
          glyph="H2"
          active={active.h2}
          disabled={off}
          onClick={() => tools.heading(2)}
        />
        <Tool label="Quote" glyph="”" active={active.quote} disabled={off} onClick={tools.quote} />
        <span className="notes-divider" aria-hidden="true" />
        <Tool
          label="Bulleted list"
          glyph="•"
          active={active.bullet}
          disabled={off}
          onClick={tools.bulletList}
        />
        <Tool
          label="Numbered list"
          glyph="1."
          active={active.ordered}
          disabled={off}
          onClick={tools.orderedList}
        />
        <span className="notes-divider" aria-hidden="true" />
        <Tool label="Undo" glyph="↶" disabled={off || !active.canUndo} onClick={tools.undo} />
        <Tool label="Redo" glyph="↷" disabled={off || !active.canRedo} onClick={tools.redo} />
      </div>

      <div className="notes-body">
        {placeholder && active.empty && <div className="notes-placeholder">{placeholder}</div>}
        <MarkdownEditorContent />
      </div>
    </div>
  )
}

function View({ value }: { value: string }) {
  const body = useRef<HTMLDivElement>(null)

  useMarkdownEditor({
    value,
    onChange: () => undefined,
    readOnly: true,
    contentClass: 'notes-content notes-view',
    imageClass: 'muted',
  })

  // A link would otherwise replace the vault in this tab.
  useEffect(() => {
    const el = body.current
    if (!el) return

    const open = (e: MouseEvent) => {
      const link = (e.target as Element).closest('a')
      if (!link) return

      e.preventDefault()
      if (/^https?:/.test(link.href)) window.open(link.href, '_blank', 'noopener,noreferrer')
    }
    el.addEventListener('click', open)
    return () => el.removeEventListener('click', open)
  }, [])

  return (
    <div ref={body}>
      <MarkdownEditorContent />
    </div>
  )
}

/**
 * A note's Markdown, rendered. It is the editor without a toolbar and never
 * editable, so a note looks here as it does while it is written. Give it a
 * new `key` to show other text.
 */
export function NotesView({ value }: { value: string }) {
  return (
    <MarkdownEditorProvider>
      <View value={value} />
    </MarkdownEditorProvider>
  )
}

/** A rich text editor whose value is Markdown. */
export default function NotesEditor(props: NotesEditorProps) {
  return (
    <MarkdownEditorProvider>
      <Editor {...props} />
    </MarkdownEditorProvider>
  )
}
