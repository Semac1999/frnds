import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Gradients } from '../constants/colors';
import { EditablePhoto } from './EditablePhoto';
import { InterestTag } from './InterestTag';
import { CloseIcon, PinIcon } from './Icons';
import { getCountry } from '../constants/countries';
import type { User } from '../types';

interface Props {
  visible: boolean;
  user: User | null;
  onClose: () => void;
}

/**
 * Shows the user's profile the way other people see it on the Discover card.
 */
export function ProfilePreview({ visible, user, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH } = useWindowDimensions();

  if (!user) return null;

  const photos: string[] = [
    ...(user.photo ? [user.photo] : []),
    ...((user.photos as string[] | undefined) || []),
  ];
  const country = getCountry(user.country);

  const photoWidth = SCREEN_WIDTH - 32;
  const photoHeight = Math.min(photoWidth * 1.4, 480);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>PROFILE PREVIEW</Text>
            <Text style={styles.headerTitle}>How others see you</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <CloseIcon size={26} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
          {/* Main card */}
          <View style={[styles.card, { width: photoWidth, height: photoHeight }]}>
            {photos[0] ? (
              <EditablePhoto value={photos[0]} width={photoWidth} height={photoHeight} radius={20} />
            ) : (
              <LinearGradient
                colors={[...Gradients.primary]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={[styles.placeholder, { width: photoWidth, height: photoHeight }]}
              >
                <Text style={styles.placeholderInitials}>{user.avatar}</Text>
              </LinearGradient>
            )}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.88)']}
              style={[StyleSheet.absoluteFillObject, { borderRadius: 20 }]}
              pointerEvents="none"
            />
            <View style={styles.cardInfo} pointerEvents="none">
              <Text style={styles.cardName}>
                {user.displayName} <Text style={styles.cardAge}>{user.age}</Text>
              </Text>
              {country && (
                <View style={styles.locationRow}>
                  <PinIcon size={12} color={Colors.textSecondary} />
                  <Text style={styles.locationText}>{country.flag} {country.name}</Text>
                </View>
              )}
              {user.bio ? <Text style={styles.cardBio} numberOfLines={3}>{user.bio}</Text> : null}
              {user.interests.length > 0 && (
                <View style={styles.cardTags}>
                  {user.interests.slice(0, 4).map((t) => (
                    <View key={t} style={styles.cardTag}>
                      <Text style={styles.cardTagText}>{t}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Extra photos grid */}
          {photos.length > 1 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>More photos</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {photos.slice(1).map((p, i) => (
                  <EditablePhoto key={i} value={p} width={120} height={180} radius={14} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Vibes */}
          {user.interests.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Vibes</Text>
              <View style={styles.tagsList}>
                {user.interests.map((tag) => <InterestTag key={tag} label={tag} selected />)}
              </View>
            </View>
          )}

          <Text style={styles.tip}>This is how your card will appear in Discover. Looking good 💜</Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 12,
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  eyebrow: { color: Colors.primaryLight, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  headerTitle: { color: Colors.text, fontSize: 20, fontWeight: '800', marginTop: 2 },

  card: { borderRadius: 20, overflow: 'hidden', alignSelf: 'center', backgroundColor: Colors.bgElevated },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  placeholderInitials: { color: '#fff', fontSize: 96, fontWeight: '900', letterSpacing: -2 },
  cardInfo: { position: 'absolute', left: 18, right: 18, bottom: 18 },
  cardName: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  cardAge: { fontWeight: '500', color: 'rgba(255,255,255,0.85)' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  locationText: { color: Colors.textSecondary, fontSize: 13 },
  cardBio: { color: 'rgba(255,255,255,0.95)', fontSize: 14, marginTop: 8, lineHeight: 20 },
  cardTags: { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  cardTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)' },
  cardTagText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  section: { marginTop: 20 },
  sectionTitle: { color: Colors.text, fontSize: 15, fontWeight: '800', marginBottom: 10, letterSpacing: 0.4 },
  tagsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tip: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 24 },
});
