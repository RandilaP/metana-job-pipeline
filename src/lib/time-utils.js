// lib/time-utils.js
import { DateTime } from 'luxon';

// Calculate the next business day at an appropriate time based on the user's timezone
export function calculateNextDayTimezone(email) {
  // For a real application, you would:
  // 1. Lookup the timezone based on the user's location or IP address
  // 2. Determine the appropriate local time (e.g., 10 AM local time)
  
  // For this example, we'll assume:
  // - Default timezone is UTC
  // - Send emails at 10 AM local time
  // - Skip weekends (only send on business days)
  
  let nextDay = DateTime.now().plus({ days: 1 });
  
  // Skip weekends
  if (nextDay.weekday > 5) { // 6 = Saturday, 7 = Sunday
    nextDay = nextDay.plus({ days: 8 - nextDay.weekday }); // Move to Monday
  }
  
  // Set to 10 AM local time
  nextDay = nextDay.set({ hour: 10, minute: 0, second: 0, millisecond: 0 });
  
  return nextDay.toJSDate();
}