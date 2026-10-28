export const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const textToHtml = (text: string) =>
  text
    .trim()
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, '<br>')}</p>`)
    .join('');

export function htmlToText(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
  const blocks = Array.from(doc.body.children);
  if (blocks.length === 0) return doc.body.textContent?.trim() ?? '';
  return blocks
    .map((block) =>
      block.matches('ul, ol')
        ? Array.from(block.children)
            .map((li) => `• ${li.textContent?.trim() ?? ''}`)
            .join('\n')
        : (block.textContent?.trim() ?? ''),
    )
    .filter(Boolean)
    .join('\n\n');
}