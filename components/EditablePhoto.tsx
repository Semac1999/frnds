import React, { useMemo } from 'react';
import { View, Text, Image, StyleSheet, ViewStyle, ImageStyle } from 'react-native';
import { Colors } from '../constants/colors';
import { decodeEditedPhoto, PhotoSticker } from '../lib/photo-format';

interface Props {
  /** Raw photo string OR encoded edited-photo string (frnds:photo:v1:...) */
  value: string | null | undefined;
  /** Render width. */
  width: number;
  /** Render height. Defaults to width (square). */
  height?: number;
  /** @deprecated Use width/height. Kept for backwards compat. */
  size?: number;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
  /** If true, draws sticker overlays. Default true. */
  showStickers?: boolean;
  /** Round corners */
  radius?: number;
}

const REFERENCE_DIM = 320;

export function EditablePhoto({ value, width, height, size, style, imageStyle, showStickers = true, radius = 16 }: Props) {
  const decoded = useMemo(() => decodeEditedPhoto(value || ''), [value]);
  const photoUri = decoded ? decoded.photo : (value || '');
  const stickers = decoded?.stickers || [];

  // Backwards compat: `size` sets a square
  const w = width ?? size ?? 0;
  const h = height ?? size ?? width ?? 0;

  if (!photoUri) {
    return (
      <View style={[styles.placeholder, { width: w, height: h, borderRadius: radius }, style]} />
    );
  }

  // Use the smaller dim as scale reference so stickers don't blow out on tall photos
  const scaleFactor = Math.min(w, h) / REFERENCE_DIM;

  return (
    <View style={[{ width: w, height: h, borderRadius: radius, overflow: 'hidden' }, style]}>
      <Image source={{ uri: photoUri }} style={[{ width: w, height: h }, imageStyle]} resizeMode="cover" />
      {showStickers && stickers.map((s) => (
        <StickerView key={s.id} sticker={s} containerWidth={w} containerHeight={h} scale={scaleFactor} />
      ))}
    </View>
  );
}

function StickerView({
  sticker, containerWidth, containerHeight, scale,
}: { sticker: PhotoSticker; containerWidth: number; containerHeight: number; scale: number }) {
  const fontSize = Math.max(8, sticker.size * scale);
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: sticker.x * containerWidth,
        top: sticker.y * containerHeight,
        transform: [
          { translateX: -fontSize },
          { translateY: -fontSize / 2 },
          { rotate: `${sticker.rotation || 0}deg` },
        ],
      }}
    >
      <Text
        style={{
          fontSize,
          color: sticker.color || '#fff',
          fontWeight: '800',
          textShadowColor: 'rgba(0,0,0,0.45)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 4,
        }}
      >
        {sticker.text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { backgroundColor: Colors.bgElevated },
});
