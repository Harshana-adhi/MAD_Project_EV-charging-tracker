import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { AppButton, ErrorView, LoadingView, Screen, useSnackbar } from '@/components';
import { OwnerStatementView } from '@/features/reports/components/OwnerStatementView';
import { useMyStatement } from '@/features/reports/hooks';
import { buildStatementHtml, sessionsForMonth } from '@/features/reports/statementPdf';
import { periodLabel } from '@/features/reports/labels';
import { useOwnerSessions } from '@/features/owner';
import { usePullToRefresh } from '@/features/admin/usePullToRefresh';
import { errorMessage } from '@/lib/errors';
import { spacing } from '@/lib/theme';

// Prints the statement from a hidden frame in this page, so the browser's print dialog
// ("Save as PDF") opens without a new window that a pop-up blocker could stop.
function printHtmlOnWeb(html: string) {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
  frame.onload = () => {
    const win = frame.contentWindow;
    if (!win) return;
    // Remove the frame once the dialog is closed (or after a minute, as a fallback).
    const cleanUp = () => setTimeout(() => frame.remove(), 500);
    win.addEventListener('afterprint', cleanUp);
    setTimeout(cleanUp, 60_000);
    win.focus();
    win.print();
  };
  frame.srcdoc = html;
  document.body.appendChild(frame);
}

export default function MyReportsScreen() {
  const snackbar = useSnackbar();
  const [month, setMonth] = useState<string | undefined>();
  const { data: statement, isLoading, isError, error, refetch } = useMyStatement(month);
  const sessions = useOwnerSessions();
  const { refreshing, onRefresh } = usePullToRefresh(() => Promise.all([refetch(), sessions.refetch()]));
  const [making, setMaking] = useState(false);

  async function downloadPdf() {
    if (!statement) return;
    setMaking(true);
    try {
      const html = buildStatementHtml(statement, sessionsForMonth(sessions.data ?? [], statement.month));
      if (Platform.OS === 'web') {
        printHtmlOnWeb(html);
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            UTI: 'com.adobe.pdf',
            dialogTitle: `GreenCharge statement ${periodLabel(statement.month)}`,
          });
        } else {
          snackbar.show('PDF created, but sharing is not available on this device.');
        }
      }
    } catch (err) {
      snackbar.show(errorMessage(err));
    } finally {
      setMaking(false);
    }
  }

  return (
    <Screen
      title="Monthly reports"
      back
      scroll
      refreshing={refreshing}
      onRefresh={onRefresh}
      footer={
        statement ? (
          <AppButton
            label={`Download ${periodLabel(statement.month)} as PDF`}
            icon="file-pdf-box"
            onPress={() => void downloadPdf()}
            loading={making}
            disabled={making || sessions.isLoading}
          />
        ) : undefined
      }
    >
      {isLoading ? (
        <LoadingView />
      ) : isError || !statement ? (
        <ErrorView error={error} onRetry={refetch} />
      ) : (
        <View style={styles.content}>
          <OwnerStatementView statement={statement} onSelectMonth={setMonth} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.md },
});
