import React from 'react';
import { Modal, View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING, TYPO } from '../../constants/theme';
import { iniciales } from '../../utils/formatters';

interface AccountSelectorModalProps {
  visible: boolean;
  cuentasSujeto: Array<{ idCuenta: string; nombre: string }>;
  cuentaSeleccionadaId?: string;
  onSelectCuenta: (idCuenta: string) => void;
  onClose: () => void;
}

export const AccountSelectorModal: React.FC<AccountSelectorModalProps> = ({
  visible,
  cuentasSujeto,
  cuentaSeleccionadaId,
  onSelectCuenta,
  onClose,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        {/* Pressable interno evita que tocar la hoja cierre el modal */}
        <Pressable style={[styles.modalSheet, { paddingBottom: insets.bottom + SPACING.xl }]} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={TYPO.h2}>Elegí una cuenta</Text>
          <Text style={[TYPO.caption, { marginTop: 2, marginBottom: SPACING.lg }]}>
            {cuentasSujeto.length} cuentas asociadas a tu usuario
          </Text>
          <FlatList
            data={cuentasSujeto}
            keyExtractor={(item) => item.idCuenta}
            renderItem={({ item }) => {
              const isActive = item.idCuenta === cuentaSeleccionadaId;
              return (
                <Pressable
                  style={({ pressed }) => [
                    styles.modalItem,
                    isActive && styles.modalItemActive,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => onSelectCuenta(item.idCuenta)}
                >
                  <View style={[styles.avatar, isActive && styles.avatarActive]}>
                    <Text style={[styles.avatarText, isActive && { color: COLORS.navy }]}>
                      {iniciales(item.nombre)}
                    </Text>
                  </View>
                  <View style={styles.flexOne}>
                    <Text style={TYPO.bodyStrong} numberOfLines={1}>{item.nombre}</Text>
                    <Text style={styles.modalItemCode}>Cuenta N° {item.idCuenta}</Text>
                  </View>
                  {isActive ? (
                    <Ionicons name="checkmark-circle" size={22} color={COLORS.navy} />
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                  )}
                </Pressable>
              );
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(11,37,69,0.55)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.xl,
    maxHeight: '70%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modalItemActive: { backgroundColor: COLORS.surfaceMuted, borderColor: COLORS.border },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  avatarActive: { backgroundColor: COLORS.gold },
  avatarText: { fontSize: 14, fontWeight: '800', color: COLORS.textGray },
  modalItemCode: { fontSize: 12, color: COLORS.textGray, marginTop: 2 },
  flexOne: { flex: 1, minWidth: 0, marginRight: SPACING.sm },
});
