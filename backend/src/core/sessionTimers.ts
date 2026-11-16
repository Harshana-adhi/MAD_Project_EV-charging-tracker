// A tiny, dependency-free place to hold the in-process timers that end a session the
// instant its spending limit is reached, rather than waiting for the next periodic sweep.
// Kept separate from session.jobs.ts/sessions.service.ts so neither has to import the
// other just to use this.
const timers = new Map<string, NodeJS.Timeout>();

export function scheduleSessionAutoEnd(sessionId: string, delayMs: number, fire: () => void): void {
  cancelSessionAutoEnd(sessionId);
  const timer = setTimeout(() => {
    timers.delete(sessionId);
    fire();
  }, Math.max(0, delayMs));
  timers.set(sessionId, timer);
}

export function cancelSessionAutoEnd(sessionId: string): void {
  const timer = timers.get(sessionId);
  if (timer) {
    clearTimeout(timer);
    timers.delete(sessionId);
  }
}
