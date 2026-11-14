import { mockUser } from '@/mocks/fixtures';
import type { User } from '@/types/domain';

type AuthResult = { token: string; user: User };

export async function signUp(input: {
  email: string;
  password: string;
  fullName: string;
  role: 'customer' | 'owner';
}): Promise<AuthResult> {
  return { token: 'mock-token', user: { ...mockUser, email: input.email, fullName: input.fullName, role: input.role } };
}

export async function signIn(input: { email: string; password: string }): Promise<AuthResult> {
  return { token: 'mock-token', user: { ...mockUser, email: input.email } };
}

export async function getMe(): Promise<User> {
  return mockUser;
}
