import { api as http } from '@/lib/api';
import type { Role, User } from '@/types/domain';

type AuthResult = { token: string; user: User };

export function signUp(input: {
  email: string;
  password: string;
  fullName: string;
  role: 'customer' | 'owner';
}): Promise<AuthResult> {
  return http.post('/auth/register', input) as unknown as Promise<AuthResult>;
}

export function signIn(input: { email: string; password: string }): Promise<AuthResult> {
  return http.post('/auth/login', input) as unknown as Promise<AuthResult>;
}

export function getMe(): Promise<User> {
  return http.get('/auth/me') as unknown as Promise<User>;
}

export type { Role, User };
