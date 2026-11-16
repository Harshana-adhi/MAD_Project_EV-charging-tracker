import { View } from 'react-native';
import { Chip } from 'react-native-paper';
import type { ConnectorType } from '@/types/domain';

const ICON: Record<ConnectorType, string> = {
  TYPE1: 'ev-plug-type1',
  TYPE2: 'ev-plug-type2',
  CCS2: 'ev-plug-ccs2',
  CHADEMO: 'ev-plug-chademo',
  GBT: 'power-plug',
};

type ConnectorChipProps = {
  connector: ConnectorType;
  selected?: boolean;
  onPress?: () => void;
};

export function ConnectorChip({ connector, selected, onPress }: ConnectorChipProps) {
  const chip = (
    <Chip
      icon={ICON[connector]}
      selected={selected}
      onPress={onPress}
      compact={!onPress}
      mode={selected ? 'flat' : 'outlined'}
    >
      {connector}
    </Chip>
  );
  if (onPress) return chip;
  // A display-only chip lets taps through, so a card it sits on still gets pressed.
  return <View pointerEvents="none">{chip}</View>;
}
