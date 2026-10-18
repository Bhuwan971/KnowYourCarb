import React from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { usePathname, router, Href } from 'expo-router';
import { Camera, Images, ChartNoAxesColumn, Settings2, LucideIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as c, fonts as f, radius } from '../lib/theme';
import { Type } from './ui';
import { useApp } from '../state/AppProvider';

const tabs: { href: Href; label: string; short: string; icon: LucideIcon }[] = [
  { href: '/', label: 'Today', short: 'Today', icon: Camera },
  { href: '/memories', label: 'Memories', short: 'Memories', icon: Images },
  { href: '/rhythm', label: 'Rhythm', short: 'Rhythm', icon: ChartNoAxesColumn },
  { href: '/settings', label: 'Settings', short: 'Settings', icon: Settings2 },
];

export const TAB_BAR_CLEARANCE = 96;

export function Shell({ children }: { children: React.ReactNode }) {
  const wide = useWindowDimensions().width >= 1000;
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { tap } = useApp();
  const go = (href: Href) => {
    tap();
    router.navigate(href);
  };
  const sideNav = tabs.map(({ href, label, short, icon: Icon }) => {
    const active = pathname === href;
    return (
      <Pressable
        key={String(href)}
        accessibilityRole="tab"
        accessibilityLabel={label}
        accessibilityState={{ selected: active }}
        aria-selected={active}
        onPress={() => go(href)}
        style={({ hovered, pressed }: { pressed: boolean; hovered?: boolean }) => [
          s.navItem,
          active && { backgroundColor: c.lavender },
          hovered && !active && { backgroundColor: c.surfaceAlt },
          pressed && { opacity: 0.75 },
        ]}
      >
        <Icon size={18} color={active ? c.purple : c.muted} strokeWidth={1.8} />
        <Type
          style={{
            fontSize: 14,
            fontFamily: active ? f.bold : f.medium,
            color: active ? c.purpleDeep : c.inkSoft,
          }}
        >
          {short}
        </Type>
      </Pressable>
    );
  });
  const mobileNav = tabs.map(({ href, short, label, icon: Icon }) => {
    const active = pathname === href;
    return (
      <Pressable
        key={String(href)}
        accessibilityRole="tab"
        accessibilityLabel={label}
        accessibilityState={{ selected: active }}
        aria-selected={active}
        onPress={() => go(href)}
        style={({ pressed }) => [s.mobileItem, pressed && { opacity: 0.7 }]}
      >
        <View style={s.mobileIcon}>
          <Icon size={20} color={active ? c.purple : c.muted} strokeWidth={active ? 2.2 : 1.8} />
        </View>
        <Type
          style={{
            fontSize: 11,
            lineHeight: 15,
            fontFamily: active ? f.bold : f.medium,
            color: active ? c.purpleDeep : c.muted,
          }}
        >
          {short}
        </Type>
      </Pressable>
    );
  });
  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {wide && (
        <View style={s.sidebar}>
          <View style={s.brand}>
            <Type style={s.brandName}>carbsy</Type>
          </View>
          <View style={s.navigation}>{sideNav}</View>
          <View style={{ flex: 1 }} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        {!wide && (
          <View style={s.topbar}>
            <View style={{ flexDirection: 'row', gap: 9, alignItems: 'center' }}>
              <Type style={{ fontFamily: f.displayBold, fontSize: 24, letterSpacing: -0.8 }}>
                carbsy
              </Type>
            </View>
          </View>
        )}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            s.content,
            !wide && {
              padding: 20,
              paddingTop: 8,
              paddingBottom: TAB_BAR_CLEARANCE + insets.bottom,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
        {!wide && (
          <View
            pointerEvents="box-none"
            style={[s.mobileNavWrap, { paddingBottom: Math.max(insets.bottom, 14) }]}
          >
            <View style={s.mobileNav}>{mobileNav}</View>
          </View>
        )}
      </View>
    </View>
  );
}

export function PageHeading({
  title,
  subtitle,
  action,
  compact = false,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  const mobile = useWindowDimensions().width < 600;
  return (
    <View style={[s.heading, mobile && { marginBottom: compact ? 18 : 22 }]}>
      <View style={{ flex: 1, gap: 8 }}>
        <Type
          kind="title"
          style={{
            fontSize: mobile ? (compact ? 26 : 28) : 32,
            lineHeight: mobile ? (compact ? 31 : 34) : 38,
          }}
        >
          {title}
        </Type>
        {subtitle && (
          <Type kind="small" style={{ fontSize: mobile ? 14 : 15, lineHeight: 21 }}>
            {subtitle}
          </Type>
        )}
      </View>
      {action}
    </View>
  );
}

export function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        { minHeight: 40, flexDirection: 'row', gap: 4, alignItems: 'center' },
        pressed && { opacity: 0.6 },
      ]}
    >
      <Type style={{ color: c.purple, fontSize: 13, fontFamily: f.bold }}>{label}</Type>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg, flexDirection: 'row' },
  sidebar: {
    width: 216,
    backgroundColor: c.white,
    padding: 22,
    paddingTop: 30,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 6 },
  brandName: { fontFamily: f.displayBold, fontSize: 28, letterSpacing: -1.2 },
  navigation: { gap: 6, marginTop: 40 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: radius.sm,
  },
  topbar: {
    height: 60,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: {
    padding: 40,
    paddingTop: 34,
    paddingBottom: 40,
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
    gap: 15,
  },
  mobileNavWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: c.white,
    alignItems: 'center',
  },
  mobileNav: {
    flexDirection: 'row',
    backgroundColor: c.white,
    paddingHorizontal: 10,
    paddingVertical: 8,
    width: '100%',
    maxWidth: 480,
  },
  mobileItem: { flex: 1, alignItems: 'center', gap: 3, minHeight: 48, justifyContent: 'center' },
  mobileIcon: {
    width: 44,
    height: 30,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
