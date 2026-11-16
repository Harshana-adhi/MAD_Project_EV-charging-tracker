import { useState } from 'react';
import { SideMenu, SideMenuButton, type SideMenuItem } from '@/components/SideMenu';
import { useAdminCounts } from '../hooks';

// What an admin can open from anywhere. Shared by the menu and the admin's profile, with the
// number of things waiting on each.
export function useAdminShortcuts(): SideMenuItem[] {
  const counts = useAdminCounts().data;
  return [
    {
      label: 'Station approvals',
      hint: 'Approve or reject new stations',
      icon: 'ev-station',
      href: { pathname: '/(admin)/stations', params: { status: 'pending' } },
      count: counts?.pendingStations,
    },
    {
      label: 'Top-ups',
      hint: 'Check bank slips and add credit',
      icon: 'cash-plus',
      href: { pathname: '/(admin)/payments', params: { tab: 'topups' } },
      count: counts?.pendingTopups,
    },
    {
      label: 'Payouts',
      hint: 'Pay owners who asked to withdraw',
      icon: 'bank-transfer-out',
      href: { pathname: '/(admin)/payments', params: { tab: 'withdrawals' } },
      count: counts?.pendingWithdrawals,
    },
    {
      label: 'Disputes',
      hint: 'Sessions an owner has disputed',
      icon: 'alert-circle-outline',
      href: '/(admin)/disputes',
      count: counts?.pendingDisputes,
    },
    { label: 'Users', hint: 'Find, block or reset users', icon: 'account-group-outline', href: '/(admin)/users' },
    { label: 'Reports', hint: 'Income and monthly reports', icon: 'chart-bar', href: '/(admin)/reports' },
    { label: 'Map', hint: 'Every station on the map', icon: 'map-marker-radius', href: '/(admin)/map' },
  ];
}

// The three-line button at the top left of the admin screens, and the menu it opens.
export function AdminMenuButton() {
  const [open, setOpen] = useState(false);
  const items = useAdminShortcuts();
  return (
    <>
      <SideMenuButton onPress={() => setOpen(true)} />
      <SideMenu visible={open} onClose={() => setOpen(false)} subtitle="Admin menu" items={items} />
    </>
  );
}
