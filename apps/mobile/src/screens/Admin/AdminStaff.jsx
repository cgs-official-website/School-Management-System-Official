import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import firestore from '@react-native-firebase/firestore';

export default function AdminStaff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const subscriber = firestore()
      .collection('users')
      .where('role', 'in', ['teacher', 'admin'])
      .onSnapshot(querySnapshot => {
        const staffData = [];
        querySnapshot?.forEach(documentSnapshot => {
          staffData.push({
            ...documentSnapshot.data(),
            key: documentSnapshot.id,
          });
        });
        setStaff(staffData);
        setLoading(false);
      }, error => {
         console.warn(error);
         setLoading(false);
      });
    return () => subscriber();
  }, []);

  if (loading) {
    return <ActivityIndicator size="large" style={{flex: 1}} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Staff Directory</Text>
      <FlatList
        data={staff}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.firstName} {item.lastName}</Text>
            <Text style={styles.cardSub}>Role: {item.role}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No staff found.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f9fafb' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#111827' },
  card: { padding: 20, backgroundColor: '#fff', borderRadius: 8, marginBottom: 15, elevation: 1 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  cardSub: { fontSize: 14, color: '#6b7280', marginTop: 5, textTransform: 'capitalize' },
  empty: { textAlign: 'center', marginTop: 50, color: '#6b7280' }
});
