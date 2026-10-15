import React from 'react';
import { StyleSheet, View, Text, Button, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthService } from '../services/authService';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const handleLogout = async () => {
    try {
      await AuthService.logout();
      // Reinicia la navegación hacia LoginScreen
      navigation.reset({
        index: 0,
        routes: [{ name: 'LoginScreen' }],
      });
    } catch (error) {
      Alert.alert('Error', 'No se pudo cerrar la sesión.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bienvenido!</Text>
      <Text style={styles.text}>Has iniciado sesión correctamente.</Text>
      <Button title="Cerrar Sesión" onPress={handleLogout} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  text: {
    fontSize: 16,
    marginBottom: 20,
    color: '#555',
  },
});

export default HomeScreen;