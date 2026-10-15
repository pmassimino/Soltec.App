import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../constants/theme';
import { IconName } from '../ui';

export type TabKey = 'resumen' | 'movimientos' | 'cosechas' | 'perfil';

interface BottomTabBarProps {
  activeTab: TabKey;
  onTabSelect: (tab: TabKey) => void;
}

const TABS: Array<{ key: TabKey; label: string; icon: IconName; iconActive: IconName }> = [
  { key: 'resumen', label: 'Inicio', icon: 'home-outline', iconActive: 'home' },
  { key: 'movimientos', label: 'Movimientos', icon: 'swap-vertical-outline', iconActive: 'swap-vertical' },
  { key: 'cosechas', label: 'Cosechas', icon: 'leaf-outline', iconActive: 'leaf' },
  { key: 'perfil', label: 'Perfil', icon: 'person-circle-outline', iconActive: 'person-circle' },
];

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ activeTab, onTabSelect }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, SPACING.sm) }]}>
      {TABS.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <Pressable
            key={tab.key}
            style={styles.tabItem}
            onPress={() => onTabSelect(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
              <Ionicons
                name={isActive ? tab.iconActive : tab.icon}
                size={22}
                color={isActive ? COLORS.navy : COLORS.textMuted}
              />
            </View>
            <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
  },
  tabItem: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  iconWrap: {
    width: 56,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  iconWrapActive: { backgroundColor: COLORS.goldSoft },
  tabLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  activeTabLabel: { color: COLORS.navy, fontWeight: '800' },
});
