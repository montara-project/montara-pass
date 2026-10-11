import '@milkdown/kit/prose/view/style/prosemirror.css'

import type { EditorState } from '@milkdown/kit/prose/state'
import type { EditorView } from '@milkdown/kit/prose/view'

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
import { Fragment, Slice } from '@milkdown/kit/prose/model'
import { Plugin, PluginKey } from '@milkdown/kit/prose/state'
import { $prose, $remark, callCommand } from '@milkdown/kit/utils'
import { Milkdown, MilkdownProvider, useEditor, useInstance } from '@milkdown/react'
import { useEffect, useRef, useState } from 'react'

// A rich text editor that reads and writes Markdown (Milkdown, on ProseMirror
// and remark), so what it produces stays a plain string any client can show.
// This is the editor without its looks: the web app and the extension each
// draw their own toolbar around it.

/** Wraps a component that calls useMarkdownEditor. */
export const MarkdownEditorProvider = MilkdownProvider

/** Where the editable content is rendered. */
export const MarkdownEditorContent = Milkdown

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

/**
 * GitHub and Gist lay a file out as a table, one row per line, and that is
 * what a copy from them puts on the clipboard. Pasted as it is, a script
 * would become a table of one column. Here such a table becomes the code
 * block it stands for.
 */
// ponytail: only GitHub's own markup (td.blob-code) is recognised; another
// site that draws code as a table still pastes as a table.
function codeTablesToBlocks(html: string): string {
  if (!html.includes('blob-code')) return html

  const page = new DOMParser().parseFromString(html, 'text/html')
  for (const table of page.querySelectorAll('table')) {
    const lines = table.querySelectorAll('td.blob-code')
    if (lines.length === 0) continue

    const code = page.createElement('code')
    code.textContent = Array.from(lines, (line) => line.textContent ?? '').join('\n')
    const block = page.createElement('pre')
    block.append(code)
    table.replaceWith(block)
  }
  return page.body.innerHTML
}

/**
 * Whether pasted plain text is code rather than prose: more than one line,
 * and either a script's first line, indentation, or lines ending the way
 * statements do.
 */
// ponytail: a guess from the shape of the text. Prose with an indented line
// is taken for code; flat code without semicolons or braces is not.
function looksLikeCode(text: string): boolean {
  const lines = text.split('\n').filter((line) => line.trim() !== '')
  if (lines.length < 2) return false
  if (text.startsWith('#!')) return true
  if (lines.some((line) => /^(\t| {2,})\S/.test(line))) return true

  const statements = lines.filter((line) => /[{};]\s*$/.test(line)).length
  return statements / lines.length >= 0.3
}

/**
 * Pasted code becomes a code block. As paragraphs it would lose its blank
 * lines and indentation, and be saved with Markdown's escapes in it: `\#`
 * for a comment, `\*` for a glob.
 */
function codeToBlock(text: string, view: EditorView): Slice | undefined {
  const { code_block: codeBlock } = view.state.schema.nodes
  const code = text.replace(/\r\n?/g, '\n').replace(/\n+$/, '')
  if (!codeBlock || !looksLikeCode(code)) return undefined

  return new Slice(Fragment.from(codeBlock.create(null, view.state.schema.text(code))), 0, 0)
}

/** What the toolbar shows for the current selection. */
export interface MarkdownEditorActive {
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

const INACTIVE: MarkdownEditorActive = {
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

function readActive(state: EditorState): MarkdownEditorActive {
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

export interface MarkdownEditorOptions {
  /**
   * The content as Markdown. It is read once, when the editor mounts: give
   * the editor a new `key` to load something else.
   */
  value: string
  /** Called with the content as Markdown whenever it changes. */
  onChange: (markdown: string) => void
  onBlur?: () => void
  disabled?: boolean
  /** Only shows the content: it is never editable and is not a text field. */
  readOnly?: boolean
  /** Labels the editing area for assistive technology. */
  labelledBy?: string
  /** Class of the editable area; headings, lists and the rest are styled from it. */
  contentClass: string
  /** Class of the text an image is replaced by. */
  imageClass?: string
}

/**
 * The editor's state and what a toolbar can do with it. Call it inside
 * MarkdownEditorProvider and render MarkdownEditorContent where the text goes.
 */
export function useMarkdownEditor({
  value,
  onChange,
  onBlur,
  disabled = false,
  readOnly = false,
  labelledBy,
  contentClass,
  imageClass = '',
}: MarkdownEditorOptions) {
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
              (key) =>
                next[key as keyof MarkdownEditorActive] ===
                current[key as keyof MarkdownEditorActive]
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
            editable: () => !readOnly && !latest.current.disabled,
            transformPastedHTML: codeTablesToBlocks,
            // No slice means the text is pasted the usual way, as paragraphs.
            clipboardTextParser: (text, _context, _plain, view) => codeToBlock(text, view) as Slice,
            attributes: {
              class: contentClass,
              ...(readOnly ? {} : { 'aria-multiline': 'true' }),
              ...(labelledBy ? { 'aria-labelledby': labelledBy } : {}),
            },
            nodeViews: {
              // An image is shown as the Markdown that names it and never
              // loaded: the content may be secret or come from someone else,
              // and an image address is a request to somewhere.
              image: (node) => {
                const dom = document.createElement('span')
                dom.className = imageClass
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
    [labelledBy, contentClass, imageClass, readOnly]
  )

  const [loading, getEditor] = useInstance()

  useEffect(() => {
    if (loading) return
    // ProseMirror asks `editable` again when its props are set.
    getEditor()?.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      view.setProps({ editable: () => !readOnly && !disabled })
      // Milkdown calls the element a text box; one that only shows its
      // content is not, and its headings and lists speak for it.
      if (readOnly) view.dom.removeAttribute('role')
    })
  }, [loading, getEditor, disabled, readOnly])

  const run = <T>(command: { key: unknown }, payload?: T) => {
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

  return {
    active,
    /** True until the editor is ready, and while it is disabled. */
    off: disabled || loading,
    tools: {
      bold: () => run(toggleStrongCommand),
      italic: () => run(toggleEmphasisCommand),
      strikethrough: () => run(toggleStrikethroughCommand),
      code: () => run(toggleInlineCodeCommand),
      heading: (level: 1 | 2) => toggleHeading(level, level === 1 ? active.h1 : active.h2),
      quote: toggleQuote,
      bulletList: () => toggleList(wrapInBulletListCommand, active.bullet),
      orderedList: () => toggleList(wrapInOrderedListCommand, active.ordered),
      undo: () => run(undoCommand),
      redo: () => run(redoCommand),
    },
  }
}
