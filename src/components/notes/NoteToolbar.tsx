import { useEffect, useRef, useState } from 'react';
import { useEditorState, type Editor } from '@tiptap/react';
import {
  AlignCenter, AlignLeft, AlignRight, Bold, CheckSquare, ChevronDown, Code, Heading1, Heading2, Heading3, Highlighter,
  IndentDecrease, IndentIncrease, Italic, Keyboard, Link2, List, ListOrdered, Minus, Pilcrow, Quote, Redo2, Strikethrough,
  Table2, Underline, Undo2, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  editor: Editor | null;
  placement: 'top' | 'bottom';
  keyboardOpen?: boolean;
}

/** Keep focus (and the iPhone keyboard) in the note when tapping toolbar buttons. */
const keepFocus = (e: React.PointerEvent | React.MouseEvent) => e.preventDefault();

const Btn = ({
  active, onClick, label, children, disabled, wide,
}: { active?: boolean; onClick: () => void; label: string; children: React.ReactNode; disabled?: boolean; wide?: boolean }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    aria-pressed={active}
    disabled={disabled}
    onPointerDown={keepFocus}
    onMouseDown={keepFocus}
    onClick={onClick}
    className={cn(
      'flex h-10 shrink-0 items-center justify-center rounded-xl transition active:scale-90 disabled:opacity-30',
      wide ? 'gap-1 px-2.5' : 'w-10',
      active ? 'bg-blue-600 text-white shadow-sm' : 'text-foreground/80 hover:bg-muted',
    )}
  >
    {children}
  </button>
);

const Divider = () => <div className="mx-0.5 h-6 w-px shrink-0 bg-border" />;

const NoteToolbar = ({ editor, placement, keyboardOpen }: Props) => {
  const [panel, setPanel] = useState<'none' | 'styles' | 'link'>('none');
  const [linkUrl, setLinkUrl] = useState('');
  const linkInput = useRef<HTMLInputElement>(null);

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e) return null;
      return {
        bold: e.isActive('bold'),
        italic: e.isActive('italic'),
        underline: e.isActive('underline'),
        strike: e.isActive('strike'),
        code: e.isActive('code'),
        highlight: e.isActive('highlight'),
        link: e.isActive('link'),
        bullet: e.isActive('bulletList'),
        ordered: e.isActive('orderedList'),
        task: e.isActive('taskList'),
        quote: e.isActive('blockquote'),
        h1: e.isActive('heading', { level: 1 }),
        h2: e.isActive('heading', { level: 2 }),
        h3: e.isActive('heading', { level: 3 }),
        alignCenter: e.isActive({ textAlign: 'center' }),
        alignRight: e.isActive({ textAlign: 'right' }),
        inList: e.isActive('listItem') || e.isActive('taskItem'),
        canUndo: e.can().undo(),
        canRedo: e.can().redo(),
      };
    },
  });

  useEffect(() => {
    if (panel === 'link') setTimeout(() => linkInput.current?.focus(), 30);
  }, [panel]);

  if (!editor || !state) return null;

  const chain = () => editor.chain().focus();
  const listItemType = state.task ? 'taskItem' : 'listItem';

  const applyLink = () => {
    const url = linkUrl.trim();
    if (!url) {
      chain().extendMarkRange('link').unsetLink().run();
    } else {
      const href = /^(https?:|mailto:|tel:)/i.test(url) ? url : `https://${url}`;
      if (editor.state.selection.empty && !state.link) {
        chain().insertContent({ type: 'text', text: url, marks: [{ type: 'link', attrs: { href } }] }).run();
      } else {
        chain().extendMarkRange('link').setLink({ href }).run();
      }
    }
    setPanel('none');
    setLinkUrl('');
  };

  const styleLabel = state.h1 ? 'Title' : state.h2 ? 'Heading' : state.h3 ? 'Subheading' : 'Body';

  return (
    <div
      className={cn(
        'z-10 shrink-0 border-border/60 bg-background/95 backdrop-blur-xl',
        placement === 'top' ? 'border-b' : 'border-t',
        placement === 'bottom' && !keyboardOpen && 'pb-[env(safe-area-inset-bottom)]',
      )}
    >
      {/* Text styles panel */}
      {panel === 'styles' && (
        <div className="flex items-center gap-1 overflow-x-auto border-b border-border/60 px-2 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Btn wide label="Title" active={state.h1} onClick={() => chain().toggleHeading({ level: 1 }).run()}>
            <Heading1 className="h-5 w-5" /><span className="text-sm font-bold">Title</span>
          </Btn>
          <Btn wide label="Heading" active={state.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()}>
            <Heading2 className="h-5 w-5" /><span className="text-sm font-semibold">Heading</span>
          </Btn>
          <Btn wide label="Subheading" active={state.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()}>
            <Heading3 className="h-5 w-5" /><span className="text-sm font-medium">Subheading</span>
          </Btn>
          <Btn wide label="Body" active={!state.h1 && !state.h2 && !state.h3} onClick={() => chain().setParagraph().run()}>
            <Pilcrow className="h-5 w-5" /><span className="text-sm">Body</span>
          </Btn>
          <Divider />
          <Btn label="Align left" active={!state.alignCenter && !state.alignRight} onClick={() => chain().setTextAlign('left').run()}>
            <AlignLeft className="h-5 w-5" />
          </Btn>
          <Btn label="Align centre" active={state.alignCenter} onClick={() => chain().setTextAlign('center').run()}>
            <AlignCenter className="h-5 w-5" />
          </Btn>
          <Btn label="Align right" active={state.alignRight} onClick={() => chain().setTextAlign('right').run()}>
            <AlignRight className="h-5 w-5" />
          </Btn>
          <Divider />
          <Btn label="Quote" active={state.quote} onClick={() => chain().toggleBlockquote().run()}>
            <Quote className="h-5 w-5" />
          </Btn>
          <Btn label="Code" active={state.code} onClick={() => chain().toggleCode().run()}>
            <Code className="h-5 w-5" />
          </Btn>
          <Btn label="Divider line" onClick={() => chain().setHorizontalRule().run()}>
            <Minus className="h-5 w-5" />
          </Btn>
          <Btn label="Insert table" onClick={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
            <Table2 className="h-5 w-5" />
          </Btn>
        </div>
      )}

      {/* Link editor */}
      {panel === 'link' && (
        <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
          <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={linkInput}
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                applyLink();
              }
              if (e.key === 'Escape') setPanel('none');
            }}
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            placeholder="Paste or type a link"
            className="h-9 min-w-0 flex-1 bg-transparent text-[16px] outline-none"
          />
          {state.link && (
            <button onClick={() => { chain().extendMarkRange('link').unsetLink().run(); setPanel('none'); }} className="rounded-lg px-2 py-1 text-sm font-medium text-red-600">
              Remove
            </button>
          )}
          <button onClick={applyLink} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white">Apply</button>
          <button onClick={() => setPanel('none')} className="rounded-full p-1.5 text-muted-foreground" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main row */}
      <div className="mx-auto flex max-w-3xl items-center gap-0.5 overflow-x-auto px-2 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Btn wide label="Text style" active={panel === 'styles'} onClick={() => setPanel(panel === 'styles' ? 'none' : 'styles')}>
          <span className="font-serif text-lg font-bold leading-none">Aa</span>
          <span className="hidden text-xs sm:inline">{styleLabel}</span>
          <ChevronDown className={cn('h-3.5 w-3.5 transition', panel === 'styles' && 'rotate-180')} />
        </Btn>
        <Divider />
        <Btn label="Bold" active={state.bold} onClick={() => chain().toggleBold().run()}><Bold className="h-5 w-5" /></Btn>
        <Btn label="Italic" active={state.italic} onClick={() => chain().toggleItalic().run()}><Italic className="h-5 w-5" /></Btn>
        <Btn label="Underline" active={state.underline} onClick={() => chain().toggleUnderline().run()}><Underline className="h-5 w-5" /></Btn>
        <Btn label="Strikethrough" active={state.strike} onClick={() => chain().toggleStrike().run()}><Strikethrough className="h-5 w-5" /></Btn>
        <Btn label="Highlight" active={state.highlight} onClick={() => chain().toggleHighlight({ color: '#fef08a' }).run()}>
          <Highlighter className="h-5 w-5" />
        </Btn>
        <Divider />
        <Btn label="Bulleted list" active={state.bullet} onClick={() => chain().toggleBulletList().run()}><List className="h-5 w-5" /></Btn>
        <Btn label="Numbered list" active={state.ordered} onClick={() => chain().toggleOrderedList().run()}><ListOrdered className="h-5 w-5" /></Btn>
        <Btn label="Checklist" active={state.task} onClick={() => chain().toggleTaskList().run()}><CheckSquare className="h-5 w-5" /></Btn>
        <Btn label="Indent" disabled={!state.inList} onClick={() => chain().sinkListItem(listItemType).run()}>
          <IndentIncrease className="h-5 w-5" />
        </Btn>
        <Btn label="Outdent" disabled={!state.inList} onClick={() => chain().liftListItem(listItemType).run()}>
          <IndentDecrease className="h-5 w-5" />
        </Btn>
        <Divider />
        <Btn
          label="Link"
          active={state.link || panel === 'link'}
          onClick={() => {
            setLinkUrl(editor.getAttributes('link').href || '');
            setPanel(panel === 'link' ? 'none' : 'link');
          }}
        >
          <Link2 className="h-5 w-5" />
        </Btn>
        <Btn label="Undo" disabled={!state.canUndo} onClick={() => chain().undo().run()}><Undo2 className="h-5 w-5" /></Btn>
        <Btn label="Redo" disabled={!state.canRedo} onClick={() => chain().redo().run()}><Redo2 className="h-5 w-5" /></Btn>
        {placement === 'bottom' && keyboardOpen && (
          <>
            <div className="flex-1" />
            <Btn label="Hide keyboard" onClick={() => editor.commands.blur()}><Keyboard className="h-5 w-5" /></Btn>
          </>
        )}
      </div>
    </div>
  );
};

export default NoteToolbar;
