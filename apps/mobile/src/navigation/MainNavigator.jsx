import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

import SuperAdminDashboard from '../screens/Dashboards/SuperAdminDashboard';
import AdminDashboard from '../screens/Dashboards/AdminDashboard';
import TeacherDashboard from '../screens/Dashboards/TeacherDashboard';
import ParentDashboard from '../screens/Dashboards/ParentDashboard';

// Admin Screens
import AdminClasses from '../screens/Admin/AdminClasses';
import AdminStudents from '../screens/Admin/AdminStudents';
import AdminStaff from '../screens/Admin/AdminStaff';
import AdminAttendance from '../screens/Admin/AdminAttendance';

// Teacher Screens
import TeacherRoster from '../screens/Teacher/TeacherRoster';
import TeacherHomework from '../screens/Teacher/TeacherHomework';
import TeacherGrades from '../screens/Teacher/TeacherGrades';
import TeacherLessonPlans from '../screens/Teacher/TeacherLessonPlans';

// Parent Screens
import ParentStudentOverview from '../screens/Parent/ParentStudentOverview';
import ParentAttendance from '../screens/Parent/ParentAttendance';
import ParentHomework from '../screens/Parent/ParentHomework';
import ParentGrades from '../screens/Parent/ParentGrades';

const Stack = createNativeStackNavigator();

export default function MainNavigator({ navigation }) {
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      const user = auth().currentUser;
      if (!user) {
         navigation.replace('Login');
         return;
      }
      try {
        const doc = await firestore().collection('users').doc(user.uid).get();
        if (doc.exists) {
          const data = doc.data();
          setUserRole(data?.role || 'parent'); // default fallback
        } else {
          setUserRole('parent'); // fallback
        }
      } catch (e) {
        setUserRole('parent');
      } finally {
        setLoading(false);
      }
    };
    fetchUserRole();
  }, [navigation]);

  if (loading) return <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}><ActivityIndicator size="large" /></View>;

  return (
    <Stack.Navigator>
       {userRole === 'superadmin' && <Stack.Screen name="SuperAdminDashboard" component={SuperAdminDashboard} />}
       
       {userRole === 'admin' && (
         <Stack.Group>
           <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
           <Stack.Screen name="AdminClasses" component={AdminClasses} />
           <Stack.Screen name="AdminStudents" component={AdminStudents} />
           <Stack.Screen name="AdminStaff" component={AdminStaff} />
           <Stack.Screen name="AdminAttendance" component={AdminAttendance} />
         </Stack.Group>
       )}

       {userRole === 'teacher' && (
         <Stack.Group>
           <Stack.Screen name="TeacherDashboard" component={TeacherDashboard} />
           <Stack.Screen name="TeacherRoster" component={TeacherRoster} />
           <Stack.Screen name="TeacherHomework" component={TeacherHomework} />
           <Stack.Screen name="TeacherGrades" component={TeacherGrades} />
           <Stack.Screen name="TeacherLessonPlans" component={TeacherLessonPlans} />
         </Stack.Group>
       )}

       {userRole === 'parent' && (
         <Stack.Group>
           <Stack.Screen name="ParentDashboard" component={ParentDashboard} />
           <Stack.Screen name="ParentStudentOverview" component={ParentStudentOverview} />
           <Stack.Screen name="ParentAttendance" component={ParentAttendance} />
           <Stack.Screen name="ParentHomework" component={ParentHomework} />
           <Stack.Screen name="ParentGrades" component={ParentGrades} />
         </Stack.Group>
       )}
    </Stack.Navigator>
  );
}
