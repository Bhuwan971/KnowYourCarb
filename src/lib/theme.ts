import { cubicBezier } from 'react-native-reanimated';
import type { ViewStyle } from 'react-native';

// A cool, high-contrast palette: deep ink on a soft violet-grey canvas, one vivid accent,
// and a few bright signal tones. Every surface floats on shadow rather than a hairline border.
export const colors = {
  bg: '#F4F3F9',
  surface: '#FFFFFF',
  surfaceAlt: '#F8F7FC',
  ink: '#14121C',
  inkSoft: '#3E3A4D',
  muted: '#7C788B',
  faint: '#B4B0C0',
  line: '#ECEAF2',
  purple: '#6B4EF6',
  purpleDeep: '#4D33DB',
  purpleGlow: '#9A86FF',
  lavender: '#EEEAFF',
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
export const radius = { sm: 12, md: 16, lg: 22, xl: 28, xxl: 34, pill: 999 };
export const gradients = {
  purple: ['#8B6CFF', '#5B3FE8'] as const,
  purpleSoft: ['#F1EDFF', '#E4DDFF'] as const,
  night: ['#2A2440', '#131020'] as const,
  lime: ['#E8FC95', '#CBEE4E'] as const,
  photoTop: ['rgba(10,8,20,0.45)', 'rgba(10,8,20,0)'] as const,
  photoBottom: ['rgba(10,8,20,0)', 'rgba(10,8,20,0.78)'] as const,
};
// Elevation as layered shadows; `boxShadow` is supported natively since RN 0.76.
export const shadow = {
  soft: {
    boxShadow: '0 1px 2px rgba(20,18,28,0.04), 0 4px 14px rgba(20,18,28,0.05)',
  } as ViewStyle,
  card: {
    boxShadow: '0 1px 2px rgba(20,18,28,0.04), 0 10px 30px rgba(20,18,28,0.07)',
  } as ViewStyle,
  float: { boxShadow: '0 18px 44px rgba(20,18,28,0.16)' } as ViewStyle,
  purple: { boxShadow: '0 10px 26px rgba(107,78,246,0.34)' } as ViewStyle,
  lime: { boxShadow: '0 8px 22px rgba(217,245,106,0.45)' } as ViewStyle,
};
// Strong ease-out for UI; never ease-in on something the person is watching.
// Reanimated CSS transitions only accept predefined strings or a cubicBezier() object, not a CSS string.
export const easeOut = cubicBezier(0.23, 1, 0.32, 1);
