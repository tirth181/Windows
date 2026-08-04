/** Open a print-friendly window for an element (Print / Save as PDF via browser dialog). */
export function printElementAsDocument(
  element: HTMLElement | null,
  title: string,
): void {
  if (!element || typeof window === "undefined") return;

  const w = window.open("", "_blank", "noopener,noreferrer,width=960,height=720");
  if (!w) {
    // Popup blocked — fall back to printing the current page region
    window.print();
    return;
  }

  const styles = `
    @page { margin: 16mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #0f172a;
      font-family: "IBM Plex Sans", system-ui, sans-serif;
      font-size: 12px;
      line-height: 1.45;
      background: #fff;
    }
    h1, h2, h3 { margin: 0 0 0.4rem; color: #0b1f33; }
    h1 { font-size: 22px; letter-spacing: -0.02em; }
    h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin-top: 1.25rem; }
    table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; }
    th, td { border-bottom: 1px solid #dbe3ec; padding: 8px 6px; text-align: left; vertical-align: top; }
    th { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; background: #f3f6f9; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    .muted { color: #64748b; }
    .grid-meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 18px; }
    .meta-item label { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; }
    .meta-item p { margin: 2px 0 0; font-size: 13px; font-weight: 600; color: #0b1f33; }
    .totals { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 12px; padding-top: 10px; border-top: 1px solid #dbe3ec; }
    .attach { margin-top: 12px; padding: 10px; border: 1px solid #dbe3ec; border-radius: 6px; }
    .attach img, .attach embed, .attach iframe { max-width: 100%; max-height: 420px; }
    .brand { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #0b1f33; }
    .brand-mark { font-size: 18px; font-weight: 700; color: #0b1f33; }
  `;

  w.document.open();
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title><style>${styles}</style></head><body>${element.innerHTML}</body></html>`);
  w.document.close();
  w.focus();
  // Wait for images/embeds to settle
  setTimeout(() => {
    w.print();
  }, 250);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
