import type { User } from '@/types/domain';
import { mockUser } from './fixtures';

let currentUser: User = { ...mockUser };

export function getCurrentMockUser(): User {
  return { ...currentUser };
}

export function setCurrentMockUser(user: User): void {
  currentUser = { ...user };
}
