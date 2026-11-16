import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Button, Dialog, Portal, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { spacing, useAppTheme } from '@/lib/theme';

const ITEM = 44;
const VISIBLE = 5; // rows shown; the middle one is the chosen value
const HOURS = ['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
const MINUTES = ['00', '30']; // bookings start on the hour or half hour
const PERIODS = ['AM', 'PM'];

type TimeWheelPickerProps = {
  visible: boolean;
  // Minutes of the day the wheels start on.
  initialMinutes: number;
  onCancel: () => void;
  onSave: (minutes: number) => void;
  // Short line under the wheels saying whether the time can be booked.
  describe: (minutes: number) => { ok: boolean; text: string };
};

const toMinutes = (hourIndex: number, minuteIndex: number, periodIndex: number) =>
  (hourIndex + periodIndex * 12) * 60 + minuteIndex * 30;

// A "Select time" pop-up with hour, minute and AM/PM wheels, like a phone's clock picker.
export function TimeWheelPicker({ visible, initialMinutes, onCancel, onSave, describe }: TimeWheelPickerProps) {
  const theme = useAppTheme();
  const [hour, setHour] = useState(0);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const rounded = Math.round(initialMinutes / 30) * 30 % (24 * 60);
    setHour(Math.floor(rounded / 60) % 12);
    setMinute((rounded % 60) / 30);
    setPeriod(rounded >= 12 * 60 ? 1 : 0);
  }, [visible, initialMinutes]);

  const minutes = toMinutes(hour, minute, period);
  const status = describe(minutes);

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onCancel} style={styles.dialog}>
        <Dialog.Title style={styles.title}>Select time</Dialog.Title>
        <Dialog.Content>
          {visible ? (
            <View style={styles.wheels}>
              <View
                pointerEvents="none"
                style={[styles.band, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}
              />
              <Wheel items={HOURS} index={hour} onChange={setHour} label="Hour" />
              <Text variant="headlineSmall" style={styles.colon}>
                :
              </Text>
              <Wheel items={MINUTES} index={minute} onChange={setMinute} label="Minute" />
              <Wheel items={PERIODS} index={period} onChange={setPeriod} label="AM or PM" />
            </View>
          ) : null}
          <View style={styles.status}>
            <MaterialCommunityIcons
              name={status.ok ? 'check-circle' : 'alert-circle'}
              size={18}
              color={status.ok ? theme.colors.primary : theme.colors.error}
            />
            <Text variant="bodySmall" style={[styles.statusText, { color: status.ok ? theme.colors.primary : theme.colors.error }]}>
              {status.text}
            </Text>
          </View>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onCancel}>Cancel</Button>
          <Button mode="contained" onPress={() => onSave(minutes)}>
            Save
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

function Wheel({ items, index, onChange, label }: { items: string[]; index: number; onChange: (index: number) => void; label: string }) {
  const theme = useAppTheme();
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [live, setLive] = useState(index);

  // Start on the chosen value, and follow it when it's set from outside.
  useEffect(() => {
    setLive(index);
    const id = setTimeout(() => ref.current?.scrollTo({ y: index * ITEM, animated: false }), 0);
    return () => clearTimeout(id);
  }, [index]);

  function settle(y: number) {
    const next = Math.max(0, Math.min(items.length - 1, Math.round(y / ITEM)));
    ref.current?.scrollTo({ y: next * ITEM, animated: true });
    if (next !== index) onChange(next);
  }

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const y = event.nativeEvent.contentOffset.y;
    setLive(Math.max(0, Math.min(items.length - 1, Math.round(y / ITEM))));
    // Web has no momentum-end event, so settle on the nearest row once scrolling pauses.
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => settle(y), 140);
  }

  return (
    <ScrollView
      ref={ref}
      accessibilityLabel={`${label}, ${items[index]}`}
      style={styles.wheel}
      contentContainerStyle={{ paddingVertical: ITEM * Math.floor(VISIBLE / 2) }}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM}
      decelerationRate="fast"
      scrollEventThrottle={16}
      onScroll={onScroll}
    >
      {items.map((item, i) => {
        const distance = Math.abs(i - live);
        return (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityLabel={`${label} ${item}`}
            onPress={() => {
              ref.current?.scrollTo({ y: i * ITEM, animated: true });
              onChange(i);
            }}
            style={styles.item}
          >
            <Text
              variant={distance === 0 ? 'titleLarge' : 'titleMedium'}
              style={{
                color: distance === 0 ? theme.colors.onSurface : theme.colors.onSurfaceVariant,
                opacity: distance === 0 ? 1 : distance === 1 ? 0.6 : 0.3,
                fontWeight: distance === 0 ? '600' : '400',
              }}
            >
              {item}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  dialog: { maxWidth: 360, width: '88%', alignSelf: 'center' },
  title: { textAlign: 'center' },
  wheels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: ITEM * VISIBLE },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ITEM * Math.floor(VISIBLE / 2),
    height: ITEM,
    borderRadius: 12,
    borderWidth: 1,
  },
  wheel: { height: ITEM * VISIBLE, width: 64, flexGrow: 0 },
  item: { height: ITEM, alignItems: 'center', justifyContent: 'center' },
  colon: { marginHorizontal: -4 },
  status: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.md },
  statusText: { flexShrink: 1, textAlign: 'center' },
});
