import { PaperTextureBackground } from '@/components/PaperTextureBackground';
import { BodyStyle, HeadingStyle } from '@/constants/theme';
import { generateIkigaiConclusion, IkigaiConclusion } from '@/utils/claudeApi';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Dimensions, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';


const { width } = Dimensions.get('window');

interface IkigaiSection {
  id: string;
  title: string;
  description: string;
  emoji: string;
  placeholder: string;
  storageKey: string;
}

const ikigaiSections: IkigaiSection[] = [
  {
    id: 'love',
    title: '', // Will be filled from translations
    description: '',
    emoji: '🤎',
    placeholder: '',
    storageKey: 'ikigaiWhatYouLove',
  },
  {
    id: 'good',
    title: '',
    description: '',
    emoji: '🏆',
    placeholder: '',
    storageKey: 'ikigaiWhatYouGoodAt',
  },
  {
    id: 'world',
    title: '',
    description: '',
    emoji: '🌳',
    placeholder: '',
    storageKey: 'ikigaiWhatWorldNeeds',
  },
  {
    id: 'paid',
    title: '',
    description: '',
    emoji: '💰',
    placeholder: '',
    storageKey: 'ikigaiWhatCanBePaidFor',
  },
];

export default function IkigaiCompassScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  
  // Get translated sections
  const getTranslatedSections = (): IkigaiSection[] => {
    return ikigaiSections.map(section => ({
      ...section,
      title: t(`ikigaiCompass.sections.${section.id}.title`),
      description: t(`ikigaiCompass.sections.${section.id}.description`),
      placeholder: t(`ikigaiCompass.sections.${section.id}.placeholder`),
    }));
  };
  
  const translatedSections = getTranslatedSections();
  const [responses, setResponses] = useState<Record<string, string>>({
    love: '',
    good: '',
    world: '',
    paid: '',
  });
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [ikigaiConclusion, setIkigaiConclusion] = useState<IkigaiConclusion | null>(null);
  const [isGeneratingConclusion, setIsGeneratingConclusion] = useState(false);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [assistanceModalVisible, setAssistanceModalVisible] = useState(false);
  const [assistanceSectionId, setAssistanceSectionId] = useState<string | null>(null);
  // Track current page for progress indicator
  const getCurrentPage = () => {
    if (editingSection) {
      const editingIndex = translatedSections.findIndex(s => s.id === editingSection);
      return editingIndex !== -1 ? editingIndex : 0;
    }
    // Find first incomplete section
    for (let i = 0; i < translatedSections.length; i++) {
      if (!responses[translatedSections[i].id]?.trim().length) {
        return i;
      }
    }
    // All complete, return last page
    return translatedSections.length - 1;
  };
  const currentPage = getCurrentPage();

  // Load saved answers from AsyncStorage
  useEffect(() => {
    const loadSavedAnswers = async () => {
      try {
        const savedAnswers: Record<string, string> = {};
        for (const section of ikigaiSections) {
          const saved = await AsyncStorage.getItem(section.storageKey);
          if (saved) {
            savedAnswers[section.id] = saved;
          }
        }
        setResponses(savedAnswers);
        setHasLoadedData(true);
        
        // If all sections are filled, load or generate conclusion
        const allFilled = Object.values(savedAnswers).every(answer => answer.trim().length > 0);
        if (allFilled) {
          const savedCallingType = await AsyncStorage.getItem('ikigaiCallingType');
          const savedPathReport = await AsyncStorage.getItem('ikigaiPathReport');
          if (savedCallingType && savedPathReport) {
            setIkigaiConclusion({
              callingType: savedCallingType,
              pathReport: savedPathReport,
            });
          } else {
            // Generate conclusion if not saved yet
            await generateConclusion(savedAnswers);
          }
        }
      } catch (error) {
        console.error('Error loading Ikigai data:', error);
        setHasLoadedData(true);
      }
    };
    loadSavedAnswers();
  }, []);

  // Generate conclusion when all sections are filled
  const generateConclusion = async (answers?: Record<string, string>) => {
    const answersToUse = answers || responses;
    const allFilled = Object.values(answersToUse).every(answer => answer.trim().length > 0);
    
    if (!allFilled) {
      setIkigaiConclusion(null);
      return;
    }

    setIsGeneratingConclusion(true);
    try {
      const conclusion = await generateIkigaiConclusion(
        answersToUse.love,
        answersToUse.good,
        answersToUse.world,
        answersToUse.paid
      );
      setIkigaiConclusion(conclusion);
      // Save conclusion to AsyncStorage
      await AsyncStorage.setItem('ikigaiCallingType', conclusion.callingType);
      await AsyncStorage.setItem('ikigaiPathReport', conclusion.pathReport);
    } catch (error) {
      console.error('Error generating Ikigai conclusion:', error);
      setIkigaiConclusion({
        callingType: 'Your Calling',
        pathReport: 'Unable to generate conclusion. Please try again.',
      });
    } finally {
      setIsGeneratingConclusion(false);
    }
  };

  const handleResponseChange = (sectionId: string, text: string) => {
    setResponses(prev => ({
      ...prev,
      [sectionId]: text,
    }));
  };

  const handleSave = async (sectionId: string) => {
    const section = ikigaiSections.find(s => s.id === sectionId);
    if (!section) return;

    try {
      // Save to AsyncStorage
      await AsyncStorage.setItem(section.storageKey, responses[sectionId].trim());
      setEditingSection(null);
      
      // Regenerate conclusion if all sections are filled
      const allFilled = Object.values(responses).every(response => response.trim().length > 0);
      if (allFilled) {
        await generateConclusion();
      } else {
        // Clear conclusion if not all sections are filled
        setIkigaiConclusion(null);
        await AsyncStorage.removeItem('ikigaiDestinyType');
        await AsyncStorage.removeItem('ikigaiPathReport');
      }
    } catch (error) {
      console.error('Error saving Ikigai answer:', error);
      alert('Error saving your answer. Please try again.');
    }
  };

  const handleEdit = (sectionId: string) => {
    setEditingSection(sectionId);
  };

  const handleCancelEdit = () => {
    setEditingSection(null);
    // Reload from storage to discard changes
    const reloadAnswers = async () => {
      try {
        const savedAnswers: Record<string, string> = {};
        for (const section of ikigaiSections) {
          const saved = await AsyncStorage.getItem(section.storageKey);
          if (saved) {
            savedAnswers[section.id] = saved;
          }
        }
        setResponses(savedAnswers);
      } catch (error) {
        console.error('Error reloading answers:', error);
      }
    };
    reloadAnswers();
  };

  const allSectionsFilled = Object.values(responses).every(response => response.trim().length > 0);

  if (!hasLoadedData) {
    return (
      <PaperTextureBackground>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#342846" />
        </View>
      </PaperTextureBackground>
    );
  }

  return (
    <PaperTextureBackground>
      <ScrollView
        style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Back Arrow */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>

      {/* Title */}
      <Text style={styles.title}>{t('ikigaiCompass.title')}</Text>
      
      {/* Progress Circles with Counter - 30px below heading */}
      <View style={styles.progressWrapper}>
        <View style={styles.progressContainer}>
          {translatedSections.map((section, index) => (
            <View
              key={section.id}
              style={[
                styles.progressCircle,
                currentPage === index && styles.progressCircleActive,
              ]}
            />
          ))}
        </View>
        <Text style={styles.progressText}>
          {currentPage + 1} {t('ikigaiCompass.outOf')} {translatedSections.length}
        </Text>
      </View>
      
      {/* Subtitle */}
      <Text style={styles.subtitle}>
        {t('ikigaiCompass.subtitle')}
      </Text>

      {/* Four Sections */}
      {translatedSections.map((section, index) => {
        const isEditing = editingSection === section.id;
        const hasAnswer = responses[section.id]?.trim().length > 0;
        
        return (
          <View key={section.id} style={styles.sectionContainer}>
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <View style={styles.sectionTitleRow}>
                    <Text style={styles.sectionEmoji}>{section.emoji}</Text>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                  </View>
                  <Text style={styles.sectionDescription}>{section.description}</Text>
                </View>
              </View>
              
              <View style={styles.inputContainer}>
                {hasAnswer && !isEditing && (
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEdit(section.id)}
                  >
                    <MaterialIcons name="edit" size={16} color="#342846" />
                  </TouchableOpacity>
                )}
                <TextInput
                  style={styles.textInput}
                  value={responses[section.id]}
                  onChangeText={(text) => handleResponseChange(section.id, text)}
                  placeholder={section.placeholder}
                  placeholderTextColor="#666"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={isEditing || !hasAnswer}
                />
              </View>
              
              {isEditing && (
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleCancelEdit}
                  >
                    <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={() => handleSave(section.id)}
                  >
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              {/* Continue button - only show on last question (paid) when it has an answer */}
              {section.id === 'paid' && hasAnswer && !isEditing && (
                <TouchableOpacity
                  style={styles.continueButton}
                  onPress={async () => {
                    // Generate conclusion when Continue is clicked
                    await generateConclusion();
                  }}
                >
                  <Text style={styles.continueButtonText}>{t('common.continue')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}

      {/* Reason for Being */}
      <View style={styles.centerContainer}>
        <Image
          source={require('../assets/images/star.png')}
          style={styles.starIcon}
          resizeMode="contain"
        />
        <View style={styles.reasonHeadingContainer}>
          <View style={styles.reasonDivider} />
          <Text style={styles.reasonHeading}>Reason for Being</Text>
          <View style={styles.reasonDivider} />
        </View>
        {isGeneratingConclusion ? (
          <View style={styles.loadingConclusion}>
            <ActivityIndicator size="small" color="#342846" />
            <Text style={styles.reasonSubtitle}>Generating your reason...</Text>
          </View>
        ) : ikigaiConclusion ? (
          <Text style={styles.reasonName}>{ikigaiConclusion.callingType}</Text>
        ) : allSectionsFilled ? (
          <Text style={styles.reasonSubtitle}>
            Generating your personalized reason...
          </Text>
        ) : (
          <Text style={styles.reasonSubtitle}>
            Complete all sections to discover your Reason for Being
          </Text>
        )}
      </View>

      {/* Your Path Forward */}
      {allSectionsFilled && ikigaiConclusion && !isGeneratingConclusion && (
        <View style={styles.pathForwardContainer}>
          <Text style={styles.pathForwardTitle}>Your Path Forward</Text>
          <ScrollView 
            style={styles.pathReportScroll}
            contentContainerStyle={styles.pathReportContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.pathReportText}>{ikigaiConclusion.pathReport}</Text>
          </ScrollView>
          {/* Inspirational Quote Field */}
          <View style={styles.quoteField}>
            <Text style={styles.quoteText}>
              "The journey of a thousand miles begins with a single step."
            </Text>
          </View>
        </View>
      )}

      {/* Assistance Modal */}
      <Modal
        visible={assistanceModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAssistanceModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setAssistanceModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {assistanceSectionId && ikigaiSections.find(s => s.id === assistanceSectionId)?.title}
              </Text>
              <TouchableOpacity
                onPress={() => setAssistanceModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDescription}>
              {assistanceSectionId && ikigaiSections.find(s => s.id === assistanceSectionId)?.description}
            </Text>
            <Text style={styles.modalHelperText}>
              {assistanceSectionId === 'love' && 'Think about activities that make you feel energized and happy. What do you do when you have free time? What hobbies or interests bring you the most joy?'}
              {assistanceSectionId === 'good' && 'Consider your natural talents and skills. What do people often ask you for help with? What tasks do you find easy that others might struggle with?'}
              {assistanceSectionId === 'world' && 'Reflect on problems you care about solving. What issues in the world make you feel passionate? What change would you like to see?'}
              {assistanceSectionId === 'paid' && 'Think about what value you can provide to others. What skills or knowledge could people pay you for? What services or products could you offer?'}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
    </PaperTextureBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    paddingHorizontal: 25,
    paddingTop: 60,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  backButton: {
    marginBottom: 20,
    alignSelf: 'flex-start',
    width: '100%',
  },
  backButtonText: {
    fontSize: 28,
    color: '#342846',
    fontWeight: 'bold',
  },
  title: {
    ...HeadingStyle,
    color: '#342846',
    textAlign: 'center',
    marginBottom: 30,
    fontSize: 24,
  },
  progressWrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
    paddingHorizontal: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D0D0D0',
    marginHorizontal: 4,
  },
  progressCircleActive: {
    backgroundColor: '#342846',
    width: 24,
  },
  progressText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  subtitle: {
    ...BodyStyle,
    color: '#342846',
    textAlign: 'center',
    marginBottom: 32,
    fontSize: 16,
    lineHeight: 22,
  },
  sectionContainer: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#342846',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sectionHeaderLeft: {
    flex: 1,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  sectionTitle: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 18,
  },
  sectionDescription: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 14,
    opacity: 0.8,
  },
  editButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#342846',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#342846',
    minHeight: 100,
    position: 'relative',
  },
  textInput: {
    ...BodyStyle,
    padding: 16,
    color: '#342846',
    fontSize: 14, // Reduced by 2px from 16 (affects placeholder helper text)
    minHeight: 100,
    textAlignVertical: 'center', // Center text vertically in the input field
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
  cancelButton: {
    paddingHorizontal: 20, // Minimum 20px padding (was 16)
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#342846',
  },
  cancelButtonText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 14,
  },
  saveButton: {
    paddingHorizontal: 20, // Minimum 20px padding (was 16)
    paddingVertical: 8,
    backgroundColor: '#342846',
    borderRadius: 6,
  },
  saveButtonText: {
    ...BodyStyle,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  centerContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 32,
  },
  starIcon: {
    width: 60,
    height: 60,
    marginBottom: 12,
  },
  reasonHeadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  reasonDivider: {
    flex: 1,
    height: 1,
    backgroundColor: '#342846',
  },
  reasonHeading: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  reasonName: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 24,
    textAlign: 'center',
    lineHeight: 32,
    fontWeight: 'bold',
  },
  reasonSubtitle: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingConclusion: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pathForwardContainer: {
    backgroundColor: '#342846',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    alignItems: 'center',
  },
  pathForwardTitle: {
    ...HeadingStyle,
    color: '#ffffff',
    fontSize: 18,
    marginBottom: 16,
    textAlign: 'center',
  },
  pathReportScroll: {
    maxHeight: 300,
  },
  pathReportContent: {
    paddingRight: 5, // Space for scrollbar
  },
  pathReportText: {
    ...BodyStyle,
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'center',
  },
  quoteField: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  quoteText: {
    ...BodyStyle,
    color: '#ffffff',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: width * 0.85,
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#342846',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 20,
    flex: 1,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 24,
    color: '#342846',
    fontWeight: 'bold',
  },
  modalDescription: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    marginBottom: 16,
    fontWeight: '600',
  },
  modalHelperText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 14, // Reduced by 2px from 16
    lineHeight: 22,
  },
  continueButton: {
    backgroundColor: '#342846',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
    marginTop: 16,
  },
  continueButtonText: {
    ...BodyStyle,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
