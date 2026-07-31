/* Kasavu identity tokens, ported from the PWA's :root CSS variables. */

export const C = {
  cotton: '#FAF7F0',
  paper: '#FFFFFF',
  ink: '#20291F',
  inkSoft: '#5C6657',
  green: '#0E5A3C',
  greenDeep: '#0A3F2A',
  greenTint: '#E7F0EA',
  gold: '#C9A227',
  goldSoft: '#EFE3BC',
  red: '#A63A2B',
  redTint: '#F6E7E2',
  line: '#E7E1D2',
  whatsapp: '#1FAF5A',
  scrim: 'rgba(24,30,22,0.45)',
} as const;

export const RADIUS = 16;

export const FONT = {
  regular: 'BalooChettan2_400Regular',
  medium: 'BalooChettan2_500Medium',
  semibold: 'BalooChettan2_600SemiBold',
  bold: 'BalooChettan2_700Bold',
} as const;

export const SHADOW = {
  boxShadow: '0 1px 3px rgba(32, 41, 31, 0.08)',
} as const;

export const FAB_SHADOW = {
  boxShadow: '0 4px 14px rgba(10, 63, 42, 0.35)',
} as const;
