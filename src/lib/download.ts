// src/lib/download.ts

export function safeFilenameFromContentDisposition(cd: string | null): string | null {
  if (!cd) return null;

  // RFC 5987: filename*=UTF-8''...
  const m1 = cd.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (m1?.[1]) return decodeURIComponent(m1[1].trim());

  // filename="..."
  const m2 = cd.match(/filename\s*=\s*"([^"]+)"/i);
  if (m2?.[1]) return m2[1].trim();

  // filename=...
  const m3 = cd.match(/filename\s*=\s*([^;]+)/i);
  if (m3?.[1]) return m3[1].trim().replace(/^"|"$|'/g, "");

  return null;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
