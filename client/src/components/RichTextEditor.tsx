import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import { Toggle } from "@/components/ui/toggle";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Heading2,
  ImageIcon,
  Loader2,
  Copy as CopyIcon,
  Trash2,
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface MenuBarProps {
  editor: Editor;
}

function MenuBar({ editor }: MenuBarProps) {
  const [isLinkInputVisible, setIsLinkInputVisible] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const addLink = () => {
    if (linkUrl) {
      // Ensure URL has protocol
      const url = linkUrl.startsWith('http://') || linkUrl.startsWith('https://') 
        ? linkUrl 
        : `https://${linkUrl}`;
      editor.chain().focus().setLink({ href: url }).run();
      setLinkUrl('');
      setIsLinkInputVisible(false);
    }
  };

  // Handle Enter key in link input
  const handleLinkKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addLink();
    } else if (e.key === 'Escape') {
      setIsLinkInputVisible(false);
      setLinkUrl('');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      
      // Insert image into editor
      editor.chain().focus().setImage({ src: data.url }).run();
      
      toast({
        title: "Image uploaded",
        description: "Your image has been inserted into the document",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="border-b p-2 bg-muted space-x-1 flex flex-wrap gap-1">
      <Toggle
        size="sm"
        pressed={editor.isActive('bold')}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
        aria-label="Toggle bold"
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </Toggle>
      
      <Toggle
        size="sm"
        pressed={editor.isActive('italic')}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        aria-label="Toggle italic"
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </Toggle>
      
      <Toggle
        size="sm"
        pressed={editor.isActive('underline')}
        onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
        aria-label="Toggle underline"
        title="Underline (Ctrl+U)"
      >
        <UnderlineIcon className="h-4 w-4" />
      </Toggle>

      <Toggle
        size="sm"
        pressed={editor.isActive('heading', { level: 2 })}
        onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        aria-label="Toggle heading"
        title="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </Toggle>

      <div className="w-px h-6 bg-border mx-1" />

      <Toggle
        size="sm"
        pressed={editor.isActive('bulletList')}
        onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
        aria-label="Toggle bullet list"
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </Toggle>
      
      <Toggle
        size="sm"
        pressed={editor.isActive('orderedList')}
        onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
        aria-label="Toggle ordered list"
        title="Numbered List"
      >
        <ListOrdered className="h-4 w-4" />
      </Toggle>

      <div className="w-px h-6 bg-border mx-1" />

      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: 'left' })}
        onPressedChange={() => editor.chain().focus().setTextAlign('left').run()}
        aria-label="Align left"
        title="Align Left"
      >
        <AlignLeft className="h-4 w-4" />
      </Toggle>
      
      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: 'center' })}
        onPressedChange={() => editor.chain().focus().setTextAlign('center').run()}
        aria-label="Align center"
        title="Align Center"
      >
        <AlignCenter className="h-4 w-4" />
      </Toggle>
      
      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: 'right' })}
        onPressedChange={() => editor.chain().focus().setTextAlign('right').run()}
        aria-label="Align right"
        title="Align Right"
      >
        <AlignRight className="h-4 w-4" />
      </Toggle>

      <div className="w-px h-6 bg-border mx-1" />

      {isLinkInputVisible ? (
        <div className="flex items-center gap-1">
          <Input
            size={30}
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={handleLinkKeyDown}
            placeholder="Enter URL"
            className="h-8"
            autoFocus
          />
          <Button size="sm" onClick={addLink}>Add</Button>
          <Button size="sm" variant="ghost" onClick={() => setIsLinkInputVisible(false)}>Cancel</Button>
        </div>
      ) : (
        <Toggle
          size="sm"
          pressed={editor.isActive('link')}
          onPressedChange={() => setIsLinkInputVisible(true)}
          aria-label="Add link"
          title="Add Link"
        >
          <LinkIcon className="h-4 w-4" />
        </Toggle>
      )}

      <div className="w-px h-6 bg-border mx-1" />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
      
      <Toggle
        size="sm"
        pressed={false}
        onPressedChange={() => fileInputRef.current?.click()}
        disabled={isUploading}
        aria-label="Upload image"
        title="Upload Image"
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImageIcon className="h-4 w-4" />
        )}
      </Toggle>
    </div>
  );
}

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  className?: string;
}

export function RichTextEditor({ content, onChange, className }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Configure specific extensions
        history: {
          depth: 100, // Increase undo/redo history
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false, // Prevent links from opening when editing
        HTMLAttributes: {
          class: 'text-primary underline cursor-pointer hover:text-primary/80',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg my-4',
        },
      }),
    ],
    content: content || "",
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none',
      },
    },
  });

  const [isPreview, setIsPreview] = useState(false);
  const { toast } = useToast();

  // Sync external content updates (e.g., AI draft) into the editor
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (typeof content === 'string' && content !== current) {
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  const previewHtml = editor ? editor.getHTML() : (content || "");

  return (
    <div className={cn("bg-card border rounded-lg", className)}>
      {!isPreview && <MenuBar editor={editor} />}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(previewHtml);
                toast({ title: 'Copied', description: 'HTML copied to clipboard.' });
              } catch (e) {
                toast({ title: 'Copy failed', description: 'Unable to copy to clipboard.', variant: 'destructive' });
              }
            }}
            aria-label="Copy HTML"
          >
            <CopyIcon className="h-4 w-4 mr-1" /> Copy HTML
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              editor?.commands.setContent('', false);
              onChange('');
              toast({ title: 'Cleared', description: 'Editor content cleared.' });
            }}
            aria-label="Clear content"
          >
            <Trash2 className="h-4 w-4 mr-1" /> Clear
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="rte-preview" className="text-xs">Preview</Label>
          <Switch id="rte-preview" checked={isPreview} onCheckedChange={setIsPreview} />
        </div>
      </div>
      {isPreview ? (
        <div
          className="prose prose-sm max-w-none p-4"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      ) : (
        <EditorContent
          editor={editor}
          className="prose prose-sm max-w-none p-4 min-h-[200px] focus-within:outline-none"
        />
      )}
    </div>
  );
}
