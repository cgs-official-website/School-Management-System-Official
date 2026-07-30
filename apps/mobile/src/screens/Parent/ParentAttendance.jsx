import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

export default function ParentAttendance() {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth().currentUser;
    if (!user) return;

    // We'd ideally query student attendance records where student is child of parent.
    const subscriber = firestore()
      .collection('student_attendance')
      .where('parentId', '==', user.uid)
      .orderBy('date', 'desc')
      .onSnapshot(querySnapshot => {
        const data = [];
        querySnapshot?.forEach(documentSnapshot => {
          data.push({
            ...documentSnapshot.data(),
            key: documentSnapshot.id,
          });
        });
        setAttendance(data);
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
      <Text style={styles.title}>Attendance Records</Text>
      <FlatList
        data={attendance}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.studentName || 'Student'}</Text>
            <Text style={styles.cardSub}>Date: {item.date?.toDate ? item.date.toDate().toLocaleDateString() : item.date}</Text>
            <Text style={[styles.cardStatus, item.status === 'Absent' ? {color: 'red'} : {color: 'green'}]}>
               {item.status || 'Present'}
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No attendance records found.</Text>}
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
  cardStatus: { fontSize: 14, fontWeight: 'bold', marginTop: 5 },
  empty: { textAlign: 'center', marginTop: 50, color: '#6b7280' }
});
