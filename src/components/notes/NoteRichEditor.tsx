import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extensions';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { cn } from '@/lib/utils';
import { TidyEnter, compactClipboardSerializer, handleIOSReturn, sliceToPlainText } from './noteEditorKit';

export interface NoteRichEditorHandle {
  editor: Editor | null;
  focusEnd: () => void;
}

interface Props {
  /** Used once when the editor mounts. Remount (change `key`) to load another note. */
  initialContent: string;
  /** Fires only for real edits by the user (typing, formatting, paste, ticking a box). */
  onChange: (html: string) => void;
  onEditorReady?: (editor: Editor) => void;
  placeholder?: string;
  className?: string;
}

/**
 * The notes editor. Every extension used by older notes (alignment, colours,
 * highlights, tables, images, checklists) is registered so opening and editing
 * a note never strips its formatting.
 */
const NoteRichEditor = forwardRef<NoteRichEditorHandle, Props>(
  ({ initialContent, onChange, onEditorReady, placeholder = 'Start writing…', className }, ref) => {
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          link: {
            openOnClick: false,
            autolink: true,
            linkOnPaste: true,
            defaultProtocol: 'https',
            HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
          },
        }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Highlight.configure({ multicolor: true }),
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        TextStyle,
        Color,
        Image,
        Table.configure({ resizable: false }),
        TableRow,
        TableHeader,
        TableCell,
        Placeholder.configure({ placeholder }),
        TidyEnter,
      ],
      content: initialContent || '',
      onUpdate: ({ editor, transaction }) => {
        // Only real document changes. (Toggling editable mode also emits
        // "update" with an empty transaction — that must never save.)
        if (!transaction?.docChanged) return;
        onChangeRef.current(editor.getHTML());
      },
      editorProps: {
        attributes: {
          class: cn('note-editor focus:outline-none', className),
          autocapitalize: 'sentences',
          autocorrect: 'on',
          spellcheck: 'true',
          role: 'textbox',
          'aria-multiline': 'true',
          'aria-label': 'Note body',
        },
        // iPhone Return key: handled by the editor so no stray space appears
        handleDOMEvents: { beforeinput: handleIOSReturn },
        // Copy/paste into WhatsApp etc. keeps the note's line breaks and bold
        clipboardTextSerializer: sliceToPlainText,
        clipboardSerializer: compactClipboardSerializer,
      },
      immediatelyRender: true,
      shouldRerenderOnTransaction: false,
    });

    // Hand the instance to the toolbar once it exists (and again if it's recreated)
    const readyRef = useRef(onEditorReady);
    readyRef.current = onEditorReady;
    useEffect(() => {
      if (editor) readyRef.current?.(editor);
    }, [editor]);

    useImperativeHandle(ref, () => ({
      editor,
      focusEnd: () => editor?.chain().focus('end').run(),
    }), [editor]);

    return <EditorContent editor={editor} className="min-h-full" />;
  },
);

NoteRichEditor.displayName = 'NoteRichEditor';

export default NoteRichEditor;
