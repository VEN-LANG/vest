/**
 * Mailable classes — unit tests.
 * Tests the build() output: to, subject, html, text. No SMTP involved.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { WelcomeEmail } from '../../app/Mail/WelcomeEmail';
import { PasswordResetEmail } from '../../app/Mail/PasswordResetEmail';

function getTo(built: any): string {
  const to = built._to ?? built.toAddress;
  if (Array.isArray(to)) {
    const first = to[0];
    return typeof first === 'string' ? first : (first?.address ?? '');
  }
  return String(to ?? '');
}

describe('WelcomeEmail', () => {
  let mail: WelcomeEmail;

  beforeAll(() => {
    mail = new WelcomeEmail('Alice', 'alice@test.com');
    mail.build();
  });

  it('is addressed to the user email', () => {
    expect(getTo(mail as any)).toBe('alice@test.com');
  });

  it('subject includes the user name', () => {
    const built = mail as any;
    const subject = built._subject ?? built.subjectLine ?? '';
    expect(subject).toContain('Alice');
  });

  it('HTML body contains a welcome heading', () => {
    const built = mail as any;
    const html = built._html ?? built.htmlContent ?? '';
    expect(html).toContain('Welcome');
  });

  it('plain text body contains the user name', () => {
    const built = mail as any;
    const text = built._text ?? built.textContent ?? '';
    expect(text).toContain('Alice');
  });
});

describe('PasswordResetEmail', () => {
  const token = 'test-token-123';
  let mail: PasswordResetEmail;

  beforeAll(() => {
    mail = new PasswordResetEmail('Bob', 'bob@test.com', token);
    mail.build();
  });

  it('is addressed to the user email', () => {
    expect(getTo(mail as any)).toBe('bob@test.com');
  });

  it('subject mentions password reset', () => {
    const built = mail as any;
    const subject = built._subject ?? built.subjectLine ?? '';
    expect(subject.toLowerCase()).toContain('password');
  });

  it('HTML body contains the reset token', () => {
    const built = mail as any;
    const html = built._html ?? built.htmlContent ?? '';
    expect(html).toContain(token);
  });

  it('plain text body contains the reset URL with token', () => {
    const built = mail as any;
    const text = built._text ?? built.textContent ?? '';
    expect(text).toContain(token);
  });
});
