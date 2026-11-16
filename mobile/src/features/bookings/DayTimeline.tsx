import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { spacing, useAppTheme } from '@/lib/theme';
import type { TakenSlot } from '@/types/domain';
import { colomboInstant, parseOpeningHours } from './slots';

type Port = { id: string; label: string; muted?: boolean };

type DayTimelineProps = {
  ports: Port[];
  selectedId: string | null;
  openingHours: string;
  dateValue: string;
  taken: TakenSlot[];
};

type Segment = { from: number; to: number }; // fractions of the day, 0..1

const DAY_MS = 24 * 60 * 60 * 1000;
const TICKS = [0, 6, 12, 18, 24];

// Parts of the day the station is shut, as fractions of the day.
function closedSegments(openingHours: string): Segment[] {
  const hours = parseOpeningHours(openingHours);
  if (!hours) return [];
  const open = hours.openMin / 1440;
  const close = hours.closeMin / 1440;
  if (close >= open + 1) return [];
  if (close <= 1) return [{ from: 0, to: open }, { from: close, to: 1 }];
  // Open past midnight, e.g. 18:00-02:00: shut between the early close and the evening open.
  return [{ from: close - 1, to: open }];
}

// One bar per port for one day: green is free, red is booked, grey is closed or already gone.
export function DayTimeline({ ports, selectedId, openingHours, dateValue, taken }: DayTimelineProps) {
  const theme = useAppTheme();
  const dayStart = colomboInstant(dateValue, 0).getTime();
  const toFraction = (ms: number) => Math.min(1, Math.max(0, (ms - dayStart) / DAY_MS));
  const past = toFraction(Date.now());
  const closed = closedSegments(openingHours);
  // A clear green that reads on both light and dark cards.
  const freeColor = `${theme.colors.primary}99`;
  const goneColor = theme.colors.outlineVariant;

  return (
    <View style={styles.wrap}>
      {ports.map((port) => {
        const selected = port.id === selectedId;
        const booked = taken
          .filter((slot) => slot.chargerId === port.id)
          .map((slot) => ({ from: toFraction(new Date(slot.startAt).getTime()), to: toFraction(new Date(slot.endAt).getTime()) }))
          .filter((segment) => segment.to > segment.from);
        return (
          <View key={port.id} style={[styles.row, { opacity: port.muted ? 0.5 : 1 }]}>
            <Text
              variant="labelLarge"
              numberOfLines={1}
              style={[styles.label, { color: selected ? theme.colors.primary : theme.colors.onSurface, fontWeight: selected ? '700' : '500' }]}
            >
              {port.label}
            </Text>
            <View
              accessibilityLabel={`${port.label}: ${booked.length === 0 ? 'no bookings' : `${booked.length} booking${booked.length > 1 ? 's' : ''}`}`}
              style={[
                styles.bar,
                {
                  backgroundColor: freeColor,
                  borderColor: selected ? theme.colors.primary : 'transparent',
                },
              ]}
            >
              {closed.map((segment, index) => (
                <Fill key={`c${index}`} segment={segment} color={goneColor} />
              ))}
              {past > 0 ? <Fill segment={{ from: 0, to: past }} color={goneColor} /> : null}
              {booked.map((segment, index) => (
                <Fill key={`b${index}`} segment={segment} color={theme.colors.error} />
              ))}
              {past > 0 && past < 1 ? (
                <View style={[styles.now, { left: `${past * 100}%`, backgroundColor: theme.colors.onSurface }]} />
              ) : null}
            </View>
          </View>
        );
      })}
      <View style={styles.axisRow}>
        <View style={styles.label} />
        <View style={styles.axis}>
          {TICKS.map((hour) => (
            <Text
              key={hour}
              variant="labelSmall"
              style={[
                styles.tick,
                { color: theme.colors.onSurfaceVariant, left: `${(hour / 24) * 100}%` },
                hour === 0 ? styles.tickFirst : hour === 24 ? styles.tickLast : null,
              ]}
            >
              {String(hour).padStart(2, '0')}:00
            </Text>
          ))}
        </View>
      </View>
      <View style={styles.legend}>
        <LegendItem color={freeColor} label="Free" />
        <LegendItem color={theme.colors.error} label="Booked" />
        <LegendItem color={goneColor} label="Closed or passed" />
      </View>
    </View>
  );
}

function Fill({ segment, color }: { segment: Segment; color: string }) {
  return (
    <View
      style={[
        styles.fill,
        { left: `${segment.from * 100}%`, width: `${(segment.to - segment.from) * 100}%`, backgroundColor: color },
      ]}
    />
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.swatch, { backgroundColor: color, borderColor: theme.colors.outlineVariant }]} />
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { width: 34 },
  bar: { flex: 1, height: 22, borderRadius: 6, overflow: 'hidden', borderWidth: 2 },
  fill: { position: 'absolute', top: 0, bottom: 0 },
  now: { position: 'absolute', top: 0, bottom: 0, width: 2 },
  axisRow: { flexDirection: 'row', gap: spacing.sm, marginTop: -2 },
  axis: { flex: 1, height: 14 },
  tick: { position: 'absolute', width: 40, marginLeft: -20, textAlign: 'center' },
  tickFirst: { marginLeft: 0, textAlign: 'left' },
  tickLast: { marginLeft: -40, textAlign: 'right' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  swatch: { width: 12, height: 12, borderRadius: 3, borderWidth: StyleSheet.hairlineWidth },
});
