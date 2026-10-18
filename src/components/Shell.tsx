import React from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { usePathname, router, Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Camera,
  Images,
  ChartNoAxesColumn,
  Settings2,
  ArrowUpRight,
  ShieldCheck,
  LucideIcon,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as c, fonts as f, gradients, radius, shadow } from '../lib/theme';
import { Mascot, LogoMark } from './Mascot';
import { Chip, Type } from './ui';
import { useApp } from '../state/AppProvider';

const tabs: { href: Href; label: string; short: string; icon: LucideIcon }[] = [
  { href: '/', label: 'Snap a meal', short: 'Snap', icon: Camera },
  { href: '/memories', label: 'Memories', short: 'Memories', icon: Images },
  { href: '/rhythm', label: 'Your rhythm', short: 'Rhythm', icon: ChartNoAxesColumn },
  { href: '/settings', label: 'Your space', short: 'You', icon: Settings2 },
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
  const sideNav = tabs.map(({ href, label, icon: Icon }) => {
    const active = pathname === href;
    return (
      <Pressable
        key={String(href)}
        accessibilityRole="tab"
        accessibilityLabel={label}
        accessibilityState={{ selected: active }}
        onPress={() => go(href)}
        style={({ hovered, pressed }: { pressed: boolean; hovered?: boolean }) => [
          s.navItem,
          active && { backgroundColor: c.ink },
          hovered && !active && { backgroundColor: c.lavender },
          pressed && { opacity: 0.75 },
        ]}
      >
        <Icon size={18} color={active ? c.lime : c.inkSoft} strokeWidth={active ? 2.2 : 1.8} />
        <Type
          style={{
            fontSize: 14,
            fontFamily: active ? f.bold : f.medium,
            color: active ? c.white : c.inkSoft,
          }}
        >
          {label}
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
        onPress={() => go(href)}
        style={({ pressed }) => [s.mobileItem, pressed && { opacity: 0.7 }]}
      >
        <View style={[s.mobileIcon, active && s.mobileIconActive]}>
          <Icon size={20} color={active ? c.white : c.muted} strokeWidth={active ? 2.2 : 1.8} />
        </View>
        <Type
          style={{
            fontSize: 10,
            lineHeight: 12,
            fontFamily: active ? f.bold : f.medium,
            color: active ? c.ink : c.muted,
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
            <LogoMark size={38} />
            <Type style={s.brandName}>carbsy</Type>
          </View>
          <View style={s.navigation}>{sideNav}</View>
          <View style={{ flex: 1 }} />
          <LinearGradient colors={[...gradients.purple]} style={s.beanCard}>
            <Mascot size={70} happy />
            <Type
              style={{ fontFamily: f.displayBold, fontSize: 17, color: c.white, marginTop: 10 }}
            >
              Less guessing.
            </Type>
            <Type style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 3 }}>
              More living.
            </Type>
          </LinearGradient>
          <View style={s.sideFooter}>
            <ShieldCheck size={15} color={c.limeInk} />
            <Type kind="caption" style={{ color: c.inkSoft }}>
              Everything stays on this device.
            </Type>
          </View>
        </View>
      )}
      <View style={{ flex: 1 }}>
        {!wide && (
          <View style={s.topbar}>
            <View style={{ flexDirection: 'row', gap: 9, alignItems: 'center' }}>
              <LogoMark size={32} />
              <Type style={{ fontFamily: f.displayBold, fontSize: 24, letterSpacing: -0.8 }}>
                carbsy
              </Type>
            </View>
            <Chip icon={ShieldCheck} color={c.limeSoft} textColor={c.limeInk}>
              On device
            </Chip>
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
          <View style={s.footer}>
            <Type kind="caption" style={{ color: c.faint }}>
              Little snaps. A little more clarity.
            </Type>
          </View>
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
  eyebrow,
  title,
  subtitle,
  action,
  compact = false,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  const mobile = useWindowDimensions().width < 600;
  return (
    <View style={[s.heading, mobile && { marginBottom: compact ? 18 : 22 }]}>
      <View style={{ flex: 1, gap: 8 }}>
        <Type kind="eyebrow">{eyebrow}</Type>
        <Type
          kind="title"
          style={{
            fontSize: mobile ? (compact ? 28 : 32) : 40,
            lineHeight: mobile ? (compact ? 33 : 37) : 46,
          }}
        >
          {title}
        </Type>
        <Type kind="small" style={{ fontSize: mobile ? 14 : 15, lineHeight: 21 }}>
          {subtitle}
        </Type>
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
      <ArrowUpRight size={15} color={c.purple} strokeWidth={2.2} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg, flexDirection: 'row' },
  sidebar: {
    width: 250,
    backgroundColor: c.white,
    padding: 22,
    paddingTop: 30,
    ...shadow.soft,
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
    borderRadius: radius.pill,
  },
  beanCard: {
    alignItems: 'center',
    borderRadius: radius.lg,
    padding: 18,
    paddingBottom: 20,
    marginBottom: 18,
    overflow: 'hidden',
  },
  sideFooter: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  topbar: {
    height: 60,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: { padding: 40, paddingTop: 34, width: '100%', maxWidth: 1320, alignSelf: 'center' },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
    gap: 15,
  },
  footer: { alignItems: 'center', paddingTop: 36 },
  mobileNavWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  mobileNav: {
    flexDirection: 'row',
    backgroundColor: c.white,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 8,
    width: '100%',
    maxWidth: 420,
    ...shadow.float,
  },
  mobileItem: { flex: 1, alignItems: 'center', gap: 3 },
  mobileIcon: {
    width: 44,
    height: 30,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileIconActive: { backgroundColor: c.ink },
});
