import { useEditor, EditorContent } from '@tiptap/react';
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
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, 
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Link as LinkIcon, Image as ImageIcon, Table as TableIcon, 
  Palette, Highlighter, Code, Quote, Undo, Redo, 
  Heading1, Heading2, Heading3, Text, Subscript, Superscript, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useState, forwardRef, useImperativeHandle } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export interface RichTextEditorHandle {
  insertImage: (url: string, alt?: string) => void;
}

interface MenuBarProps {
  editor: any;
  isToolbarVisible: boolean;
  onToggleToolbar: () => void;
}

const MenuBar = ({ editor, isToolbarVisible, onToggleToolbar }: MenuBarProps) => {
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
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

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const setTextColor = (color: string) => {
    editor.chain().focus().setColor(color).run();
  };

  const setHighlightColor = (color: string) => {
    editor.chain().focus().setHighlight({ color }).run();
  };

  return (
    <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
      <div className="flex items-center justify-between p-2 border-b border-gray-100">
        <span className="text-sm font-medium text-gray-700">Formatting Tools</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleToolbar}
          className="h-6 w-6 p-0 hover:bg-gray-100"
        >
          {isToolbarVisible ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </Button>
      </div>
      {isToolbarVisible && (
        <div className="p-2">
          <div className="flex flex-wrap gap-1 items-center">
            {/* Text Formatting */}
            <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
              <Button
                variant={editor.isActive('bold') ? 'default' : 'outline'}
                size="sm"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className="h-8 w-8 p-0"
              >
                <Bold className="w-4 h-4" />
              </Button>
              <Button
                variant={editor.isActive('italic') ? 'default' : 'outline'}
                size="sm"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className="h-8 w-8 p-0"
              >
                <Italic className="w-4 h-4" />
              </Button>
              <Button
                variant={editor.isActive('underline') ? 'default' : 'outline'}
                size="sm"
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className="h-8 w-8 p-0"
              >
                <UnderlineIcon className="w-4 h-4" />
              </Button>
              <Button
                variant={editor.isActive('strike') ? 'default' : 'outline'}
                size="sm"
                onClick={() => editor.chain().focus().toggleStrike().run()}
                className="h-8 w-8 p-0"
              >
                <Strikethrough className="w-4 h-4" />
              </Button>
            </div>

            {/* Headings */}
            <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
              <Button
                variant={editor.isActive('heading', { level: 1 }) ? 'default' : 'outline'}
                size="sm"
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className="h-8 w-8 p-0"
              >
                <Heading1 className="w-4 h-4" />
              </Button>
              <Button
                variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'outline'}
                size="sm"
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className="h-8 w-8 p-0"
              >
                <Heading2 className="w-4 h-4" />
              </Button>
              <Button
                variant={editor.isActive('heading', { level: 3 }) ? 'default' : 'outline'}
                size="sm"
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                className="h-8 w-8 p-0"
              >
                <Heading3 className="w-4 h-4" />
              </Button>
              <Button
                variant={editor.isActive('paragraph') ? 'default' : 'outline'}
                size="sm"
                onClick={() => editor.chain().focus().setParagraph().run()}
                className="h-8 w-8 p-0"
              >
                <Text className="w-4 h-4" />
              </Button>
            </div>

            {/* Lists */}
            <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
              <Button
                variant={editor.isActive('bulletList') ? 'default' : 'outline'}
                size="sm"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className="h-8 w-8 p-0"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={editor.isActive('orderedList') ? 'default' : 'outline'}
                size="sm"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className="h-8 w-8 p-0"
              >
                <ListOrdered className="w-4 h-4" />
              </Button>
            </div>

            {/* Text Alignment */}
            <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
              <Button
                variant={editor.isActive({ textAlign: 'left' }) ? 'default' : 'outline'}
                size="sm"
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                className="h-8 w-8 p-0"
              >
                <AlignLeft className="w-4 h-4" />
              </Button>
              <Button
                variant={editor.isActive({ textAlign: 'center' }) ? 'default' : 'outline'}
                size="sm"
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                className="h-8 w-8 p-0"
              >
                <AlignCenter className="w-4 h-4" />
              </Button>
              <Button
                variant={editor.isActive({ textAlign: 'right' }) ? 'default' : 'outline'}
                size="sm"
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                className="h-8 w-8 p-0"
              >
                <AlignRight className="w-4 h-4" />
              </Button>
              <Button
                variant={editor.isActive({ textAlign: 'justify' }) ? 'default' : 'outline'}
                size="sm"
                onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                className="h-8 w-8 p-0"
              >
                <AlignJustify className="w-4 h-4" />
              </Button>
            </div>

            {/* Special Formatting */}
            <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
              <Button
                variant={editor.isActive('blockquote') ? 'default' : 'outline'}
                size="sm"
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className="h-8 w-8 p-0"
              >
                <Quote className="w-4 h-4" />
              </Button>
              <Button
                variant={editor.isActive('codeBlock') ? 'default' : 'outline'}
                size="sm"
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                className="h-8 w-8 p-0"
              >
                <Code className="w-4 h-4" />
              </Button>
            </div>

            {/* Links and Media */}
            <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLinkDialog(true)}
                className="h-8 w-8 p-0"
              >
                <LinkIcon className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowImageDialog(true)}
                className="h-8 w-8 p-0"
              >
                <ImageIcon className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={addTable}
                className="h-8 w-8 p-0"
              >
                <TableIcon className="w-4 h-4" />
              </Button>
            </div>

            {/* Colors */}
            <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTextColor('#000000')}
                className="h-8 w-8 p-0"
                title="Black"
              >
                <Palette className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHighlightColor('#fef3c7')}
                className="h-8 w-8 p-0"
                title="Highlight"
              >
                <Highlighter className="w-4 h-4" />
              </Button>
            </div>

            {/* History */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                className="h-8 w-8 p-0"
              >
                <Undo className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                className="h-8 w-8 p-0"
              >
                <Redo className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Enter URL"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
            />
            <div className="flex gap-2">
              <Button onClick={addLink}>Add Link</Button>
              <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Image URL"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
            <Input
              placeholder="Alt text (optional)"
              value={imageAlt}
              onChange={(e) => setImageAlt(e.target.value)}
            />
            <div className="flex gap-2">
              <Button onClick={addImage}>Add Image</Button>
              <Button variant="outline" onClick={() => setShowImageDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(({ content, onChange, placeholder }, ref) => {
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
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[300px] p-4',
      },
    },
  });

  useImperativeHandle(ref, () => ({
    insertImage: (url: string, alt?: string) => {
      if (!url) return;
      if (editor) {
        editor.chain().focus().setImage({ src: url, alt }).run();
      }
    },
  }), [editor]);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <MenuBar 
        editor={editor} 
        isToolbarVisible={isToolbarVisible}
        onToggleToolbar={() => setIsToolbarVisible(!isToolbarVisible)}
      />
      <EditorContent editor={editor} />
      {!content && (
        <div className="text-gray-400 p-4 text-center">
          {placeholder || 'Start writing your note...'}
        </div>
      )}
    </div>
  );
});

export default RichTextEditor;