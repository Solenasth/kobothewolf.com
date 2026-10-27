// Downloads (FR-E15, DESIGN §5.5): exports are ordinary browser downloads.
// Other host runtimes can plug in through the same interface.

export interface Saver {
  save(file: { filename: string; data: Blob }): Promise<{ status: 'saved' }>;
}

/** Clicks an <a download> on an object URL, then revokes the URL after 10 s (GP §1). */
export const browserSaver: Saver = {
  async save({ filename, data }) {
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return { status: 'saved' };
  },
};
