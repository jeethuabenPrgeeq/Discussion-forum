'use client';

import { useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyleKit } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import { TableKit } from '@tiptap/extension-table';
import { Placeholder } from '@tiptap/extensions';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  CodeXml,
  Eraser,
  Highlighter,
  ImagePlus,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListOrdered,
  Omega,
  Quote,
  Redo2,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Table as TableIcon,
  Underline,
  Undo2,
} from 'lucide-react';
import DropdownMenu from '@/components/ui/DropdownMenu';
import { fileUrl, uploadFile } from '@/features/forum/lib/api';
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
  onNotice?: (message: string) => void;
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
  { key: 'disc', label: '\u25CF  Filled circle', type: 'disc' },
  { key: 'circle', label: '\u25CB  Hollow circle', type: 'circle' },
  { key: 'square', label: '\u25A0  Square', type: 'square' },
  { key: 'diamond', label: '\u25C6  Diamond', type: '"\u25C6  "' },
  { key: 'arrow', label: '\u27A2  Arrow', type: '"\u27A2  "' },
  { key: 'check', label: '\u2713  Check mark', type: '"\u2713  "' },
];

const NUMBERING = [
  { key: 'decimal', label: '1.  2.  3.', type: 'decimal' },
  { key: 'lower-alpha', label: 'a.  b.  c.', type: 'lower-alpha' },
  { key: 'upper-alpha', label: 'A.  B.  C.', type: 'upper-alpha' },
  { key: 'lower-roman', label: 'i.  ii.  iii.', type: 'lower-roman' },
  { key: 'upper-roman', label: 'I.  II.  III.', type: 'upper-roman' },
];

const BLOCKS = [
  { value: 'p', label: 'Paragraph' },
  { value: 'h1', label: 'Heading 1' },
  { value: 'h2', label: 'Heading 2' },
  { value: 'h3', label: 'Heading 3' },
];

const SPECIAL_CHARS = [
  ['\u00A9', 'Copyright'],
  ['\u00AE', 'Registered'],
  ['\u2122', 'Trademark'],
  ['\u20B9', 'Rupee'],
  ['\u20AC', 'Euro'],
  ['\u00A3', 'Pound'],
  ['\u00A5', 'Yen'],
  ['\u00B0', 'Degree'],
  ['\u00B1', 'Plus-minus'],
  ['\u00D7', 'Multiply'],
  ['\u00F7', 'Divide'],
  ['\u2260', 'Not equal'],
  ['\u2264', 'Less or equal'],
  ['\u2265', 'Greater or equal'],
  ['\u2248', 'Approximately'],
  ['\u221E', 'Infinity'],
  ['\u221A', 'Square root'],
  ['\u03C0', 'Pi'],
  ['\u03A9', 'Omega'],
  ['\u00B5', 'Micro'],
  ['\u2211', 'Sum'],
  ['\u2190', 'Left arrow'],
  ['\u2192', 'Right arrow'],
  ['\u2191', 'Up arrow'],
  ['\u2193', 'Down arrow'],
  ['\u2022', 'Bullet'],
  ['\u2026', 'Ellipsis'],
  ['\u2014', 'Em dash'],
  ['\u00A7', 'Section'],
  ['\u00B6', 'Pilcrow'],
] as const;

const DEFAULT_FONT = 'Segoe UI';
const DEFAULT_SIZE = '16';
const DEFAULT_COLOR = '#374151';
const DEFAULT_HIGHLIGHT = '#FFF1A8';
const HEX = /^#[0-9a-f]{6}$/i;

const DEFAULT_STATE = {
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  superscript: false,
  subscript: false,
  bulletList: false,
  orderedList: false,
  blockquote: false,
  codeBlock: false,
  link: false,
  inTable: false,
  canSink: false,
  canLift: false,
  align: 'left',
  block: 'p',
  font: DEFAULT_FONT,
  size: DEFAULT_SIZE,
  color: DEFAULT_COLOR,
  highlight: DEFAULT_HIGHLIGHT,
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

const Divider = () => <span className={styles.divider} aria-hidden />;

export default function RichTextEditor({
  ref,
  label,
  placeholder,
  variant = 'raised',
  initialHTML,
  onChange,
  onEmptyChange,
  onSubmitShortcut,
  onNotice,
}: RichTextEditorProps) {
  const pendingRef = useRef<string | null>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const callbacksRef = useRef({ onEmptyChange, onSubmitShortcut, onChange, onNotice });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    callbacksRef.current = { onEmptyChange, onSubmitShortcut, onChange, onNotice };
  });

  useEffect(() => {
    const el = toolsRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || el.scrollWidth <= el.clientWidth) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    content: initialHTML ?? '',
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: false,
        orderedList: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
      }),
      StyledBulletList,
      StyledOrderedList,
      TextStyleKit,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image.configure({ inline: false, allowBase64: false }),
      Superscript,
      Subscript,
      TableKit.configure({ table: { resizable: false } }),
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
        const rawHighlight = e.getAttributes('highlight').color;
        const level = [1, 2, 3].find((l) => e.isActive('heading', { level: l }));
        const align = ['center', 'right', 'justify'].find((a) => e.isActive({ textAlign: a })) ?? 'left';
        return {
          bold: e.isActive('bold'),
          italic: e.isActive('italic'),
          underline: e.isActive('underline'),
          strike: e.isActive('strike'),
          superscript: e.isActive('superscript'),
          subscript: e.isActive('subscript'),
          bulletList: e.isActive('bulletList'),
          orderedList: e.isActive('orderedList'),
          blockquote: e.isActive('blockquote'),
          codeBlock: e.isActive('codeBlock'),
          link: e.isActive('link'),
          inTable: e.isActive('table'),
          canSink: e.can().sinkListItem('listItem'),
          canLift: e.can().liftListItem('listItem'),
          align,
          block: level ? `h${level}` : 'p',
          font: rawFont.split(',')[0].replace(/["']/g, '').trim() || DEFAULT_FONT,
          size: rawSize.replace('px', '') || DEFAULT_SIZE,
          color: HEX.test(rawColor) ? rawColor : DEFAULT_COLOR,
          highlight: typeof rawHighlight === 'string' && HEX.test(rawHighlight) ? rawHighlight : DEFAULT_HIGHLIGHT,
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

  const applyBlock = (value: string) => {
    if (!editor) return;
    if (value === 'p') {
      editor.chain().focus().setParagraph().run();
      return;
    }
    editor.chain().focus().setHeading({ level: Number(value.slice(1)) as 1 | 2 | 3 }).run();
  };

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
    const url = window.prompt('Link URL (https://\u2026)', previous ?? '');
    if (url === null) return;
    const trimmed = url.trim();
    if (!trimmed) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    if (!/^https?:\/\//i.test(trimmed)) {
      callbacksRef.current.onNotice?.('Links must start with http:// or https://');
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: trimmed }).run();
  };

  const insertImage = async (file: File | undefined) => {
    if (!editor || !file) return;
    if (!/^image\/(png|jpe?g)$/.test(file.type)) {
      callbacksRef.current.onNotice?.('Only PNG or JPG images can be inserted');
      return;
    }
    setUploading(true);
    try {
      const uploaded = await uploadFile(file);
      editor.chain().focus().setImage({ src: fileUrl(uploaded.url), alt: uploaded.name }).run();
    } catch (error) {
      callbacksRef.current.onNotice?.(error instanceof Error ? error.message : 'Could not upload the image');
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const run = (fn: (chain: ReturnType<NonNullable<typeof editor>['chain']>) => { run: () => boolean }) => {
    if (!editor) return;
    fn(editor.chain().focus()).run();
  };

  const disabled = !editor;

  return (
    <div className={styles.editor} data-variant={variant}>
      <div className={styles.toolbar}>
        <div ref={toolsRef} className={styles.tools} role="toolbar" aria-label="Formatting">
          <div className={styles.group}>
            <ToolButton label="Undo" disabled={!state.canUndo} onClick={() => run((c) => c.undo())}>
              <Undo2 size={20} strokeWidth={1.5} />
            </ToolButton>
            <ToolButton label="Redo" disabled={!state.canRedo} onClick={() => run((c) => c.redo())}>
              <Redo2 size={20} strokeWidth={1.5} />
            </ToolButton>
          </div>

          <Divider />

          <label className={`${styles.select} ${styles.blockSelect}`}>
            <span className={styles.srOnly}>Paragraph style</span>
            <select value={state.block} disabled={disabled} onChange={(e) => applyBlock(e.target.value)}>
              {BLOCKS.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
            <ChevronDown size={20} strokeWidth={1.5} className={styles.chevron} aria-hidden />
          </label>

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

          <Divider />

          <div className={styles.group}>
            <ToolButton label="Bold" active={state.bold} disabled={disabled} onClick={() => run((c) => c.toggleBold())}>
              <Bold size={20} strokeWidth={1.5} />
            </ToolButton>
            <ToolButton label="Italic" active={state.italic} disabled={disabled} onClick={() => run((c) => c.toggleItalic())}>
              <Italic size={20} strokeWidth={1.5} />
            </ToolButton>
            <ToolButton label="Underline" active={state.underline} disabled={disabled} onClick={() => run((c) => c.toggleUnderline())}>
              <Underline size={20} strokeWidth={1.5} />
            </ToolButton>
            <ToolButton label="Strikethrough" active={state.strike} disabled={disabled} onClick={() => run((c) => c.toggleStrike())}>
              <Strikethrough size={20} strokeWidth={1.5} />
            </ToolButton>
            <ToolButton
              label="Superscript"
              active={state.superscript}
              disabled={disabled}
              onClick={() => run((c) => (state.subscript ? c.unsetSubscript().toggleSuperscript() : c.toggleSuperscript()))}
            >
              <SuperscriptIcon size={20} strokeWidth={1.5} />
            </ToolButton>
            <ToolButton
              label="Subscript"
              active={state.subscript}
              disabled={disabled}
              onClick={() => run((c) => (state.superscript ? c.unsetSuperscript().toggleSubscript() : c.toggleSubscript()))}
            >
              <SubscriptIcon size={20} strokeWidth={1.5} />
            </ToolButton>
          </div>

          <Divider />

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

          <label className={styles.color} title="Highlight colour">
            <span className={styles.srOnly}>Highlight colour</span>
            <span className={styles.highlightSwatch} style={{ borderColor: state.highlight }} aria-hidden>
              <Highlighter size={18} strokeWidth={1.5} />
            </span>
            <ChevronDown size={18} strokeWidth={1.5} aria-hidden />
            <input
              type="color"
              value={state.highlight}
              disabled={disabled}
              onChange={(e) => editor?.chain().focus().setHighlight({ color: e.target.value }).run()}
            />
          </label>

          <Divider />

          <div className={styles.group}>
            <ToolButton label="Bulleted list" active={state.bulletList} disabled={disabled} onClick={() => run((c) => c.toggleBulletList())}>
              <List size={20} strokeWidth={1.5} />
            </ToolButton>
            <ToolButton label="Numbered list" active={state.orderedList} disabled={disabled} onClick={() => run((c) => c.toggleOrderedList())}>
              <ListOrdered size={20} strokeWidth={1.5} />
            </ToolButton>
          </div>

          <label className={`${styles.select} ${styles.listSelect}`} title="List style">
            <span className={styles.srOnly}>List style</span>
            <select
              value=""
              disabled={disabled}
              onChange={(e) => {
                if (e.target.value) applyList(e.target.value);
              }}
            >
              <option value="" disabled hidden>
                {'\u2022'}
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

          <div className={styles.group}>
            <ToolButton label="Outdent" disabled={!state.canLift} onClick={() => run((c) => c.liftListItem('listItem'))}>
              <IndentDecrease size={20} strokeWidth={1.5} />
            </ToolButton>
            <ToolButton label="Indent" disabled={!state.canSink} onClick={() => run((c) => c.sinkListItem('listItem'))}>
              <IndentIncrease size={20} strokeWidth={1.5} />
            </ToolButton>
          </div>

          <Divider />

          <div className={styles.group}>
            <ToolButton label="Align left" active={state.align === 'left'} disabled={disabled} onClick={() => run((c) => c.setTextAlign('left'))}>
              <AlignLeft size={20} strokeWidth={1.5} />
            </ToolButton>
            <ToolButton label="Align centre" active={state.align === 'center'} disabled={disabled} onClick={() => run((c) => c.setTextAlign('center'))}>
              <AlignCenter size={20} strokeWidth={1.5} />
            </ToolButton>
            <ToolButton label="Align right" active={state.align === 'right'} disabled={disabled} onClick={() => run((c) => c.setTextAlign('right'))}>
              <AlignRight size={20} strokeWidth={1.5} />
            </ToolButton>
            <ToolButton label="Justify" active={state.align === 'justify'} disabled={disabled} onClick={() => run((c) => c.setTextAlign('justify'))}>
              <AlignJustify size={20} strokeWidth={1.5} />
            </ToolButton>
          </div>

          <Divider />

          <div className={styles.group}>
            <ToolButton label="Insert link" active={state.link} disabled={disabled} onClick={addLink}>
              <Link2 size={20} strokeWidth={1.5} />
            </ToolButton>
            <ToolButton label={uploading ? 'Uploading image\u2026' : 'Insert image'} disabled={disabled || uploading} onClick={() => imageInputRef.current?.click()}>
              <ImagePlus size={20} strokeWidth={1.5} />
            </ToolButton>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/png,image/jpeg"
              hidden
              onChange={(e) => void insertImage(e.target.files?.[0])}
            />
            <DropdownMenu
              label="Table"
              trigger={<TableIcon size={20} strokeWidth={1.5} />}
              triggerClassName={styles.tool}
              items={[
                { key: 't2', label: 'Insert 2 \u00D7 2 table', onSelect: () => run((c) => c.insertTable({ rows: 2, cols: 2, withHeaderRow: true })) },
                { key: 't3', label: 'Insert 3 \u00D7 3 table', onSelect: () => run((c) => c.insertTable({ rows: 3, cols: 3, withHeaderRow: true })) },
                { key: 't4', label: 'Insert 4 \u00D7 4 table', onSelect: () => run((c) => c.insertTable({ rows: 4, cols: 4, withHeaderRow: true })) },
                ...(state.inTable
                  ? [
                      { key: 'row', label: 'Add row below', onSelect: () => run((c) => c.addRowAfter()) },
                      { key: 'col', label: 'Add column right', onSelect: () => run((c) => c.addColumnAfter()) },
                      { key: 'drow', label: 'Delete row', onSelect: () => run((c) => c.deleteRow()) },
                      { key: 'dcol', label: 'Delete column', onSelect: () => run((c) => c.deleteColumn()) },
                      { key: 'dtable', label: 'Delete table', onSelect: () => run((c) => c.deleteTable()) },
                    ]
                  : []),
              ]}
            />
            <ToolButton label="Blockquote" active={state.blockquote} disabled={disabled} onClick={() => run((c) => c.toggleBlockquote())}>
              <Quote size={20} strokeWidth={1.5} />
            </ToolButton>
            <ToolButton label="Code block" active={state.codeBlock} disabled={disabled} onClick={() => run((c) => c.toggleCodeBlock())}>
              <CodeXml size={20} strokeWidth={1.5} />
            </ToolButton>
            <DropdownMenu
              label="Special character"
              trigger={<Omega size={20} strokeWidth={1.5} />}
              triggerClassName={styles.tool}
              items={SPECIAL_CHARS.map(([char, name]) => ({
                key: name,
                label: `${char}   ${name}`,
                onSelect: () => run((c) => c.insertContent(char)),
              }))}
            />
          </div>

          <Divider />

          <div className={styles.group}>
            <ToolButton label="Clear formatting" disabled={disabled} onClick={() => run((c) => c.unsetAllMarks().clearNodes().setTextAlign('left'))}>
              <Eraser size={20} strokeWidth={1.5} />
            </ToolButton>
          </div>
        </div>
      </div>

      <div className={styles.surface}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}