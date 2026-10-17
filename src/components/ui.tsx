import React from 'react';
import {
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  ImageStyle,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
  StyleProp,
  TextStyle,
} from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { colors as c, fonts as f } from '../lib/theme';
import { samplePhoto } from '../lib/samples';
import { PressableScale } from './PressableScale';
export function Type({
  children,
  style,
  kind = 'body',
  ...rest
}: React.ComponentProps<typeof Text> & { kind?: 'body' | 'title' | 'label' | 'small' }) {
  return (
    <Text
      {...rest}
      style={[
        styles.text,
        kind === 'title' && styles.title,
        kind === 'label' && styles.label,
        kind === 'small' && styles.small,
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Button({
  label,
  onPress,
  icon: Icon,
  variant = 'primary',
  disabled = false,
  busy = false,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: LucideIcon;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const color = variant === 'primary' ? c.white : variant === 'danger' ? c.error : c.ink;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy, busy }}
      onPress={onPress}
      disabled={disabled || busy}
      hoverStyle={{ opacity: 0.88 }}
      style={[
        styles.button,
        variant === 'primary' && { backgroundColor: c.purple },
        variant === 'secondary' && { backgroundColor: c.lavender },
        variant === 'ghost' && {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: c.line,
        },
        variant === 'danger' && { backgroundColor: c.pink },
        (disabled || busy) && { opacity: 0.45 },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={color} />
      ) : Icon ? (
        <Icon size={18} color={color} strokeWidth={1.8} />
      ) : null}
      <Type style={{ fontFamily: f.bold, color, fontSize: 14 }}>{label}</Type>
    </PressableScale>
  );
}
export function IconButton({
  icon: Icon,
  label,
  onPress,
  style,
  color = c.ink,
  disabled = false,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  color?: string;
  disabled?: boolean;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      scaleTo={0.92}
      hoverStyle={{ backgroundColor: c.lavender }}
      style={[styles.iconButton, disabled && { opacity: 0.4 }, style]}
    >
      <Icon size={21} color={color} strokeWidth={1.7} />
    </PressableScale>
  );
}
export function Chip({
  children,
  color = c.lavender,
  textColor = c.purple,
  icon: Icon,
}: {
  children: React.ReactNode;
  color?: string;
  textColor?: string;
  icon?: LucideIcon;
}) {
  return (
    <View style={[styles.chip, { backgroundColor: color }]}>
      {Icon && <Icon size={13} color={textColor} />}
      <Type style={{ color: textColor, fontFamily: f.medium, fontSize: 11 }}>{children}</Type>
    </View>
  );
}
export function Field({
  label,
  style,
  inline = false,
  ...props
}: TextInputProps & { label: string; inline?: boolean; style?: StyleProp<TextStyle> }) {
  return (
    <View style={[{ gap: 8 }, inline && { flex: 1 }]}>
      <Type kind="label">{label}</Type>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#A49EAF"
        {...props}
        style={[styles.input, style]}
      />
    </View>
  );
}
export function FoodPhoto({
  uri,
  source,
  style,
}: {
  uri?: string;
  source?: ImageSourcePropType;
  style?: StyleProp<ViewStyle>;
}) {
  const [failedSource, setFailedSource] = React.useState<ImageSourcePropType | string | null>(null);
  const currentSource = source || uri || null;
  const failed = failedSource !== null && failedSource === currentSource;
  if ((!uri && !source) || failed)
    return (
      <View
        style={[
          { backgroundColor: c.lavender, alignItems: 'center', justifyContent: 'center' },
          style,
        ]}
      >
        <Type style={{ fontSize: 34 }}>✧</Type>
        <Type kind="small">{failed ? 'Photo unavailable' : 'A little food memory'}</Type>
      </View>
    );
  return (
    <Image
      onError={() => setFailedSource(currentSource)}
      source={source || (uri?.startsWith('sample:') ? samplePhoto(uri) : { uri })}
      style={[style as StyleProp<ImageStyle>, { width: '100%', height: '100%' }]}
      resizeMode="cover"
      accessibilityLabel="Food photo"
    />
  );
}
export const styles = StyleSheet.create({
  text: { fontFamily: f.regular, color: c.ink, fontSize: 15, lineHeight: 23 },
  title: { fontFamily: f.displayBold, fontSize: 30, lineHeight: 36, letterSpacing: -1.1 },
  label: { fontFamily: f.bold, fontSize: 12, lineHeight: 18 },
  small: { color: c.muted, fontSize: 12, lineHeight: 19 },
  button: {
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: c.white,
  },
  chip: {
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  input: {
    minHeight: 49,
    backgroundColor: c.white,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 13,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontFamily: f.medium,
    fontSize: 15,
    color: c.ink,
  },
});
