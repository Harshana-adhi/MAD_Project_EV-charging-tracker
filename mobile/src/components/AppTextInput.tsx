import { StyleSheet, View } from 'react-native';
import { HelperText, TextInput } from 'react-native-paper';
import type { TextInputProps } from 'react-native-paper';

type AppTextInputProps = TextInputProps & {
  errorText?: string;
};

export function AppTextInput({ errorText, ...rest }: AppTextInputProps) {
  return (
    <View style={styles.container}>
      <TextInput mode="outlined" error={!!errorText} {...rest} />
      {errorText ? <HelperText type="error">{errorText}</HelperText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 4 },
});
