// The E2E jobs run in Microsoft's Playwright image. Its browsers must be the
// ones @playwright/test expects, so the image tag has to match the package
// version exactly, and the image is pinned by digest (dependency hygiene).

const IMAGE = /mcr\.microsoft\.com\/playwright:v(\d+\.\d+\.\d+)-[a-z]+(@sha256:[0-9a-f]{64})?/g;

export function checkPlaywrightImage(workflow: string, version: string): string[] {
  const refs = [...workflow.matchAll(IMAGE)];
  if (refs.length === 0) return ['no Playwright image found in the workflow'];

  const errors: string[] = [];
  for (const [ref, tag, digest] of refs) {
    if (tag !== version) errors.push(`${ref}: tag v${tag} does not match @playwright/test ${version}`);
    if (!digest) errors.push(`${ref}: not pinned by digest`);
  }
  return errors;
}
