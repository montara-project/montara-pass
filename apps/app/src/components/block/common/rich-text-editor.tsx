import '@milkdown/kit/prose/view/style/prosemirror.css'

import type { EditorState } from '@milkdown/kit/prose/state'
import type { ComponentType, ReactNode } from 'react'

import {
  defaultValueCtx,
  Editor,
  editorViewCtx,
  editorViewOptionsCtx,
  remarkStringifyOptionsCtx,
  rootCtx,
  serializerCtx,
} from '@milkdown/kit/core'
import { history, redoCommand, undoCommand } from '@milkdown/kit/plugin/history'
import {
  commonmark,
  liftListItemCommand,
  remarkPreserveEmptyLinePlugin,
  toggleEmphasisCommand,
  toggleInlineCodeCommand,
  toggleStrongCommand,
  turnIntoTextCommand,
  wrapInBlockquoteCommand,
  wrapInBulletListCommand,
  wrapInHeadingCommand,
  wrapInOrderedListCommand,
} from '@milkdown/kit/preset/commonmark'
import { gfm, toggleStrikethroughCommand } from '@milkdown/kit/preset/gfm'
import { lift } from '@milkdown/kit/prose/commands'
import { redoDepth, undoDepth } from '@milkdown/kit/prose/history'
import { Plugin, PluginKey } from '@milkdown/kit/prose/state'
import { $prose, $remark, callCommand } from '@milkdown/kit/utils'
import { Milkdown, MilkdownProvider, useEditor, useInstance } from '@milkdown/react'
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
import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

// A rich text editor that reads and writes Markdown (Milkdown, on ProseMirror
// and remark), so what it produces stays a plain string any client can show.

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

// Without this plugin an empty paragraph is not written out as `<br />`,
// which every other client would show as those six characters.
const preset = commonmark.filter(
  (plugin) => !(remarkPreserveEmptyLinePlugin as unknown[]).includes(plugin)
)

interface MarkdownNode {
  type: string
  title?: string | null
  children?: MarkdownNode[]
}

// remark gives an image without a title `null`, which Milkdown's image node
// refuses, and the whole document then fails to load.
const imageTitle = $remark('imageTitle', () => () => (tree: MarkdownNode) => {
  const visit = (node: MarkdownNode) => {
    if (node.type === 'image') node.title ??= ''
    node.children?.forEach(visit)
  }
  visit(tree)
})

/** What the toolbar shows for the current selection. */
interface Active {
  bold: boolean
  italic: boolean
  strike: boolean
  code: boolean
  h1: boolean
  h2: boolean
  quote: boolean
  bullet: boolean
  ordered: boolean
  canUndo: boolean
  canRedo: boolean
  /** Nothing typed yet: the placeholder shows. */
  empty: boolean
}

const INACTIVE: Active = {
  bold: false,
  italic: false,
  strike: false,
  code: false,
  h1: false,
  h2: false,
  quote: false,
  bullet: false,
  ordered: false,
  canUndo: false,
  canRedo: false,
  empty: true,
}

function readActive(state: EditorState): Active {
  const { $from, from, to, empty } = state.selection

  const marked = (name: string) => {
    const type = state.schema.marks[name]
    return empty
      ? !!type.isInSet(state.storedMarks ?? $from.marks())
      : state.doc.rangeHasMark(from, to, type)
  }

  // The blocks around the cursor, innermost first.
  const around: string[] = []
  for (let depth = $from.depth; depth > 0; depth--) around.push($from.node(depth).type.name)
  const list = around.find((name) => name === 'bullet_list' || name === 'ordered_list')
  const heading = $from.parent.type.name === 'heading' ? $from.parent.attrs.level : 0

  return {
    bold: marked('strong'),
    italic: marked('emphasis'),
    strike: marked('strike_through'),
    code: marked('inlineCode'),
    h1: heading === 1,
    h2: heading === 2,
    quote: around.includes('blockquote'),
    bullet: list === 'bullet_list',
    ordered: list === 'ordered_list',
    canUndo: undoDepth(state) > 0,
    canRedo: redoDepth(state) > 0,
    empty: state.doc.childCount === 1 && state.doc.firstChild!.content.size === 0,
  }
}

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
  const [active, setActive] = useState(INACTIVE)

  // The editor is built once; it reaches the latest props through this.
  const latest = useRef({ onChange, onBlur, disabled })
  useEffect(() => {
    latest.current = { onChange, onBlur, disabled }
  }, [onChange, onBlur, disabled])

  const initial = useRef(value)

  useEditor(
    (root) => {
      // Reports every change as it happens, and keeps the toolbar in step
      // with the selection.
      const sync = $prose((ctx) => {
        const refresh = (state: EditorState) => {
          const next = readActive(state)
          setActive((current) =>
            Object.keys(next).every(
              (key) => next[key as keyof Active] === current[key as keyof Active]
            )
              ? current
              : next
          )
        }

        return new Plugin({
          key: new PluginKey('rich-text-editor-sync'),
          props: {
            handleDOMEvents: {
              blur: () => {
                latest.current.onBlur?.()
                return false
              },
            },
          },
          view: (view) => {
            refresh(view.state)
            return {
              update: (updated, previous) => {
                if (!updated.state.doc.eq(previous.doc)) {
                  latest.current.onChange(ctx.get(serializerCtx)(updated.state.doc).trimEnd())
                }
                refresh(updated.state)
              },
            }
          },
        })
      })

      return Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, root)
          ctx.set(defaultValueCtx, initial.current)
          ctx.update(remarkStringifyOptionsCtx, (options) => ({ ...options, bullet: '-' as const }))
          ctx.update(editorViewOptionsCtx, (options) => ({
            ...options,
            editable: () => !latest.current.disabled,
            attributes: {
              class: CONTENT_CLASS,
              role: 'textbox',
              'aria-multiline': 'true',
              ...(labelledBy ? { 'aria-labelledby': labelledBy } : {}),
            },
            nodeViews: {
              // An image is shown as the Markdown that names it and never
              // loaded: the content may be secret or come from someone else,
              // and an image address is a request to somewhere.
              image: (node) => {
                const dom = document.createElement('span')
                dom.className = 'text-muted-foreground'
                dom.textContent = `![${node.attrs.alt ?? ''}](${node.attrs.src ?? ''})`
                return { dom }
              },
            },
          }))
        })
        .use(preset)
        .use(imageTitle)
        .use(gfm)
        .use(history)
        .use(sync)
    },
    [labelledBy]
  )

  const [loading, getEditor] = useInstance()

  useEffect(() => {
    if (loading) return
    // ProseMirror asks `editable` again when its props are set.
    getEditor()?.action((ctx) => ctx.get(editorViewCtx).setProps({ editable: () => !disabled }))
  }, [loading, getEditor, disabled])

  const run = <T,>(command: { key: unknown }, payload?: T) => {
    getEditor()?.action(callCommand(command.key as never, payload as never))
  }

  const toggleHeading = (level: 1 | 2, on: boolean) =>
    on ? run(turnIntoTextCommand) : run(wrapInHeadingCommand, level)

  const toggleList = (command: { key: unknown }, on: boolean) => {
    // Out of the list it is in first, also when changing to the other kind.
    if (active.bullet || active.ordered) run(liftListItemCommand)
    if (!on) run(command)
  }

  const toggleQuote = () => {
    if (!active.quote) return run(wrapInBlockquoteCommand)
    getEditor()?.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      lift(view.state, view.dispatch)
    })
  }

  const off = disabled || loading

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
          onClick={() => run(toggleStrongCommand)}
        />
        <Tool
          label="Italic"
          icon={IconItalic}
          active={active.italic}
          disabled={off}
          onClick={() => run(toggleEmphasisCommand)}
        />
        <Tool
          label="Strikethrough"
          icon={IconStrikethrough}
          active={active.strike}
          disabled={off}
          onClick={() => run(toggleStrikethroughCommand)}
        />
        <Tool
          label="Inline code"
          icon={IconCode}
          active={active.code}
          disabled={off}
          onClick={() => run(toggleInlineCodeCommand)}
        />
        <Divider />
        <Tool
          label="Heading 1"
          icon={IconH1}
          active={active.h1}
          disabled={off}
          onClick={() => toggleHeading(1, active.h1)}
        />
        <Tool
          label="Heading 2"
          icon={IconH2}
          active={active.h2}
          disabled={off}
          onClick={() => toggleHeading(2, active.h2)}
        />
        <Tool
          label="Quote"
          icon={IconBlockquote}
          active={active.quote}
          disabled={off}
          onClick={toggleQuote}
        />
        <Divider />
        <Tool
          label="Bulleted list"
          icon={IconList}
          active={active.bullet}
          disabled={off}
          onClick={() => toggleList(wrapInBulletListCommand, active.bullet)}
        />
        <Tool
          label="Numbered list"
          icon={IconListNumbers}
          active={active.ordered}
          disabled={off}
          onClick={() => toggleList(wrapInOrderedListCommand, active.ordered)}
        />
        <Divider />
        <Tool
          label="Undo"
          icon={IconArrowBackUp}
          disabled={off || !active.canUndo}
          onClick={() => run(undoCommand)}
        />
        <Tool
          label="Redo"
          icon={IconArrowForwardUp}
          disabled={off || !active.canRedo}
          onClick={() => run(redoCommand)}
        />
        {toolbarEnd && <span className="ml-auto">{toolbarEnd}</span>}
      </div>

      <div className="relative">
        {placeholder && active.empty && (
          <div className="text-muted-foreground/80 pointer-events-none absolute top-2 left-3">
            {placeholder}
          </div>
        )}
        <Milkdown />
      </div>
    </div>
  )
}

/** A rich text editor whose value is Markdown. */
export default function RichTextEditor(props: RichTextEditorProps) {
  return (
    <MilkdownProvider>
      <EditorBody {...props} />
    </MilkdownProvider>
  )
}
