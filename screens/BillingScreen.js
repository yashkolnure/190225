// screens/BillingScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';

const BillingScreen = () => {
  const [billingData, setBillingData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [restaurantDetails, setRestaurantDetails] = useState({});

  const fetchRestaurantDetails = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const restaurant = await AsyncStorage.getItem('restaurant');
      const { _id: restaurantId } = JSON.parse(restaurant);

      const res = await fetch(`http://192.168.1.45:5000/api/admin/${restaurantId}/details`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Failed to fetch restaurant details');
      setRestaurantDetails(data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', error.message || 'Unable to fetch restaurant info');
    }
  };

  const clearTable = async (tableNumber) => {
    Alert.alert(
      'Confirm Clear',
      `Are you sure you want to clear Table ${tableNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              const restaurant = await AsyncStorage.getItem('restaurant');
              const { _id: restaurantId } = JSON.parse(restaurant);

              const response = await fetch(
                `http://192.168.1.45:5000/api/clearTable/${tableNumber}`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                }
              );

              if (!response.ok) throw new Error('Failed to clear table');

              Alert.alert('Success', `Table ${tableNumber} cleared!`);
              fetchOrders(); // Refresh billing data
            } catch (error) {
              console.error('❌ Error clearing table:', error);
              Alert.alert('Error', 'Failed to clear the table. Please try again.');
            }
          },
        },
      ]
    );
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      const restaurant = await AsyncStorage.getItem('restaurant');
      const { _id: restaurantId } = JSON.parse(restaurant);

      const response = await fetch(
        `http://192.168.1.45:5000/api/admin/${restaurantId}/orders`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch orders');

      const grouped = {};

      data.forEach((order) => {
        const table = order.tableNumber;
        if (!grouped[table]) {
          grouped[table] = {
            tableNumber: table,
            orders: [],
            totalAmount: 0,
          };
        }

        let orderTotal = 0;
        order.items.forEach((item) => {
          orderTotal += item.price * item.quantity;
        });

        grouped[table].orders.push(order);
        grouped[table].totalAmount += orderTotal;
      });

      setBillingData(Object.values(grouped));
    } catch (error) {
      console.error(error);
      Alert.alert('Error', error.message || 'Failed to load billing data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const groupItems = (orders) => {
    const grouped = {};

    orders.forEach((order) => {
      order.items.forEach(({ itemId, quantity, price }) => {
        const key = itemId?._id || itemId?.name || 'deleted';
        if (!grouped[key]) {
          grouped[key] = {
            name: itemId?.name || 'Deleted Item',
            quantity: 0,
            total: 0,
          };
        }
        grouped[key].quantity += quantity;
        grouped[key].total += quantity * price;
      });
    });

    return Object.values(grouped);
  };

  const printBill = async (tableData) => {
    const { tableNumber, orders, totalAmount } = tableData;
    const groupedItems = groupItems(orders);

    const orderTableHTML = groupedItems
      .map(
        (item) => `
        <tr>
          <td>${item.name}</td>
          <td class="qty">${item.quantity}</td>
          <td class="total">₹${item.total.toFixed(2)}</td>
        </tr>`
      )
      .join('');

    const billHTML = `
    <html>
      <head>
        <title>Bill - Table ${tableNumber}</title>
        <style>
          body {
            font-family: monospace;
            font-size: 12px;
            text-align: center;
            margin: 0;
            padding: 0;
          }
          .bill-container {
            width: 250px;
            margin: auto;
          }
          .logo {
            width: 120px;
            height: auto;
            display: block;
            margin: 5px auto;
          }
          hr {
            border: none;
            border-top: 1px dashed black;
            margin: 6px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          th, td {
            padding: 2px;
            word-break: break-word;
          }
          th {
            text-align: left;
          }
          td.qty {
            text-align: center;
            width: 20%;
          }
          td.total {
            text-align: right;
            width: 30%;
          }
          .summary {
            font-weight: bold;
            margin-top: 5px;
          }
        </style>
      </head>
      <body>
        <div class="bill-container">
          ${restaurantDetails.logo ? `<img src="${restaurantDetails.logo}" class="logo" />` : ''}
          <h3>${restaurantDetails.name || 'Restaurant Name'}</h3>
          <p>${restaurantDetails.address || ''}</p>
          <p>${restaurantDetails.contact || ''}</p>
          <hr />
          <p><strong>Table:</strong> ${tableNumber}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
          <hr />
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th class="qty">Qty</th>
                <th class="total">Total</th>
              </tr>
            </thead>
            <tbody>
              ${orderTableHTML}
            </tbody>
          </table>
          <hr />
          <p class="summary">Orders: ${orders.length}</p>
          <p class="summary">TOTAL: ₹${totalAmount.toFixed(2)}</p>
          <hr />
          <p>Thank You! Visit Again!</p>
        </div>
      </body>
    </html>
    `;

    try {
      await Print.printAsync({ html: billHTML });
    } catch (error) {
      console.error('Print error:', error);
      Alert.alert('Error', 'Failed to print bill');
    }
  };

  useEffect(() => {
    fetchRestaurantDetails();
    fetchOrders();
  }, []);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => {
          setRefreshing(true);
          fetchOrders();
        }} />
      }
    >
     
      {loading ? (
        <ActivityIndicator size="large" color="#f97316" />
      ) : billingData.length === 0 ? (
        <Text style={styles.noData}>No billing data available.</Text>
      ) : (
        billingData.map((data) => {
          const groupedItems = groupItems(data.orders);
          return (
            <View key={data.tableNumber} style={styles.card}>
              <Text style={styles.table}>Table No: {data.tableNumber}</Text>
              <Text style={styles.date}>{new Date().toLocaleString()}</Text>

              <View style={styles.itemHeader}>
                <Text style={styles.itemText}>Item</Text>
                <Text style={styles.qtyText}>Qty</Text>
                <Text style={styles.priceText}>Price</Text>
              </View>

              {groupedItems.map((item, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <Text style={styles.itemText}>{item.name}</Text>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <Text style={styles.priceText}>₹{item.total.toFixed(2)}</Text>
                </View>
              ))}

              <View style={styles.totalContainer}>
              <Text style={styles.totalText}>Total Orders: {groupedItems.length}</Text>
              <Text style={styles.totalText}>Total: ₹{data.totalAmount.toFixed(2)}</Text>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  onPress={() => printBill(data)}
                  style={styles.printButton}
                >
                  <Text style={styles.buttonText}>Print Bill 🖨️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => clearTable(data.tableNumber)}
                  style={styles.clearButton}
                >
                  <Text style={styles.buttonText}>Clear Table ✔</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
};

export default BillingScreen;

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 80,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#f97316',
  },
  noData: {
    textAlign: 'center',
    color: 'gray',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    elevation: 3,
  },
  table: {
    fontSize: 18,
    fontWeight: '600',
  },
  date: {
    fontSize: 12,
    color: 'gray',
    marginBottom: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#4444',
    paddingVertical: 6,
    marginTop: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  itemText: {
    flex: 2,
  },
  qtyText: {
    flex: 1,
    textAlign: 'center',
  },
  priceText: {
    flex: 1,
    textAlign: 'right',
  },
  totalContainer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#4444',
    paddingTop: 10,
  },
  totalText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: '',
    marginTop: 12,
    gap: 8, // for spacing between buttons
  },
  printButton: {
    backgroundColor: '#22c55e', // green-500
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: '50%',
  },
  clearButton: {
    width: '50%',
    backgroundColor: '#ef4444',
    paddingVertical: 10,
    paddingHorizontal: 20,
    textAlign: 'center',
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
