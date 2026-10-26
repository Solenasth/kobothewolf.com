// Composes the inquiry email (FR-P8, DESIGN §6.1). Pure: no DOM, no network.

export const RECIPIENT = 'contact@kobothewolf.com';
export const LIMITS = { name: 100, email: 254, message: 1500 } as const;
export const TYPES = ['inquiry', 'quote'] as const;

export type InquiryType = (typeof TYPES)[number];

export interface Inquiry {
  type: InquiryType;
  name: string;
  email: string;
  message: string;
}

/** Catalog templates: `subject` uses {name}; `signature` uses {name} and {email}. */
export interface Templates {
  subject: string;
  signature: string;
}

export type FieldError = 'required' | 'email';

const singleLine = (value: string, max: number) => value.replace(/[\r\n]+/g, ' ').trim().slice(0, max);

export function normalize(input: Inquiry): Inquiry {
  return {
    type: TYPES.includes(input.type) ? input.type : 'inquiry',
    name: singleLine(input.name, LIMITS.name),
    email: singleLine(input.email, LIMITS.email),
    message: input.message.replace(/\r\n?/g, '\n').trim().slice(0, LIMITS.message),
  };
}

export function validate(input: Inquiry): Partial<Record<'name' | 'email' | 'message', FieldError>> {
  const { name, email, message } = normalize(input);
  const errors: Partial<Record<'name' | 'email' | 'message', FieldError>> = {};
  if (!name) errors.name = 'required';
  if (!email) errors.email = 'required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'email';
  if (!message) errors.message = 'required';
  return errors;
}

const fill = (template: string, values: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (match, key: string) => (Object.hasOwn(values, key) ? values[key]! : match));

export function compose(input: Inquiry, templates: Templates): { subject: string; body: string } {
  const { name, email, message } = normalize(input);
  return {
    subject: singleLine(fill(templates.subject, { name }), 200),
    body: `${message}\n\n—\n${fill(templates.signature, { name, email })}`,
  };
}

/** RFC 6068: CRLF line breaks, every value percent-encoded. */
export function mailtoUrl(input: Inquiry, templates: Templates): string {
  const { subject, body } = compose(input, templates);
  const enc = (value: string) => encodeURIComponent(value.replace(/\n/g, '\r\n'));
  return `mailto:${RECIPIENT}?subject=${enc(subject)}&body=${enc(body)}`;
}

/** Plain text for "Copy message", for visitors without an email app. */
export function plainText(input: Inquiry, templates: Templates, labels: { to: string; subject: string }): string {
  const { subject, body } = compose(input, templates);
  return `${labels.to}: ${RECIPIENT}\n${labels.subject}: ${subject}\n\n${body}`;
}
