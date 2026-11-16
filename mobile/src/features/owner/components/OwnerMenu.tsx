import { useState } from 'react';
import { SideMenu, SideMenuButton, type SideMenuItem } from '@/components/SideMenu';
import { useOwnerBookings } from '@/features/bookings/hooks';

// The three-line button at the top left of the owner screens, and the menu it opens.
export function OwnerMenuButton() {
  const [open, setOpen] = useState(false);
  const bookings = useOwnerBookings();
  const upcoming = (bookings.data ?? []).filter((booking) => new Date(booking.endAt).getTime() > Date.now()).length;

  const items: SideMenuItem[] = [
    { label: 'Bookings', hint: 'Who booked your chargers', icon: 'calendar-clock', href: '/owner/bookings', count: upcoming },
    { label: 'Add station', hint: 'Set up a new charging point', icon: 'plus-circle-outline', href: '/owner/station/new' },
    { label: 'My stations', hint: 'Edit stations and chargers', icon: 'ev-station', href: '/(owner)/stations' },
    { label: 'Sessions', hint: 'Charging sessions and disputes', icon: 'lightning-bolt', href: '/owner/sessions' },
    { label: 'Reviews', hint: 'What customers said', icon: 'star-outline', href: '/owner/reviews' },
    { label: 'Earnings', hint: 'Daily and per-station totals', icon: 'chart-bar', href: '/(owner)/earnings' },
    { label: 'Wallet', hint: 'Balance and withdrawals', icon: 'wallet-outline', href: '/owner/wallet' },
  ];

  return (
    <>
      <SideMenuButton onPress={() => setOpen(true)} />
      <SideMenu visible={open} onClose={() => setOpen(false)} subtitle="Owner menu" items={items} />
    </>
  );
}
