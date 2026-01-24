import { BodyStyle, HeadingStyle } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Animated, Dimensions, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const [moodSelected, setMoodSelected] = useState<string | null>(null);
  const [dailyAnswer, setDailyAnswer] = useState('');
  const scaleAnim = useState(new Animated.Value(1))[0];

  const handleMoodSelect = (mood: string) => {
    setMoodSelected(mood);
    // Animation when mood is selected
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Greeting */}
      <Text style={styles.greeting}>Hello, ARINA</Text>

      {/* Thought-provoking question */}
      <Text style={styles.question}>What does the day of an ideal version of you looks like?</Text>

      {/* Answer field */}
      <LinearGradient
        colors={['#fffffe', '#e6e6e6', '#f6fdff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.answerField}
      >
        <TextInput
          style={styles.answerInput}
          value={dailyAnswer}
          onChangeText={setDailyAnswer}
          placeholder="Enter your answer"
          placeholderTextColor="#999"
          multiline
        />
      </LinearGradient>

      {/* Four sections grid */}
      <View style={styles.gridContainer}>
        {/* Row 1 */}
        <View style={styles.gridRow}>
          <TouchableOpacity style={styles.gridButton} activeOpacity={0.8}>
            <LinearGradient
              colors={['rgba(232, 233, 239, 0.56)', '#baccd7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonTitle}>Cosmic Insight</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridButton} activeOpacity={0.8}>
            <LinearGradient
              colors={['rgba(232, 233, 239, 0.56)', '#baccd7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonTitle}>Today's action</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Row 2 */}
        <View style={styles.gridRow}>
          <TouchableOpacity style={styles.gridButton} activeOpacity={0.8}>
            <LinearGradient
              colors={['#baccd7', 'rgba(232, 233, 239, 0.56)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonTitle}>Progress This Week</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridButton} activeOpacity={0.8}>
            <LinearGradient
              colors={['#baccd7', 'rgba(232, 233, 239, 0.56)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonTitle}>Your Ikigai compass</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* How is it going question */}
      <Text style={styles.moodQuestion}>How is it going today?</Text>

      {/* Mood buttons */}
      <View style={styles.moodContainer}>
        <Animated.View style={{ transform: [{ scale: moodSelected === 'progress' ? scaleAnim : 1 }] }}>
          <TouchableOpacity
            style={[
              styles.moodButton,
              moodSelected === 'progress' && styles.moodButtonSelected
            ]}
            onPress={() => handleMoodSelect('progress')}
            activeOpacity={0.8}
          >
            <Text style={styles.moodButtonText}>I'm making progress</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={{ transform: [{ scale: moodSelected === 'finding' ? scaleAnim : 1 }] }}>
          <TouchableOpacity
            style={[
              styles.moodButton,
              moodSelected === 'finding' && styles.moodButtonSelected
            ]}
            onPress={() => handleMoodSelect('finding')}
            activeOpacity={0.8}
          >
            <Text style={styles.moodButtonText}>Finding my way</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={{ transform: [{ scale: moodSelected === 'stuck' ? scaleAnim : 1 }] }}>
          <TouchableOpacity
            style={[
              styles.moodButton,
              moodSelected === 'stuck' && styles.moodButtonSelected
            ]}
            onPress={() => handleMoodSelect('stuck')}
            activeOpacity={0.8}
          >
            <Text style={styles.moodButtonText}>I'm stuck</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    paddingHorizontal: 25,
    paddingTop: 60,
    paddingBottom: 40,
  },
  greeting: {
    ...HeadingStyle,
    color: '#342846',
    textAlign: 'center',
    marginTop: 20, // Moved down by 20px
    marginBottom: 16,
  },
  question: {
    ...BodyStyle,
    color: '#342846',
    textAlign: 'center',
    marginBottom: 24,
    fontSize: 18,
  },
  answerField: {
    borderWidth: 1,
    borderColor: '#342846',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 32,
    minHeight: 100,
  },
  answerInput: {
    ...BodyStyle,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#342846',
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  gridContainer: {
    marginBottom: 32,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  gridButton: {
    width: (width - 50 - 16) / 2, // Screen width minus padding minus gap
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#342846',
  },
  buttonGradient: {
    padding: 20,
    minHeight: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonTitle: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 18,
    textAlign: 'center',
  },
  moodQuestion: {
    ...BodyStyle,
    color: '#342846',
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 16,
  },
  moodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moodButton: {
    backgroundColor: '#342846',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    minWidth: (width - 50 - 32) / 3, // Equal width for three buttons
  },
  moodButtonSelected: {
    backgroundColor: '#342846',
  },
  moodButtonText: {
    ...BodyStyle,
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
});
