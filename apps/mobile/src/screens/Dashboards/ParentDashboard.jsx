import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import auth from '@react-native-firebase/auth';

const modules = [
  { id: '1', name: 'Student Overview', route: 'ParentStudentOverview' },
  { id: '2', name: 'Attendance', route: 'ParentAttendance' },
  { id: '3', name: 'Homework', route: 'ParentHomework' },
  { id: '4', name: 'Grades', route: 'ParentGrades' },
  { id: '5', name: 'Fees', route: 'ParentFees' }, // Placeholder for future
  { id: '6', name: 'Calendar', route: 'ParentCalendar' }, // Placeholder for future
];

export default function ParentDashboard({ navigation }) {
  const handleLogout = () => {
    auth().signOut();
    navigation.replace('Login');
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => item.route ? navigation.navigate(item.route) : null}
    >
      <Text style={styles.cardText}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
         <Text style={styles.headerTitle}>Parent Dashboard</Text>
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
