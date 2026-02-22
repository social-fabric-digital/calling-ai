import { Redirect } from 'expo-router';
import '@/utils/i18n'; // Initialize i18n

export default function Index() {
  // Go directly to landing screen
  return <Redirect href="/landing" />;
}

