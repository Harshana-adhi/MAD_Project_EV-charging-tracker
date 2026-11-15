import { errorMessage } from '@/lib/errors';

// Codes that only the password screens receive, so they are explained here.
const MESSAGES: Record<string, string> = {
  WRONG_PASSWORD: 'Your current password is incorrect.',
  INVALID_CODE: "That code isn't right. Check the email and try again.",
  CODE_EXPIRED: 'That code has expired. Send a new one.',
  TOO_MANY_REQUESTS: 'Too many attempts. Wait 15 minutes and try again.',
};

export function passwordErrorMessage(err: unknown): string {
  const code = err instanceof Error ? err.message : String(err);
  return MESSAGES[code] ?? errorMessage(err);
}

export const PASSWORD_RULE = 'Use 8 to 64 characters';
