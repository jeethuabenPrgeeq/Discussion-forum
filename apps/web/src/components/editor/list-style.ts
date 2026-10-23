import { BulletList, OrderedList } from '@tiptap/extension-list';

const listStyleType = {
  default: null,
  parseHTML: (element: HTMLElement) => element.style.listStyleType || null,
  renderHTML: (attributes: Record<string, unknown>) =>
    attributes.listStyleType ? { style: `list-style-type: ${String(attributes.listStyleType)}` } : {},
};

export const StyledBulletList = BulletList.extend({
  addAttributes() {
    return { ...this.parent?.(), listStyleType };
  },
});

export const StyledOrderedList = OrderedList.extend({
  addAttributes() {
    return { ...this.parent?.(), listStyleType };
  },
});