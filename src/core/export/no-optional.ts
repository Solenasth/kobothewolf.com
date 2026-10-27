// Stands in for jsPDF's optional html2canvas, DOMPurify and canvg (DESIGN §5.5).
// jsPDF imports them only for html() and SVG, which the export doesn't use, so
// they stay out of the bundle; using one of those features fails loudly.
throw new Error('export: this jsPDF feature is not part of the site build');
