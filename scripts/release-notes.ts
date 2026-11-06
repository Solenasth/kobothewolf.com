// The page's version label and release notes (FR-P9, DESIGN §6): the
// CHANGELOG.md entry for the running version, turned into HTML at build time.
// All text is escaped; only **bold**, `code` and links to this repository
// become markup. The build fails if the version has no entry.

export const REPO = 'https://github.com/Solenasth/kobothewolf.com';
/** The sections visitors care about; docs, CI and chores stay in the changelog. */
export const SHOWN_SECTIONS = ['Features', 'Fixes', 'Security', 'Performance'] as const;

export interface ReleaseEntry {
  version: string;
  date?: string;
  /** Hand-written entries have a title ("vector PDF") and a summary paragraph. */
  title?: string;
  summary: string[];
  sections: { name: string; items: string[] }[];
  /** Written by release-please: one item per commit, PR merges carry a PR link. */
  generated: boolean;
}

/** The entry for `version`, in either changelog format, or undefined. */
export function findEntry(changelog: string, version: string): ReleaseEntry | undefined {
  for (const block of changelog.split(/^## /m).slice(1)) {
    const [heading = '', ...lines] = block.split('\n');
    // release-please: "[0.7.0](compare-url) (2026-10-27)"; by hand: "v0.6.0 (2026-10-27): vector PDF".
    const generated = /^\[(\d+\.\d+\.\d+)\]\([^)]*\)\s*\((\d{4}-\d{2}-\d{2})\)/.exec(heading);
    const manual = /^v(\d+\.\d+\.\d+)\s*\((\d{4}-\d{2}-\d{2})\)(?::\s*(.+))?$/.exec(heading.trim());
    const match = generated ?? manual;
    if (!match || match[1] !== version) continue;
    const entry: ReleaseEntry = { version, date: match[2]!, summary: [], sections: [], generated: !!generated };
    if (manual?.[3]) entry.title = manual[3].trim();
    for (const line of lines) {
      const section = /^###\s+(.+)$/.exec(line);
      if (section) entry.sections.push({ name: section[1]!.trim(), items: [] });
      else if (/^[*-]\s+/.test(line)) entry.sections.at(-1)?.items.push(line.replace(/^[*-]\s+/, '').trim());
      else if (line.trim() && !entry.sections.length) entry.summary.push(line.trim());
    }
    return entry;
  }
  return undefined;
}

/** The shown sections; for release-please entries only PR merges, without commit links or "closes". */
export function visibleSections(entry: ReleaseEntry): { name: string; items: string[] }[] {
  return entry.sections
    .filter((s) => (SHOWN_SECTIONS as readonly string[]).includes(s.name))
    .map((s) => ({
      name: s.name,
      items: s.items
        .filter((item) => !entry.generated || /\(\[#\d+\]\([^)]*\)\)/.test(item))
        .map((item) =>
          item
            .replace(/\s*\(\[[0-9a-f]{7,40}\]\([^)]*\)\)/g, '')
            .replace(/,?\s*closes\s+(\[#\d+\]\([^)]*\)(,\s*)?)+/g, '')
            .trim(),
        ),
    }))
    .filter((s) => s.items.length);
}

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** A repository URL for a link target, or undefined: only this repo, absolute or as a relative path. */
function repoUrl(target: string): string | undefined {
  if (target.startsWith(`${REPO}/`)) return target;
  if (/^[\w./-]+$/.test(target) && !target.startsWith('/') && !target.includes('..')) return `${REPO}/blob/main/${target}`;
  return undefined;
}

/** Inline markdown to HTML: text escaped; **bold**, `code` and repo links only. */
export function inline(markdown: string): string {
  const parts: string[] = [];
  let rest = markdown;
  const link = /\[([^\]]+)\]\(([^)\s]+)\)/;
  for (let m = link.exec(rest); m; m = link.exec(rest)) {
    parts.push(format(rest.slice(0, m.index)));
    const url = repoUrl(m[2]!);
    parts.push(url ? `<a href="${escape(url)}">${format(m[1]!)}</a>` : format(m[1]!));
    rest = rest.slice(m.index + m[0].length);
  }
  parts.push(format(rest));
  return parts.join('');
}

function format(text: string): string {
  return escape(text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

/** The <details> the page shows (DESIGN §6). Its labels are catalog keys, filled like the rest of the page. */
export function renderVersion(changelog: string, version: string, commit: string | undefined): string {
  const entry = findEntry(changelog, version);
  if (!entry) throw new Error(`release notes: CHANGELOG.md has no entry for v${version}`);
  const short = commit?.slice(0, 7);
  const sections = visibleSections(entry)
    .map((s) => `<h3>${escape(s.name)}</h3><ul>${s.items.map((i) => `<li>${inline(i)}</li>`).join('')}</ul>`)
    .join('');
  return [
    '<details class="version" id="version">',
    `<summary><span data-i18n="version.label"></span> <span class="v">v${escape(version)}${short ? ` · ${escape(short)}` : ''}</span></summary>`,
    '<div class="version-panel">',
    `<p class="label" data-i18n="version.notes"></p>`,
    `<div lang="en">`,
    `<p class="version-title">v${escape(version)}${entry.date ? ` · ${escape(entry.date)}` : ''}${entry.title ? `: ${escape(entry.title)}` : ''}</p>`,
    ...entry.summary.map((p) => `<p>${inline(p)}</p>`),
    sections,
    '</div>',
    `<p class="version-links"><a href="${REPO}/releases/tag/v${escape(version)}" data-i18n="version.release"></a>`,
    short ? ` · <a href="${REPO}/commit/${escape(commit!)}"><span data-i18n="version.commit"></span> <code>${escape(short)}</code></a>` : '',
    '</p>',
    '</div>',
    '</details>',
  ].join('');
}
