import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Gradients } from '../constants/colors';
import { ChatIcon, DiscoverIcon, ProfileIcon } from './Icons';
import { useChatStore } from '../lib/store';

interface Props {
  state: any;
  descriptors: any;
  navigation: any;
}

export function TabBar({ state, descriptors, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const totalUnread = useChatStore((s) => s.getTotalUnread());

  const tabs = [
    { key: 'chat', label: 'Chat', route: state.routes[0] },
    { key: 'discover', label: 'Discover', route: state.routes[1] },
    { key: 'profile', label: 'Profile', route: state.routes[2] },
  ];

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {tabs.map((tab, index) => {
        const isFocused = state.index === index;
        const isCenter = index === 1;
        const color = isFocused ? Colors.primaryLight : Colors.textMuted;

        const onPress = () => {
          if (isFocused) {
            // Already on this tab — pop the inner stack back to its root
            // so e.g. tapping Profile while inside Settings goes to the main profile.
            const route = tab.route;
            const innerState = route?.state;
            if (innerState && Array.isArray(innerState.routes) && innerState.routes.length > 1) {
              navigation.navigate(route.name, { screen: innerState.routes[0].name });
            }
          } else {
            navigation.navigate(tab.route.name);
          }
        };

        if (isCenter) {
          return (
            <TouchableOpacity key={tab.key} onPress={onPress} activeOpacity={0.8} style={styles.centerBtn}>
              <LinearGradient
                colors={[...Gradients.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.centerGradient}
              >
                <DiscoverIcon size={28} color="#fff" filled={isFocused} />
              </LinearGradient>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity key={tab.key} onPress={onPress} activeOpacity={0.7} style={styles.tab}>
            <View style={styles.iconContainer}>
              {index === 0 ? (
                <ChatIcon size={24} color={color} filled={isFocused} />
              ) : (
                <ProfileIcon size={24} color={color} filled={isFocused} />
              )}
              {index === 0 && totalUnread > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{totalUnread}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, { color }]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: Colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 8,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 2,
  },
  iconContainer: {
    position: 'relative',
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
  },
  centerBtn: {
    marginTop: -20,
  },
  centerGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
