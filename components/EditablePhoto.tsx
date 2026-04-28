import React, { useMemo } from 'react';
import { View, Text, Image, StyleSheet, ViewStyle, ImageStyle, useWindowDimensions } from 'react-native';
import { Colors } from '../constants/colors';
import { decodeEditedPhoto, PhotoSticker } from '../lib/photo-format';

interface Props {
  /** Raw photo string OR encoded edited-photo string (frnds:photo:v1:...) */
  value: string | null | undefined;
  /** Width of the rendered photo (square). */
  size: number;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
  /** If true, draws sticker overlays. Default true. */
  showStickers?: boolean;
  /** Round corners */
  radius?: number;
}

const REFERENCE_WIDTH = 320;

export function EditablePhoto({ value, size, style, imageStyle, showStickers = true, radius = 16 }: Props) {
  const decoded = useMemo(() => decodeEditedPhoto(value || ''), [value]);
  const photoUri = decoded ? decoded.photo : (value || '');
  const stickers = decoded?.stickers || [];

  if (!photoUri) {
    return (
      <View style={[styles.placeholder, { width: size, height: size, borderRadius: radius }, style]} />
    );
  }

  const scaleFactor = size / REFERENCE_WIDTH;

  return (
    <View style={[{ width: size, height: size, borderRadius: radius, overflow: 'hidden' }, style]}>
      <Image source={{ uri: photoUri }} style={[{ width: size, height: size }, imageStyle]} resizeMode="cover" />
      {showStickers && stickers.map((s) => (
        <StickerView key={s.id} sticker={s} container={size} scale={scaleFactor} />
      ))}
    </View>
  );
}

function StickerView({ sticker, container, scale }: { sticker: PhotoSticker; container: number; scale: number }) {
  const fontSize = Math.max(8, sticker.size * scale);
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: sticker.x * container,
        top: sticker.y * container,
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
