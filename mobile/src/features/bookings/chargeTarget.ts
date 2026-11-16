import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// The customer says how much to charge in ONE of three ways. Whichever they pick, it becomes the
// same spending limit the start screen uses, plus the booking's slot length.
export type TargetType = 'amount' | 'time' | 'units';

export type ChargeTarget = { type: TargetType; value: number };

// Same range as spendingLimit in backend/src/modules/sessions/sessions.schema.ts.
export const MIN_LIMIT = 100;
export const MAX_LIMIT = 20000;
// Same range as durationMinutes in backend/src/modules/bookings/bookings.schema.ts.
export const MAX_SLOT_MINUTES = 240;

export const TARGET_OPTIONS: Record<TargetType, { label: string; icon: string; unit: string; question: string; example: string }> = {
  amount: { label: 'Amount', icon: 'cash', unit: 'LKR', question: 'How much do you want to spend?', example: 'e.g. 1000' },
  time: { label: 'Time', icon: 'timer-outline', unit: 'minutes', question: 'How long do you want to charge?', example: 'e.g. 60' },
  units: { label: 'Units', icon: 'lightning-bolt', unit: 'kWh', question: 'How many units do you need?', example: 'e.g. 10' },
};

export type ChargePlan = {
  limit: number;
  kwh: number;
  chargeMinutes: number;
  slotMinutes: number;
  problem: string | null;
};

export function formatMinutes(minutes: number): string {
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function formatTargetValue(target: ChargeTarget): string {
  if (target.type === 'amount') return `LKR ${target.value.toLocaleString('en-LK')}`;
  if (target.type === 'time') return formatMinutes(target.value);
  return `${target.value} kWh`;
}

export function planCharge(target: ChargeTarget, powerKw: number, ratePerKwh: number): ChargePlan {
  let kwh: number;
  if (target.type === 'amount') kwh = target.value / ratePerKwh;
  else if (target.type === 'time') kwh = powerKw * (target.value / 60);
  else kwh = target.value;

  const limit = Math.round(kwh * ratePerKwh * 100) / 100;
  const chargeMinutes = target.type === 'time' ? target.value : (kwh / powerKw) * 60;
  const slotMinutes = Math.max(30, Math.ceil(chargeMinutes / 30) * 30);

  let problem: string | null = null;
  if (!Number.isFinite(limit) || limit < MIN_LIMIT) {
    problem = `That's under the LKR ${MIN_LIMIT} minimum. Choose a bit more.`;
  } else if (limit > MAX_LIMIT) {
    problem = `That costs about LKR ${Math.round(limit).toLocaleString('en-LK')}. The most for one charge is LKR ${MAX_LIMIT.toLocaleString('en-LK')}.`;
  } else if (slotMinutes > MAX_SLOT_MINUTES) {
    problem = `That takes about ${formatMinutes(chargeMinutes)} on this charger. The longest booking is 4 h, so choose less or a faster charger.`;
  }
  return { limit, kwh, chargeMinutes, slotMinutes: Math.min(slotMinutes, MAX_SLOT_MINUTES), problem };
}

// The target is kept on the phone, keyed by booking, so the start screen can fill in the same limit.
const keyFor = (bookingId: string) => `evct_booking_target_${bookingId}`;

export async function saveBookingTarget(bookingId: string, target: ChargeTarget): Promise<void> {
  const value = JSON.stringify(target);
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.setItem(keyFor(bookingId), value);
    return;
  }
  await SecureStore.setItemAsync(keyFor(bookingId), value);
}

export async function loadBookingTarget(bookingId: string): Promise<ChargeTarget | null> {
  try {
    const raw =
      Platform.OS === 'web'
        ? typeof localStorage === 'undefined'
          ? null
          : localStorage.getItem(keyFor(bookingId))
        : await SecureStore.getItemAsync(keyFor(bookingId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChargeTarget;
    return parsed.type in TARGET_OPTIONS && Number.isFinite(parsed.value) ? parsed : null;
  } catch {
    return null;
  }
}
