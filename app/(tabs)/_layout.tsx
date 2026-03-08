import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, View, Animated } from 'react-native';
import Svg, { Path, Circle, Polygon } from 'react-native-svg';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from 'react-i18next';

// ============================================================================
// CUSTOM ICON COMPONENTS
// SVG icons matching the web design with active/inactive states
// ============================================================================

const HomeIcon = ({ color, size = 24 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 9.5L12 3L21 9.5V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9.5Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9 22V12H15V22"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const HomeIconFilled = ({ color, size = 24 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 9.5L12 3L21 9.5V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9.5Z"
      fill={color}
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9 22V12H15V22"
      stroke="#FAFAFA"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const FocusIcon = ({ color, size = 24 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
    <Circle cx="12" cy="12" r="5" stroke={color} strokeWidth="2" />
    <Circle cx="12" cy="12" r="1.5" fill={color} />
  </Svg>
);

const FocusIconFilled = ({ color, size = 24 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
    <Circle cx="12" cy="12" r="5" fill="#a592b0" stroke={color} strokeWidth="2" />
    <Circle cx="12" cy="12" r="1.5" fill={color} />
  </Svg>
);

const GoalsIcon = ({ color, size = 24 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Polygon
      points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const GoalsIconFilled = ({ color, size = 24 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Polygon
      points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
      fill={color}
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const MeIcon = ({ color, size = 24 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth="2" />
    <Path
      d="M4 20C4 16.6863 7.58172 14 12 14C16.4183 14 20 16.6863 20 20"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </Svg>
);

const MeIconFilled = ({ color, size = 24 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" fill={color} stroke={color} strokeWidth="2" />
    <Path
      d="M4 20C4 16.6863 7.58172 14 12 14C16.4183 14 20 16.6863 20 20"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <Path
      d="M4 20C4 16.6863 7.58172 14 12 14C16.4183 14 20 16.6863 20 20"
      fill={color}
    />
  </Svg>
);

// ============================================================================
// TAB BAR ICON WRAPPER
// Wraps icon with active indicator and background highlight
// ============================================================================

const TabBarIcon = ({ 
  focused, 
  icon: Icon, 
  activeIcon: ActiveIcon 
}: { 
  focused: boolean; 
  icon: React.ComponentType<{ color: string; size?: number }>; 
  activeIcon: React.ComponentType<{ color: string; size?: number }>; 
}) => {
  const inactiveColor = '#9BA3AF';
  const activeColor = '#342846';
  const IconComponent = focused ? ActiveIcon : Icon;
  const iconColor = focused ? activeColor : inactiveColor;

  return (
    <View style={styles.iconWrapper}>
      {/* Active indicator dot */}
      {focused && <View style={styles.activeIndicator} />}
      
      {/* Icon container with background for active state */}
      <View style={[
        styles.iconContainer,
        focused && styles.iconContainerActive
      ]}>
        <IconComponent color={iconColor} size={24} />
      </View>
    </View>
  );
};

// ============================================================================
// TAB LAYOUT
// Main Expo Router tabs configuration
// ============================================================================

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { i18n } = useTranslation();
  const isRussian = i18n.language === 'ru' || i18n.language?.startsWith('ru');
  const isTabletLayout = Platform.OS === 'ios' && Platform.isPad;

  return (
    <Tabs
      detachInactiveScreens={false}
      screenOptions={{
        tabBarActiveTintColor: '#342846',
        tabBarInactiveTintColor: '#9BA3AF',
        headerShown: false,
        tabBarButton: HapticTab,
        lazy: false,
        sceneStyle: {
          backgroundColor: '#1f1a2a',
        },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingHorizontal: 16,
        },
        tabBarLabelStyle: {
          ...styles.tabLabelBase,
          ...(isTabletLayout ? styles.tabLabelTablet : null),
        },
        tabBarLabelPosition: isTabletLayout ? 'beside-icon' : undefined,
        tabBarIconStyle: isTabletLayout ? styles.tabIconTablet : undefined,
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: isRussian ? 'Главная' : 'Home',
          tabBarIcon: ({ focused }) => (
            <TabBarIcon 
              focused={focused} 
              icon={HomeIcon} 
              activeIcon={HomeIconFilled} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="focus"
        options={{
          title: isRussian ? 'Фокус' : 'Focus',
          tabBarIcon: ({ focused }) => (
            <TabBarIcon 
              focused={focused} 
              icon={FocusIcon} 
              activeIcon={FocusIconFilled} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: isRussian ? 'Цели' : 'Goals',
          tabBarIcon: ({ focused }) => (
            <TabBarIcon 
              focused={focused} 
              icon={GoalsIcon} 
              activeIcon={GoalsIconFilled} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: isRussian ? 'Я' : 'Me',
          tabBarIcon: ({ focused }) => (
            <TabBarIcon 
              focused={focused} 
              icon={MeIcon} 
              activeIcon={MeIconFilled} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          href: null, // Hide from tab bar but keep as route
        }}
      />
    </Tabs>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    top: -2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#a592b0',
  },
  iconContainer: {
    width: 40,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  iconContainerActive: {
    backgroundColor: '#a592b0',
  },
  tabLabelBase: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 11,
    marginTop: 4,
  },
  tabLabelTablet: {
    marginTop: 0,
  },
  tabIconTablet: {
    marginRight: 5,
    marginBottom: 0,
  },
});
