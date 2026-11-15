import type { AppTheme } from '@/lib/theme';
import type { Role, User } from '@/types/domain';

export const ROLE_LABEL: Record<Role, string> = {
  customer: 'Customer',
  owner: 'Owner',
  admin: 'Admin',
};

export function initials(fullName: string): string {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

// Customers are the majority, so they stay neutral and owners, admins and blocked users stand out.
// Blocked users are shown in the error colours whatever their role is.
export function userColors(user: User, theme: AppTheme): { bg: string; text: string } {
  if (user.isBlocked) {
    return { bg: theme.colors.errorContainer, text: theme.colors.onErrorContainer };
  }
  if (user.role === 'owner') {
    return { bg: theme.colors.primaryContainer, text: theme.colors.onPrimaryContainer };
  }
  if (user.role === 'admin') {
    return { bg: theme.colors.tertiaryContainer, text: theme.colors.onTertiaryContainer };
  }
  return { bg: theme.colors.surfaceVariant, text: theme.colors.onSurfaceVariant };
}
