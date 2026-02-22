import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ModalScreen() {
  const { i18n } = useTranslation();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">{isRussian ? 'Это модальное окно' : 'This is a modal screen'}</ThemedText>
      <Link href="/" dismissTo style={styles.link}>
        <ThemedText type="link">{isRussian ? 'Перейти на главный экран' : 'Go to home screen'}</ThemedText>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
