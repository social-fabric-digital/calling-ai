import { Tabs } from 'expo-router';
import React, { useMemo } from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          paddingTop: Platform.OS === 'ios' ? 0 : 0,
          paddingBottom: Platform.OS === 'ios' ? 0 : 0,
          height: Platform.OS === 'ios' ? 75 : 55, // Increased by 7% (from 70 to 75, from 51 to 55)
          backgroundColor: '#342846', // Brown color
          justifyContent: 'center', // Center items vertically
          alignItems: 'center', // Center items horizontally
        },
        tabBarLabelStyle: {
          fontSize: 12, // Increased by 7% (from default ~11 to 12)
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={30} name="house.fill" color={color} />, // Increased by 7% (from 28 to 30)
        }}
      />
      <Tabs.Screen
        name="focus"
        options={{
          title: 'Focus',
          tabBarIcon: ({ color }) => <IconSymbol size={30} name="target" color={color} />, // Increased by 7% (from 28 to 30)
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: 'Goals',
          tabBarIcon: ({ color }) => <IconSymbol size={30} name="star.fill" color={color} />, // Increased by 7% (from 28 to 30)
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: 'Me',
          tabBarIcon: ({ color }) => <IconSymbol size={30} name="person.fill" color={color} />, // Increased by 7% (from 28 to 30)
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          href: null, // Hide from tab bar
        }}
      />
    </Tabs>
  );
}
