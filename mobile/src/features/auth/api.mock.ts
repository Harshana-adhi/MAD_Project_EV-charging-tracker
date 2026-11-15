import { mockUser } from '@/mocks/fixtures';
import { setCurrentMockUser } from '@/mocks/currentUser';
import type { User } from '@/types/domain';

type AuthResult = { token: string; user: User };

const MOCK_SESSION_PREFIX = 'mock-session:';

function createSession(user: User): AuthResult {
  setCurrentMockUser(user);
  return {
    token: `${MOCK_SESSION_PREFIX}${encodeURIComponent(JSON.stringify(user))}`,
    user: { ...user },
  };
}

function isUser(value: unknown): value is User {
  if (!value || typeof value !== 'object') return false;
  const user = value as Partial<User>;
  return (
    typeof user.id === 'string' &&
    typeof user.email === 'string' &&
    typeof user.fullName === 'string' &&
    (user.phone === null || typeof user.phone === 'string') &&
    (user.role === 'customer' || user.role === 'owner' || user.role === 'admin') &&
    typeof user.isBlocked === 'boolean' &&
    typeof user.createdAt === 'string'
  );
}

function restoreSession(token?: string): User {
  if (!token?.startsWith(MOCK_SESSION_PREFIX)) {
    // Older mock tokens did not store a role. Restore these as the default customer.
    const legacyUser = { ...mockUser };
    setCurrentMockUser(legacyUser);
    return legacyUser;
  }

  try {
    const user: unknown = JSON.parse(decodeURIComponent(token.slice(MOCK_SESSION_PREFIX.length)));
    if (!isUser(user)) throw new Error('Invalid mock session');
    setCurrentMockUser(user);
    return { ...user };
  } catch {
    throw new Error('UNAUTHENTICATED');
  }
}

function userForEmail(email: string): User {
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail === 'owner@evct.lk') {
    return {
      ...mockUser,
      id: 'owner-1',
      email: normalizedEmail,
      fullName: 'Station Owner',
      role: 'owner',
    };
  }
  if (normalizedEmail === 'admin@evct.lk') {
    return {
      ...mockUser,
      id: 'admin-1',
      email: normalizedEmail,
      fullName: 'EVCT Admin',
      role: 'admin',
    };
  }
  return {
    ...mockUser,
    id: normalizedEmail === 'customer@evct.lk' ? mockUser.id : `mock-${encodeURIComponent(normalizedEmail)}`,
    email: normalizedEmail,
  };
}

export async function signUp(input: {
  email: string;
  password: string;
  fullName: string;
  role: 'customer' | 'owner';
}): Promise<AuthResult> {
  return createSession({
    ...mockUser,
    id: `mock-${Date.now()}`,
    email: input.email.trim().toLowerCase(),
    fullName: input.fullName,
    role: input.role,
  });
}

export async function signIn(input: { email: string; password: string }): Promise<AuthResult> {
  return createSession(userForEmail(input.email));
}

export async function getMe(token?: string): Promise<User> {
  return restoreSession(token);
}
