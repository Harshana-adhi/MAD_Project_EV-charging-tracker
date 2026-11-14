import { Chip } from 'react-native-paper';
import type { ConnectorType } from '@/types/domain';

export function ConnectorChip({ connector }: { connector: ConnectorType }) {
  return <Chip compact>{connector}</Chip>;
}
