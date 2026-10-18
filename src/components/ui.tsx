import React, { useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { LucideIcon } from 'lucide-react-native';
import { colors as c, fonts as f, gradients, radius, shadow } from '../lib/theme';
import { samplePhoto } from '../lib/samples';
import { PressableScale } from './PressableScale';

type Kind = 'display' | 'title' | 'heading' | 'body' | 'label' | 'small' | 'eyebrow' | 'caption';
export function Type({
  children,
  style,
  kind = 'body',
  ...rest
}: React.ComponentProps<typeof Text> & { kind?: Kind }) {
  return (
    <Text
      {...rest}
      style={[
        styles.text,
        kind === 'display' && styles.display,
        kind === 'title' && styles.title,
        kind === 'heading' && styles.heading,
        kind === 'label' && styles.label,
        kind === 'small' && styles.small,
        kind === 'eyebrow' && styles.eyebrow,
        kind === 'caption' && styles.caption,
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
  size = 'md',
  disabled = false,
  busy = false,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: LucideIcon;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark' | 'lime';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const color =
    variant === 'primary' || variant === 'dark'
      ? c.white
      : variant === 'danger'
        ? c.error
        : variant === 'secondary'
          ? c.purpleDeep
          : variant === 'lime'
            ? c.limeInk
            : c.ink;
  const off = disabled || busy;
  const height = size === 'lg' ? 58 : size === 'sm' ? 40 : 50;
  const content = (
    <>
      {busy ? (
        <ActivityIndicator size="small" color={color} />
      ) : Icon ? (
        <Icon size={size === 'sm' ? 15 : 18} color={color} strokeWidth={2} />
      ) : null}
      <Type
        style={{
          fontFamily: f.bold,
          color,
          fontSize: size === 'lg' ? 16 : size === 'sm' ? 13 : 15,
          lineHeight: 20,
        }}
      >
        {label}
      </Type>
    </>
  );
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: off, busy }}
      onPress={onPress}
      disabled={off}
      hoverStyle={{ opacity: 0.9 }}
      style={[
        styles.button,
        { minHeight: height, paddingHorizontal: size === 'sm' ? 14 : 22 },
        variant === 'primary' && [{ backgroundColor: c.purple }, !off && shadow.purple],
        variant === 'secondary' && { backgroundColor: c.lavender },
        variant === 'ghost' && { backgroundColor: c.white, ...shadow.soft },
        variant === 'danger' && { backgroundColor: c.pink },
        variant === 'dark' && { backgroundColor: c.ink },
        variant === 'lime' && [{ backgroundColor: c.lime }, !off && shadow.lime],
        off && { opacity: 0.45 },
        style,
      ]}
    >
      {variant === 'primary' ? (
        <>
          <LinearGradient
            colors={[...gradients.purple]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: radius.pill }]}
          />
          {content}
        </>
      ) : (
        content
      )}
    </PressableScale>
  );
}

export function IconButton({
  icon: Icon,
  label,
  onPress,
  style,
  color,
  variant = 'surface',
  size = 44,
  disabled = false,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  color?: string;
  variant?: 'surface' | 'tonal' | 'dark' | 'glass' | 'plain' | 'primary';
  size?: number;
  disabled?: boolean;
}) {
  const tint =
    color ??
    (variant === 'dark' || variant === 'glass' || variant === 'primary'
      ? c.white
      : variant === 'tonal'
        ? c.purpleDeep
        : c.ink);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      scaleTo={0.9}
      hoverStyle={{ opacity: 0.85 }}
      style={[
        styles.iconButton,
        { width: size, height: size, borderRadius: size / 2 },
        variant === 'surface' && { backgroundColor: c.white, ...shadow.soft },
        variant === 'tonal' && { backgroundColor: c.lavender },
        variant === 'dark' && { backgroundColor: 'rgba(255,255,255,0.12)' },
        variant === 'glass' && { backgroundColor: 'rgba(255,255,255,0.22)' },
        variant === 'primary' && { backgroundColor: c.purple, ...shadow.purple },
        variant === 'plain' && { backgroundColor: 'transparent' },
        disabled && { opacity: 0.4 },
        style,
      ]}
    >
      <Icon size={Math.round(size * 0.46)} color={tint} strokeWidth={1.9} />
    </PressableScale>
  );
}

export function Chip({
  children,
  color = c.lavender,
  textColor = c.purpleDeep,
  icon: Icon,
  style,
}: {
  children: React.ReactNode;
  color?: string;
  textColor?: string;
  icon?: LucideIcon;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.chip, { backgroundColor: color }, style]}>
      {Icon && <Icon size={12} color={textColor} strokeWidth={2.2} />}
      <Type
        style={{
          color: textColor,
          fontFamily: f.bold,
          fontSize: 11,
          lineHeight: 14,
          letterSpacing: 0.3,
        }}
      >
        {children}
      </Type>
    </View>
  );
}

export function Field({
  label,
  style,
  inline = false,
  hint,
  ...props
}: TextInputProps & {
  label: string;
  inline?: boolean;
  hint?: string;
  style?: StyleProp<TextStyle>;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ gap: 7 }, inline && { flex: 1 }]}>
      <Type kind="label">{label}</Type>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.faint}
        {...props}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        style={[styles.input, focused && styles.inputFocused, style]}
      />
      {hint ? <Type kind="caption">{hint}</Type> : null}
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
      <LinearGradient
        colors={[...gradients.purpleSoft]}
        style={[{ alignItems: 'center', justifyContent: 'center', gap: 4 }, style]}
      >
        <Type style={{ fontSize: 30, color: c.purple }}>✧</Type>
        <Type kind="caption" style={{ color: c.purpleDeep }}>
          {failed ? 'Photo unavailable' : 'No photo yet'}
        </Type>
      </LinearGradient>
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

// A floating surface. No hairline borders anywhere: depth comes from shadow and tone.
export function Card({
  children,
  style,
  tone = 'surface',
  padding = 20,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 'surface' | 'tonal' | 'dark' | 'flat';
  padding?: number;
}) {
  return (
    <View
      style={[
        styles.card,
        { padding },
        tone === 'surface' && { backgroundColor: c.white, ...shadow.card },
        tone === 'tonal' && { backgroundColor: c.lavender },
        tone === 'dark' && { backgroundColor: c.night },
        tone === 'flat' && { backgroundColor: c.surfaceAlt },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionTitle({
  title,
  subtitle,
  action,
  style,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.sectionTitle, style]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Type kind="heading">{title}</Type>
        {subtitle ? <Type kind="small">{subtitle}</Type> : null}
      </View>
      {action}
    </View>
  );
}

// A compact pill switcher for a handful of mutually exclusive options.
export function Segmented<K extends string>({
  options,
  value,
  onChange,
  label,
  dark = false,
}: {
  options: { key: K; label: string; icon?: LucideIcon }[];
  value: K;
  onChange: (key: K) => void;
  label: string;
  dark?: boolean;
}) {
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      style={[styles.segmented, dark && { backgroundColor: 'rgba(255,255,255,0.1)' }]}
    >
      {options.map(({ key, label: text, icon: Icon }) => {
        const active = key === value;
        return (
          <PressableScale
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${text} mode`}
            onPress={() => onChange(key)}
            scaleTo={0.96}
            style={[
              styles.segment,
              active && { backgroundColor: dark ? c.lime : c.white, ...shadow.soft },
            ]}
          >
            {Icon && (
              <Icon
                size={14}
                strokeWidth={2.2}
                color={
                  active ? (dark ? c.limeInk : c.ink) : dark ? 'rgba(255,255,255,0.7)' : c.muted
                }
              />
            )}
            <Type
              style={{
                fontSize: 13,
                fontFamily: f.bold,
                color: active
                  ? dark
                    ? c.limeInk
                    : c.ink
                  : dark
                    ? 'rgba(255,255,255,0.7)'
                    : c.muted,
              }}
            >
              {text}
            </Type>
          </PressableScale>
        );
      })}
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: 1, backgroundColor: c.line }, style]} />;
}

const styles = StyleSheet.create({
  text: { fontFamily: f.regular, color: c.ink, fontSize: 15, lineHeight: 23 },
  display: { fontFamily: f.displayBold, fontSize: 40, lineHeight: 44, letterSpacing: -1.8 },
  title: { fontFamily: f.displayBold, fontSize: 30, lineHeight: 35, letterSpacing: -1.2 },
  heading: { fontFamily: f.displayBold, fontSize: 20, lineHeight: 25, letterSpacing: -0.5 },
  label: { fontFamily: f.bold, fontSize: 12, lineHeight: 16, color: c.inkSoft },
  small: { color: c.muted, fontSize: 13, lineHeight: 19 },
  caption: { color: c.muted, fontSize: 12, lineHeight: 17 },
  eyebrow: {
    fontFamily: f.bold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.6,
    color: c.purple,
    textTransform: 'uppercase',
  },
  button: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
    overflow: 'hidden',
  },
  iconButton: { justifyContent: 'center', alignItems: 'center' },
  chip: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
  },
  input: {
    minHeight: 52,
    backgroundColor: c.surfaceAlt,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: radius.md,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontFamily: f.medium,
    fontSize: 15,
    color: c.ink,
  },
  inputFocused: { backgroundColor: c.white, borderColor: c.purple },
  card: { borderRadius: radius.lg },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: c.lavender,
    borderRadius: radius.pill,
    padding: 4,
    gap: 2,
    alignSelf: 'center',
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    minHeight: 38,
    borderRadius: radius.pill,
  },
});
