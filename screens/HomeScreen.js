import React, { useCallback, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, Modal,
  TextInput, Alert, StyleSheet, SafeAreaView, Image
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

const HomeScreen = () => {
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [restaurant, setRestaurant] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [tableNumber, setTableNumber] = useState("");
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      fetchRestaurantDetails();
      fetchMenuItems();
    }, [])
  );

  const fetchRestaurantDetails = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const storedRestaurant = await AsyncStorage.getItem("restaurant");
      const id = JSON.parse(storedRestaurant)?._id;
      if (!token || !id) return;

      const res = await fetch(`http://192.168.1.45:5000/api/admin/${id}/details`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRestaurant(data);
    } catch (err) {
      console.error("Error fetching restaurant details", err);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const storedRestaurant = await AsyncStorage.getItem("restaurant");
      const id = JSON.parse(storedRestaurant)?._id;
      if (!token || !id) return;

      const res = await fetch(`http://192.168.1.45:5000/api/admin/${id}/menu`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMenu(data);
    } catch (err) {
      console.error("Error fetching menu items", err);
    }
  };

  const logout = async () => {
    await AsyncStorage.clear();
    navigation.reset({
      index: 0,
      routes: [{ name: "Login" }],
    });
  };

  const addToCart = (item) => {
    const found = cart.find((c) => c._id === item._id);
    if (found) {
      updateQuantity(item._id, found.quantity + 1);
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const updateQuantity = (itemId, qty) => {
    if (qty <= 0) {
      removeFromCart(itemId);
    } else {
      setCart(cart.map((item) =>
        item._id === itemId ? { ...item, quantity: qty } : item
      ));
    }
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter((item) => item._id !== itemId));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const placeOrder = async () => {
    try {
      if (!tableNumber) return Alert.alert("❗ Table Number Required");

      const token = await AsyncStorage.getItem("token");
      const storedRestaurant = await AsyncStorage.getItem("restaurant");
      const id = JSON.parse(storedRestaurant)?._id;

      const payload = {
        restaurantId: id,
        tableNumber,
        items: cart.map((item) => ({
          itemId: item._id,
          quantity: item.quantity,
          price: item.price,
        })),
        total: calculateTotal(),
      };

      const response = await fetch(`http://192.168.1.45:5000/api/order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      const data = JSON.parse(text);

      if (response.ok) {
        Alert.alert("✅ Order Placed");
        setCart([]);
        setTableNumber("");
        setModalVisible(false);
      } else {
        Alert.alert("❌ Failed", data.message || "Something went wrong");
      }
    } catch (err) {
      console.error("Order Error:", err);
      Alert.alert("❌ Network Error");
    }
  };

  const renderItem = ({ item }) => {
    const inCart = cart.find((c) => c._id === item._id);
    return (
      <View style={styles.card}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.placeholderImage]}>
            <Text style={{ color: "#999" }}>No Image</Text>
          </View>
        )}

        <Text style={styles.itemName}>{item.name}</Text>

        <View style={styles.itemInfo}>
          <Text style={styles.itemPrice}>₹{item.price}</Text>
          {inCart ? (
            <View style={styles.cartControl}>
              <TouchableOpacity onPress={() => updateQuantity(item._id, inCart.quantity - 1)}>
                <Text style={styles.cartBtn}>−</Text>
              </TouchableOpacity>
              <Text style={styles.quantity}>{inCart.quantity}</Text>
              <TouchableOpacity onPress={() => updateQuantity(item._id, inCart.quantity + 1)}>
                <Text style={styles.cartBtn}>+</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => addToCart(item)} style={styles.addBtn}>
              <Text style={{ color: "#fff" }}>Add</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.header}>
        <Text style={styles.title}>{restaurant?.name || "Loading..."}</Text>
        <TouchableOpacity onPress={logout}>
          <Ionicons name="log-out-outline" size={26} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={menu}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        numColumns={2}
        key={"2-cols"}
        contentContainerStyle={styles.grid}
      />

      {cart.length > 0 && (
        <View style={styles.footer}>
          <Text style={styles.totalText}>Total: ₹{calculateTotal()}</Text>
          <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.placeBtn}>
            <Text style={styles.placeText}>Place Order</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Order</Text>
            <FlatList
              data={cart}
              renderItem={({ item }) => (
                <Text>{item.name} x {item.quantity} = ₹{item.price * item.quantity}</Text>
              )}
              keyExtractor={(item) => item._id}
            />
            <TextInput
              placeholder="Enter Table Number"
              value={tableNumber}
              onChangeText={setTableNumber}
              style={styles.input}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={placeOrder} style={styles.confirmBtn}>
                <Text style={styles.confirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  header: {
    padding: 16,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
  },
  grid: {
    padding: 10,
  },
  card: {
    backgroundColor: "#fff",
    width: "47%",
    margin: "1.5%",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  image: {
    width: "100%",
    height: 100,
    borderRadius: 10,
    marginBottom: 10,
  },
  placeholderImage: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#eee",
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 5,
  },
  itemInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    alignItems: "center",
    marginTop: 10,
  },
  itemPrice: {
    fontSize: 17,
    color: "#555",
  },
  cartControl: {
    flexDirection: "row",
    alignItems: "center",
  },
  cartBtn: {
    fontSize: 22,
    color: "#f97316",
    paddingHorizontal: 10,
  },
  quantity: {
    fontSize: 16,
    marginHorizontal: 6,
  },
  addBtn: {
    backgroundColor: "#f97316",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 50,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 10,
  },
  totalText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  placeBtn: {
    backgroundColor: "#0ea5e9",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 30,
  },
  placeText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
    width: "90%",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 6,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
    color: "#0f172a",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 10,
    marginTop: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
  },
  cancelBtn: {
    backgroundColor: "#f87171",
    padding: 12,
    borderRadius: 8,
    width: "48%",
    alignItems: "center",
  },
  confirmBtn: {
    backgroundColor: "#22c55e",
    padding: 12,
    borderRadius: 8,
    width: "48%",
    alignItems: "center",
  },
  cancelText: {
    color: "#fff",
    fontWeight: "bold",
  },
  confirmText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
