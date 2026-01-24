import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function WelcomeScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>HEY YOU!</Text>
      <Text style={styles.subtitle}>
        Congratulations on taking one extra{"\n"}
        step towards your destiny.
      </Text>
      <Image 
        source={require('../assets/images/deer-butterfly.png')}
        style={styles.image}
        resizeMode="contain"
      />
      {/* Pagination dots */}
      <View style={styles.pagination}>
        <View style={[styles.dot, styles.activeDot]} />
        <View style={styles.dot} />
        <View style={styles.dot} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </View>
      {/* Continue button */}
      <TouchableOpacity style={styles.button} onPress={() => {/* Navigation action here */}}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 24,
  },
  header: {
    fontSize: 30,
    marginBottom: 12,
    color: '#342846',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 48,
  },
  subtitle: {
    fontSize: 18,
    color: '#342846',
    textAlign: 'center',
    marginBottom: 32,
  },
  image: {
    width: 220,
    height: 180,
    marginBottom: 24,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    gap: 8,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#eee',
    margin: 4,
  },
  activeDot: {
    backgroundColor: '#c8d8e7',
  },
  button: {
    backgroundColor: '#342846',
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
    position: 'absolute',
    bottom: 56,
    alignSelf: 'center',
    width: 240,
  },
  buttonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '400',
    textAlign: 'center',
  },
});

