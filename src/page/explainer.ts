// The "OwO wats dis?!" disclosure (FR-P11, DESIGN §6) is a native <details>,
// which already opens by mouse, keyboard and touch and works without
// JavaScript. This adds what it lacks: Escape closes it and returns focus to
// its summary.
export function setUpExplainer(details: HTMLDetailsElement): void {
  details.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !details.open) return;
    details.open = false;
    details.querySelector('summary')?.focus();
  });
}
