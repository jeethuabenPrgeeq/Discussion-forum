import sanitizeHtml = require('sanitize-html');

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'mark', 'span',
    'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'a', 'h3', 'h4',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    span: ['style'],
    mark: ['style'],
  },
  allowedStyles: {
    '*': {
      color: [/^#[0-9a-f]{3,8}$/i, /^rgb\(/i],
      'background-color': [/^#[0-9a-f]{3,8}$/i, /^rgb\(/i],
      'font-size': [/^\d{1,2}px$/],
      'font-family': [/^[\w\s,'"-]+$/],
    },
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }),
  },
};

export const cleanHtml = (html: string) => sanitizeHtml(html, OPTIONS).trim();

export const isBlankHtml = (html: string) => cleanHtml(html).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() === '';