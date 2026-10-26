import { onLanguageChange, t, type MessageKey } from '../i18n';
import { mailtoUrl, plainText, TYPES, validate, type Inquiry, type InquiryType } from './mailto';

type Field = 'name' | 'email' | 'message';
const FIELDS: readonly Field[] = ['name', 'email', 'message'];

/** Enhances the static form (DESIGN §6.1). Without JavaScript it stays hidden. */
export function setUpInquiryForm(form: HTMLFormElement) {
  const status = form.querySelector<HTMLElement>('[role="status"]')!;
  const control = (name: string) => form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement;

  const read = (): Inquiry => {
    const type = control('type').value;
    return {
      type: (TYPES as readonly string[]).includes(type) ? (type as InquiryType) : 'inquiry',
      name: control('name').value,
      email: control('email').value,
      message: control('message').value,
    };
  };

  const templates = (inquiry: Inquiry) => ({
    subject: t(`mail.subject.${inquiry.type}` as MessageKey),
    signature: t('mail.signature'),
  });

  const say = (key: MessageKey) => (status.textContent = t(key));

  function showErrors(errors: Partial<Record<Field, string>>) {
    for (const field of FIELDS) {
      const input = control(field);
      const message = form.querySelector<HTMLElement>(`#e-${field}`)!;
      const error = errors[field];
      input.setAttribute('aria-invalid', String(Boolean(error)));
      message.hidden = !error;
      message.dataset['error'] = error ?? '';
      message.textContent = error ? t(`form.error.${error}` as MessageKey) : '';
    }
  }

  function check(): Inquiry | undefined {
    const inquiry = read();
    const errors = validate(inquiry);
    showErrors(errors);
    const first = FIELDS.find((f) => errors[f]);
    if (first) {
      say('form.status.invalid');
      control(first).focus();
      return undefined;
    }
    return inquiry;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const inquiry = check();
    if (!inquiry) return;
    say('form.status.opening');
    const link = document.createElement('a');
    link.href = mailtoUrl(inquiry, templates(inquiry));
    link.click();
  });

  form.querySelector('[data-action="copy"]')!.addEventListener('click', async () => {
    const inquiry = check();
    if (!inquiry) return;
    const text = plainText(inquiry, templates(inquiry), { to: t('mail.to'), subject: t('mail.subjectLabel') });
    try {
      await navigator.clipboard.writeText(text);
      say('form.status.copied');
    } catch {
      say('form.status.copyFailed');
    }
  });

  // Visible errors follow the language; the static labels are handled by applyStatic.
  onLanguageChange(() => {
    for (const message of form.querySelectorAll<HTMLElement>('.err[data-error]:not([data-error=""])')) {
      message.textContent = t(`form.error.${message.dataset['error']}` as MessageKey);
    }
  });

  form.hidden = false;
}
