import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

// iOS does not resize the screen for the keyboard, so dialogs with a text field are lifted by hand.
// Android already resizes the window, so no offset is needed there.
export function useKeyboardOffset(): number {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const show = Keyboard.addListener('keyboardWillShow', (event) =>
      setOffset(event.endCoordinates.height),
    );
    const hide = Keyboard.addListener('keyboardWillHide', () => setOffset(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return offset;
}
