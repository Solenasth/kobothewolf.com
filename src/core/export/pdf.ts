// The 2-page print PDF (FR-E14, DESIGN §5.5): each face's 300 dpi PNG on a
// 96 × 56 mm page (272.13 × 158.74 pt, 300 ppi), front first, as in P8. The
// text is inside the images, so the PDF carries no fonts.
import { jsPDF } from 'jspdf';
import { renderFacePng } from './png';

export interface PdfMeta {
  title: string;
}

/** Builds the PDF from two PNGs' bytes. No DOM, so it runs in Node too. */
export function buildPdf(front: Uint8Array, back: Uint8Array, meta: PdfMeta): ArrayBuffer {
  const doc = new jsPDF({ unit: 'mm', format: [96, 56], orientation: 'landscape', compress: true, putOnlyUsedFonts: true });
  doc.setProperties({ title: meta.title, creator: 'kobothewolf.com' });
  doc.addImage(front, 'PNG', 0, 0, 96, 56, 'frente', 'FAST');
  doc.addPage([96, 56], 'landscape');
  doc.addImage(back, 'PNG', 0, 0, 96, 56, 'reverso', 'FAST');
  return doc.output('arraybuffer');
}

export async function renderPdf(front: HTMLElement, back: HTMLElement, meta: PdfMeta): Promise<Blob> {
  const pages = [await renderFacePng(front), await renderFacePng(back)] as const;
  return new Blob([buildPdf(...pages, meta)], { type: 'application/pdf' });
}
