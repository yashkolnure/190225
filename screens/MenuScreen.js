import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';

const OrdersScreen = () => {
  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [newOrderPopup, setNewOrderPopup] = useState(null);
  const [newOrderQueue, setNewOrderQueue] = useState([]);
  const latestOrderIdsRef = useRef([]);
  const soundRef = useRef(null);

  const playSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/notification.mp3') // Add your sound file here
      );
      soundRef.current = sound;
      await sound.playAsync();
    } catch (error) {
      console.warn('Sound play error:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const restaurant = await AsyncStorage.getItem('restaurant');
      const restaurantId = JSON.parse(restaurant)._id;

      const res = await fetch(`http://192.168.1.45:5000/api/admin/${restaurantId}/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!Array.isArray(data)) throw new Error('Invalid data format');

      setOrders(data);

      const currentIds = data.map(order => order._id);
      const newOrders = data.filter(order => !latestOrderIdsRef.current.includes(order._id));

      if (newOrders.length > 0) {
        setNewOrderQueue(prev => [...prev, ...newOrders]);
        if (!newOrderPopup) {
          setNewOrderPopup(newOrders[0]);
          setNewOrderQueue(prev => prev.slice(1));
          playSound();
        }
      }

      latestOrderIdsRef.current = currentIds;
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  };

  const handleAcceptPopup = () => {
    if (newOrderQueue.length > 0) {
      const next = newOrderQueue[0];
      setNewOrderPopup(next);
      setNewOrderQueue(prev => prev.slice(1));
      playSound();
    } else {
      setNewOrderPopup(null);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 3000);
    return () => {
      clearInterval(interval);
      if (soundRef.current) soundRef.current.unloadAsync();
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.heading}>🍕 Active Orders</Text>
      {orders.length === 0 ? (
        <Text style={styles.noOrders}>No orders yet.</Text>
      ) : (
        orders
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .map((order) => (
            <View key={order._id} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.timestamp}>🕒 {new Date(order.createdAt).toLocaleString()}</Text>
                <Text style={styles.table}>Table #{order.tableNumber}</Text>
              </View>
              <Text style={styles.subHeading}>Items:</Text>
              {order.items.map((item, idx) => (
                <Text key={idx} style={styles.item}>
                  • {item.itemId?.name || 'Deleted Item'} × {item.quantity}
                </Text>
              ))}
              <Text style={styles.total}>Total: ₹{order.total}</Text>
            </View>
          ))
      )}

      {/* Popup Modal for New Orders */}
      <Modal visible={!!newOrderPopup} transparent animationType="slide">
        <View style={styles.popupContainer}>
          <View style={styles.popup}>
            <Text style={styles.popupTitle}>🆕 New Order!</Text>
            {newOrderPopup && (
              <>
                <Text style={styles.table}>Table #{newOrderPopup.tableNumber}</Text>
                {newOrderPopup.items.map((item, idx) => (
                  <Text key={idx} style={styles.item}>
                    • {item.itemId?.name || 'Deleted Item'} × {item.quantity}
                  </Text>
                ))}
                <Text style={styles.total}>Total: ₹{newOrderPopup.total}</Text>
              </>
            )}
            <Text style={styles.accept} onPress={handleAcceptPopup}>
              ✅ Accept
            </Text>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default OrdersScreen;

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fefefe',
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff7f50',
    marginBottom: 16,
  },
  noOrders: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
    marginTop: 20,
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  table: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
  },
  subHeading: {
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 4,
    color: '#333',
  },
  item: {
    fontSize: 14,
    color: '#555',
    marginLeft: 10,
  },
  total: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'green',
    marginTop: 12,
  },
  popupContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  popup: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 20,
    width: '80%',
    alignItems: 'center',
  },
  popupTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  accept: {
    marginTop: 20,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: 'bold',
  },
});
