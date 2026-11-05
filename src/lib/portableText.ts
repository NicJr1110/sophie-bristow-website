// Minimal Portable Text → HTML for the bio (paragraphs, h2/h3, quotes, lists, bold/italic, links).

type Span = { _type: 'span'; text: string; marks?: string[] };
type MarkDef = { _key: string; _type: string; href?: string };
type Block = {
  _type: string;
  style?: string;
  listItem?: 'bullet' | 'number';
  children?: Span[];
  markDefs?: MarkDef[];
};

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeHref(href = ''): string | null {
  return /^(https?:|mailto:|\/)/i.test(href) ? href : null;
}

function renderSpans(children: Span[] = [], markDefs: MarkDef[] = []): string {
  return children
    .map((span) => {
      let out = escapeHtml(span.text ?? '').replace(/\n/g, '<br>');
      for (const mark of span.marks ?? []) {
        if (mark === 'strong') out = `<strong>${out}</strong>`;
        else if (mark === 'em') out = `<em>${out}</em>`;
        else {
          const def = markDefs.find((d) => d._key === mark);
          const href = def?._type === 'link' ? safeHref(def.href) : null;
          if (href) {
            const ext = /^https?:/i.test(href) ? ' target="_blank" rel="noopener"' : '';
            out = `<a href="${escapeHtml(href)}"${ext}>${out}</a>`;
          }
        }
      }
      return out;
    })
    .join('');
}

export function portableTextToHtml(blocks: Block[] = []): string {
  let html = '';
  let openList: 'ul' | 'ol' | null = null;

  for (const b of blocks) {
    if (b._type !== 'block') continue;
    const inner = renderSpans(b.children, b.markDefs);

    if (b.listItem) {
      const tag = b.listItem === 'number' ? 'ol' : 'ul';
      if (openList !== tag) {
        if (openList) html += `</${openList}>`;
        html += `<${tag}>`;
        openList = tag;
      }
      html += `<li>${inner}</li>`;
      continue;
    }
    if (openList) {
      html += `</${openList}>`;
      openList = null;
    }
    const tag = ({ h2: 'h2', h3: 'h3', blockquote: 'blockquote' } as Record<string, string>)[b.style ?? ''] ?? 'p';
    html += `<${tag}>${inner}</${tag}>`;
  }
  if (openList) html += `</${openList}>`;
  return html;
}
