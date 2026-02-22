import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function OnboardingScreen({ navigation }: any) {
  const { i18n } = useTranslation();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const tr = (en: string, ru: string) => (isRussian ? ru : en);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{tr('Getting Started', 'Начало')}</Text>
        <Text style={styles.subtitle}>{tr("Let's set up your profile", 'Давай настроим твой профиль')}</Text>
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => {/* Navigation action */}}
        >
          <Text style={styles.buttonText}>{tr('Continue', 'Продолжить')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#342846',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
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
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});

