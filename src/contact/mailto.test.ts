import { describe, expect, it } from 'vitest';
import es from '../i18n/es.json';
import en from '../i18n/en.json';
import { LIMITS, mailtoUrl, plainText, validate, type Inquiry } from './mailto';

const templates = (cat: Record<string, string>, type: 'inquiry' | 'quote') => ({
  subject: cat[`mail.subject.${type}`]!,
  signature: cat['mail.signature']!,
});

const base: Inquiry = { type: 'quote', name: 'Ana', email: 'ana@example.com', message: 'Hi!\nTwo lines' };

function parse(url: string) {
  const parsed = new URL(url);
  return {
    to: parsed.pathname,
    keys: [...parsed.searchParams.keys()],
    subject: parsed.searchParams.get('subject'),
    body: parsed.searchParams.get('body'),
  };
}

describe('FR-P8 the email is composed for each type and language', () => {
  it.each([
    ['en', 'inquiry', en],
    ['en', 'quote', en],
    ['es', 'inquiry', es],
    ['es', 'quote', es],
  ] as const)('%s %s', (_lang, type, cat) => {
    const mail = parse(mailtoUrl({ ...base, type }, templates(cat, type)));
    expect(mail.to).toBe('contact@kobothewolf.com');
    expect(mail.keys).toEqual(['subject', 'body']);
    expect(mail.subject).toBe(cat[`mail.subject.${type}`].replace('{name}', 'Ana'));
    expect(mail.body).toContain('Hi!\r\nTwo lines');
    expect(mail.body).toContain('ana@example.com');
  });

  it('copies recipient, subject and body as plain text', () => {
    const text = plainText(base, templates(en, 'quote'), { to: 'To', subject: 'Subject' });
    expect(text.startsWith('To: contact@kobothewolf.com\nSubject: ')).toBe(true);
    expect(text).toContain('Hi!\nTwo lines');
  });
});

describe('NFR-4 typed text cannot add headers or recipients', () => {
  const evil: Inquiry = {
    type: 'inquiry',
    name: 'Eve\r\nBcc: victim@example.com',
    email: 'eve@example.com&cc=victim@example.com',
    message: 'x&bcc=victim@example.com?to=other@example.com%0ACc: a@b.c',
  };

  it('keeps exactly one recipient and two parameters', () => {
    const url = mailtoUrl(evil, templates(en, 'inquiry'));
    const mail = parse(url);
    expect(mail.to).toBe('contact@kobothewolf.com');
    expect(mail.keys).toEqual(['subject', 'body']);
    expect(url.match(/[?&]/g)).toHaveLength(2);
    expect(url).not.toMatch(/\r|\n/);
  });

  it('flattens line breaks in single-line fields', () => {
    const { subject } = parse(mailtoUrl(evil, templates(en, 'inquiry')));
    expect(subject).not.toMatch(/[\r\n]/);
    expect(subject).toContain('Eve Bcc: victim@example.com');
  });

  it('falls back to a known type', () => {
    const url = mailtoUrl({ ...base, type: 'other' as never }, templates(en, 'inquiry'));
    expect(parse(url).subject).toContain('Ana');
  });
});

describe('FR-P8 limits and validation', () => {
  it('truncates fields over the cap', () => {
    const long: Inquiry = { type: 'quote', name: 'n'.repeat(500), email: 'a@b.co', message: 'm'.repeat(5000) };
    const mail = parse(mailtoUrl(long, { subject: '{name}', signature: '{name}' }));
    expect(mail.subject).toHaveLength(LIMITS.name);
    expect(mail.body!.split('\r\n')[0]).toHaveLength(LIMITS.message);
  });

  it('requires name, email and message', () => {
    expect(validate({ type: 'quote', name: ' ', email: '', message: '\n' })).toEqual({
      name: 'required',
      email: 'required',
      message: 'required',
    });
  });

  it('rejects a malformed email', () => {
    expect(validate({ ...base, email: 'ana@' })).toEqual({ email: 'email' });
    expect(validate({ ...base, email: 'ana @example.com' })).toEqual({ email: 'email' });
    expect(validate(base)).toEqual({});
  });
});
