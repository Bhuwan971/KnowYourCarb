import type { ViewStyle } from 'react-native';

// Neutral surfaces and a single violet accent keep the food and numbers in focus.
export const colors = {
  bg: '#FAFAF9',
  surface: '#FFFFFF',
  surfaceAlt: '#F4F4F2',
  ink: '#14121C',
  inkSoft: '#3E3A4D',
  muted: '#706D79',
  faint: '#B4B0C0',
  line: '#E9E8EC',
  purple: '#6550C8',
  purpleDeep: '#5341AB',
  purpleGlow: '#9A86FF',
  lavender: '#F0EDF8',
  lavenderDeep: '#DCD4FF',
  lime: '#D9F56A',
  limeInk: '#3F5417',
  limeSoft: '#EEF9C7',
  butter: '#FFEFC4',
  butterInk: '#7A5A10',
  white: '#FFFFFF',
  pink: '#FFE2E9',
  pinkInk: '#B0304C',
  error: '#D23B5A',
  night: '#131020',
  nightSoft: '#221E33',
  nightLine: 'rgba(255,255,255,0.1)',
};
export const fonts = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  bold: 'DMSans_700Bold',
  display: 'SpaceGrotesk_500Medium',
  displayBold: 'SpaceGrotesk_700Bold',
};
export const radius = { sm: 10, md: 12, lg: 16, xl: 20, xxl: 24, pill: 999 };
export const gradients = {
  purple: ['#8B6CFF', '#5B3FE8'] as const,
  purpleSoft: ['#F1EDFF', '#E4DDFF'] as const,
  night: ['#2A2440', '#131020'] as const,
  lime: ['#E8FC95', '#CBEE4E'] as const,
  photoTop: ['rgba(10,8,20,0.45)', 'rgba(10,8,20,0)'] as const,
  photoBottom: ['rgba(10,8,20,0)', 'rgba(10,8,20,0.78)'] as const,
};
// Subtle elevation is reserved for controls and overlays.
export const shadow = {
  soft: {
    boxShadow: '0 1px 2px rgba(20,18,28,0.03)',
  } as ViewStyle,
  card: {
    boxShadow: '0 1px 3px rgba(20,18,28,0.04)',
  } as ViewStyle,
  float: { boxShadow: '0 2px 12px rgba(20,18,28,0.07)' } as ViewStyle,
  purple: { boxShadow: '0 1px 2px rgba(20,18,28,0.04)' } as ViewStyle,
  lime: { boxShadow: '0 1px 2px rgba(20,18,28,0.04)' } as ViewStyle,
};
