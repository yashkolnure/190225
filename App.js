// App.js
import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import AsyncStorage

import HomeScreen from './screens/HomeScreen';
import OrdersScreen from './screens/OrdersScreen';
import BillingScreen from './screens/BillingScreen';
import OrderHistoryScreen from './screens/OrderHistoryScreen';
import LoginScreen from './screens/LoginScreen';
import CustomDrawer from './components/CustomDrawer';

const Drawer = createDrawerNavigator();

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(null); // State to hold login status

  useEffect(() => {
    const checkLoginStatus = async () => {
      const token = await AsyncStorage.getItem('token'); // Or use any other key for login status
      setIsLoggedIn(!!token); // Set the state based on token availability
    };
    checkLoginStatus();
  }, []);

  if (isLoggedIn === null) {
    return null; // Or use a loading spinner
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Drawer.Navigator
          initialRouteName={isLoggedIn ? 'Home' : 'Login'}
          drawerContent={(props) => <CustomDrawer {...props} />}
        >
          <Drawer.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }} // Hide the header for LoginScreen
          />
          <Drawer.Screen name="Home" component={HomeScreen} />
          <Drawer.Screen name="Orders" component={OrdersScreen} />
          <Drawer.Screen name="Billing" component={BillingScreen} />
          <Drawer.Screen name="Past Orders" component={OrderHistoryScreen} />
        </Drawer.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
