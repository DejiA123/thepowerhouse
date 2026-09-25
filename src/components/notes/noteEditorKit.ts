import { Extension } from '@tiptap/core';
import { DOMSerializer, type Fragment, type Node as PMNode, type Slice } from '@tiptap/pm/model';
import type { EditorView } from '@tiptap/pm/view';

const isIOS = () =>
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

/**
 * Return / Enter that behaves like Apple Notes:
 *  • no stray space left at the end of the line (iOS predictive text adds one)
 *  • on iPhone the Return key is handled directly, instead of iOS first
 *    typing into the page (which briefly showed a space before the new line)
 */
export const TidyEnter = Extension.create({
  name: 'tidyEnter',
  priority: 1000,

  addKeyboardShortcuts() {
    const trimBeforeCursor = () => {
      const { state, view } = this.editor;
      const { $from, empty } = state.selection;
      if (!empty || !$from.parent.isTextblock || $from.parent.type.spec.code) return false;
      const before = $from.parent.textBetween(0, $from.parentOffset, undefined, '￼');
      const trailing = before.match(/[  ]+$/)?.[0];
      if (trailing && trailing.length < before.length) {
        view.dispatch(state.tr.delete($from.pos - trailing.length, $from.pos));
      }
      return false; // let the normal Enter (new paragraph / list item) run
    };
    return { Enter: trimBeforeCursor, 'Shift-Enter': trimBeforeCursor };
  },
});

/** iOS Return → run the editor's own Enter, so the browser never edits the page itself. */
export function handleIOSReturn(view: EditorView, event: Event) {
  const e = event as InputEvent;
  if (!isIOS() || e.isComposing) return false;
  if (e.inputType !== 'insertParagraph' && e.inputType !== 'insertLineBreak') return false;
  e.preventDefault();
  // ProseMirror has its own delayed iOS Enter fallback; cancel it so Return isn't applied twice
  const input = (view as any).input;
  if (input) {
    clearTimeout(input.lastIOSEnterFallbackTimeout);
    input.lastIOSEnter = 0;
  }
  const key = document.createEvent('Event') as KeyboardEvent & { keyCode: number; key: string; code: string };
  key.initEvent('keydown', true, true);
  Object.defineProperty(key, 'keyCode', { value: 13 });
  Object.defineProperty(key, 'key', { value: 'Enter' });
  Object.defineProperty(key, 'code', { value: 'Enter' });
  Object.defineProperty(key, 'shiftKey', { value: e.inputType === 'insertLineBreak' });
  view.someProp('handleKeyDown', (f) => f(view, key));
  return true;
}

/* ── Copying: paste into WhatsApp / Messages looks like the note ───────── */

// WhatsApp formatting: *bold*, _italic_, ~strike~ (markers must hug the words)
const wrapMarker = (text: string, marker: string) => {
  const m = text.match(/^(\s*)([\s\S]*?)(\s*)$/);
  return m && m[2] ? `${m[1]}${marker}${m[2]}${marker}${m[3]}` : text;
};

function inlineNodesText(nodes: PMNode[]) {
  let out = '';
  for (const child of nodes) {
    if (child.isText) {
      let text = child.text || '';
      const marks = new Set(child.marks.map((m) => m.type.name));
      if (marks.has('code')) text = wrapMarker(text, '`');
      if (marks.has('strike')) text = wrapMarker(text, '~');
      if (marks.has('italic')) text = wrapMarker(text, '_');
      if (marks.has('bold')) text = wrapMarker(text, '*');
      out += text;
    } else if (child.type.name === 'hardBreak') {
      out += '\n';
    } else if (child.isInline) {
      out += child.textContent;
    }
  }
  return out;
}

const inlineText = (node: PMNode) => {
  const kids: PMNode[] = [];
  node.forEach((k) => kids.push(k));
  return inlineNodesText(kids);
};

function listLines(list: PMNode, indent: string): string[] {
  const lines: string[] = [];
  let n = Number(list.attrs.start) || 1;
  list.forEach((item) => {
    const marker =
      list.type.name === 'orderedList' ? `${n++}. ` : list.type.name === 'taskList' ? (item.attrs.checked ? '☑ ' : '☐ ') : '• ';
    let first = true;
    item.forEach((child) => {
      if (child.isTextblock) {
        lines.push(`${indent}${first ? marker : ' '.repeat(marker.length)}${inlineText(child)}`);
        first = false;
      } else {
        lines.push(...blockLines(child, `${indent}   `));
      }
    });
    if (first) lines.push(`${indent}${marker}`);
  });
  return lines;
}

function blockLines(node: PMNode, indent = ''): string[] {
  const name = node.type.name;
  if (name === 'heading') return [indent + wrapMarker(inlineText(node), '*')];
  if (name === 'bulletList' || name === 'orderedList' || name === 'taskList') return listLines(node, indent);
  if (name === 'blockquote') return fragmentLines(node.content).map((l) => `${indent}> ${l}`);
  if (name === 'codeBlock') return ['```', ...node.textContent.split('\n'), '```'].map((l) => indent + l);
  if (name === 'horizontalRule') return [`${indent}———`];
  if (name === 'image') return [];
  if (name === 'table') {
    const rows: string[] = [];
    node.forEach((row) => {
      const cells: string[] = [];
      row.forEach((cell) => cells.push(fragmentLines(cell.content).join(' ')));
      rows.push(indent + cells.join(' | '));
    });
    return rows;
  }
  if (node.isTextblock) return [indent + inlineText(node)];
  return fragmentLines(node.content).map((l) => indent + l);
}

function fragmentLines(fragment: Fragment): string[] {
  const lines: string[] = [];
  let inline: PMNode[] = [];
  const flush = () => {
    if (inline.length) lines.push(inlineNodesText(inline));
    inline = [];
  };
  fragment.forEach((node) => {
    if (node.isInline) inline.push(node); // a selection inside one line
    else {
      flush();
      lines.push(...blockLines(node));
    }
  });
  flush();
  return lines;
}

/** Plain text for the clipboard: one line per line, no blank line between every paragraph. */
export function sliceToPlainText(slice: Slice) {
  return fragmentLines(slice.content)
    .map((line) => line.replace(/[ \t ]+$/g, ''))
    .join('\n')
    .replace(/^\n+|\n+$/g, '');
}

/**
 * Rich text for the clipboard with paragraph spacing removed, so apps that
 * paste formatted text don't add a gap after every line.
 */
export const compactClipboardSerializer = {
  serializeFragment(fragment: Fragment, options: { document?: Document } = {}, target?: HTMLElement | DocumentFragment) {
    const schema = fragment.firstChild?.type.schema;
    const doc = options.document || document;
    if (!schema) return target || doc.createDocumentFragment();
    const out = DOMSerializer.fromSchema(schema).serializeFragment(fragment, options, target);
    (out as ParentNode).querySelectorAll?.('p, h1, h2, h3, h4, ul, ol, li, blockquote').forEach((el) => {
      (el as HTMLElement).style.margin = '0';
    });
    // Keep intentional blank lines
    (out as ParentNode).querySelectorAll?.('p:empty').forEach((el) => el.appendChild(doc.createElement('br')));
    return out;
  },
} as unknown as DOMSerializer;
