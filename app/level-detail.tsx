import { PaperTextureBackground } from '@/components/PaperTextureBackground';
import { BodyStyle, HeadingStyle } from '@/constants/theme';
import { generateGoalSteps, generateStepDescription } from '@/utils/claudeApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

const { width, height } = Dimensions.get('window');

export default function LevelDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const levelNumber = params.level ? parseInt(params.level as string) : 1;
  const goalName = params.goalName as string || 'Get an internship';
  const goalId = params.goalId as string || ''; // Goal ID for marking as completed
  const userName = params.userName as string || 'Arena';
  
  // State for dynamic step data
  const [stepName, setStepName] = useState<string>('');
  const [stepDescription, setStepDescription] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fear, setFear] = useState<string>('being rejected');
  const [totalLevels, setTotalLevels] = useState<number>(4); // Default to 4 levels
  
  // Get fallback level data from translations
  const fallbackLevelData = t('levelDetail.fallbackLevels', { returnObjects: true }) as any;
  const fallbackLevel = fallbackLevelData[levelNumber.toString()] || fallbackLevelData['1'];
  const currentStepName = stepName || fallbackLevel.name;
  const currentDescription = stepDescription || fallbackLevel.description;
  const currentFear = fear || fallbackLevel.fear;
  
  const [showFearChat, setShowFearChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ type: 'atlas' | 'user'; text: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [showNeedTimeModal, setShowNeedTimeModal] = useState(false);

  // Load user data and generate step content
  useEffect(() => {
    const loadStepData = async () => {
      try {
        setIsLoading(true);
        
        // Load user data from AsyncStorage
        const [
          birthMonth,
          birthDate,
          birthYear,
          birthCity,
          birthHour,
          birthMinute,
          birthPeriod,
          whatYouLove,
          whatYouGoodAt,
          whatWorldNeeds,
          whatCanBePaidFor,
          fearData,
          whatExcites,
        ] = await Promise.all([
          AsyncStorage.getItem('birthMonth') || '',
          AsyncStorage.getItem('birthDate') || '',
          AsyncStorage.getItem('birthYear') || '',
          AsyncStorage.getItem('birthCity') || '',
          AsyncStorage.getItem('birthHour') || '',
          AsyncStorage.getItem('birthMinute') || '',
          AsyncStorage.getItem('birthPeriod') || '',
          AsyncStorage.getItem('ikigaiWhatYouLove') || '',
          AsyncStorage.getItem('ikigaiWhatYouGoodAt') || '',
          AsyncStorage.getItem('ikigaiWhatWorldNeeds') || '',
          AsyncStorage.getItem('ikigaiWhatCanBePaidFor') || '',
          AsyncStorage.getItem('fear') || '',
          AsyncStorage.getItem('whatExcites') || '',
        ]);

        if (fearData) {
          setFear(fearData);
        }

        // Generate goal steps to get step names
        const goalStepsResult = await generateGoalSteps(
          goalName,
          birthMonth || '1',
          birthDate || '1',
          birthYear || '2000',
          birthCity || undefined,
          birthHour || undefined,
          birthMinute || undefined,
          birthPeriod || undefined,
          whatYouLove || undefined,
          whatYouGoodAt || undefined,
          whatWorldNeeds || undefined,
          whatCanBePaidFor || undefined,
          fearData || undefined,
          whatExcites || undefined
        );

        // Find the step for current level number
        const currentStep = goalStepsResult.steps.find(step => step.number === levelNumber);
        const totalSteps = goalStepsResult.steps.length;
        
        // Store totalSteps for navigation
        setTotalLevels(totalSteps);

        if (currentStep) {
          setStepName(currentStep.text);
          
          // Generate detailed description for this step
          const description = await generateStepDescription(
            goalName,
            levelNumber,
            currentStep.text,
            totalSteps,
            birthMonth || '1',
            birthDate || '1',
            birthYear || '2000',
            birthCity || undefined,
            birthHour || undefined,
            birthMinute || undefined,
            birthPeriod || undefined,
            whatYouLove || undefined,
            whatYouGoodAt || undefined,
            whatWorldNeeds || undefined,
            whatCanBePaidFor || undefined,
            fearData || undefined,
            whatExcites || undefined
          );
          
          setStepDescription(description);
        } else {
          // Fallback if step not found
          setStepName(fallbackLevel.name);
          setStepDescription(fallbackLevel.description);
        }
      } catch (error) {
        console.error('Error loading step data:', error);
        // Use fallback data on error
        setStepName(fallbackLevel.name);
        setStepDescription(fallbackLevel.description);
      } finally {
        setIsLoading(false);
      }
    };

    loadStepData();
  }, [levelNumber, goalName]);

  // Get level badge image based on level number
  const getLevelBadgeImage = () => {
    switch (levelNumber) {
      case 1:
        return require('../assets/images/level1.png');
      case 2:
        return require('../assets/images/level2.png');
      case 3:
        return require('../assets/images/level3.png');
      case 4:
        return require('../assets/images/level4.png');
      default:
        return require('../assets/images/level1.png');
    }
  };

  const handleSendMessage = () => {
    if (chatInput.trim()) {
      setChatMessages([...chatMessages, { type: 'user', text: chatInput.trim() }]);
      setChatInput('');
      // TODO: Send to AI and get response
    }
  };

  const handleOpenFearChat = () => {
    setShowFearChat(true);
    // Initialize with Atlas's message about the fear
    const initialMessage = `I understand you're dealing with "${currentFear}". Let's talk about how to overcome this fear and move forward with confidence. What specific concerns do you have?`;
    setChatMessages([{ type: 'atlas', text: initialMessage }]);
  };

  // Parse description into sections with headings
  const parseDescription = (description: string): Array<{ type: 'heading' | 'text' | 'bullet'; content: string }> => {
    if (!description) return [];
    
    // Remove stars
    let text = description.replace(/⭐/g, '').trim();
    
    const sections: Array<{ type: 'heading' | 'text' | 'bullet'; content: string }> = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      
      // Check if this is a heading (common heading patterns - case insensitive)
      const isTimeEstimate = line.match(/^(Time Estimate|Estimated Time)/i);
      const isHeading = line.match(/^(Why This Step Matters|How to Complete It|Why This Matters|How to Complete|What You'll Do)/i);
      
      if (isTimeEstimate) {
        // Skip the "Time Estimate" heading, just show the content as text
        i++;
        
        // Collect text until next heading or bullet points
        const textLines: string[] = [];
        while (i < lines.length) {
          const nextLine = lines[i];
          // Stop if we hit another heading
          if (nextLine.match(/^(Why|How|Time|What|Estimated)/i) && !nextLine.startsWith('-')) {
            break;
          }
          // Stop if we hit a bullet point (but include it)
          if (nextLine.startsWith('-')) {
            break;
          }
          textLines.push(nextLine);
          i++;
        }
        
        if (textLines.length > 0) {
          // Remove "Estimated time:" prefix if present
          let timeText = textLines.join('\n');
          timeText = timeText.replace(/^Estimated time:\s*/i, '').trim();
          sections.push({ type: 'text', content: timeText });
        }
      } else if (isHeading) {
        sections.push({ type: 'heading', content: line });
        i++;
        
        // Collect text until next heading or bullet points
        const textLines: string[] = [];
        while (i < lines.length) {
          const nextLine = lines[i];
          // Stop if we hit another heading
          if (nextLine.match(/^(Why|How|Time|What|Estimated)/i) && !nextLine.startsWith('-')) {
            break;
          }
          // Stop if we hit a bullet point (but include it)
          if (nextLine.startsWith('-')) {
            break;
          }
          textLines.push(nextLine);
          i++;
        }
        
        if (textLines.length > 0) {
          sections.push({ type: 'text', content: textLines.join('\n') });
        }
      } else if (line.startsWith('-')) {
        // Bullet point
        sections.push({ type: 'bullet', content: line.substring(1).trim() });
        i++;
      } else {
        // Regular text - check if it might be a heading (short line, no lowercase start, not a sentence)
        const mightBeHeading = line.length < 60 && 
                               !line.startsWith('-') && 
                               !line.match(/^[a-z]/) &&
                               !line.includes('.') &&
                               (i === 0 || sections.length === 0 || sections[sections.length - 1].type === 'heading');
        
        if (mightBeHeading && i === 0) {
          // First line that looks like a heading
          sections.push({ type: 'heading', content: line });
          i++;
        } else {
          // Regular text
          const textLines: string[] = [line];
          i++;
          while (i < lines.length) {
            const nextLine = lines[i];
            // Stop if we hit a heading
            if (nextLine.match(/^(Why|How|Time|What|Estimated)/i) && !nextLine.startsWith('-')) {
              break;
            }
            // Stop if we hit a bullet point
            if (nextLine.startsWith('-')) {
              break;
            }
            textLines.push(nextLine);
            i++;
          }
          sections.push({ type: 'text', content: textLines.join('\n') });
        }
      }
    }
    
    return sections;
  };

  return (
    <PaperTextureBackground>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Bar */}
        <View style={styles.topBar}>
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              // Navigate to goals screen as fallback if back doesn't work
              try {
                if (router.canGoBack && router.canGoBack()) {
                  router.back();
                } else {
                  router.push('/(tabs)/goals');
                }
              } catch (error) {
                // Fallback: navigate directly to goals screen
                router.push('/(tabs)/goals');
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>

          {/* Level Badge */}
          <Image
            source={getLevelBadgeImage()}
            style={styles.levelBadgeTop}
            resizeMode="contain"
          />
        </View>

        {/* Step Name Heading */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#342846" />
            <Text style={styles.loadingText}>Loading step...</Text>
          </View>
        ) : (
          <>
            <Text style={styles.levelName}>{currentStepName.replace(/⭐/g, '').trim()}</Text>

            {/* Step Description in Purple Card */}
            <View style={styles.instructionsFrame}>
              {parseDescription(currentDescription).map((section, index) => {
                if (section.type === 'heading') {
                  return (
                    <Text 
                      key={index} 
                      style={[
                        styles.instructionHeading,
                        index === 0 && { marginTop: 0 }
                      ]}
                    >
                      {section.content}
                    </Text>
                  );
                } else if (section.type === 'bullet') {
                  return (
                    <Text key={index} style={styles.instructionBullet}>
                      • {section.content}
                    </Text>
                  );
                } else {
                  return (
                    <Text key={index} style={styles.instructionText}>
                      {section.content}
                    </Text>
                  );
                }
              })}
            </View>
          </>
        )}

        {/* Dear Face Image */}
        <View style={styles.dearFaceContainer}>
          <Image
            source={require('../assets/images/deer.face.png')}
            style={styles.dearFaceImage}
            resizeMode="contain"
          />
        </View>

        {/* Chat About My Fear Button */}
        <TouchableOpacity
          style={styles.chatFearButton}
          onPress={handleOpenFearChat}
        >
          <Text style={styles.chatFearButtonText}>chat about my fear</Text>
        </TouchableOpacity>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          {/* I did it Button */}
          <TouchableOpacity
            style={styles.didItButton}
            onPress={() => {
              router.push({
                pathname: '/level-complete',
                params: {
                  level: levelNumber.toString(),
                  goalName: goalName,
                  goalId: goalId,
                  userName: userName,
                  totalLevels: totalLevels.toString(),
                },
              });
            }}
          >
            <Text style={styles.didItButtonText}>{t('levelDetail.iDidIt')}</Text>
          </TouchableOpacity>

          {/* I need time Button */}
          <TouchableOpacity
            style={styles.needTimeButton}
            onPress={() => {
              setShowNeedTimeModal(true);
            }}
          >
            <LinearGradient
              colors={['#ffffff', '#e0e0e0']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.needTimeButtonGradient}
            >
              <Text style={styles.needTimeButtonText}>I need time</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Fear Chat Modal */}
      <Modal
        visible={showFearChat}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFearChat(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.chatContainer}>
            {/* Chat Header */}
            <View style={styles.chatHeader}>
              <Text style={styles.chatHeaderText}>{t('levelDetail.atlasIsHere')}</Text>
              <TouchableOpacity
                onPress={() => setShowFearChat(false)}
                style={styles.closeChatButton}
              >
                <Text style={styles.closeChatButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Chat Content */}
            <ScrollView 
              style={styles.chatContent} 
              contentContainerStyle={styles.chatContentContainer}
            >
              {chatMessages.map((message, index) => (
                message.type === 'atlas' ? (
                  <View key={index} style={styles.atlasMessageContainer}>
                    <View style={styles.atlasBubbleAndAvatar}>
                      <View style={styles.atlasMessageBubble}>
                        <Text style={styles.atlasMessageText}>{message.text}</Text>
                      </View>
                      <Image
                        source={require('../assets/images/deer.face.png')}
                        style={styles.atlasAvatar}
                        resizeMode="contain"
                      />
                    </View>
                  </View>
                ) : (
                  <View key={index} style={styles.userMessageContainer}>
                    <View style={styles.userMessageBubble}>
                      <Text style={styles.userMessageText}>{message.text}</Text>
                    </View>
                  </View>
                )
              ))}
            </ScrollView>

            {/* Chat Input */}
            <View style={styles.chatInputContainer}>
              <TextInput
                style={styles.chatInput}
                placeholder={t('levelDetail.askForHelp')}
                placeholderTextColor="#999"
                value={chatInput}
                onChangeText={setChatInput}
                onSubmitEditing={handleSendMessage}
                numberOfLines={1}
              />
              <TouchableOpacity 
                style={styles.sendButton}
                onPress={handleSendMessage}
              >
                <Text style={styles.sendButtonText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Need Time Modal */}
      <Modal
        visible={showNeedTimeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowNeedTimeModal(false)}
      >
        <View style={styles.needTimeModalOverlay}>
          <View style={styles.needTimeModalContent}>
            {/* Close Button - Top Right */}
            <TouchableOpacity
              style={styles.needTimeModalCloseButton}
              onPress={() => {
                setShowNeedTimeModal(false);
                // Navigate back to goals screen
                try {
                  if (router.canGoBack && router.canGoBack()) {
                    router.back();
                  } else {
                    router.push('/(tabs)/goals');
                  }
                } catch (error) {
                  router.push('/(tabs)/goals');
                }
              }}
            >
              <Text style={styles.needTimeModalCloseButtonText}>✕</Text>
            </TouchableOpacity>
            
            <Text style={styles.needTimeModalTitle}>{t('levelDetail.needTimeTitle')}</Text>
            <Text style={styles.needTimeModalMessage}>
              {t('levelDetail.needTimeMessage')}
            </Text>
            
            <TouchableOpacity
              style={styles.needTimeModalDoItButton}
              onPress={() => {
                setShowNeedTimeModal(false);
                router.push('/(tabs)/focus');
              }}
            >
              <Text style={styles.needTimeModalDoItButtonText}>{t('levelDetail.readyNow')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </KeyboardAvoidingView>
    </PaperTextureBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 25,
    paddingTop: 60,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    width: '100%',
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: 10,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  backButtonText: {
    fontSize: 28,
    color: '#342846',
    fontWeight: 'bold',
  },
  levelBadgeTop: {
    width: 60,
    height: 60,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  loadingText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
  },
  levelName: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 24,
    marginBottom: 16,
    textAlign: 'center',
    width: '100%',
  },
  instructionsFrame: {
    backgroundColor: '#342846',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
    width: '100%',
  },
  instructionHeading: {
    ...HeadingStyle,
    color: '#FFFFFF',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  instructionText: {
    ...BodyStyle,
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'left',
    lineHeight: 24,
    marginBottom: 12,
  },
  instructionBullet: {
    ...BodyStyle,
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'left',
    lineHeight: 24,
    marginBottom: 8,
    marginLeft: 0,
    paddingLeft: 20, // Minimum 20px padding (was 0)
  },
  dearFaceContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  dearFaceImage: {
    width: width * 0.3, // Made smaller (reduced from 0.39)
    height: width * 0.3,
  },
  chatFearButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#342846',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    alignSelf: 'center',
    minHeight: 44,
  },
  chatFearButtonText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
    marginTop: 100,
  },
  didItButton: {
    backgroundColor: '#342846',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 0.63, // Reduced by 37% (from 1.0 to 0.63)
    minHeight: 44,
  },
  didItButtonText: {
    ...BodyStyle,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  needTimeButton: {
    borderRadius: 999,
    overflow: 'hidden',
    flex: 1,
    minHeight: 44,
  },
  needTimeButtonGradient: {
    paddingVertical: 10,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  needTimeButtonText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    fontWeight: '600',
  },
  // Chat Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  chatContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '70%',
    maxHeight: 600,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  chatHeaderText: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 20,
  },
  closeChatButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeChatButtonText: {
    fontSize: 24,
    color: '#342846',
    fontWeight: 'bold',
  },
  chatContent: {
    flex: 1,
  },
  chatContentContainer: {
    padding: 16,
  },
  atlasMessageContainer: {
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  atlasBubbleAndAvatar: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
  },
  atlasMessageBubble: {
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    padding: 12,
    borderTopLeftRadius: 4,
    maxWidth: '85%',
  },
  atlasAvatar: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    marginLeft: 0,
  },
  atlasMessageText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'left',
  },
  userMessageContainer: {
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  userMessageBubble: {
    backgroundColor: '#342846',
    borderRadius: 16,
    padding: 12,
    borderTopRightRadius: 4,
    maxWidth: '85%',
  },
  userMessageText: {
    ...BodyStyle,
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'left',
  },
  chatInputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  chatInput: {
    flex: 1,
    ...BodyStyle,
    borderWidth: 1,
    borderColor: '#342846',
    borderRadius: 8,
    paddingHorizontal: 20, // Minimum 20px padding (was 16)
    paddingVertical: 12,
    color: '#342846',
    fontSize: 14,
    height: 44,
  },
  sendButton: {
    backgroundColor: '#342846',
    borderRadius: 999,
    paddingHorizontal: 20, // Minimum 20px padding (was 16)
    paddingVertical: 12,
    justifyContent: 'center',
    minWidth: 60,
    maxWidth: 80,
  },
  sendButtonText: {
    ...BodyStyle,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  needTimeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  needTimeModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    position: 'relative',
  },
  needTimeModalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  needTimeModalCloseButtonText: {
    fontSize: 24,
    color: '#342846',
    fontWeight: 'bold',
  },
  needTimeModalTitle: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 24,
    marginBottom: 16,
    textAlign: 'center',
    marginTop: 8,
  },
  needTimeModalMessage: {
    ...BodyStyle,
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  needTimeModalDoItButton: {
    backgroundColor: '#342846',
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
    width: '100%',
  },
  needTimeModalDoItButtonText: {
    ...BodyStyle,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

