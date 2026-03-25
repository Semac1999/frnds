import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, interpolate, SharedValue } from 'react-native-reanimated';
import { Colors } from '../constants/colors';
import { InterestTag } from './InterestTag';
import type { SwipeProfile } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  profile: SwipeProfile;
  isTop?: boolean;
  translateX?: SharedValue<number>;
  stackIndex?: number;
}

export function SwipeCard({ profile, isTop, translateX, stackIndex = 0 }: Props) {
  const animatedStyle = useAnimatedStyle(() => {
    if (!isTop || !translateX) {
      return {
        transform: [
          { scale: 1 - stackIndex * 0.04 },
          { translateY: stackIndex * 8 },
        ],
      };
    }
    const rotate = interpolate(translateX.value, [-SCREEN_WIDTH, 0, SCREEN_WIDTH], [-15, 0, 15]);
    return {
      transform: [
        { translateX: translateX.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const likeStyle = useAnimatedStyle(() => {
    if (!translateX) return { opacity: 0 };
    return { opacity: interpolate(translateX.value, [0, SCREEN_WIDTH / 4], [0, 1]) };
  });

  const nopeStyle = useAnimatedStyle(() => {
    if (!translateX) return { opacity: 0 };
    return { opacity: interpolate(translateX.value, [0, -SCREEN_WIDTH / 4], [0, 1]) };
  });

  return (
    <Animated.View style={[styles.card, animatedStyle, { zIndex: 10 - stackIndex }]}>
      <LinearGradient
        colors={[...profile.gradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.background}
      >
        <Text style={styles.avatarText}>{profile.avatar}</Text>
      </LinearGradient>
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.gradient} />

      {isTop && (
        <>
          <Animated.View style={[styles.stamp, styles.stampLike, likeStyle]}>
            <Text style={styles.stampText}>LIKE</Text>
          </Animated.View>
          <Animated.View style={[styles.stamp, styles.stampNope, nopeStyle]}>
            <Text style={[styles.stampText, { color: Colors.red }]}>NOPE</Text>
          </Animated.View>
        </>
      )}

      <View style={styles.info}>
        <Text style={styles.name}>
          {profile.displayName} <Text style={styles.age}>{profile.age}</Text>
        </Text>
        <Text style={styles.bio}>{profile.bio}</Text>
        <View style={styles.tags}>
          {profile.interests.slice(0, 3).map((tag) => (
            <InterestTag key={tag} label={tag} small />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: Colors.bgCard,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  background: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 80,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.2)',
    letterSpacing: 4,
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  info: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  name: { fontSize: 26, fontWeight: '800', color: '#fff' },
  age: { fontSize: 22, fontWeight: '400', color: Colors.textSecondary },
  bio: { fontSize: 14, color: Colors.textSecondary, marginTop: 4, marginBottom: 8 },
  tags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  stamp: {
    position: 'absolute',
    top: 50,
    padding: 8,
    paddingHorizontal: 16,
    borderWidth: 4,
    borderRadius: 12,
    zIndex: 10,
  },
  stampLike: {
    left: 20,
    borderColor: Colors.green,
    transform: [{ rotate: '-15deg' }],
  },
  stampNope: {
    right: 20,
    borderColor: Colors.red,
    transform: [{ rotate: '15deg' }],
  },
  stampText: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.green,
  },
});
