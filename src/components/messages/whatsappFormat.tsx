import { Fragment, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * WhatsApp's text formatting, with WhatsApp's rules:
 *   *bold*  _italic_  ~strikethrough~  `inline code`  ```monospace```
 *   "> " quote, "- " / "* " / "• " bullet list, "1. " numbered list (at the start of a line)
 * A marker only counts at the edge of a word: the opening one after the start,
 * a space or punctuation and before a non-space; the closing one after a
 * non-space and before the end, a space or punctuation; never across a line.
 * So snake_case, 2*3*4 and links with underscores stay as they are.
 */

type Inline =
  | { kind: 'text'; text: string }
  | { kind: 'bold' | 'italic' | 'strike'; children: Inline[] }
  | { kind: 'code'; text: string };

const MARKS: Record<string, 'bold' | 'italic' | 'strike' | 'code'> = { '*': 'bold', _: 'italic', '~': 'strike', '`': 'code' };
const EDGE = /[\s\p{P}\p{S}]/u;
const isEdge = (ch: string | undefined) => ch === undefined || EDGE.test(ch);
const ATOMIC = /(?:https?:\/\/|www\.)[^\s]+|@\[[^\]\n]{1,80}\]\([0-9a-f-]{36}\)/y;

/** Where the marker opened at `i` closes (-1: it doesn't) */
function closing(s: string, i: number): number {
  const mark = s[i];
  for (let j = i + 2; j < s.length; j++) {
    const ch = s[j];
    if (ch === '\n') return -1;
    if (ch === mark && !/\s/.test(s[j - 1]) && isEdge(s[j + 1])) return j;
  }
  return -1;
}

export function parseInline(s: string): Inline[] {
  const out: Inline[] = [];
  let text = '';
  let i = 0;
  while (i < s.length) {
    // Links and @mentions are never formatted inside (a link can have _ or * in it)
    ATOMIC.lastIndex = i;
    const atomic = isEdge(s[i - 1]) ? ATOMIC.exec(s) : null;
    if (atomic) {
      text += atomic[0];
      i += atomic[0].length;
      continue;
    }
    const ch = s[i];
    const kind = MARKS[ch];
    if (kind && isEdge(s[i - 1]) && s[i - 1] !== ch && s[i + 1] !== undefined && !/\s/.test(s[i + 1]) && s[i + 1] !== ch) {
      const end = closing(s, i);
      if (end > i) {
        if (text) out.push({ kind: 'text', text });
        text = '';
        const inner = s.slice(i + 1, end);
        out.push(kind === 'code' ? { kind: 'code', text: inner } : { kind, children: parseInline(inner) });
        i = end + 1;
        continue;
      }
    }
    text += ch;
    i++;
  }
  if (text) out.push({ kind: 'text', text });
  return out;
}

const plainOf = (nodes: Inline[]): string =>
  nodes.map((n) => (n.kind === 'text' || n.kind === 'code' ? n.text : plainOf(n.children))).join('');

/** The text without formatting marks (chat lists, notifications, copying a quote) */
export function plainFormatting(text: string): string {
  return text
    .replace(/```([\s\S]*?)```/g, '$1')
    .split('\n')
    .map((line) => plainOf(parseInline(line.replace(/^>\s?/, ''))))
    .join('\n');
}

function renderInline(nodes: Inline[], leaf: (text: string, key: string) => ReactNode, key: string, mono: string): ReactNode[] {
  return nodes.map((n, i) => {
    const k = `${key}.${i}`;
    if (n.kind === 'text') return <Fragment key={k}>{leaf(n.text, k)}</Fragment>;
    if (n.kind === 'code') return <code key={k} className={mono}>{n.text}</code>;
    const children = renderInline(n.children, leaf, k, mono);
    if (n.kind === 'bold') return <strong key={k} className="font-bold">{children}</strong>;
    if (n.kind === 'italic') return <em key={k} className="italic">{children}</em>;
    return <s key={k}>{children}</s>;
  });
}

type Block =
  | { kind: 'text'; lines: string[] }
  | { kind: 'quote'; lines: string[] }
  | { kind: 'bullets'; lines: string[] }
  | { kind: 'numbers'; lines: { n: string; text: string }[] };

const BULLET = /^[-*•]\s+(.*)$/;
const NUMBER = /^(\d{1,3})\.\s+(.*)$/;
const QUOTE = /^>\s?(.*)$/;

function blocksOf(text: string): Block[] {
  const blocks: Block[] = [];
  for (const line of text.split('\n')) {
    const last = blocks[blocks.length - 1];
    let m: RegExpMatchArray | null;
    if ((m = line.match(QUOTE))) {
      if (last?.kind === 'quote') last.lines.push(m[1]);
      else blocks.push({ kind: 'quote', lines: [m[1]] });
    } else if ((m = line.match(BULLET))) {
      if (last?.kind === 'bullets') last.lines.push(m[1]);
      else blocks.push({ kind: 'bullets', lines: [m[1]] });
    } else if ((m = line.match(NUMBER))) {
      if (last?.kind === 'numbers') last.lines.push({ n: m[1], text: m[2] });
      else blocks.push({ kind: 'numbers', lines: [{ n: m[1], text: m[2] }] });
    } else if (last?.kind === 'text') last.lines.push(line);
    else blocks.push({ kind: 'text', lines: [line] });
  }
  return blocks;
}

/**
 * The message as formatted text. `leaf` draws plain stretches (links, @mentions);
 * `own` picks colours for my (blue) bubbles.
 */
export function renderFormatted(text: string, leaf: (text: string, key: string) => ReactNode, own = false): ReactNode[] {
  const mono = cn('rounded-[5px] px-1 py-px font-mono text-[0.9em]', own ? 'bg-white/20' : 'bg-black/[0.06] dark:bg-white/10');
  const out: ReactNode[] = [];
  // ```monospace``` first (it can run over several lines and nothing inside is formatted)
  const parts = text.split(/```([\s\S]*?)```/g);
  parts.forEach((part, p) => {
    if (p % 2 === 1) {
      out.push(<code key={`m${p}`} className={cn('my-0.5 block whitespace-pre-wrap rounded-lg px-2 py-1 font-mono text-[0.88em]', own ? 'bg-white/15' : 'bg-black/[0.05] dark:bg-white/10')}>{part.replace(/^\n|\n$/g, '')}</code>);
      return;
    }
    if (!part) return;
    // Text around a monospace block: drop the line break that joins them (the block has its own)
    let trimmed = part;
    if (p > 0) trimmed = trimmed.replace(/^\n/, '');
    if (p < parts.length - 1) trimmed = trimmed.replace(/\n$/, '');
    blocksOf(trimmed).forEach((b, i) => {
      const k = `b${p}.${i}`;
      if (b.kind === 'text') {
        out.push(<Fragment key={k}>{renderInline(parseInline(b.lines.join('\n')), leaf, k, mono)}</Fragment>);
      } else if (b.kind === 'quote') {
        out.push(
          <span key={k} className={cn('my-0.5 block border-l-[3px] pl-2', own ? 'border-white/60 text-white/90' : 'border-muted-foreground/40 text-muted-foreground')}>
            {b.lines.map((line, j) => <span key={j} className="block">{renderInline(parseInline(line), leaf, `${k}.${j}`, mono)}</span>)}
          </span>,
        );
      } else if (b.kind === 'bullets') {
        out.push(
          <span key={k} className="my-0.5 block">
            {b.lines.map((line, j) => (
              <span key={j} className="flex gap-2"><span aria-hidden>•</span><span className="min-w-0 flex-1">{renderInline(parseInline(line), leaf, `${k}.${j}`, mono)}</span></span>
            ))}
          </span>,
        );
      } else {
        out.push(
          <span key={k} className="my-0.5 block">
            {b.lines.map((line, j) => (
              <span key={j} className="flex gap-1.5"><span className="tabular-nums">{line.n}.</span><span className="min-w-0 flex-1">{renderInline(parseInline(line.text), leaf, `${k}.${j}`, mono)}</span></span>
            ))}
          </span>,
        );
      }
    });
  });
  return out;
}

