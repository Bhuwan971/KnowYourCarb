import React from 'react';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
export function Mascot({
  size = 64,
  color = '#DDF2A4',
  happy = false,
}: {
  size?: number;
  color?: string;
  happy?: boolean;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      accessibilityLabel="Bean, your little food buddy"
    >
      <Path
        d="M25 77Q12 88 17 92M75 77Q88 88 83 92"
        stroke="#34313E"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M17 51Q2 43 6 37M83 51Q98 43 94 37"
        stroke="#34313E"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <Path d="M48 18Q42 4 53 6Q65 8 54 20" fill="#A8C875" />
      <Path
        d="M50 17C76 8 91 27 86 53C83 80 67 88 49 84C26 94 9 72 14 49C10 25 29 12 50 17Z"
        fill={color}
      />
      {happy ? (
        <>
          <Path
            d="M30 44Q35 38 40 44M60 44Q65 38 70 44"
            stroke="#34313E"
            strokeWidth="3.5"
            fill="none"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <Ellipse cx="35" cy="43" rx="3" ry="4" fill="#34313E" />
          <Ellipse cx="65" cy="43" rx="3" ry="4" fill="#34313E" />
        </>
      )}
      <Ellipse cx="26" cy="52" rx="6" ry="3.5" fill="#E5A2AF" opacity="0.75" />
      <Ellipse cx="74" cy="52" rx="6" ry="3.5" fill="#E5A2AF" opacity="0.75" />
      <Path
        d="M42 53Q50 63 58 53"
        stroke="#34313E"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <Path
        d="M21 30Q26 22 34 23"
        stroke="#FFF"
        strokeWidth="4"
        opacity="0.55"
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  );
}
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect width="48" height="48" rx="16" fill="#6B4EF6" />
      <Path
        d="M14 17H19L21 13H29L31 17H34Q37 17 37 21V32Q37 35 34 35H14Q11 35 11 32V21Q11 17 14 17Z"
        fill="#D9F56A"
      />
      <Circle cx="24" cy="26" r="6.5" fill="#6B4EF6" />
      <Circle cx="22" cy="24" r="2" fill="#D9F56A" />
    </Svg>
  );
}
