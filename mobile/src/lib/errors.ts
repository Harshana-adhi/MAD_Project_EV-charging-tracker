const MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: 'Some details are invalid. Please check the form and try again.',
  INVALID_AMOUNT: 'Please enter a valid amount.',
  INVALID_KWH: 'Please enter a valid kWh value.',
  INVALID_RATING: 'Please choose a rating between 1 and 5.',
  UNAUTHENTICATED: 'Please log in to continue.',
  INVALID_CREDENTIALS: 'Incorrect email or password.',
  TOKEN_EXPIRED: 'Your session expired. Please log in again.',
  ACCOUNT_DELETED: 'This account has been deleted.',
  STATION_HAS_ACTIVE_SESSION: 'A customer is currently charging at one of your stations. Try again once that session ends.',
  INSUFFICIENT_BALANCE: 'You don’t have enough available credits.',
  CARD_DECLINED: 'The card was declined.',
  NOT_ALLOWED: 'You’re not allowed to do that.',
  USER_BLOCKED: 'Your account has been blocked.',
  NOT_FOUND: 'We couldn’t find that.',
  CHARGER_NOT_FOUND: 'That charger could not be found.',
  SESSION_NOT_FOUND: 'That session could not be found.',
  EMAIL_TAKEN: 'That email is already registered.',
  CHARGER_BUSY: 'This charger is currently busy.',
  CHARGER_OFFLINE: 'This charger is offline.',
  ACTIVE_SESSION_EXISTS: 'You already have an active charging session.',
  SESSION_NOT_ACTIVE: 'This session is no longer active.',
  ALREADY_REVIEWED: 'You already reviewed this session.',
  ALREADY_PROCESSED: 'This request has already been processed.',
  DISPUTE_WINDOW_CLOSED: 'The 24-hour dispute window has closed.',
  STATION_NOT_APPROVED: 'This station is not yet approved.',
  SLOT_TAKEN: 'That slot was just booked by someone else. Please pick another.',
  BOOKING_EXISTS: 'You already have an upcoming booking. Cancel it to book another slot.',
  CHARGER_RESERVED: 'This charger is reserved for a booking right now.',
  BOOKING_NOT_FOUND: 'That booking could not be found.',
  BOOKING_NOT_CANCELLABLE: 'This booking can no longer be cancelled.',
  SERVER_ERROR: 'Something went wrong on our side. Please try again.',
  NETWORK_ERROR: "Can't reach the server. If this is the first request, wait a minute and try again.",
};

export function errorMessage(err: unknown): string {
  const code = err instanceof Error ? err.message : String(err);
  return MESSAGES[code] ?? 'Something went wrong. Please try again.';
}
