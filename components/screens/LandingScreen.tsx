import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function LandingScreen({ navigation }: any) {
  const { i18n } = useTranslation();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const tr = (en: string, ru: string) => (isRussian ? ru : en);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{tr('Welcome to Calling', 'Добро пожаловать в Предназначение')}</Text>
        <Text style={styles.subtitle}>{tr('Your path starts here', 'Твой путь начинается здесь')}</Text>
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => {/* Navigation to onboarding */}}
        >
          <Text style={styles.buttonText}>{tr('Start', 'Начать')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#342846',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#342846',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 40,
    minWidth: 200,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});

