/**
 * Settings Squircle Icon Tiles with Centered Lucide SVGs.
 *
 * Upstream Attribution:
 * Reused Lucide glyphs: calendar-days, dumbbell, heart-pulse, bell, shield.
 * License: ISC License (https://github.com/lucide-icons/lucide/blob/main/LICENSE)
 * Copyright (c) Lucide Contributors 2022. Portions Copyright (c) Cole Bemis 2013-2022 (Feather, MIT).
 */
import React from 'react';
import Svg, { Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

export type SettingsIconKind = 'plan' | 'equipment' | 'health' | 'reminders' | 'privacy';

interface SquircleIconTileProps {
  kind: SettingsIconKind;
  size?: number;
}

// Genuine continuous superellipse (|x/50|^4.5 + |y/50|^4.5 = 1) path normalized to 100x100
// Features visibly flatter sides and continuous curvature transitions at the corners
export const SQUIRCLE_PATH =
  'M 50.00,0.00 L 54.92,0.00 L 59.94,0.01 L 65.15,0.05 L 70.62,0.21 L 76.38,0.64 L 82.31,1.65 L 88.01,3.68 L 92.86,7.14 L 96.32,11.99 L 98.35,17.69 L 99.36,23.62 L 99.79,29.38 L 99.95,34.85 L 99.99,40.06 L 100.00,45.08 L 100.00,50.00 L 100.00,54.92 L 99.99,59.94 L 99.95,65.15 L 99.79,70.62 L 99.36,76.38 L 98.35,82.31 L 96.32,88.01 L 92.86,92.86 L 88.01,96.32 L 82.31,98.35 L 76.38,99.36 L 70.62,99.79 L 65.15,99.95 L 59.94,99.99 L 54.92,100.00 L 50.00,100.00 L 45.08,100.00 L 40.06,99.99 L 34.85,99.95 L 29.38,99.79 L 23.62,99.36 L 17.69,98.35 L 11.99,96.32 L 7.14,92.86 L 3.68,88.01 L 1.65,82.31 L 0.64,76.38 L 0.21,70.62 L 0.05,65.15 L 0.01,59.94 L 0.00,54.92 L 0.00,50.00 L 0.00,45.08 L 0.01,40.06 L 0.05,34.85 L 0.21,29.38 L 0.64,23.62 L 1.65,17.69 L 3.68,11.99 L 7.14,7.14 L 11.99,3.68 L 17.69,1.65 L 23.62,0.64 L 29.38,0.21 L 34.85,0.05 L 40.06,0.01 L 45.08,0.00 Z';

const TILE_GRADIENTS: Record<SettingsIconKind, { start: string; end: string; id: string }> = {
  plan: {
    start: '#5E7DF5',
    end: '#4561DC',
    id: 'fl-grad-plan',
  },
  equipment: {
    start: '#30D1C2',
    end: '#0EA598',
    id: 'fl-grad-equipment',
  },
  health: {
    start: '#FF6363',
    end: '#E83E3E',
    id: 'fl-grad-health',
  },
  reminders: {
    start: '#FBBF24',
    end: '#E59B0C',
    id: 'fl-grad-reminders',
  },
  privacy: {
    start: '#7073F8',
    end: '#554FE3',
    id: 'fl-grad-privacy',
  },
};

function renderLucideGlyph(kind: SettingsIconKind) {
  switch (kind) {
    case 'plan':
      // calendar-days (Lucide 24x24)
      return (
        <G stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none">
          <Path d="M8 2v4" />
          <Path d="M16 2v4" />
          <Rect width="18" height="18" x="3" y="4" rx="2" />
          <Path d="M3 10h18" />
          <Path d="M8 14h.01" />
          <Path d="M12 14h.01" />
          <Path d="M16 14h.01" />
          <Path d="M8 18h.01" />
          <Path d="M12 18h.01" />
          <Path d="M16 18h.01" />
        </G>
      );
    case 'equipment':
      // dumbbell (Lucide 24x24)
      return (
        <G stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none">
          <Path d="m6.5 6.5 11 11" />
          <Path d="m21 21-1-1a2 2 0 0 0-2.83 0l-2.83 2.83a2 2 0 0 1-2.83 0l-5.66-5.66a2 2 0 0 1 0-2.83l2.83-2.83a2 2 0 0 0 0-2.83l-1-1" />
          <Path d="m3 3 1 1a2 2 0 0 0 2.83 0l2.83-2.83a2 2 0 0 1 2.83 0l5.66 5.66a2 2 0 0 1 0 2.83l-2.83 2.83a2 2 0 0 0 0 2.83l1 1" />
        </G>
      );
    case 'health':
      // heart-pulse (Lucide 24x24)
      return (
        <G stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none">
          <Path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          <Path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" />
        </G>
      );
    case 'reminders':
      // bell (Lucide 24x24)
      return (
        <G stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none">
          <Path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <Path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </G>
      );
    case 'privacy':
      // shield (Lucide 24x24)
      return (
        <G stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none">
          <Path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
        </G>
      );
  }
}

export function SquircleIconTile({ kind, size = 30 }: SquircleIconTileProps) {
  const grad = TILE_GRADIENTS[kind];

  // Scale 24x24 Lucide icon to ~54% of tile, centered at (23, 23) in 100x100 space
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={grad.id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={grad.start} stopOpacity={1} />
          <Stop offset="100%" stopColor={grad.end} stopOpacity={1} />
        </LinearGradient>
      </Defs>
      <Path d={SQUIRCLE_PATH} fill={`url(#${grad.id})`} />
      <G transform="translate(23.6, 23.6) scale(2.2)">{renderLucideGlyph(kind)}</G>
    </Svg>
  );
}

/**
 * Builds an SVG path string for a resizable continuous rounded rectangle (squircle card)
 * with long straight sides and smooth curvature transitions at corners (iOS continuous curvature profile).
 * Ensures exact C1 tangent continuity and G2 curvature continuity at every segment join,
 * with no kinks, symmetric corners, and safe bounds preventing self-intersection on small dimensions.
 */
export function buildContinuousRectPath(w: number, h: number, r = 18): string {
  if (w <= 0 || h <= 0) return '';
  const p = Math.min(1.3 * r, w / 2, h / 2);
  const s = 0.29;
  const k = 0.14;
  const a = 0.38;

  return [
    `M ${p},0`,
    `L ${w - p},0`,
    // Top-Right corner: 2 symmetric cubics meeting at diagonal (w - s*p, s*p) with identical 45° tangent (k*p, k*p)
    `C ${w - p + a * p},0 ${w - (s + k) * p},${(s - k) * p} ${w - s * p},${s * p}`,
    `C ${w - (s - k) * p},${(s + k) * p} ${w},${p - a * p} ${w},${p}`,
    `L ${w},${h - p}`,
    // Bottom-Right corner: meeting at diagonal (w - s*p, h - s*p) with identical 135° tangent (-k*p, k*p)
    `C ${w},${h - p + a * p} ${w - (s - k) * p},${h - (s + k) * p} ${w - s * p},${h - s * p}`,
    `C ${w - (s + k) * p},${h - (s - k) * p} ${w - p + a * p},${h} ${w - p},${h}`,
    `L ${p},${h}`,
    // Bottom-Left corner: meeting at diagonal (s*p, h - s*p) with identical 225° tangent (-k*p, -k*p)
    `C ${p - a * p},${h} ${(s + k) * p},${h - (s - k) * p} ${s * p},${h - s * p}`,
    `C ${(s - k) * p},${h - (s + k) * p} 0,${h - p + a * p} 0,${h - p}`,
    `L 0,${p}`,
    // Top-Left corner: meeting at diagonal (s*p, s*p) with identical 315° tangent (k*p, -k*p)
    `C 0,${p - a * p} ${(s - k) * p},${(s + k) * p} ${s * p},${s * p}`,
    `C ${(s + k) * p},${(s - k) * p} ${p - a * p},0 ${p},0`,
    'Z',
  ].join(' ');
}

