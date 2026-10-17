import React, { useState } from 'react';
import { Pressable, PressableProps, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { easeOut } from '../lib/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Press feedback on press-in, commit on press-out: a 3% scale in 120 ms. Touched dozens of times a
// day, so it stays near-imperceptible. Hover only exists on the web.
export function PressableScale({
  style,
  hoverStyle,
  scaleTo = 0.97,
  children,
  ...props
}: Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  hoverStyle?: StyleProp<ViewStyle>;
  scaleTo?: number;
  children?: React.ReactNode;
}) {
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  return (
    <AnimatedPressable
      pressRetentionOffset={16}
      {...props}
      onPressIn={(e) => {
        setPressed(true);
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        props.onPressOut?.(e);
      }}
      onHoverIn={(e) => {
        setHovered(true);
        props.onHoverIn?.(e);
      }}
      onHoverOut={(e) => {
        setHovered(false);
        props.onHoverOut?.(e);
      }}
      style={[
        motion.press,
        style,
        hovered && !props.disabled && hoverStyle,
        pressed && !props.disabled && { transform: [{ scale: scaleTo }] },
      ]}
    >
      {children}
    </AnimatedPressable>
  );
}

const motion = StyleSheet.create({
  press: {
    transform: [{ scale: 1 }],
    transitionProperty: 'transform',
    transitionDuration: '120ms',
    transitionTimingFunction: easeOut,
  } as ViewStyle,
});
