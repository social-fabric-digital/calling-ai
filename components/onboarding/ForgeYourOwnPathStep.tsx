import React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import CustomPathForm from './CustomPathForm';

interface ForgeYourOwnPathStepProps {
  onComplete: (pathData: {
    goalTitle: string;
    description: string;
    milestones: string[];
    targetTimeline: string;
    challenge?: string;
  }) => void;
  onBack?: () => void;
  currentStep?: number;
  totalSteps?: number;
}

export default function ForgeYourOwnPathStep({
  onComplete,
  onBack,
  currentStep,
  totalSteps,
}: ForgeYourOwnPathStepProps) {
  const { t } = useTranslation();
  
  return (
    <View style={{ flex: 1 }}>
      <CustomPathForm
        onComplete={onComplete}
        onBack={onBack}
        currentStep={currentStep}
        totalSteps={totalSteps}
        hideHeader={true}
        heroTitle={t('onboarding.createYourPath')}
        heroSubtitle={t('onboarding.buildYourRoute')}
        fixedMilestoneCount={4}
      />
    </View>
  );
}
