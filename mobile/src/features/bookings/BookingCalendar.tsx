import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { spacing, useAppTheme } from '@/lib/theme';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

type BookingCalendarProps = {
  // Dates are 'YYYY-MM-DD' strings in Colombo time.
  value: string;
  today: string;
  lastDay: string;
  onChange: (value: string) => void;
};

const pad = (n: number) => String(n).padStart(2, '0');
const toValue = (year: number, month: number, day: number) => `${year}-${pad(month + 1)}-${pad(day)}`;

// A month calendar. Days before today, or after the last day bookings allow, can't be picked.
export function BookingCalendar({ value, today, lastDay, onChange }: BookingCalendarProps) {
  const theme = useAppTheme();
  const [shown, setShown] = useState(() => ({ year: Number(value.slice(0, 4)), month: Number(value.slice(5, 7)) - 1 }));

  const firstWeekday = new Date(Date.UTC(shown.year, shown.month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(shown.year, shown.month + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthStart = toValue(shown.year, shown.month, 1);
  const monthEnd = toValue(shown.year, shown.month, daysInMonth);
  const canGoBack = monthStart > today;
  const canGoForward = monthEnd < lastDay;

  function moveMonth(step: number) {
    setShown(({ year, month }) => {
      const next = month + step;
      return { year: year + Math.floor(next / 12), month: ((next % 12) + 12) % 12 };
    });
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" disabled={!canGoBack} onPress={() => moveMonth(-1)} accessibilityLabel="Previous month" />
        <Text variant="titleMedium">
          {MONTHS[shown.month]} {shown.year}
        </Text>
        <IconButton icon="chevron-right" disabled={!canGoForward} onPress={() => moveMonth(1)} accessibilityLabel="Next month" />
      </View>
      <View style={styles.week}>
        {WEEKDAYS.map((name) => (
          <Text key={name} variant="labelSmall" style={[styles.cell, styles.weekday, { color: theme.colors.onSurfaceVariant }]}>
            {name}
          </Text>
        ))}
      </View>
      {Array.from({ length: cells.length / 7 }, (_, row) => (
        <View key={row} style={styles.week}>
          {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
            if (day === null) return <View key={col} style={styles.cell} />;
            const date = toValue(shown.year, shown.month, day);
            const open = date >= today && date <= lastDay;
            const selected = date === value;
            const isToday = date === today;
            return (
              <View key={col} style={styles.cell}>
                <Pressable
                  disabled={!open}
                  onPress={() => onChange(date)}
                  accessibilityRole="button"
                  accessibilityLabel={`${day} ${MONTHS[shown.month]}${open ? '' : ', not available'}`}
                  accessibilityState={{ selected, disabled: !open }}
                  style={[
                    styles.day,
                    selected ? { backgroundColor: theme.colors.primary } : null,
                    isToday && !selected ? { borderWidth: 1, borderColor: theme.colors.primary } : null,
                  ]}
                >
                  <Text
                    variant="bodyLarge"
                    style={{
                      color: selected ? theme.colors.onPrimary : open ? theme.colors.onSurface : theme.colors.outlineVariant,
                      textDecorationLine: open ? 'none' : 'line-through',
                      fontWeight: selected || isToday ? '700' : '400',
                    }}
                  >
                    {day}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  week: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 2 },
  weekday: { textAlign: 'center', paddingBottom: spacing.xs },
  day: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
