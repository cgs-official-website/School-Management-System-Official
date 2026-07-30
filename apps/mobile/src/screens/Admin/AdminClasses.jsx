import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import firestore from '@react-native-firebase/firestore';

export default function AdminClasses() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const subscriber = firestore()
      .collection('classes')
      .onSnapshot(querySnapshot => {
        const classesData = [];
        querySnapshot?.forEach(documentSnapshot => {
          classesData.push({
            ...documentSnapshot.data(),
            key: documentSnapshot.id,
          });
        });
        setClasses(classesData);
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
      <Text style={styles.title}>Classes</Text>
      <FlatList
        data={classes}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.name || 'Unnamed Class'}</Text>
            <Text style={styles.cardSub}>Teacher: {item.teacherName || 'Not Assigned'}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No classes found.</Text>}
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
