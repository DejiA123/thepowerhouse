import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import BubbleMenuExtension from '@tiptap/extension-bubble-menu';
import { cn } from '@/lib/utils';
import StarterKit from '@tiptap/starter-kit';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Link as LinkIcon, Image as ImageIcon, Table as TableIcon,
  Palette, Highlighter, Code, Quote, Undo, Redo,
  Heading1, Heading2, Heading3, Text, Subscript, Superscript, ChevronDown, ChevronUp,
  CheckSquare, Plus, Trash2, Columns, Rows
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useState, forwardRef, useImperativeHandle, useEffect } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  toolbarPosition?: 'top' | 'bottom';
  className?: string;
  readOnly?: boolean;
  compact?: boolean;
}

export interface RichTextEditorHandle {
  insertImage: (url: string, alt?: string) => void;
}

interface MenuBarProps {
  editor: any;
  isToolbarVisible: boolean;
  onToggleToolbar: () => void;
  isTouchActive: boolean;
  position?: 'top' | 'bottom';
}

const MenuBar = ({ editor, isToolbarVisible, onToggleToolbar, isTouchActive, position = 'top' }: MenuBarProps) => {
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showFormattingMenu, setShowFormattingMenu] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');

  if (!editor) {
    return null;
  }

  const addLink = () => {
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
      setLinkUrl('');
      setShowLinkDialog(false);
    }
  };

  const addImage = () => {
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl, alt: imageAlt }).run();
      setImageUrl('');
      setImageAlt('');
      setShowImageDialog(false);
    }
  };

  const shadowClass = "shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)]";
  const [showInsertMenu, setShowInsertMenu] = useState(false);

  const ToolbarButton = ({
    isActive,
    onClick,
    children,
    className = "",
    activeColor = "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30",
    title
  }: {
    isActive?: boolean,
    onClick: () => void,
    children: React.ReactNode,
    className?: string,
    activeColor?: string,
    title?: string
  }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      title={title}
      className={cn(
        "h-10 w-10 p-0 rounded-full transition-all duration-200 pointer-events-auto",
        isActive ? activeColor : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800",
        className
      )}
    >
      {children}
    </Button>
  );

  return (
    <>
      {editor && (
        <BubbleMenu
          editor={editor}
          shouldShow={({ editor }) => !isTouchActive && editor.isActive('table')}
          className="pointer-events-none"
        >
          <div className="flex items-center gap-2 bg-white/90 dark:bg-gray-950/90 border border-gray-200 dark:border-gray-800 p-2 rounded-xl shadow-2xl animate-in fade-in zoom-in duration-200 backdrop-blur-xl pointer-events-auto">
            {/* Columns Group */}
            <div className="flex items-center gap-1 bg-gray-50/50 dark:bg-gray-900/50 p-1 rounded-lg">
              <ToolbarButton onClick={() => editor.chain().focus().addColumnBefore().run()} className="relative" title="Add Column Before">
                <Columns className="w-5 h-5 mr-0.5" />
                <Plus className="w-3 h-3 absolute top-1 right-1 text-emerald-500 font-bold" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().addColumnAfter().run()} className="relative" title="Add Column After">
                <Columns className="w-5 h-5 ml-0.5" />
                <Plus className="w-3 h-3 absolute top-1 right-1 text-emerald-500 font-bold" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().deleteColumn().run()} className="relative text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" title="Delete Column">
                <Columns className="w-5 h-5" />
                <Trash2 className="w-3 h-3 absolute top-1 right-1" />
              </ToolbarButton>
            </div>

            <div className="h-6 w-px bg-gray-200 dark:bg-gray-800 mx-1"></div>

            {/* Rows Group */}
            <div className="flex items-center gap-1 bg-gray-50/50 dark:bg-gray-900/50 p-1 rounded-lg">
              <ToolbarButton onClick={() => editor.chain().focus().addRowBefore().run()} className="relative" title="Add Row Above">
                <Rows className="w-5 h-5 mt-0.5" />
                <Plus className="w-3 h-3 absolute top-1 right-1 text-emerald-500 font-bold" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().addRowAfter().run()} className="relative" title="Add Row Below">
                <Rows className="w-5 h-5 mb-0.5" />
                <Plus className="w-3 h-3 absolute top-1 right-1 text-emerald-500 font-bold" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().deleteRow().run()} className="relative text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" title="Delete Row">
                <Rows className="w-5 h-5" />
                <Trash2 className="w-3 h-3 absolute top-1 right-1" />
              </ToolbarButton>
            </div>

            <div className="h-6 w-px bg-gray-200 dark:bg-gray-800 mx-1"></div>

            {/* Table Actions */}
            <ToolbarButton onClick={() => editor.chain().focus().deleteTable().run()} className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30" title="Delete Table">
              <Trash2 className="w-5 h-5" />
            </ToolbarButton>
          </div>
        </BubbleMenu>
      )}

      {editor && (
        <BubbleMenu
          editor={editor}
          shouldShow={({ state }) => {
            if (isTouchActive) return false;
            const { selection } = state;
            return !selection.empty && !editor.isActive('table');
          }}
          className="pointer-events-none"
        >
          <div className="flex items-center gap-1.5 bg-white/95 dark:bg-gray-950/95 border border-gray-100 dark:border-gray-800 p-1.5 rounded-full shadow-2xl animate-in fade-in zoom-in duration-200 backdrop-blur-2xl ring-1 ring-black/5 dark:ring-white/10 pointer-events-auto">
            <ToolbarButton
              isActive={editor.isActive('bold')}
              onClick={() => editor.chain().focus().toggleBold().run()}
              title="Bold"
              className="h-9 w-9"
            >
              <Bold className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              isActive={editor.isActive('italic')}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              title="Italic"
              className="h-9 w-9"
            >
              <Italic className="w-4 h-4" />
            </ToolbarButton>
            <div className="h-6 w-px bg-gray-200 dark:bg-gray-800 mx-1"></div>
            <ToolbarButton
              isActive={editor.isActive('taskList')}
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              activeColor="text-blue-600 bg-blue-50 dark:bg-blue-900/30"
              title="Add Checkbox"
              className="h-9 w-9"
            >
              <CheckSquare className="w-4 h-4" />
            </ToolbarButton>
          </div>
        </BubbleMenu>
      )}

      <div className={cn(
        "absolute left-1/2 -translate-x-1/2 z-[100] py-8 pointer-events-none",
        position === 'top' ? 'top-0' : 'bottom-0'
      )}>
        <div className="flex flex-col items-center gap-4 pointer-events-auto">
          {/* Grouped Formatting Menu (Aa) */}
          {showFormattingMenu && (
            <div className="bg-white/95 dark:bg-gray-950/95 backdrop-blur-2xl border border-gray-100 dark:border-gray-800 p-2.5 rounded-[2rem] shadow-2xl animate-in zoom-in-95 fade-in duration-300 flex flex-wrap items-center justify-center gap-2 max-w-[90vw] md:max-w-2xl ring-1 ring-black/5 dark:ring-white/5">
              <div className="flex items-center gap-1 bg-gray-100/50 dark:bg-gray-800/40 p-1 rounded-full">
                <ToolbarButton isActive={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
                  <Bold className="w-5 h-5" />
                </ToolbarButton>
                <ToolbarButton isActive={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
                  <Italic className="w-5 h-5" />
                </ToolbarButton>
                <ToolbarButton isActive={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
                  <UnderlineIcon className="w-5 h-5" />
                </ToolbarButton>
              </div>

              <div className="flex items-center gap-1 bg-gray-100/50 dark:bg-gray-800/40 p-1 rounded-full">
                <ToolbarButton isActive={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">
                  <Heading1 className="w-5 h-5" />
                </ToolbarButton>
                <ToolbarButton isActive={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">
                  <Heading2 className="w-5 h-5" />
                </ToolbarButton>
              </div>

              <div className="flex items-center gap-1 bg-gray-100/50 dark:bg-gray-800/40 p-1 rounded-full">
                <ToolbarButton isActive={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List">
                  <List className="w-5 h-5" />
                </ToolbarButton>
                <ToolbarButton isActive={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered List">
                  <ListOrdered className="w-5 h-5" />
                </ToolbarButton>
              </div>

              <div className="flex items-center gap-1 bg-gray-100/50 dark:bg-gray-800/40 p-1 rounded-full">
                <ToolbarButton isActive={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Align Left">
                  <AlignLeft className="w-5 h-5" />
                </ToolbarButton>
                <ToolbarButton isActive={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Align Center">
                  <AlignCenter className="w-5 h-5" />
                </ToolbarButton>
                <ToolbarButton isActive={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Align Right">
                  <AlignRight className="w-5 h-5" />
                </ToolbarButton>
              </div>
            </div>
          )}

          {/* Smart Insert Menu (+) */}
          {showInsertMenu && (
            <div className="bg-white/95 dark:bg-gray-950/95 backdrop-blur-2xl border border-gray-100 dark:border-gray-800 p-2 rounded-[2rem] shadow-2xl animate-in zoom-in-95 fade-in duration-300 flex items-center gap-2 ring-1 ring-black/5 dark:ring-white/5">
              <ToolbarButton onClick={() => { editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); setShowInsertMenu(false); }} title="Insert Table">
                <TableIcon className="w-6 h-6" />
              </ToolbarButton>
              <ToolbarButton onClick={() => { setShowImageDialog(true); setShowInsertMenu(false); }} title="Insert Image">
                <ImageIcon className="w-6 h-6" />
              </ToolbarButton>
              <ToolbarButton onClick={() => { setShowLinkDialog(true); setShowInsertMenu(false); }} title="Add Link">
                <LinkIcon className="w-6 h-6" />
              </ToolbarButton>
              <ToolbarButton onClick={() => { editor.chain().focus().toggleBlockquote().run(); setShowInsertMenu(false); }} title="Blockquote">
                <Quote className="w-6 h-6" />
              </ToolbarButton>
            </div>
          )}

          {/* Main Floating Pill Toolbar */}
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl border border-white/20 dark:border-gray-800 p-1.5 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-1.5 ring-1 ring-black/5 dark:ring-white/10 hover:shadow-[0_25px_60px_rgba(0,0,0,0.25)] transition-all duration-300 active:scale-95">
            <ToolbarButton
              isActive={showInsertMenu}
              onClick={() => { setShowInsertMenu(!showInsertMenu); setShowFormattingMenu(false); }}
              activeColor="bg-blue-600 text-white shadow-lg shadow-blue-500/30"
              className="h-11 w-11"
              title="Insert Content"
            >
              <Plus className={cn("w-6 h-6 transition-transform duration-300", showInsertMenu && "rotate-45")} />
            </ToolbarButton>

            <div className="h-8 w-px bg-gray-200 dark:bg-gray-800 mx-1"></div>

            <ToolbarButton
              isActive={showFormattingMenu}
              onClick={() => { setShowFormattingMenu(!showFormattingMenu); setShowInsertMenu(false); }}
              activeColor="bg-blue-600 text-white shadow-lg shadow-blue-500/30"
              className="h-11 w-11"
              title="Format Text"
            >
              <span className="text-xl font-serif font-black">Aa</span>
            </ToolbarButton>

            <ToolbarButton
              isActive={editor.isActive('taskList')}
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              activeColor="text-blue-600 bg-blue-50 dark:bg-blue-900/30"
              className="h-11 w-11"
              title="Checkbox"
            >
              <CheckSquare className="w-6 h-6" />
            </ToolbarButton>

            <div className="h-8 w-px bg-gray-200 dark:bg-gray-800 mx-1"></div>

            <div className="flex items-center">
              <ToolbarButton onClick={() => editor.chain().focus().undo().run()} className="h-11 w-11" title="Undo">
                <Undo className="w-5 h-5" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().redo().run()} className="h-11 w-11" title="Redo">
                <Redo className="w-5 h-5" />
              </ToolbarButton>
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Link</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <Input placeholder="Enter URL" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowLinkDialog(false)}>Cancel</Button>
              <Button onClick={addLink}>Add Link</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Image</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <Input placeholder="Image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
            <Input placeholder="Alt text (optional)" value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowImageDialog(false)}>Cancel</Button>
              <Button onClick={addImage}>Add Image</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(({ content, onChange, placeholder, toolbarPosition = 'top', className = '', readOnly = false, compact = false }, ref) => {
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);
  const [isTouchActive, setIsTouchActive] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
        heading: {
          levels: [1, 2, 3],
        },
      }),
      BulletList,
      OrderedList,
      ListItem,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      Link.configure({
        openOnClick: false,
      }),
      Image,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'task-item',
        },
      }),
      BubbleMenuExtension,
    ],
    content: content,
    editable: true, // Always editable to allow BubbleMenu interaction
    onFocus: () => {
      if (typeof window !== 'undefined') {
        window.scrollTo(0, 0);
        document.body.scrollTop = 0;
      }
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose max-w-none focus:outline-none text-gray-900 dark:text-gray-100 [&_p]:my-2 text-[16px]',
          compact ? 'prose-xs p-0' : 'prose-sm sm:prose lg:prose-lg xl:prose-2xl p-1',
          'ios-input-fix select-text touch-callout-default',
          '[&_table]:border-collapse [&_table]:w-full [&_table]:my-6',
          '[&_table_td]:border [&_table_td]:border-gray-200 dark:[&_table_td]:border-gray-800 [&_table_td]:p-2 [&_table_td]:min-w-[100px]',
          '[&_table_th]:border [&_table_th]:border-gray-200 dark:[&_table_th]:border-gray-800 [&_table_th]:p-2 [&_table_th]:bg-gray-50 dark:[&_table_th]:bg-gray-900 [&_table_th]:font-bold',
          '[&_h1]:text-4xl [&_h1]:font-black [&_h1]:mb-6 [&_h1]:mt-10 [&_h1]:text-gray-900 dark:[&_h1]:text-white',
          '[&_h2]:text-3xl [&_h2]:font-bold [&_h2]:mb-4 [&_h2]:mt-8 [&_h2]:text-gray-800 dark:[&_h2]:text-gray-100',
          '[&_h3]:text-2xl [&_h3]:font-bold [&_h3]:mb-3 [&_h3]:mt-6 [&_h3]:text-gray-700 dark:[&_h3]:text-gray-200',
          '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-4 [&_ul_li]:mb-1',
          '[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-4 [&_ol_li]:mb-1',
          !readOnly && !compact && 'min-h-[200px] sm:min-h-[500px]',
          readOnly && 'caret-transparent cursor-text' // Hide caret in readOnly mode but show text cursor
        ),
      },
      handleKeyDown: (view, event) => {
        // Prevent typing if readOnly is true, but allow commands (like table edits)
        if (readOnly && !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) {
          return true;
        }
        return false;
      },
      handleTextInput: () => readOnly,
      handleDOMEvents: {
        touchstart: () => {
          setIsTouchActive(true);
          return false;
        },
        touchend: () => {
          setIsTouchActive(false);
          return false;
        },
        touchcancel: () => {
          setIsTouchActive(false);
          return false;
        },
      },
    },
  });

  // Sync content when content prop changes from outside (optional but good for parity)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      // Small optimization: only update if it's truly different to avoid cursor jumps
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [editor, content]);

  useImperativeHandle(ref, () => ({
    insertImage: (url: string, alt?: string) => {
      if (!url) return;
      if (editor) {
        editor.chain().focus().setImage({ src: url, alt }).run();
      }
    },
  }), [editor]);

  return (
    <div className={cn("flex flex-col flex-1 min-h-0 bg-white dark:bg-gray-950", className)}>
      {toolbarPosition === 'top' && !readOnly && (
        <MenuBar
          editor={editor}
          isToolbarVisible={isToolbarVisible}
          onToggleToolbar={() => setIsToolbarVisible(!isToolbarVisible)}
          isTouchActive={isTouchActive}
          position="top"
        />
      )}
      <div className={cn(
        "flex-1 relative overflow-y-auto min-h-0 touch-action-auto",
        toolbarPosition === 'bottom' && !readOnly && "pb-36"
      )} style={{ WebkitOverflowScrolling: 'touch' }}>
        <EditorContent editor={editor} className="min-h-full" />
        {!content && editor && editor.getText().length === 0 && !readOnly && (
          <div className="absolute top-6 left-10 text-gray-300 pointer-events-none italic text-xl md:text-2xl font-medium">
            {placeholder || 'Select here to write your note...'}
          </div>
        )}
      </div>
      {toolbarPosition === 'bottom' && !readOnly && (
        <MenuBar
          editor={editor}
          isToolbarVisible={isToolbarVisible}
          onToggleToolbar={() => setIsToolbarVisible(!isToolbarVisible)}
          isTouchActive={isTouchActive}
          position="bottom"
        />
      )}
    </div>
  );
});

export default RichTextEditor;