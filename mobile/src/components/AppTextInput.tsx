import { StyleSheet, View } from 'react-native';
import { HelperText, TextInput } from 'react-native-paper';
import type { TextInputProps } from 'react-native-paper';

type AppTextInputProps = Omit<TextInputProps, 'error'> & {
  error?: string;
};

export function AppTextInput({ error, ...rest }: AppTextInputProps) {
  return (
    <View style={styles.container}>
      <TextInput mode="outlined" error={!!error} {...rest} />
      {error ? <HelperText type="error">{error}</HelperText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 4 },
});
