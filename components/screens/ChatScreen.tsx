import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    Animated,
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAtlasChatResponse, ChatMessage } from '../../utils/claudeApi';
import { checkMessageLimit, incrementMessageCount } from '../../utils/messageLimits';
import { checkSubscriptionStatus, triggerPaywall } from '../../utils/superwall';

const { width, height } = Dimensions.get('window');
const ATLAS_CHAT_HISTORY_KEY = '@atlas_chat_history_v1';

// ============================================
// Color Palette
// ============================================
const COLORS = {
  primary: '#342846',
  accent1: '#cdbad8',
  accent2: '#baccd7',
  white: '#FFFFFF',
  background: '#F5F3F0',
  atlasBubble: '#F8F6F4',
  userBubble: '#342846',
};

// ============================================
// Types
// ============================================
interface AtlasChatProps {
  onClose: () => void;
  userName?: string;
  goalTitle?: string;
  goalStepLabel?: string;
  goalStepNumber?: number;
  totalGoalSteps?: number;
}

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface QuickReply {
  id: string;
  text: string;
  icon: string;
}

// ============================================
// Typing Indicator Component
// ============================================
function TypingIndicator() {
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (anim: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.delay(600 - delay),
        ])
      ).start();
    };

    animateDot(dot1Anim, 0);
    animateDot(dot2Anim, 150);
    animateDot(dot3Anim, 300);
  }, []);

  const getDotStyle = (anim: Animated.Value) => ({
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -6],
        }),
      },
    ],
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.4, 1],
    }),
  });

  return (
    <View style={styles.typingContainer}>
      <View style={styles.typingBubble}>
        <Animated.View style={[styles.typingDot, getDotStyle(dot1Anim)]} />
        <Animated.View style={[styles.typingDot, getDotStyle(dot2Anim)]} />
        <Animated.View style={[styles.typingDot, getDotStyle(dot3Anim)]} />
      </View>
    </View>
  );
}

// ============================================
// Atlas Avatar Component
// ============================================
interface AtlasAvatarProps {
  size?: 'small' | 'medium' | 'large';
  showStatus?: boolean;
}

function AtlasAvatar({ size = 'medium', showStatus = false }: AtlasAvatarProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  const sizeMap = {
    small: 32,
    medium: 44,
    large: 64,
  };
  
  const avatarSize = sizeMap[size];

  useEffect(() => {
    if (showStatus) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [showStatus]);

  return (
    <View style={[styles.avatarContainer, { width: avatarSize, height: avatarSize }]}>
      <Image
        source={require('../../assets/images/deer.face.png')}
        style={[styles.avatarImage, { width: avatarSize, height: avatarSize }]}
        resizeMode="contain"
      />
      {showStatus && (
        <Animated.View
          style={[
            styles.statusIndicator,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <View style={styles.statusDot} />
        </Animated.View>
      )}
    </View>
  );
}

// ============================================
// Message Bubble Component
// ============================================
interface MessageBubbleProps {
  message: Message;
  isFirst?: boolean;
  showAvatar?: boolean;
}

function MessageBubble({ message, isFirst = false, showAvatar = true }: MessageBubbleProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(message.isUser ? 20 : -20)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  if (message.isUser) {
    return (
      <Animated.View
        style={[
          styles.userMessageContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }, { scale: scaleAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={[COLORS.primary, '#4a3a5c']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.userBubble}
        >
          <Text style={styles.userMessageText}>{message.text}</Text>
        </LinearGradient>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.atlasMessageContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }, { scale: scaleAnim }],
        },
      ]}
    >
      {showAvatar && (
        <View style={styles.atlasAvatarWrapper}>
          <AtlasAvatar size="small" />
        </View>
      )}
      <View style={[styles.atlasBubble, !showAvatar && styles.atlasBubbleNoAvatar]}>
        {isFirst && (
          <View style={styles.atlasGlow} />
        )}
        <Text style={styles.atlasMessageText}>{message.text}</Text>
      </View>
    </Animated.View>
  );
}

// ============================================
// Quick Reply Chip Component
// ============================================
interface QuickReplyChipProps {
  reply: QuickReply;
  onPress: () => void;
  index: number;
}

function QuickReplyChip({ reply, onPress, index }: QuickReplyChipProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: 500 + index * 100,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        delay: 500 + index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <TouchableOpacity
        style={styles.quickReplyChip}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <MaterialIcons name={reply.icon as any} size={16} color={COLORS.primary} />
        <Text style={styles.quickReplyText}>{reply.text}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ============================================
// Welcome Message Component
// ============================================
interface WelcomeMessageProps {
  userName?: string;
  greeting: string;
  body: string;
  prompt: string;
}

function WelcomeMessage({ userName, greeting, body, prompt }: WelcomeMessageProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.6,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.welcomeContainer,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={styles.welcomeBubble}>
        <Text style={styles.welcomeGreeting}>
          {greeting}{userName ? `, ${userName}` : ''}! 👋
        </Text>
        <Text style={styles.welcomeText}>
          {body}
        </Text>
        <Text style={styles.welcomeSubtext}>
          {prompt}
        </Text>
      </View>
    </Animated.View>
  );
}

// ============================================
// Main Component
// ============================================
function AtlasChat({
  onClose,
  userName,
  goalTitle,
  goalStepLabel,
  goalStepNumber,
  totalGoalSteps,
}: AtlasChatProps) {
  const { t, i18n } = useTranslation();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const tr = (en: string, ru: string) => (isRussian ? ru : en);
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const quickReplies: QuickReply[] = [
    { id: '1', text: tr('What should I focus on today?', 'На чем мне сфокусироваться сегодня?'), icon: 'lightbulb-outline' },
    { id: '2', text: tr("I'm stuck", 'Я застрял'), icon: 'help-outline' },
    { id: '3', text: tr('Celebrate a win with me!', 'Отпразднуй со мной победу!'), icon: 'celebration' },
  ];

  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const stored = await AsyncStorage.getItem(ATLAS_CHAT_HISTORY_KEY);
        if (!stored) return;
        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed)) return;

        const hydrated: Message[] = parsed
          .map((item: any) => ({
            id: String(item?.id || Date.now()),
            text: String(item?.text || ''),
            isUser: Boolean(item?.isUser),
            timestamp: item?.timestamp ? new Date(item.timestamp) : new Date(),
          }))
          .filter((item: Message) => item.text.trim().length > 0);

        if (hydrated.length > 0) {
          setMessages(hydrated);
          setShowWelcome(false);
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: false });
          }, 0);
        }
      } catch (error) {
        console.error('Error loading Atlas chat history:', error);
      }
    };

    loadChatHistory();
  }, []);

  useEffect(() => {
    const saveChatHistory = async () => {
      try {
        if (messages.length === 0) return;
        await AsyncStorage.setItem(ATLAS_CHAT_HISTORY_KEY, JSON.stringify(messages));
      } catch (error) {
        console.error('Error saving Atlas chat history:', error);
      }
    };

    saveChatHistory();
  }, [messages]);

  const addSystemMessage = (text: string) => {
    const atlasMessage: Message = {
      id: (Date.now() + 1).toString(),
      text,
      isUser: false,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, atlasMessage]);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const sendMessageToAPI = async (conversationMessages: Message[]) => {
    const conversationHistory: ChatMessage[] = conversationMessages.map((msg) => ({
      role: msg.isUser ? 'user' : 'assistant',
      content: msg.text,
    }));

    const aiResponse = await getAtlasChatResponse(conversationHistory, {
      userName,
      goalTitle,
      goalStepLabel,
      goalStepNumber,
      totalGoalSteps,
    });

    // Increment message count after successful API response
    await incrementMessageCount();

    setIsTyping(false);

    const atlasMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: aiResponse,
      isUser: false,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, atlasMessage]);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText('');
    setShowWelcome(false);

    // Show typing indicator
    setIsTyping(true);

    try {
      // Check message limit before calling API
      const userIsPremium = await checkSubscriptionStatus();
      const { allowed } = await checkMessageLimit(userIsPremium);

      if (!allowed) {
        setIsTyping(false);

        // Show paywall instead of just blocking
        const { purchased } = await triggerPaywall('message_limit_reached');

        if (purchased) {
          // They upgraded! Now they have premium limits
          // Re-check and allow the message
          setIsTyping(true);
          await sendMessageToAPI(updatedMessages);
        } else {
          // Show friendly "come back tomorrow" message
          addSystemMessage(tr('You used all your messages for today. Come back tomorrow! 🌅', 'Ты использовал все сообщения на сегодня. Возвращайся завтра! 🌅'));
        }
        return;
      }

      await sendMessageToAPI(updatedMessages);
    } catch (error) {
      setIsTyping(false);
      console.error('Error getting Atlas response:', error);
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error 
        ? error.message 
        : tr("Can't connect right now. Try again in a minute.", 'Сейчас не получается подключиться. Попробуй еще раз через минуту.');
      
      const atlasMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: errorMessage,
        isUser: false,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, atlasMessage]);
      
      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleQuickReply = (reply: QuickReply) => {
    setInputText(reply.text);
    setTimeout(() => handleSend(), 100);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Background gradient */}
      <LinearGradient
        colors={['#F8F6F4', '#F5F3F0', '#F0EDE8']}
        style={styles.backgroundGradient}
      />

      {/* Decorative elements */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 44) + 40 }]}>
        <View style={styles.headerLeft}>
          <AtlasAvatar size="medium" showStatus />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>{tr('ATLAS', 'АТЛАС')}</Text>
            <Text style={styles.headerSubtitle}>{tr('Your guide', 'Твой проводник')}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <MaterialIcons name="close" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Chat Area */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Welcome Message */}
        {showWelcome && (
          <>
            <WelcomeMessage
              userName={userName}
              greeting={tr('Hi', 'Привет')}
              body={tr(
                "I'm Atlas, your guide. I'll help you stay on course, navigate challenges, and celebrate wins.",
                'Я Атлас, твой проводник. Я помогу тебе держать курс, проходить трудности и отмечать победы.'
              )}
              prompt={tr("What's on your mind today?", 'О чем ты думаешь сегодня?')}
            />
            
            {/* Quick Replies */}
            <View style={styles.quickRepliesContainer}>
              {quickReplies.map((reply, index) => (
                <QuickReplyChip
                  key={reply.id}
                  reply={reply}
                  onPress={() => handleQuickReply(reply)}
                  index={index}
                />
              ))}
            </View>
          </>
        )}

        {/* Messages */}
        {messages.map((message, index) => {
          const showAvatar = !message.isUser && (
            index === 0 || messages[index - 1]?.isUser
          );
          return (
            <MessageBubble
              key={message.id}
              message={message}
              isFirst={index === 0 && !message.isUser}
              showAvatar={showAvatar}
            />
          );
        })}

        {/* Typing Indicator */}
        {isTyping && <TypingIndicator />}

        {/* Bottom padding */}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            ref={inputRef}
            style={styles.textInput}
            placeholder={tr('Ask Atlas anything...', 'Спроси Атласа о чем угодно...')}
            placeholderTextColor="rgba(52, 40, 70, 0.4)"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !inputText.trim() && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim()}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={inputText.trim() ? [COLORS.primary, '#4a3a5c'] : ['#ccc', '#bbb']}
              style={styles.sendButtonGradient}
            >
              <MaterialIcons name="arrow-upward" size={20} color={COLORS.white} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
        
        {/* Safety text */}
        <Text style={styles.safetyText}>
          {tr(
            'Atlas is here to support you. Your conversations stay private.',
            'Атлас рядом, чтобы поддержать тебя. Твои разговоры остаются приватными.'
          )}
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

// ============================================
// Styles
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.accent1 + '15',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: 100,
    left: -80,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.accent2 + '15',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTextContainer: {
    marginLeft: 12,
  },
  headerTitle: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 18,
    color: COLORS.primary,
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 13,
    color: COLORS.primary,
    opacity: 0.5,
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.primary + '10',
    marginHorizontal: 20,
  },

  // Avatar
  avatarContainer: {
    position: 'relative',
  },
  avatarImage: {
    borderRadius: 0,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },

  // Chat Area
  chatArea: {
    flex: 1,
  },
  chatContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // Welcome Message
  welcomeContainer: {
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  welcomeGlow: {
    position: 'absolute',
    top: 20,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.accent1,
  },
  welcomeAvatarContainer: {
    marginBottom: 20,
    zIndex: 10,
  },
  welcomeBubble: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  welcomeGreeting: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 22,
    color: COLORS.primary,
    marginBottom: 12,
  },
  welcomeText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 16,
    color: COLORS.primary,
    lineHeight: 24,
    marginBottom: 16,
  },
  welcomeSubtext: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 15,
    color: COLORS.accent1,
    fontStyle: 'italic',
  },

  // Quick Replies
  quickRepliesContainer: {
    gap: 10,
    marginBottom: 20,
  },
  quickReplyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.accent2 + '50',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  quickReplyText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 15,
    color: COLORS.primary,
  },

  // Message Bubbles
  atlasMessageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  atlasAvatarWrapper: {
    marginRight: 10,
    marginBottom: 4,
  },
  atlasBubble: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderTopLeftRadius: 4,
    paddingHorizontal: 18,
    paddingVertical: 14,
    maxWidth: '80%',
    position: 'relative',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  atlasBubbleNoAvatar: {
    marginLeft: 42,
  },
  atlasGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 30,
    backgroundColor: COLORS.accent1 + '20',
  },
  atlasMessageText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 16,
    color: COLORS.primary,
    lineHeight: 24,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  userBubble: {
    borderRadius: 20,
    borderTopRightRadius: 4,
    paddingHorizontal: 18,
    paddingVertical: 14,
    maxWidth: '80%',
  },
  userMessageText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 16,
    color: COLORS.white,
    lineHeight: 24,
  },

  // Typing Indicator
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
    marginLeft: 42,
  },
  typingBubble: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderTopLeftRadius: 4,
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 6,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accent1,
  },

  // Input Area
  inputContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    backgroundColor: 'transparent',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.white,
    borderRadius: 28,
    paddingLeft: 20,
    paddingRight: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.primary + '10',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  textInput: {
    flex: 1,
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 16,
    color: COLORS.primary,
    paddingVertical: 12,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 8,
    marginBottom: 4,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  safetyText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 12,
    color: COLORS.primary,
    opacity: 0.4,
    textAlign: 'center',
    marginTop: 12,
  },
});

// Export as ChatScreen to match import expectations
const ChatScreen = AtlasChat;
export default ChatScreen;
