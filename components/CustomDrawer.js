// components/CustomDrawer.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';

const CustomDrawer = (props) => {
  const handleLogout = async () => {
    await AsyncStorage.clear();
    Alert.alert("Logged out", "You have been logged out.");
    props.navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <DrawerContentScrollView {...props}>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  logoutBtn: {
    backgroundColor: '#ff4d4d',
    margin: 16,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default CustomDrawer;
