// "About this piece": a Flash or Mark Making image someone pressed Enquire on.
// The browser only sends a reference ("<page id>:<image key>"); the contact function looks the
// image up in Sanity itself, so nobody can slip other pictures or links into Sophie's email.
import { escapeHtml } from './email.ts';

export type PieceRef = { page: string; key: string };
export type PieceLookup = { page?: string; image?: { title?: string; alt?: string; url?: string } | null } | null;

const PIECE_REF_RE = /^(page-[a-z0-9-]{1,40}):([A-Za-z0-9_-]{1,64})$/;

export function parsePieceRef(value: unknown): PieceRef | null {
  const m = typeof value === 'string' ? PIECE_REF_RE.exec(value) : null;
  return m ? { page: m[1], key: m[2] } : null;
}

/** The lines added to Sophie's notification, or null if the piece no longer exists. */
export function pieceForEmail(found: PieceLookup): { name: string; text: string; html: string } | null {
  const url = found?.image?.url;
  if (!url || !/^https:\/\/cdn\.sanity\.io\//.test(url)) return null;
  const name = found?.image?.title || found?.image?.alt || 'Untitled';
  const page = found?.page || 'Gallery';
  const thumb = `${url}?w=480&auto=format`;
  return {
    name: `${page}: ${name}`,
    text: `About this piece: ${name} (${page})\n${url}`,
    html: `<p style="margin:0 0 6px"><strong>About this piece:</strong> ${escapeHtml(name)} (${escapeHtml(page)})</p>
       <p style="margin:0 0 18px"><a href="${escapeHtml(url)}"><img src="${escapeHtml(thumb)}" width="240" alt="${escapeHtml(name)}" style="display:block;width:240px;max-width:100%;height:auto;border:0"></a></p>`,
  };
}
