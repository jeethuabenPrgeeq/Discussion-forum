'use client';

import { useEffect, useImperativeHandle, useRef, type ReactNode, type Ref } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyleKit } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import { Placeholder } from '@tiptap/extensions';
import { Bold, ChevronDown, Ellipsis, Eraser, Highlighter, Italic, Redo2, Strikethrough, Underline, Undo2 } from 'lucide-react';
import DropdownMenu from '@/components/ui/DropdownMenu';
import { StyledBulletList, StyledOrderedList } from './list-style';
import styles from './RichTextEditor.module.css';

export interface RichTextEditorHandle {
  focus: () => void;
  getHTML: () => string;
  setHTML: (html: string) => void;
  clear: () => void;
  isEmpty: () => boolean;
}

interface RichTextEditorProps {
  ref?: Ref<RichTextEditorHandle>;
  label: string;
  placeholder?: string;
  variant?: 'raised' | 'inset';
  initialHTML?: string;
  onChange?: (html: string) => void;
  onEmptyChange?: (empty: boolean) => void;
  onSubmitShortcut?: () => void;
}

const FONTS = [
  'Arial',
  'Arial Black',
  'Calibri',
  'Cambria',
  'Candara',
  'Comic Sans MS',
  'Consolas',
  'Constantia',
  'Corbel',
  'Courier New',
  'Georgia',
  'Impact',
  'Segoe UI',
  'Tahoma',
  'Times New Roman',
  'Trebuchet MS',
  'Verdana',
];

const SIZES = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '22', '24', '26', '28', '36', '48', '72'];

const BULLETS = [
  { key: 'disc', label: '●  Filled circle', type: 'disc' },
  { key: 'circle', label: '○  Hollow circle', type: 'circle' },
  { key: 'square', label: '■  Square', type: 'square' },
  { key: 'diamond', label: '◆  Diamond', type: '"◆  "' },
  { key: 'arrow', label: '➢  Arrow', type: '"➢  "' },
  { key: 'check', label: '✓  Check mark', type: '"✓  "' },
];

const NUMBERING = [
  { key: 'decimal', label: '1.  2.  3.', type: 'decimal' },
  { key: 'lower-alpha', label: 'a.  b.  c.', type: 'lower-alpha' },
  { key: 'upper-alpha', label: 'A.  B.  C.', type: 'upper-alpha' },
  { key: 'lower-roman', label: 'i.  ii.  iii.', type: 'lower-roman' },
  { key: 'upper-roman', label: 'I.  II.  III.', type: 'upper-roman' },
];

const DEFAULT_FONT = 'Segoe UI';
const DEFAULT_SIZE = '16';
const DEFAULT_COLOR = '#374151';
const HIGHLIGHT = '#FFF1A8';

const DEFAULT_STATE = {
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  highlight: false,
  font: DEFAULT_FONT,
  size: DEFAULT_SIZE,
  color: DEFAULT_COLOR,
  canUndo: false,
  canRedo: false,
};

interface ToolButtonProps {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}

function ToolButton({ label, active, disabled, onClick, children }: ToolButtonProps) {
  return (
    <button
      type="button"
      className={styles.tool}
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({
  ref,
  label,
  placeholder,
  variant = 'raised',
  initialHTML,
  onChange,
  onEmptyChange,
  onSubmitShortcut,
}: RichTextEditorProps) {
  const pendingRef = useRef<string | null>(null);
  const callbacksRef = useRef({ onEmptyChange, onSubmitShortcut, onChange });

  useEffect(() => {
    callbacksRef.current = { onEmptyChange, onSubmitShortcut, onChange };
  });

  const editor = useEditor({
    immediatelyRender: false,
    content: initialHTML ?? '',
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
      }),
      StyledBulletList,
      StyledOrderedList,
      TextStyleKit,
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({ placeholder: placeholder ?? '' }),
    ],
    editorProps: {
      attributes: {
        class: styles.content,
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': label,
      },
      handleKeyDown: (_view, event) => {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
          callbacksRef.current.onSubmitShortcut?.();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: e }) => {
      callbacksRef.current.onEmptyChange?.(e.isEmpty);
      callbacksRef.current.onChange?.(e.isEmpty ? '' : e.getHTML());
    },
  });

  useEffect(() => {
    if (!editor || pendingRef.current === null) return;
    editor.commands.setContent(pendingRef.current);
    pendingRef.current = null;
    callbacksRef.current.onEmptyChange?.(editor.isEmpty);
  }, [editor]);

  const state =
    useEditorState({
      editor,
      selector: ({ editor: e }) => {
        if (!e) return DEFAULT_STATE;
        const style = e.getAttributes('textStyle');
        const rawFont = typeof style.fontFamily === 'string' ? style.fontFamily : '';
        const rawSize = typeof style.fontSize === 'string' ? style.fontSize : '';
        const rawColor = typeof style.color === 'string' ? style.color : '';
        return {
          bold: e.isActive('bold'),
          italic: e.isActive('italic'),
          underline: e.isActive('underline'),
          strike: e.isActive('strike'),
          highlight: e.isActive('highlight'),
          font: rawFont.split(',')[0].replace(/["']/g, '').trim() || DEFAULT_FONT,
          size: rawSize.replace('px', '') || DEFAULT_SIZE,
          color: /^#[0-9a-f]{6}$/i.test(rawColor) ? rawColor : DEFAULT_COLOR,
          canUndo: e.can().undo(),
          canRedo: e.can().redo(),
        };
      },
    }) ?? DEFAULT_STATE;

  useImperativeHandle(
    ref,
    () => ({
      focus: () => {
        editor?.commands.focus('end');
      },
      getHTML: () => (editor && !editor.isEmpty ? editor.getHTML() : ''),
      setHTML: (html) => {
        if (!editor) {
          pendingRef.current = html;
          return;
        }
        editor.commands.setContent(html);
        callbacksRef.current.onEmptyChange?.(editor.isEmpty);
      },
      clear: () => {
        pendingRef.current = null;
        if (!editor) return;
        editor.commands.clearContent();
        callbacksRef.current.onEmptyChange?.(true);
      },
      isEmpty: () => !editor || editor.isEmpty,
    }),
    [editor],
  );

  const fontOptions = FONTS.includes(state.font) ? FONTS : [state.font, ...FONTS];
  const sizeOptions = SIZES.includes(state.size)
    ? SIZES
    : [...SIZES, state.size].sort((a, b) => Number(a) - Number(b));

  const applyList = (value: string) => {
    if (!editor) return;
    if (value === 'none') {
      if (editor.isActive('orderedList')) editor.chain().focus().toggleOrderedList().run();
      else if (editor.isActive('bulletList')) editor.chain().focus().toggleBulletList().run();
      return;
    }
    const [kind, key] = value.split(':');
    const name = kind === 'ol' ? 'orderedList' : 'bulletList';
    const listStyleType = (kind === 'ol' ? NUMBERING : BULLETS).find((s) => s.key === key)?.type ?? null;
    let chain = editor.chain().focus();
    if (!editor.isActive(name)) chain = name === 'orderedList' ? chain.toggleOrderedList() : chain.toggleBulletList();
    chain.updateAttributes(name, { listStyleType }).run();
  };

  const addLink = () => {
    if (!editor) return;
    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL (https://…)', previous ?? '');
    if (url === null) return;
    const trimmed = url.trim();
    if (!trimmed) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    if (!/^https?:\/\//i.test(trimmed)) return;
    editor.chain().focus().extendMarkRange('link').setLink({ href: trimmed }).run();
  };

  const disabled = !editor;

  return (
    <div className={styles.editor} data-variant={variant}>
      <div className={styles.toolbar}>
        <div className={styles.tools} role="toolbar" aria-label="Formatting">
          <div className={styles.group}>
            <ToolButton label="Undo" disabled={!state.canUndo} onClick={() => editor?.chain().focus().undo().run()}>
              <Undo2 size={20} strokeWidth={1.5} />
            </ToolButton>
            <ToolButton label="Redo" disabled={!state.canRedo} onClick={() => editor?.chain().focus().redo().run()}>
              <Redo2 size={20} strokeWidth={1.5} />
            </ToolButton>
          </div>

          <label className={`${styles.select} ${styles.fontSelect}`}>
            <span className={styles.srOnly}>Font</span>
            <select
              value={state.font}
              disabled={disabled}
              onChange={(e) => editor?.chain().focus().setFontFamily(`"${e.target.value}"`).run()}
            >
              {fontOptions.map((f) => (
                <option key={f} value={f} style={{ fontFamily: f }}>
                  {f}
                </option>
              ))}
            </select>
            <ChevronDown size={20} strokeWidth={1.5} className={styles.chevron} aria-hidden />
          </label>

          <label className={`${styles.select} ${styles.sizeSelect}`}>
            <span className={styles.srOnly}>Font size</span>
            <select
              value={state.size}
              disabled={disabled}
              onChange={(e) => editor?.chain().focus().setFontSize(`${e.target.value}px`).run()}
            >
              {sizeOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <ChevronDown size={20} strokeWidth={1.5} className={styles.chevron} aria-hidden />
          </label>

          <div className={styles.group}>
            <ToolButton
              label="Bold"
              active={state.bold}
              disabled={disabled}
              onClick={() => editor?.chain().focus().toggleBold().run()}
            >
              <Bold size={20} strokeWidth={1.5} />
            </ToolButton>
            <ToolButton
              label="Italic"
              active={state.italic}
              disabled={disabled}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            >
              <Italic size={20} strokeWidth={1.5} />
            </ToolButton>
            <ToolButton
              label="Underline"
              active={state.underline}
              disabled={disabled}
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
            >
              <Underline size={20} strokeWidth={1.5} />
            </ToolButton>
          </div>

          <label className={styles.color} title="Text colour">
            <span className={styles.srOnly}>Text colour</span>
            <span className={styles.colorLetter} style={{ borderColor: state.color }} aria-hidden>
              A
            </span>
            <ChevronDown size={18} strokeWidth={1.5} aria-hidden />
            <input
              type="color"
              value={state.color}
              disabled={disabled}
              onChange={(e) => editor?.chain().focus().setColor(e.target.value).run()}
            />
          </label>

          <div className={styles.group}>
            <ToolButton
              label="Strikethrough"
              active={state.strike}
              disabled={disabled}
              onClick={() => editor?.chain().focus().toggleStrike().run()}
            >
              <Strikethrough size={20} strokeWidth={1.5} />
            </ToolButton>
            <ToolButton
              label="Highlight"
              active={state.highlight}
              disabled={disabled}
              onClick={() => editor?.chain().focus().toggleHighlight({ color: HIGHLIGHT }).run()}
            >
              <Highlighter size={20} strokeWidth={1.5} />
            </ToolButton>
            <ToolButton
              label="Clear formatting"
              disabled={disabled}
              onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}
            >
              <Eraser size={20} strokeWidth={1.5} />
            </ToolButton>
          </div>

          <label className={`${styles.select} ${styles.listSelect}`}>
            <span className={styles.srOnly}>List style</span>
            <select
              value=""
              disabled={disabled}
              onChange={(e) => {
                if (e.target.value) applyList(e.target.value);
              }}
            >
              <option value="" disabled hidden>
                •
              </option>
              <optgroup label="Bullets">
                {BULLETS.map((b) => (
                  <option key={b.key} value={`ul:${b.key}`}>
                    {b.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Numbering">
                {NUMBERING.map((n) => (
                  <option key={n.key} value={`ol:${n.key}`}>
                    {n.label}
                  </option>
                ))}
              </optgroup>
              <option value="none">Remove list</option>
            </select>
            <ChevronDown size={18} strokeWidth={1.5} className={styles.chevron} aria-hidden />
          </label>
        </div>

        <DropdownMenu
          label="More formatting"
          trigger={<Ellipsis size={20} strokeWidth={1.5} />}
          triggerClassName={styles.more}
          items={[
            { key: 'link', label: 'Insert link', onSelect: addLink },
            { key: 'quote', label: 'Quote', onSelect: () => editor?.chain().focus().toggleBlockquote().run() },
            { key: 'code', label: 'Code block', onSelect: () => editor?.chain().focus().toggleCodeBlock().run() },
            { key: 'text', label: 'Normal text', onSelect: () => editor?.chain().focus().setParagraph().run() },
          ]}
        />
      </div>

      <div className={styles.surface}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}