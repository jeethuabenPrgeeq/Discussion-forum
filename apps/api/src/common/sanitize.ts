import sanitizeHtml = require('sanitize-html');

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'mark', 'span', 'sup', 'sub',
    'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'a', 'h1', 'h2', 'h3', 'h4',
    'table', 'colgroup', 'col', 'thead', 'tbody', 'tr', 'th', 'td', 'img',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    span: ['style'],
    mark: ['style', 'data-color'],
    p: ['style'],
    h1: ['style'],
    h2: ['style'],
    h3: ['style'],
    h4: ['style'],
    ul: ['style'],
    ol: ['style', 'start', 'type'],
    table: ['style'],
    col: ['style'],
    th: ['colspan', 'rowspan', 'style'],
    td: ['colspan', 'rowspan', 'style'],
    img: ['src', 'alt', 'title', 'width', 'height'],
  },
  allowedStyles: {
    '*': {
      color: [/^#[0-9a-f]{3,8}$/i, /^rgb\(/i],
      'background-color': [/^#[0-9a-f]{3,8}$/i, /^rgb\(/i],
      'font-size': [/^\d{1,2}px$/],
      'font-family': [/^[\w\s,'"-]+$/],
      'text-align': [/^(left|right|center|justify)$/],
      'list-style-type': [/^[\w-]+$/, /^"[^"<>]{1,4}"$/],
      'min-width': [/^\d{1,4}px$/],
      width: [/^\d{1,4}px$/, /^\d{1,3}%$/],
    },
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  allowProtocolRelative: false,
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }),
  },
};

export const cleanHtml = (html: string) => sanitizeHtml(html, OPTIONS).trim();

export const isBlankHtml = (html: string) => cleanHtml(html).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() === '';