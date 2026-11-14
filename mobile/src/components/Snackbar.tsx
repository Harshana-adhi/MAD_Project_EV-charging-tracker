import { createContext, useContext, useState, type ReactNode } from 'react';
import { Snackbar as PaperSnackbar } from 'react-native-paper';

type SnackbarState = {
  show: (message: string) => void;
};

const SnackbarContext = createContext<SnackbarState | undefined>(undefined);

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);

  return (
    <SnackbarContext.Provider value={{ show: setMessage }}>
      {children}
      <PaperSnackbar visible={!!message} onDismiss={() => setMessage(null)} duration={3000}>
        {message}
      </PaperSnackbar>
    </SnackbarContext.Provider>
  );
}

export function useSnackbar(): SnackbarState {
  const context = useContext(SnackbarContext);
  if (!context) throw new Error('useSnackbar must be used within a SnackbarProvider');
  return context;
}
