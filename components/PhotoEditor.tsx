import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, Alert, TextInput,
  ScrollView, Modal, useWindowDimensions, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients } from '../constants/colors';
import { BackIcon, TextIcon, TrashIcon, PlusIcon } from './Icons';
import { encodeEditedPhoto, PhotoSticker } from '../lib/photo-format';

const EMOJI_PALETTE = ['😍', '🔥', '✨', '💜', '🌈', '🎉', '☀️', '🌙', '⭐', '💫', '📸', '🎵', '🍕', '☕', '🌸', '🦋', '🌊', '🏖️'];
const COLOR_PALETTE = ['#ffffff', '#fd79a8', '#6C5CE7', '#fdcb6e', '#00b894', '#74b9ff', '#ff6b6b', '#000000'];

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Called with an encoded photo string (raw or frnds:photo:v1:...) */
  onSave: (encoded: string) => Promise<void> | void;
  /** Optional: launch with this photo pre-loaded (skips the pick step) */
  initialPhoto?: string | null;
}

export function PhotoEditor({ visible, onClose, onSave, initialPhoto }: Props) {
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  // Portrait 9:16 canvas
  const editorWidth = Math.min(SCREEN_WIDTH - 24, 320);
  const editorHeight = Math.min(SCREEN_HEIGHT * 0.55, (editorWidth * 16) / 9);

  const [photoUri, setPhotoUri] = useState<string | null>(initialPhoto || null);
  const [stickers, setStickers] = useState<PhotoSticker[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [textModalOpen, setTextModalOpen] = useState(false);
  const [textDraft, setTextDraft] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [saving, setSaving] = useState(false);

  // Reset on every open
  React.useEffect(() => {
    if (visible) {
      setPhotoUri(initialPhoto || null);
      setStickers([]);
      setSelectedId(null);
    }
  }, [visible]);

  const pickPhoto = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to pick a picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
      setPhotoUri(uri);
      setStickers([]);
    }
  }, []);

  // Auto-launch picker when opened with no photo
  React.useEffect(() => {
    if (visible && !photoUri && !initialPhoto) {
      // Small delay so the modal is fully visible first
      const t = setTimeout(() => pickPhoto(), 200);
      return () => clearTimeout(t);
    }
  }, [visible]);

  const addEmoji = useCallback((emoji: string) => {
    const id = `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setStickers((prev) => [
      ...prev,
      { id, type: 'emoji', text: emoji, x: 0.5, y: 0.5, size: 56, rotation: 0, color: '#fff' },
    ]);
    setSelectedId(id);
  }, []);

  const addText = useCallback(() => {
    const t = textDraft.trim();
    if (!t) return;
    const id = `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setStickers((prev) => [
      ...prev,
      { id, type: 'text', text: t, x: 0.5, y: 0.5, size: 32, rotation: 0, color: textColor },
    ]);
    setSelectedId(id);
    setTextDraft('');
    setTextModalOpen(false);
  }, [textDraft, textColor]);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    setStickers((prev) => prev.filter((s) => s.id !== selectedId));
    setSelectedId(null);
  }, [selectedId]);

  const updateSticker = useCallback((id: string, patch: Partial<PhotoSticker>) => {
    setStickers((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const handleSave = useCallback(async () => {
    if (!photoUri) {
      Alert.alert('No photo', 'Pick a photo first.');
      return;
    }
    if (saving) return;
    setSaving(true);
    const encoded = stickers.length > 0
      ? encodeEditedPhoto({ photo: photoUri, stickers })
      : photoUri;
    try {
      await onSave(encoded);
      setSaving(false);
    } catch (err: any) {
      setSaving(false);
      Alert.alert('Could not save', err?.message || 'Please try again');
    }
  }, [photoUri, stickers, saving, onSave]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <BackIcon size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Photo</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving || !photoUri} hitSlop={12}>
            {saving ? <ActivityIndicator color={Colors.primaryLight} /> : (
              <Text style={[styles.saveBtn, (!photoUri) && { opacity: 0.4 }]}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        {!photoUri ? (
          <View style={styles.pickBody}>
            <Text style={styles.pickIcon}>📸</Text>
            <Text style={styles.pickTitle}>Pick a photo to get creative</Text>
            <Text style={styles.pickHint}>Add stickers, emojis, and your own text. Drag them anywhere on the photo.</Text>
            <TouchableOpacity onPress={pickPhoto} activeOpacity={0.85}>
              <LinearGradient colors={[...Gradients.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.pickBtn}>
                <PlusIcon size={20} color="#fff" />
                <Text style={styles.pickBtnText}>Choose Photo</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll}>
            <TouchableOpacity activeOpacity={1} onPress={() => setSelectedId(null)}>
              <View style={[styles.canvas, { width: editorWidth, height: editorHeight }]}>
                <Image source={{ uri: photoUri }} style={{ width: editorWidth, height: editorHeight }} resizeMode="cover" />
                {stickers.map((s) => (
                  <DraggableSticker
                    key={s.id}
                    sticker={s}
                    containerWidth={editorWidth}
                    containerHeight={editorHeight}
                    selected={s.id === selectedId}
                    onSelect={() => setSelectedId(s.id)}
                    onChange={(patch) => updateSticker(s.id, patch)}
                  />
                ))}
              </View>
            </TouchableOpacity>

            <View style={styles.toolbar}>
              <TouchableOpacity style={styles.toolBtn} onPress={() => setTextModalOpen(true)}>
                <TextIcon size={22} color={Colors.text} />
                <Text style={styles.toolText}>Text</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolBtn} onPress={pickPhoto}>
                <PlusIcon size={22} color={Colors.text} />
                <Text style={styles.toolText}>Replace</Text>
              </TouchableOpacity>
              {selectedId ? (
                <TouchableOpacity style={[styles.toolBtn, styles.toolBtnDanger]} onPress={deleteSelected}>
                  <TrashIcon size={22} color={Colors.red} />
                  <Text style={[styles.toolText, { color: Colors.red }]}>Delete</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <Text style={styles.sectionLabel}>Stickers</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.palette}>
              {EMOJI_PALETTE.map((e) => (
                <TouchableOpacity key={e} style={styles.emojiBtn} onPress={() => addEmoji(e)} activeOpacity={0.7}>
                  <Text style={styles.emojiText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {selectedId ? <SizeControls stickers={stickers} selectedId={selectedId} onChange={updateSticker} /> : null}

            <Text style={styles.tip}>Tip: tap a sticker to select, then drag to move.</Text>
          </ScrollView>
        )}

        <Modal visible={textModalOpen} transparent animationType="fade" onRequestClose={() => setTextModalOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <Text style={styles.modalTitle}>Add text</Text>
              <TextInput
                style={[styles.modalInput, { color: textColor }]}
                placeholder="Type something fun…"
                placeholderTextColor={Colors.textMuted}
                value={textDraft}
                onChangeText={setTextDraft}
                autoFocus
                maxLength={40}
              />
              <View style={styles.colorRow}>
                {COLOR_PALETTE.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.colorDot, { backgroundColor: c }, textColor === c && styles.colorDotActive]}
                    onPress={() => setTextColor(c)}
                  />
                ))}
              </View>
              <View style={styles.modalRow}>
                <TouchableOpacity style={[styles.modalBtn, styles.modalBtnGhost]} onPress={() => setTextModalOpen(false)}>
                  <Text style={styles.modalBtnGhostText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={addText}>
                  <Text style={styles.modalBtnPrimaryText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

function DraggableSticker({
  sticker, containerWidth, containerHeight, selected, onSelect, onChange,
}: {
  sticker: PhotoSticker;
  containerWidth: number;
  containerHeight: number;
  selected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<PhotoSticker>) => void;
}) {
  const tx = useSharedValue(sticker.x * containerWidth);
  const ty = useSharedValue(sticker.y * containerHeight);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  React.useEffect(() => {
    tx.value = sticker.x * containerWidth;
    ty.value = sticker.y * containerHeight;
  }, [sticker.x, sticker.y, containerWidth, containerHeight]);

  const commitPosition = useCallback((x: number, y: number) => {
    onChange({
      x: Math.max(0, Math.min(1, x / containerWidth)),
      y: Math.max(0, Math.min(1, y / containerHeight)),
    });
  }, [containerWidth, containerHeight, onChange]);

  const tap = Gesture.Tap().onStart(() => { runOnJS(onSelect)(); });
  const pan = Gesture.Pan()
    .onStart(() => {
      startX.value = tx.value;
      startY.value = ty.value;
      runOnJS(onSelect)();
    })
    .onUpdate((e) => {
      tx.value = Math.max(0, Math.min(containerWidth, startX.value + e.translationX));
      ty.value = Math.max(0, Math.min(containerHeight, startY.value + e.translationY));
    })
    .onEnd(() => {
      runOnJS(commitPosition)(tx.value, ty.value);
    });

  const composed = Gesture.Simultaneous(tap, pan);

  const animStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: tx.value,
    top: ty.value,
    transform: [
      { translateX: -sticker.size },
      { translateY: -sticker.size / 2 },
      { rotate: `${sticker.rotation || 0}deg` },
    ],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={animStyle}>
        <View style={[
          { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
          selected && { borderWidth: 1.5, borderColor: '#fff', borderStyle: 'dashed' },
        ]}>
          <Text style={{
            fontSize: sticker.size,
            color: sticker.color,
            fontWeight: '800',
            textShadowColor: 'rgba(0,0,0,0.45)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 4,
          }}>
            {sticker.text}
          </Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

function SizeControls({
  stickers, selectedId, onChange,
}: {
  stickers: PhotoSticker[];
  selectedId: string;
  onChange: (id: string, patch: Partial<PhotoSticker>) => void;
}) {
  const sticker = stickers.find((s) => s.id === selectedId);
  if (!sticker) return null;
  const adjust = (delta: number) => onChange(sticker.id, { size: Math.max(14, Math.min(140, sticker.size + delta)) });
  const rotate = (delta: number) => onChange(sticker.id, { rotation: (sticker.rotation || 0) + delta });
  return (
    <View style={styles.controlsRow}>
      <Text style={styles.sectionLabel}>Adjust</Text>
      <View style={styles.controlsButtons}>
        <TouchableOpacity style={styles.controlBtn} onPress={() => adjust(-6)}><Text style={styles.controlText}>A-</Text></TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn} onPress={() => adjust(6)}><Text style={styles.controlText}>A+</Text></TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn} onPress={() => rotate(-15)}><Text style={styles.controlText}>↺</Text></TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn} onPress={() => rotate(15)}><Text style={styles.controlText}>↻</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { color: Colors.text, fontSize: 17, fontWeight: '700' },
  saveBtn: { color: Colors.primaryLight, fontWeight: '700', fontSize: 15 },
  scroll: { padding: 12, alignItems: 'center', paddingBottom: 60 },
  pickBody: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  pickIcon: { fontSize: 56 },
  pickTitle: { color: Colors.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  pickHint: { color: Colors.textMuted, textAlign: 'center', maxWidth: 300, marginBottom: 12 },
  pickBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 999 },
  pickBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  canvas: { backgroundColor: Colors.bgElevated, borderRadius: 18, overflow: 'hidden', marginBottom: 12 },
  toolbar: { flexDirection: 'row', gap: 10, marginVertical: 10 },
  toolBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  toolBtnDanger: { borderColor: Colors.red },
  toolText: { color: Colors.text, fontWeight: '700', fontSize: 13 },
  sectionLabel: { alignSelf: 'flex-start', color: Colors.textMuted, fontWeight: '700', fontSize: 12, marginTop: 12, marginBottom: 6, letterSpacing: 0.5 },
  palette: { gap: 8, paddingVertical: 4 },
  emojiBtn: { width: 46, height: 46, backgroundColor: Colors.bgCard, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  emojiText: { fontSize: 24 },
  controlsRow: { width: '100%', alignItems: 'flex-start' },
  controlsButtons: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  controlBtn: { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: Colors.bgCard, borderRadius: 10, borderWidth: 1, borderColor: Colors.border },
  controlText: { color: Colors.text, fontWeight: '700' },
  tip: { marginTop: 14, color: Colors.textMuted, fontSize: 12, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalSheet: { width: '100%', backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: Colors.border },
  modalTitle: { color: Colors.text, fontSize: 17, fontWeight: '700' },
  modalInput: { backgroundColor: Colors.bgInput, padding: 12, borderRadius: 10, fontSize: 18, fontWeight: '700' },
  colorRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  colorDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: Colors.border },
  colorDotActive: { borderColor: Colors.primary, borderWidth: 3 },
  modalRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 },
  modalBtnGhost: { backgroundColor: Colors.bgElevated },
  modalBtnGhostText: { color: Colors.textSecondary, fontWeight: '700' },
  modalBtnPrimary: { backgroundColor: Colors.primary },
  modalBtnPrimaryText: { color: '#fff', fontWeight: '800' },
});
