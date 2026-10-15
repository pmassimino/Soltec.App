import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { AuthService } from '../services/authService';
import { COLORS, RADIUS, SHADOW, SPACING, TYPO } from '../constants/theme';
import { Button, IconName } from '../components/ui';

interface FieldProps {
  icon: IconName;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  secure?: boolean;
  inputRef?: React.RefObject<TextInput | null>;
  onSubmitEditing?: () => void;
  returnKeyType?: 'next' | 'go';
}

const Field: React.FC<FieldProps> = ({
  icon,
  placeholder,
  value,
  onChangeText,
  secure,
  inputRef,
  onSubmitEditing,
  returnKeyType,
}) => {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);

  return (
    <View style={[styles.field, focused && styles.fieldFocused]}>
      <Ionicons name={icon} size={20} color={focused ? COLORS.navy : COLORS.textMuted} />
      <TextInput
        ref={inputRef}
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry={secure && !visible}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onSubmitEditing={onSubmitEditing}
        returnKeyType={returnKeyType}
      />
      {secure && (
        <Pressable onPress={() => setVisible((v) => !v)} hitSlop={10}>
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textMuted} />
        </Pressable>
      )}
    </View>
  );
};

const LoginScreen: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);

  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Ingresá tu usuario y contraseña.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const success = await AuthService.login(username, password);

      if (success) {
        // Redirige al contenedor principal y reemplaza la pila de navegación
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainApp' }],
        });
      } else {
        setError('Usuario o contraseña incorrectos.');
      }
    } catch (err) {
      setError('No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* Hero de marca */}
          <View style={[styles.hero, { paddingTop: insets.top + 48 }]}>
            <View style={styles.decorCircleLg} />
            <View style={styles.decorCircleSm} />
            <View style={styles.logo}>
              <Text style={styles.logoMark}>▲</Text>
            </View>
            <Text style={styles.brand}>Soltec</Text>
            <Text style={styles.tagline}>Tu cuenta, tus cosechas y tus documentos en un solo lugar.</Text>
          </View>

          {/* Formulario */}
          <View style={[styles.sheet, { paddingBottom: insets.bottom + SPACING.xxl }]}>
            <Text style={TYPO.h1}>Iniciar sesión</Text>
            <Text style={[TYPO.caption, styles.subtitle]}>Ingresá con el usuario que te dio tu acopio.</Text>

            <Field
              icon="person-outline"
              placeholder="Usuario"
              value={username}
              onChangeText={(v) => { setUsername(v); setError(null); }}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <Field
              icon="lock-closed-outline"
              placeholder="Contraseña"
              value={password}
              onChangeText={(v) => { setPassword(v); setError(null); }}
              secure
              inputRef={passwordRef}
              returnKeyType="go"
              onSubmitEditing={handleLogin}
            />

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={COLORS.red} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Button label="Ingresar" onPress={handleLogin} loading={loading} style={{ marginTop: SPACING.sm }} />

            <View style={{ flex: 1 }} />
            <Text style={styles.footer}>Soltec · Gestión de acopios</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.navy },
  hero: {
    paddingHorizontal: SPACING.xxl,
    paddingBottom: 56,
    overflow: 'hidden',
  },
  decorCircleLg: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    right: -90,
    top: -60,
    backgroundColor: COLORS.navyLight,
  },
  decorCircleSm: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    right: -30,
    top: 190,
    borderWidth: 1,
    borderColor: 'rgba(214,167,80,0.35)',
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: COLORS.navySoft,
    borderWidth: 1,
    borderColor: COLORS.navyBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoMark: { color: COLORS.gold, fontSize: 24, fontWeight: '800' },
  brand: { color: COLORS.white, fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  tagline: { color: COLORS.textOnDarkMuted, fontSize: 15, lineHeight: 22, marginTop: SPACING.sm, maxWidth: 300 },
  sheet: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    paddingHorizontal: SPACING.xxl,
    paddingTop: SPACING.xxxl,
    ...SHADOW.lg,
  },
  subtitle: { marginTop: 6, marginBottom: SPACING.xxl },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceMuted,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  fieldFocused: { borderColor: COLORS.navy, backgroundColor: COLORS.white },
  input: { flex: 1, fontSize: 16, color: COLORS.textDark, marginLeft: SPACING.md, height: '100%' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.redSoft,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  errorText: { color: COLORS.red, fontSize: 13, fontWeight: '600', marginLeft: SPACING.sm, flex: 1 },
  footer: { ...TYPO.caption, color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.xxxl },
});

export default LoginScreen;
