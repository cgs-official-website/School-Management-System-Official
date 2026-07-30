import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

export default function ParentGrades() {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth().currentUser;
    if (!user) return;

    const subscriber = firestore()
      .collection('grades')
      // Ideally query where studentId in [childrenIds]
      .onSnapshot(querySnapshot => {
        const data = [];
        querySnapshot?.forEach(documentSnapshot => {
          data.push({
            ...documentSnapshot.data(),
            key: documentSnapshot.id,
          });
        });
        setGrades(data);
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
      <Text style={styles.title}>Student Grades</Text>
      <FlatList
        data={grades}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.studentName || 'Student'}</Text>
            <Text style={styles.cardSub}>Subject: {item.subject}</Text>
            <Text style={styles.cardSub}>Score: {item.score} / {item.totalScore}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No grades available.</Text>}
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
