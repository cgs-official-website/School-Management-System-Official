import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import auth from '@react-native-firebase/auth';

const modules = [
  { id: '1', name: 'Overview' },
  { id: '2', name: 'Tenants' },
  { id: '3', name: 'Billing & Plans' },
  { id: '4', name: 'Support Tickets' },
];

export default function SuperAdminDashboard({ navigation }) {
  const handleLogout = () => {
    auth().signOut();
    navigation.replace('Login');
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card}>
      <Text style={styles.cardText}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
         <Text style={styles.headerTitle}>SuperAdmin Dashboard</Text>
         <TouchableOpacity onPress={handleLogout}><Text style={styles.logout}>Logout</Text></TouchableOpacity>
      </View>
      <FlatList
        data={modules}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 20, paddingTop: 50, backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-between' },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  logout: { color: 'red' },
  list: { padding: 10 },
  card: { flex: 1, margin: 10, backgroundColor: '#fff', padding: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  cardText: { fontWeight: 'bold' }
});
