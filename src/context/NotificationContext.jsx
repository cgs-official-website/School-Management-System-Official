import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const { userProfile, currentUser } = useAuth();
  const schoolId = userProfile?.schoolId;
  const role = userProfile?.role?.toLowerCase();

  const [unreadCounts, setUnreadCounts] = useState({
    noticeboard: 0,
    homework: 0,
    complaints: 0,
    leaves: 0
  });

  const [lastViewed, setLastViewed] = useState({
    noticeboard: localStorage.getItem('lastViewed_noticeboard') || '1970-01-01T00:00:00.000Z',
    homework: localStorage.getItem('lastViewed_homework') || '1970-01-01T00:00:00.000Z'
  });

  const clearBadge = (moduleKey) => {
    const now = new Date().toISOString();
    localStorage.setItem(`lastViewed_${moduleKey}`, now);
    setLastViewed(prev => ({ ...prev, [moduleKey]: now }));
  };

  useEffect(() => {
    if (!schoolId || !currentUser) {
      setUnreadCounts({ noticeboard: 0, homework: 0, complaints: 0, leaves: 0 });
      return;
    }

    const unsubscribers = [];

    // 1. Noticeboard Listener (All Roles except Admin)
    if (role !== 'admin') {
      try {
        const noticesRef = collection(db, `schools/${schoolId}/notices`);
        const unsubNotices = onSnapshot(noticesRef, (snapshot) => {
          let count = 0;
          snapshot.forEach((doc) => {
            const data = doc.data();
            const targetAudience = role === 'parent' ? ['all', 'parents', 'students_parents'] : ['all', 'teachers'];
            if (targetAudience.includes(data.audience) && data.createdAt > lastViewed.noticeboard) {
              count++;
            }
          });
          setUnreadCounts(prev => ({ ...prev, noticeboard: count }));
        });
        unsubscribers.push(unsubNotices);
      } catch (e) {
        console.error("Error subscribing to notices:", e);
      }
    }

    // 2. Homework Listener (Parents / Teachers only)
    if (role === 'parent' || role === 'teacher') {
      try {
        const homeworkRef = collection(db, `schools/${schoolId}/homeworks`);
        const unsubHomework = onSnapshot(homeworkRef, (snapshot) => {
          let count = 0;
          snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.createdAt > lastViewed.homework) {
              count++;
            }
          });
          setUnreadCounts(prev => ({ ...prev, homework: count }));
        });
        unsubscribers.push(unsubHomework);
      } catch (e) {
        console.error("Error subscribing to homeworks:", e);
      }
    }

    // 3. Complaints Listener (Admin only)
    if (role === 'admin') {
      try {
        const complaintsRef = collection(db, `schools/${schoolId}/complaints`);
        const q = query(complaintsRef, where("status", "==", "pending"));
        const unsubComplaints = onSnapshot(q, (snapshot) => {
          setUnreadCounts(prev => ({ ...prev, complaints: snapshot.size }));
        });
        unsubscribers.push(unsubComplaints);
      } catch (e) {
        // Fallback without index query
        const complaintsRef = collection(db, `schools/${schoolId}/complaints`);
        const unsubComplaints = onSnapshot(complaintsRef, (snapshot) => {
          let count = 0;
          snapshot.forEach((doc) => {
            if (doc.data().status === 'pending') count++;
          });
          setUnreadCounts(prev => ({ ...prev, complaints: count }));
        });
        unsubscribers.push(unsubComplaints);
      }
    }

    // 4. Leaves Listener (Admin only)
    if (role === 'admin') {
      try {
        const leavesRef = collection(db, `schools/${schoolId}/leaves`);
        const q = query(leavesRef, where("status", "==", "Pending"));
        const unsubLeaves = onSnapshot(q, (snapshot) => {
          setUnreadCounts(prev => ({ ...prev, leaves: snapshot.size }));
        });
        unsubscribers.push(unsubLeaves);
      } catch (e) {
        const leavesRef = collection(db, `schools/${schoolId}/leaves`);
        const unsubLeaves = onSnapshot(leavesRef, (snapshot) => {
          let count = 0;
          snapshot.forEach((doc) => {
            if (doc.data().status === 'Pending') count++;
          });
          setUnreadCounts(prev => ({ ...prev, leaves: count }));
        });
        unsubscribers.push(unsubLeaves);
      }
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [schoolId, role, currentUser, lastViewed]);

  return (
    <NotificationContext.Provider value={{ unreadCounts, clearBadge }}>
      {children}
    </NotificationContext.Provider>
  );
};
