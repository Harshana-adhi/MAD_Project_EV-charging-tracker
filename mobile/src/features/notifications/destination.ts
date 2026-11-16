import type { Href } from 'expo-router';
import type { AppNotification, Role } from '@/types/domain';

export function notificationDestination(note: AppNotification, role: Role): Href | undefined {
  switch (note.type) {
    case 'session_completed':
    case 'session_cancelled':
    case 'session_disputed':
      if (role === 'customer' && note.refId) {
        return { pathname: '/receipt/[id]', params: { id: note.refId } };
      }
      if (role === 'owner') return '/owner/sessions';
      return undefined;
    case 'booking_reminder':
    case 'booking_warning':
    case 'booking_expired':
      return role === 'customer' ? '/bookings' : undefined;
    case 'booking_made':
    case 'booking_cancelled':
      return role === 'owner' ? '/owner/sessions' : undefined;
    case 'station_review':
      return role === 'owner' ? '/(owner)/stations' : undefined;
    case 'topup_review':
      return role === 'customer' ? '/(customer)/wallet' : undefined;
    case 'topup_pending':
      return role === 'admin'
        ? { pathname: '/(admin)/payments', params: { tab: 'topups' } }
        : undefined;
    case 'withdrawal_review':
      return role === 'owner' ? '/owner/wallet' : undefined;
    case 'withdrawal_pending':
      return role === 'admin'
        ? { pathname: '/(admin)/payments', params: { tab: 'withdrawals' } }
        : undefined;
    default:
      return undefined;
  }
}
