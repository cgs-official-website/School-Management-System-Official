import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import firestore from '@react-native-firebase/firestore';

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const subscriber = firestore()
      .collection('students')
      .onSnapshot(querySnapshot => {
        const studentsData = [];
        querySnapshot?.forEach(documentSnapshot => {
          studentsData.push({
            ...documentSnapshot.data(),
            key: documentSnapshot.id,
          });
        });
        setStudents(studentsData);
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
      <Text style={styles.title}>Students Directory</Text>
      <FlatList
        data={students}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.firstName} {item.lastName}</Text>
            <Text style={styles.cardSub}>Class: {item.className || 'N/A'}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No students found.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f9fafb' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#111827' },
  card: { padding: 20, backgroundColor: '#fff', borderRadius: 8, marginBottom: 15, elevation: 1 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  cardSub: { fontSize: 14, color: '#6b7280', marginTop: 5 },
  empty: { textAlign: 'center', marginTop: 50, color: '#6b7280' }
});
