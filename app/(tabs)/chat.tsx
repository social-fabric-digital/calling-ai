import { PaperTextureBackground } from '@/components/PaperTextureBackground';
import { BodyStyle } from '@/constants/theme';
import { ChatMessage, getClaudeResponse } from '@/utils/claudeApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

const MESSAGES_STORAGE_KEY = '@chat_messages';

export default function ChatScreen() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Array<{ id: number; text: string; isUser: boolean }>>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Load messages from storage on mount
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const storedMessages = await AsyncStorage.getItem(MESSAGES_STORAGE_KEY);
        if (storedMessages) {
          setMessages(JSON.parse(storedMessages));
        }
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    };
    loadMessages();
  }, []);

  // Save messages to storage whenever they change
  useEffect(() => {
    const saveMessages = async () => {
      try {
        await AsyncStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messages));
      } catch (error) {
        console.error('Error saving messages:', error);
      }
    };
    if (messages.length > 0) {
      saveMessages();
    }
  }, [messages]);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollViewRef.current && messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = async () => {
    if (inputText.trim() && !isLoading) {
      const userMessageText = inputText.trim();
      setInputText('');
      setIsLoading(true);

      // Add user message
      const userMessage = {
        id: Date.now(),
        text: userMessageText,
        isUser: true,
      };
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);

      // Save user message immediately
      try {
        await AsyncStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(newMessages));
      } catch (error) {
        console.error('Error saving messages:', error);
      }

      try {
        // Convert messages to Claude API format
        const conversationHistory: ChatMessage[] = newMessages.map((msg) => ({
          role: msg.isUser ? 'user' : 'assistant',
          content: msg.text,
        }));

        // Get response from Claude
        const aiResponse = await getClaudeResponse(conversationHistory);

        // Add AI response
        const aiMessage = {
          id: Date.now() + 1,
          text: aiResponse,
          isUser: false,
        };
        const updatedMessages = [...newMessages, aiMessage];
        setMessages(updatedMessages);

        // Save AI response
        try {
          await AsyncStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(updatedMessages));
        } catch (error) {
          console.error('Error saving AI message:', error);
        }
      } catch (error) {
        console.error('Error getting AI response:', error);
        
        // Show error message to user
        const errorMessage = {
          id: Date.now() + 1,
          text: error instanceof Error 
            ? error.message 
            : t('chat.errorMessage'),
          isUser: false,
        };
        const errorMessages = [...newMessages, errorMessage];
        setMessages(errorMessages);
        
        // Save error message
        try {
          await AsyncStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(errorMessages));
        } catch (saveError) {
          console.error('Error saving error message:', saveError);
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <PaperTextureBackground>
      <View style={styles.container}>
        <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
      </View>

      {/* Chat messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 && (
          <View style={styles.welcomeContainer}>
            <Image
              source={require('../../assets/images/deer.face.png')}
              style={styles.welcomeImage}
              resizeMode="contain"
            />
            <Text style={styles.welcomeText}>
              {t('chat.welcome')}
            </Text>
            <Text style={styles.welcomeQuestion}>
              {t('chat.welcomeQuestion')}
            </Text>
          </View>
        )}
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageContainer,
              message.isUser ? styles.userMessage : styles.aiMessage,
            ]}
          >
            {!message.isUser && (
              <Image
                source={require('../../assets/images/deer.face.png')}
                style={styles.messageAvatar}
                resizeMode="contain"
              />
            )}
            <View
              style={[
                styles.messageBubble,
                message.isUser ? styles.userBubble : styles.aiBubble,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  message.isUser ? styles.userText : styles.aiText,
                ]}
              >
                {message.text}
              </Text>
            </View>
          </View>
        ))}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <Image
              source={require('../../assets/images/deer.face.png')}
              style={styles.messageAvatar}
              resizeMode="contain"
            />
            <View style={styles.aiBubble}>
              <ActivityIndicator size="small" color="#342846" />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input area */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder={t('chat.placeholder')}
          placeholderTextColor="#999"
          numberOfLines={1}
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={isLoading || !inputText.trim()}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendButtonText} numberOfLines={1}>{t('chat.send')}</Text>
          )}
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
      </View>
    </PaperTextureBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#342846',
    fontWeight: '600',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
    paddingBottom: 10,
  },
  welcomeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  welcomeImage: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  welcomeText: {
    ...BodyStyle,
    textAlign: 'center',
    color: '#342846',
    fontSize: 16,
    lineHeight: 24,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  welcomeQuestion: {
    ...BodyStyle,
    textAlign: 'center',
    color: '#342846',
    fontSize: 18,
    lineHeight: 26,
    paddingHorizontal: 20,
    fontWeight: '600',
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  userMessage: {
    justifyContent: 'flex-end',
    flexDirection: 'row',
  },
  aiMessage: {
    justifyContent: 'flex-start',
    flexDirection: 'row',
  },
  messageAvatar: {
    width: 30,
    height: 30,
    marginRight: 8,
    marginBottom: 4,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 20, // Minimum 20px padding (was 16)
    paddingVertical: 10,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#342846',
  },
  aiBubble: {
    backgroundColor: '#f0f0f0',
  },
  messageText: {
    ...BodyStyle,
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: '#fff',
  },
  aiText: {
    color: '#342846',
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 14.4,
    paddingBottom: 60, // Increased by another 30px (30 + 30 = 60)
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    maxWidth: '70%',
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    minHeight: 44, // Match send button height
    ...BodyStyle,
    fontSize: 14,
  },
  sendButton: {
    backgroundColor: '#342846',
    paddingHorizontal: 20, // Minimum 20px padding (was 16)
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 80,
    maxWidth: 100,
    minHeight: 44, // Explicit height to match input
    marginLeft: 15, // Move right 15px
  },
  sendButtonText: {
    ...BodyStyle,
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  loadingContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
});
