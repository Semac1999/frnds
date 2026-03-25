import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableWithoutFeedback, TouchableOpacity, TextInput, Dimensions, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, type SharedValue } from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { useStoryStore } from '../../lib/store';
import { Avatar } from '../../components/Avatar';
import { CloseIcon, SendIcon } from '../../components/Icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STORY_DURATION = 5000;

export default function StoryViewerScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const insets = useSafeAreaInsets();
  const storyGroups = useStoryStore((s) => s.storyGroups);
  const markSeen = useStoryStore((s) => s.markSeen);

  const group = storyGroups.find((g) => g.userId === userId);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reply, setReply] = useState('');
  const progress = useSharedValue(0);

  const story = group?.stories[currentIndex];

  const startTimer = useCallback(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: STORY_DURATION });
  }, [currentIndex]);

  useEffect(() => {
    startTimer();
    const timer = setTimeout(() => nextStory(), STORY_DURATION);
    return () => clearTimeout(timer);
  }, [currentIndex]);

  const nextStory = () => {
    if (!group) return;
    if (currentIndex < group.stories.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      markSeen(userId!);
      router.back();
    }
  };

  const prevStory = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const handleReply = () => {
    if (!reply.trim()) return;
    Alert.alert('Reply sent!');
    setReply('');
  };

  const handleTap = (x: number) => {
    if (x > SCREEN_WIDTH / 2) nextStory();
    else prevStory();
  };

  if (!group || !story) {
    router.back();
    return null;
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[...story.background]} style={StyleSheet.absoluteFill} />

      {/* Progress bars */}
      <View style={[styles.progressBar, { marginTop: insets.top + 8 }]}>
        {group.stories.map((_, i) => (
          <View key={i} style={styles.progressSegment}>
            <ProgressFill index={i} currentIndex={currentIndex} progress={progress} />
          </View>
        ))}
      </View>

      {/* Header */}
      <View style={[styles.header, { marginTop: insets.top + 20 }]}>
        <View style={styles.userInfo}>
          <Avatar initials={group.userAvatar} size={36} />
          <Text style={styles.userName}>{group.userName}</Text>
          <Text style={styles.storyTime}>{story.time}</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <CloseIcon size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <TouchableWithoutFeedback onPress={(e) => handleTap(e.nativeEvent.locationX)}>
        <View style={styles.content}>
          <Text style={styles.storyText}>{story.content}</Text>
        </View>
      </TouchableWithoutFeedback>

      {/* Reply */}
      <View style={[styles.replyBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TextInput
          style={styles.replyInput}
          placeholder="Reply to story..."
          placeholderTextColor="rgba(255,255,255,0.5)"
          value={reply}
          onChangeText={setReply}
        />
        <TouchableOpacity style={styles.replyBtn} onPress={handleReply}>
          <SendIcon size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ProgressFill({ index, currentIndex, progress }: { index: number; currentIndex: number; progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    width: index < currentIndex ? '100%' : index === currentIndex ? `${progress.value * 100}%` : '0%',
  }));

  return <Animated.View style={[styles.progressFill, style]} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  progressBar: { flexDirection: 'row', gap: 4, paddingHorizontal: 12, zIndex: 10 },
  progressSegment: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 2 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, zIndex: 10 },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  userName: { fontSize: 14, fontWeight: '600', color: '#fff' },
  storyTime: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  storyText: { fontSize: 28, fontWeight: '700', color: '#fff', textAlign: 'center', maxWidth: 300, lineHeight: 40 },
  replyBar: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  replyInput: { flex: 1, padding: 10, paddingHorizontal: 14, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 20, color: '#fff', fontSize: 14 },
  replyBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
});
