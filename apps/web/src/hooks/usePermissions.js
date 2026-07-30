import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

export default function usePermissions() {
  const { userProfile, currentUser } = useAuth();
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchPermissions = async () => {
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
          setPermissions('ALL'); // Special keyword for full access
          setLoading(false);
        }
        return;
      }

      // If they are a staff member (usually registered with role 'teacher' or 'staff' in users collection)
      try {
        const schoolId = userProfile.schoolId;
        if (!schoolId) {
          if (isMounted) {
            setPermissions({});
            setLoading(false);
          }
          return;
        }

        // 1. Get the staff document to find their actual assigned role
        const staffRef = collection(db, `schools/${schoolId}/teachers`);
        const q = query(staffRef, where("userId", "==", currentUser.uid));
        const staffSnap = await getDocs(q);
        
        let actualRole = userProfile.role; // fallback
        
        if (!staffSnap.empty) {
          const staffData = staffSnap.docs[0].data();
          if (staffData.role) {
            actualRole = staffData.role;
          }
        }

        // 2. Fetch the permissions for that role
        const roleDocRef = doc(db, `schools/${schoolId}/roles`, actualRole);
        const roleSnap = await getDoc(roleDocRef);

        if (roleSnap.exists()) {
          if (isMounted) {
            setPermissions(roleSnap.data().permissions || {});
          }
        } else {
          // If no specific permissions found, default to nothing or basic based on role?
          // Defaulting to empty permissions if not defined by admin.
          if (isMounted) {
            setPermissions({});
          }
        }
      } catch (error) {
        console.error("Error fetching permissions:", error);
        if (isMounted) setPermissions({});
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPermissions();

    return () => {
      isMounted = false;
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
