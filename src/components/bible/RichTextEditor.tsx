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
  position?: 'top' | 'bottom';
}

const MenuBar = ({ editor, isToolbarVisible, onToggleToolbar, position = 'top' }: MenuBarProps) => {
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

  const shadowClass = position === 'top' ? 'shadow-sm' : 'shadow-[0_-8px_30px_rgba(0,0,0,0.12)]';
  const heightClass = position === 'top' ? 'h-12' : 'h-16 pb-safe';

  const ToolbarButton = ({
    isActive,
    onClick,
    children,
    className = "",
    activeColor = "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30"
  }: {
    isActive?: boolean,
    onClick: () => void,
    children: React.ReactNode,
    className?: string,
    activeColor?: string
  }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn(
        "h-10 w-10 p-0 rounded-full transition-all duration-200",
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
        <BubbleMenu editor={editor} shouldShow={({ editor }) => editor.isActive('table')}>
          <div className="flex items-center gap-2 bg-white/90 dark:bg-gray-950/90 border border-gray-200 dark:border-gray-800 p-2 rounded-xl shadow-2xl animate-in fade-in zoom-in duration-200 backdrop-blur-xl">
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

      <div className={cn(
        "bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl sticky z-20 transition-all border-gray-100 dark:border-gray-800",
        position === 'top' ? 'top-0 border-b' : 'bottom-0 border-t',
        shadowClass
      )}>
        <div className="flex flex-col w-full">
          {/* Secondary Formatting Menu (Apple Notes "Aa" Menu) */}
          {showFormattingMenu && (
            <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-100 dark:border-gray-800 animate-in slide-in-from-bottom-2 duration-200 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1 bg-gray-100/50 dark:bg-gray-800/50 p-1 rounded-full">
                <ToolbarButton isActive={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
                  <Bold className="w-5 h-5" />
                </ToolbarButton>
                <ToolbarButton isActive={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
                  <Italic className="w-5 h-5" />
                </ToolbarButton>
                <ToolbarButton isActive={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
                  <UnderlineIcon className="w-5 h-5" />
                </ToolbarButton>
              </div>

              <div className="h-6 w-px bg-gray-200 dark:bg-gray-800 mx-1 shrink-0"></div>

              <div className="flex items-center gap-1 bg-gray-100/50 dark:bg-gray-800/50 p-1 rounded-full shrink-0">
                <ToolbarButton isActive={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
                  <span className="font-bold text-sm">H1</span>
                </ToolbarButton>
                <ToolbarButton isActive={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
                  <span className="font-bold text-sm">H2</span>
                </ToolbarButton>
              </div>

              <div className="h-6 w-px bg-gray-200 dark:bg-gray-800 mx-1 shrink-0"></div>

              <div className="flex items-center gap-1 bg-gray-100/50 dark:bg-gray-800/50 p-1 rounded-full shrink-0">
                <ToolbarButton isActive={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
                  <AlignLeft className="w-5 h-5" />
                </ToolbarButton>
                <ToolbarButton isActive={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
                  <AlignCenter className="w-5 h-5" />
                </ToolbarButton>
              </div>
            </div>
          )}

          {/* Main Toolbar */}
          <div className={cn("flex items-center justify-between px-6", heightClass)}>
            <div className="flex items-center gap-4 md:gap-8">
              <ToolbarButton
                isActive={showFormattingMenu}
                onClick={() => setShowFormattingMenu(!showFormattingMenu)}
                activeColor="text-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50 dark:bg-indigo-900/30"
              >
                <span className="text-xl font-serif font-bold italic">Aa</span>
              </ToolbarButton>

              <ToolbarButton
                isActive={editor.isActive('taskList')}
                onClick={() => editor.chain().focus().toggleTaskList().run()}
              >
                <CheckSquare className="w-6 h-6" />
              </ToolbarButton>

              <ToolbarButton
                isActive={editor.isActive('table')}
                onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
              >
                <TableIcon className="w-6 h-6" />
              </ToolbarButton>

              <ToolbarButton onClick={() => setShowImageDialog(true)}>
                <ImageIcon className="w-6 h-6" />
              </ToolbarButton>
            </div>

            <div className="flex items-center gap-2">
              <ToolbarButton onClick={() => editor.chain().focus().undo().run()}>
                <Undo className="w-5 h-5" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().redo().run()}>
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

  const editor = useEditor({
    extensions: [
      StarterKit,
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
      }),
      BubbleMenuExtension,
    ],
    content: content,
    editable: true, // Always editable to allow BubbleMenu interaction
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose mx-auto focus:outline-none text-gray-900 dark:text-gray-100 [&_p]:my-2 transition-all',
          compact ? 'prose-xs p-0' : 'prose-sm sm:prose lg:prose-lg xl:prose-2xl p-6 md:p-10',
          'selection:bg-indigo-100 dark:selection:bg-indigo-900/30',
          '[&_table]:border-collapse [&_table]:w-full [&_table]:my-6',
          '[&_table_td]:border [&_table_td]:border-gray-200 dark:[&_table_td]:border-gray-800 [&_table_td]:p-2 [&_table_td]:min-w-[100px]',
          '[&_table_th]:border [&_table_th]:border-gray-200 dark:[&_table_th]:border-gray-800 [&_table_th]:p-2 [&_table_th]:bg-gray-50 dark:[&_table_th]:bg-gray-900 [&_table_th]:font-bold',
          '[&_.taskList]:list-none [&_.taskList]:p-0 [&_.taskList]:my-4',
          '[&_.taskList_li]:flex [&_.taskList_li]:gap-3 [&_.taskList_li]:items-start [&_.taskList_li]:mb-2',
          '[&_.taskList_input]:mt-1.5 [&_.taskList_input]:h-5 [&_.taskList_input]:w-5 [&_.taskList_input]:rounded-full [&_.taskList_input]:border-gray-300 [&_.taskList_input]:text-indigo-600 [&_.taskList_input]:focus:ring-indigo-500',
          !readOnly && !compact && 'min-h-[300px]',
          readOnly && 'caret-transparent' // Hide caret in readOnly mode
        ),
      },
      handleKeyDown: (view, event) => {
        // Prevent typing if readOnly is true, but allow commands (like table edits)
        if (readOnly && !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) {
          return true; // Return true to block the event
        }
        return false;
      },
      handleTextInput: () => readOnly, // Block text input if readOnly
    },
  });

  // Sync content when content prop changes from outside (optional but good for parity)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      // Small optimization: only update if it's truly different to avoid cursor jumps
      editor.commands.setContent(content, false);
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
    <div className={cn("flex flex-col flex-1 min-h-0 bg-white dark:bg-gray-950 transition-colors", className)}>
      {toolbarPosition === 'top' && !readOnly && (
        <MenuBar
          editor={editor}
          isToolbarVisible={isToolbarVisible}
          onToggleToolbar={() => setIsToolbarVisible(!isToolbarVisible)}
          position="top"
        />
      )}
      <div className="flex-1 relative overflow-y-auto min-h-0">
        <EditorContent editor={editor} className="min-h-full" />
        {!content && editor && editor.getText().length === 0 && !readOnly && (
          <div className="absolute top-6 left-10 text-gray-300 pointer-events-none italic text-xl md:text-2xl font-medium">
            {placeholder || 'Begin your divine exploration...'}
          </div>
        )}
      </div>
      {toolbarPosition === 'bottom' && !readOnly && (
        <MenuBar
          editor={editor}
          isToolbarVisible={isToolbarVisible}
          onToggleToolbar={() => setIsToolbarVisible(!isToolbarVisible)}
          position="bottom"
        />
      )}
    </div>
  );
});

export default RichTextEditor;