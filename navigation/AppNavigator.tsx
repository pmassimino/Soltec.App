// navigation/AppNavigator.tsx
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { AuthService } from '../services/authService';
import { COLORS } from '../constants/colors';
import LoginScreen from '../screens/LoginScreen';
import { MainLayout } from '../components/layout/MainLayout';
import { BottomTabBar, TabKey } from '../components/navigation/BottomTabBar';
import { EstadoCuentaContent } from '../screens/EstadoCuenta';
import { PerfilScreen } from '../screens/PerfilScreen';
import { MovimientosScreen } from '../screens/MovimientosScreen';
import { FacturasScreen, RemitosScreen } from '../screens/DocumentosPendientesScreen';
import { CosechasScreen } from '../screens/CosechasScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Las pantallas sin pestaña propia resaltan la pestaña desde la que se abren
const tabActiva = (route: string): TabKey => (['remitos', 'facturas'].includes(route) ? 'resumen' : (route as TabKey));

// MainLayout envuelve el Tab.Navigator: el combo de cuenta vive arriba de
// todo, las pantallas (tabs) solo leen el contexto y se refrescan solas.
const MainAppShell: React.FC = () => (
  <MainLayout>
    <Tab.Navigator
      backBehavior="history"
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: COLORS.bg } }}
      tabBar={(props) => (
        <BottomTabBar
          activeTab={tabActiva(props.state.routeNames[props.state.index])}
          onTabSelect={(tab) => props.navigation.navigate(tab)}
        />
      )}
    >
      <Tab.Screen name="resumen" component={EstadoCuentaContent} />
      <Tab.Screen name="movimientos" component={MovimientosScreen} />
      <Tab.Screen name="cosechas" component={CosechasScreen} />
      <Tab.Screen name="perfil" component={PerfilScreen} />
      {/* Pantallas sin pestaña propia: se abren desde Inicio */}
      <Tab.Screen name="remitos" component={RemitosScreen} />
      <Tab.Screen name="facturas" component={FacturasScreen} />
    </Tab.Navigator>
  </MainLayout>
);

export const AppNavigator: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    AuthService.isLoggedIn().then(setIsLoggedIn);

    const unsubscribe = AuthService.onSessionExpired(() => {
      Alert.alert('Sesión Expirada', 'Tu sesión ha caducado. Vuelve a iniciar sesión.');
      setIsLoggedIn(false);
    });

    return () => unsubscribe();
  }, []);

  if (isLoggedIn === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.navy} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={isLoggedIn ? 'MainApp' : 'LoginScreen'}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="LoginScreen" component={LoginScreen} />
        <Stack.Screen name="MainApp" component={MainAppShell} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
});

export default AppNavigator;