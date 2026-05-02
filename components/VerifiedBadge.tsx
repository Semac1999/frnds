import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

/**
 * Blue verification checkmark — like Wizz's, Twitter's, etc.
 * Renders inline next to display names.
 */
export function VerifiedBadge({ size = 14 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {/* Subtle 8-point star/scallop background */}
      <Path
        d="M12 2l1.95 1.65L16.5 3l.84 2.4L19.7 6l.06 2.55L21.4 10l-.95 2.4L21.4 14l-1.65 1.45L19.7 18l-2.36.6L16.5 21l-2.55-.65L12 22l-1.95-1.65L7.5 21l-.84-2.4L4.3 18l-.06-2.55L2.6 14l.95-2.4L2.6 10l1.65-1.45L4.3 6l2.36-.6L7.5 3l2.55.65L12 2z"
        fill="#1DA1F2"
      />
      {/* White checkmark */}
      <Path
        d="M9.5 12.6l1.9 1.9 4-4.6"
        stroke="#fff"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
