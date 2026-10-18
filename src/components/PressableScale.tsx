import React, { useState } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';

// Static press feedback keeps controls steady while preserving touch and hover affordances.
export function PressableScale({
  style,
  hoverStyle,
  children,
  ...props
}: Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  hoverStyle?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}) {
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
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
        style,
        hovered && !props.disabled && hoverStyle,
        pressed && !props.disabled && { opacity: 0.65 },
      ]}
    >
      {children}
    </Pressable>
  );
}
