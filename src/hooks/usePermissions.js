import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { collection, query, where, doc, onSnapshot } from 'firebase/firestore';

export default function usePermissions() {
  const { userProfile, currentUser } = useAuth();
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    if (!userProfile || !currentUser) {
      if (isMounted) {
        setPermissions(null);
        setLoading(false);
      }
      return;
    }

    // If School Admin, they have full access
    if (userProfile.role === 'admin') {
      if (isMounted) {
        setPermissions('ALL');
        setLoading(false);
      }
      return;
    }

    const schoolId = userProfile.schoolId;
    if (!schoolId) {
      if (isMounted) {
        setPermissions({});
        setLoading(false);
      }
      return;
    }

    let roleUnsub = null;

    // 1. Listen to the staff document in real-time to find their actual assigned role
    const staffRef = collection(db, `schools/${schoolId}/teachers`);
    const q = query(staffRef, where("userId", "==", currentUser.uid));
    
    const staffUnsub = onSnapshot(q, (staffSnap) => {
      let actualRole = userProfile.role; // fallback
      
      if (!staffSnap.empty) {
        const staffData = staffSnap.docs[0].data();
        if (staffData.role) {
          actualRole = staffData.role;
        }
      }

      // Cleanup previous role listener if it exists
      if (roleUnsub) roleUnsub();

      // 2. Listen to the permissions for that role in real-time
      const roleDocRef = doc(db, `schools/${schoolId}/roles`, actualRole);
      roleUnsub = onSnapshot(roleDocRef, (roleSnap) => {
        if (isMounted) {
          if (roleSnap.exists()) {
            setPermissions(roleSnap.data().permissions || {});
          } else {
            setPermissions({});
          }
          setLoading(false);
        }
      }, (error) => {
        console.error("Error listening to role permissions:", error);
        if (isMounted) {
          setPermissions({});
          setLoading(false);
        }
      });
    }, (error) => {
      console.error("Error listening to staff role:", error);
      if (isMounted) {
        setPermissions({});
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      if (staffUnsub) staffUnsub();
      if (roleUnsub) roleUnsub();
    };
  }, [userProfile, currentUser]);

  const canRead = (moduleKey) => {
    if (permissions === 'ALL') return true;
    if (!permissions || !moduleKey) return false;
    return permissions[moduleKey]?.read === true;
  };

  const canCreate = (moduleKey) => {
    if (permissions === 'ALL') return true;
    if (!permissions || !moduleKey) return false;
    return permissions[moduleKey]?.create === true;
  };

  const canEdit = (moduleKey) => {
    if (permissions === 'ALL') return true;
    if (!permissions || !moduleKey) return false;
    return permissions[moduleKey]?.edit === true;
  };

  const canDelete = (moduleKey) => {
    if (permissions === 'ALL') return true;
    if (!permissions || !moduleKey) return false;
    return permissions[moduleKey]?.delete === true;
  };

  return { permissions, loading, canRead, canCreate, canEdit, canDelete };
}
