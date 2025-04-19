import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://192.168.1.45:5000/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        await AsyncStorage.setItem('token', data.token);
        await AsyncStorage.setItem('restaurant', JSON.stringify(data.restaurant));
        navigation.navigate('Home');
      } else {
        Alert.alert('Login Failed', data.message || 'Invalid credentials');
      }
    } catch (error) {
      console.error('Login Error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Animated.View style={{ opacity: fadeAnim }}>
        <Image
          source={require('../assets/illustration.webp')}
          style={styles.image}
          resizeMode="contain"
        />

        <Text style={styles.heading}>Login</Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email ID"
            placeholderTextColor="#888"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <View style={styles.passwordWrapper}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Password"
              placeholderTextColor="#888"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Ionicons
                name={showPassword ? 'eye' : 'eye-off'}
                size={20}
                color="#888"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.forgotContainer}>
            {/* Add forgot password navigation if needed */}
          </TouchableOpacity>

          {loading ? (
            <ActivityIndicator size="large" color="#A020F0" />
          ) : (
            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
              <Text style={styles.loginText}>Login</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.footer}>Powered by Avenirya Solutions (OPC) Pvt Ltd</Text>
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: 180,
    marginBottom: 20,
  },
  heading: {
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  inputContainer: {
    gap: 12,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FAFAFA',
    fontSize: 16,
    color: '#333',
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 14,
  },
  forgotContainer: {
    alignItems: 'flex-end',
    marginTop: 6,
    marginBottom: 12,
  },
  forgotText: {
    color: '#A020F0',
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#FF3744',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  loginText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 40,
    textAlign: 'center',
    fontSize: 12,
    color: '#aaa',
  },
});