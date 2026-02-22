import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, ScrollView, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { ObstaclePageProps } from './types';
import { styles } from './styles';

function ObstaclePage({ pathName, onContinue }: ObstaclePageProps) {
  const { t } = useTranslation();
  const [obstacle, setObstacle] = useState('');

  const handleContinue = () => {
    if (obstacle.trim()) {
      onContinue(obstacle.trim());
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={{ flex: 1 }}>
        <ScrollView
          style={styles.formContainer}
          contentContainerStyle={styles.obstaclePageContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.obstaclePageTitle}>
            {t('onboarding.whatMightHoldYouBack', { pathName })}
          </Text>
          <Text style={styles.obstaclePageSubtext}>
            {t('onboarding.whatMightHoldYouBackSubtext')}
          </Text>

          <View style={styles.obstacleFieldContainer}>
            <View style={styles.bodyTextFieldWrapper}>
              <TextInput
                style={[styles.textField, styles.obstacleTextField]}
                value={obstacle}
                onChangeText={setObstacle}
                placeholder=""
                placeholderTextColor="#999"
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.obstacleContinueButton, !obstacle.trim() && styles.obstacleContinueButtonDisabled]}
            onPress={handleContinue}
            disabled={!obstacle.trim()}
            activeOpacity={0.8}
          >
            <Text style={styles.obstacleContinueButtonText}>{t('onboarding.continue')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
}

export default ObstaclePage;
