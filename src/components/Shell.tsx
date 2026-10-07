import React, { useMemo } from 'react';
import {
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { usePathname, router, Href } from 'expo-router';
import {
  Camera,
  Images,
  ChartNoAxesColumn,
  Settings2,
  ArrowUpRight,
  Heart,
  ShieldCheck,
  LucideIcon,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as c, fonts as f } from '../lib/theme';
import { Mascot, LogoMark } from './Mascot';
import { Chip, Type } from './ui';
import { useApp } from '../state/AppProvider';
const tabs: { href: Href; label: string; icon: LucideIcon }[] = [
  { href: '/', label: 'Snap a meal', icon: Camera },
  { href: '/memories', label: 'Memories', icon: Images },
  { href: '/rhythm', label: 'Your rhythm', icon: ChartNoAxesColumn },
  { href: '/settings', label: 'Your space', icon: Settings2 },
];
export function Shell({ children }: { children: React.ReactNode }) {
  const wide = useWindowDimensions().width >= 1000;
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { tap } = useApp();
  const go = (href: Href) => {
    tap();
    router.navigate(href);
  };
  const gestures = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => !wide && Math.abs(g.dx) > 65 && Math.abs(g.dy) < 25,
        onPanResponderRelease: (_, g) => {
          if (pathname === '/' && g.dx < -75) router.navigate('/memories');
          if (pathname === '/memories' && g.dx > 75) router.navigate('/');
        },
      }),
    [wide, pathname],
  );
  const nav = (mobile: boolean) =>
    tabs.map(({ href, label, icon: Icon }) => {
      const active = pathname === href;
      return (
        <Pressable
          key={String(href)}
          accessibilityRole="tab"
          accessibilityLabel={label}
          accessibilityState={{ selected: active }}
          onPress={() => go(href)}
          style={({ hovered, pressed }: { pressed: boolean; hovered?: boolean }) => [
            mobile ? s.mobileItem : s.navItem,
            !mobile && active && { backgroundColor: c.lavender },
            hovered && !mobile && { backgroundColor: c.lavender },
            pressed && { opacity: 0.7 },
          ]}
        >
          <View style={mobile && active ? s.mobileIcon : undefined}>
            <Icon
              size={mobile ? 21 : 19}
              color={active ? c.purple : c.muted}
              strokeWidth={active ? 2.1 : 1.7}
            />
          </View>
          <Type
            style={{
              fontSize: mobile ? 10 : 14,
              fontFamily: active ? f.bold : f.medium,
              color: active ? c.purple : c.muted,
            }}
          >
            {mobile && label === 'Snap a meal'
              ? 'Snap'
              : mobile && label === 'Your rhythm'
                ? 'Rhythm'
                : mobile && label === 'Your space'
                  ? 'You'
                  : label}
          </Type>
        </Pressable>
      );
    });
  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {wide && (
        <View style={s.sidebar}>
          <View style={s.brand}>
            <LogoMark />
            <Type style={s.brandName}>
              carbsy<Type style={{ color: c.purple, fontSize: 32 }}>.</Type>
            </Type>
          </View>
          <Type style={s.brandTag}>your food, in focus.</Type>
          <View style={s.navigation}>{nav(false)}</View>
          <View style={{ flex: 1 }} />
          <View style={s.beanCard}>
            <Mascot size={78} />
            <Type style={{ fontFamily: f.displayBold, fontSize: 17, textAlign: 'center' }}>
              A little less guessing.
            </Type>
            <Type kind="small" style={{ textAlign: 'center', marginTop: 6 }}>
              A little more living.
            </Type>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 5 }}>
              <Heart size={12} color={c.purple} />
              <Type kind="small" style={{ color: c.purple }}>
                Made for your everyday
              </Type>
            </View>
          </View>
          <View style={s.sideFooter}>
            <View style={s.avatar}>
              <Type style={{ color: c.purple, fontFamily: f.bold }}>you</Type>
            </View>
            <View>
              <Type kind="label">Your happy little space</Type>
              <Type kind="small">No judgment. Just clarity.</Type>
            </View>
          </View>
        </View>
      )}
      <View style={{ flex: 1 }} {...gestures.panHandlers}>
        <View style={[s.topbar, !wide && { paddingHorizontal: 22, height: 65 }]}>
          {wide ? (
            <Type kind="small" style={{ letterSpacing: 0.8 }}>
              A LITTLE MOMENT FOR YOU
            </Type>
          ) : (
            <View style={{ flexDirection: 'row', gap: 9, alignItems: 'center' }}>
              <LogoMark size={31} />
              <Type style={{ fontFamily: f.displayBold, fontSize: 25 }}>carbsy.</Type>
            </View>
          )}
          <Chip icon={ShieldCheck} color="#F1F3EC" textColor="#69765A">
            Saved on your device
          </Chip>
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[s.content, !wide && { padding: 22, paddingBottom: 30 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
          <View style={s.footer}>
            <Type kind="small">Little snaps. A little more clarity.</Type>
            <Type kind="small" style={{ color: '#AAA4B2' }}>
              with love, carbsy <Heart size={10} color="#AAA4B2" />
            </Type>
          </View>
        </ScrollView>
        {!wide && (
          <View style={[s.mobileNav, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            {nav(true)}
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
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  const mobile = useWindowDimensions().width < 600;
  return (
    <View style={[s.heading, mobile && { marginBottom: 24 }]}>
      <View style={{ flex: 1 }}>
        <Type style={s.eyebrow}>{eyebrow}</Type>
        <Type kind="title" style={{ fontSize: mobile ? 31 : 38, lineHeight: mobile ? 38 : 46 }}>
          {title}
        </Type>
        <Type style={{ color: c.muted, marginTop: 9, fontSize: mobile ? 13 : 14 }}>{subtitle}</Type>
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
      style={{ minHeight: 40, flexDirection: 'row', gap: 6, alignItems: 'center' }}
    >
      <Type style={{ color: c.purple, fontSize: 12, fontFamily: f.bold }}>{label}</Type>
      <ArrowUpRight size={15} color={c.purple} />
    </Pressable>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg, flexDirection: 'row' },
  sidebar: {
    width: 232,
    borderRightWidth: 1,
    borderRightColor: c.line,
    backgroundColor: '#FDFCFA',
    padding: 25,
    paddingTop: 34,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandName: { fontFamily: f.displayBold, fontSize: 33, letterSpacing: -1.4 },
  brandTag: { color: c.muted, fontSize: 12, marginTop: 10, marginLeft: 3 },
  navigation: { gap: 8, marginTop: 53 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    height: 49,
    borderRadius: 14,
  },
  beanCard: {
    alignItems: 'center',
    backgroundColor: '#F0EBF9',
    borderRadius: 22,
    padding: 17,
    paddingBottom: 22,
    marginBottom: 30,
  },
  sideFooter: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: c.line,
  },
  avatar: {
    width: 34,
    height: 34,
    backgroundColor: c.lavender,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topbar: {
    height: 81,
    borderBottomWidth: 1,
    borderBottomColor: c.line,
    paddingHorizontal: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: { padding: 40, paddingTop: 34, width: '100%', maxWidth: 1320, alignSelf: 'center' },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
    gap: 15,
  },
  eyebrow: {
    fontFamily: f.bold,
    fontSize: 10,
    letterSpacing: 1.9,
    color: c.purple,
    marginBottom: 7,
  },
  footer: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 31, gap: 15 },
  mobileNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: c.line,
    backgroundColor: '#FDFCFA',
    paddingTop: 9,
    paddingHorizontal: 7,
  },
  mobileItem: { flex: 1, alignItems: 'center', gap: 1 },
  mobileIcon: {
    backgroundColor: c.lavender,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 4,
  },
});
