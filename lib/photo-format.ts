// "Edited photo" format: stored in a normal `photos[]` string slot but
// serialized as JSON with a recognizable prefix so the backend can keep
// treating it as an opaque string.
//
// Format: `frnds:photo:v1:` + base64-encoded JSON of { photo, stickers }.

export interface PhotoSticker {
  id: string;
  /** 'text' for typed text, 'emoji' for emoji stamp */
  type: 'text' | 'emoji';
  text: string;
  /** Normalized 0..1 position relative to the photo container */
  x: number;
  y: number;
  /** Font size in points (relative to a 320px reference width) */
  size: number;
  rotation: number; // degrees
  color: string;
}

export interface EditedPhoto {
  photo: string; // raw image data URI / http url / base64
  stickers: PhotoSticker[];
}

const PREFIX = 'frnds:photo:v1:';

function utf8ToBase64(s: string): string {
  // Avoid `Buffer` (not always available in RN)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof globalThis !== 'undefined' && (globalThis as any).btoa) {
    // btoa expects latin1, so encode utf-8 first
    return (globalThis as any).btoa(unescape(encodeURIComponent(s)));
  }
  // Fallback: very large strings may be slow
  return s;
}

function base64ToUtf8(s: string): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof globalThis !== 'undefined' && (globalThis as any).atob) {
    return decodeURIComponent(escape((globalThis as any).atob(s)));
  }
  return s;
}

export function encodeEditedPhoto(p: EditedPhoto): string {
  try {
    return PREFIX + utf8ToBase64(JSON.stringify(p));
  } catch {
    // Fallback: just return the raw photo
    return p.photo;
  }
}

export function decodeEditedPhoto(value: string | null | undefined): EditedPhoto | null {
  if (!value || typeof value !== 'string') return null;
  if (!value.startsWith(PREFIX)) return null;
  try {
    const json = base64ToUtf8(value.slice(PREFIX.length));
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed.photo !== 'string') return null;
    return {
      photo: parsed.photo,
      stickers: Array.isArray(parsed.stickers) ? parsed.stickers : [],
    };
  } catch {
    return null;
  }
}

/** Returns the underlying raw photo URI (data: or http:) for any photo entry. */
export function rawPhotoOf(value: string | null | undefined): string | null {
  if (!value) return null;
  const edited = decodeEditedPhoto(value);
  return edited ? edited.photo : value;
}
