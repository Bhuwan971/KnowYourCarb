import { cubicBezier } from 'react-native-reanimated';

export const colors = {
  bg: '#FAF9F6',
  ink: '#282632',
  inkSoft: '#4A4657',
  muted: '#827E8E',
  line: '#EAE7EF',
  purple: '#7960D9',
  purpleDeep: '#5B43B8',
  lavender: '#EEE8FF',
  lime: '#DDF2A4',
  limeInk: '#4F6332',
  butter: '#FBF0C9',
  butterInk: '#81621A',
  white: '#FFFFFF',
  pink: '#F7E5EB',
  pinkInk: '#9A3B4C',
  error: '#A94352',
};
export const fonts = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  bold: 'DMSans_700Bold',
  display: 'SpaceGrotesk_500Medium',
  displayBold: 'SpaceGrotesk_700Bold',
};
// Strong ease-out for UI; never ease-in on something the person is watching.
// Reanimated CSS transitions only accept predefined strings or a cubicBezier() object, not a CSS string.
export const easeOut = cubicBezier(0.23, 1, 0.32, 1);
