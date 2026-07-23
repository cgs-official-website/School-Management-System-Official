import { db, storage } from "./config";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc,
  addDoc,
  onSnapshot,
  orderBy,
  limit,
  writeBatch,
  arrayUnion,
  increment,
  deleteDoc,
  runTransaction
} from "firebase/firestore";

// --- Assessment / Grades Operations ---
export const createAssessment = async (schoolId, assessmentData) => {
  try {
    const docRef = await addDoc(collection(db, `schools/${schoolId}/assessments`), {
      ...assessmentData,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating assessment:", error);
    throw error;
  }
};

export const getAssessmentsByClass = async (schoolId, classId) => {
  try {
    const q = query(
      collection(db, `schools/${schoolId}/assessments`), 
      where("classId", "==", classId)
    );
    const querySnapshot = await getDocs(q);
    const assessments = [];
    querySnapshot.forEach((doc) => {
      assessments.push({ id: doc.id, ...doc.data() });
    });
    // Sort by date descending
    assessments.sort((a, b) => new Date(b.date) - new Date(a.date));
    return assessments;
  } catch (error) {
    console.error("Error getting assessments:", error);
    throw error;
  }
};

export const updateChatRoomStatus = async (schoolId, studentId, teacherId, status) => {
  const chatRoomId = `${studentId}_${teacherId}`;
  const chatRef = doc(db, `schools/${schoolId}/chats`, chatRoomId);
  await setDoc(chatRef, { status }, { merge: true });
};

export const subscribeToChatRoom = (schoolId, studentId, teacherId, callback) => {
  const chatRoomId = `${studentId}_${teacherId}`;
  return onSnapshot(doc(db, `schools/${schoolId}/chats`, chatRoomId), (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() });
    } else {
      callback(null);
    }
  });
};

export const updateAssessmentGrades = async (schoolId, assessmentId, gradesMap) => {
  try {
    const docRef = doc(db, `schools/${schoolId}/assessments`, assessmentId);
    await updateDoc(docRef, {
      grades: gradesMap,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error updating grades:", error);
    throw error;
  }
};

// --- Parent Portal Operations ---
export const findStudentByAdmission = async (schoolId, admissionNumber, dob) => {
  try {
    const studentsRef = collection(db, `schools/${schoolId}/students`);
    const cleanAdmission = (admissionNumber || '').trim().toUpperCase();
    const q = query(
      studentsRef, 
      where("admissionNumber", "==", cleanAdmission)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const docSnap = querySnapshot.docs[0];
    const studentData = docSnap.data();
    
    // Normalize both dates to compare robustly (e.g. YYYY-MM-DD)
    const normalizeDate = (dStr) => {
      if (!dStr) return '';
      // Try parsing with JS Date
      const parsed = new Date(dStr);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
      // Manual regex split for formats like DD-MM-YYYY or DD/MM/YYYY
      const parts = dStr.split(/[-/.]/);
      if (parts.length === 3) {
        // YYYY-MM-DD
        if (parts[0].length === 4) {
          return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        }
        // DD-MM-YYYY or MM-DD-YYYY
        if (parts[2].length === 4) {
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
      return dStr.trim();
    };

    const dbDob = normalizeDate(studentData.dob);
    const inputDob = normalizeDate(dob);

    if (dbDob === inputDob && dbDob !== '') {
      return { id: docSnap.id, ...studentData };
    }
    
    // Fallback: compare digit characters only
    const cleanStr = (s) => (s || '').replace(/[^0-9]/g, '');
    if (cleanStr(dbDob) === cleanStr(inputDob) && cleanStr(dbDob) !== '') {
      return { id: docSnap.id, ...studentData };
    }
    
    console.warn(`DOB Mismatch. DB: "${studentData.dob}" (Normalized: "${dbDob}"), Input: "${dob}" (Normalized: "${inputDob}")`);
    return null;
  } catch (error) {
    console.error("Error finding student:", error);
    throw error;
  }
};

export const linkStudentToParent = async (parentId, studentId, classId) => {
  try {
    const userRef = doc(db, "users", parentId);
    await updateDoc(userRef, {
      linkedStudentId: studentId,
      linkedClassId: classId,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error linking student:", error);
    throw error;
  }
};

// --- School Operations ---
export const generateSchoolId = async () => {
  try {
    const counterRef = doc(db, 'counters', 'schoolId');
    const newId = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let currentCount = 0;
      if (counterDoc.exists()) {
        currentCount = counterDoc.data().count || 0;
      }
      const nextCount = currentCount + 1;
      transaction.set(counterRef, { count: nextCount }, { merge: true });
      
      // format to SchoolS001
      return `SchoolS${String(nextCount).padStart(3, '0')}`;
    });
    return newId;
  } catch (error) {
    console.error("Error generating school ID:", error);
    throw error;
  }
};

export const createSchool = async (schoolData, schoolId = null) => {
  try {
    let docRef;
    if (schoolId) {
      docRef = doc(db, "schools", schoolId);
      await setDoc(docRef, {
        ...schoolData,
        status: "pending",
        createdAt: new Date().toISOString()
      });
    } else {
      docRef = await addDoc(collection(db, "schools"), {
        ...schoolData,
        status: "pending",
        createdAt: new Date().toISOString()
      });
    }
    return schoolId || docRef.id;
  } catch (error) {
    console.error("Error creating school:", error);
    throw error;
  }
};



export const updateSchoolStatus = async (schoolId, newStatus, permittedModules = []) => {
  try {
    const schoolRef = doc(db, "schools", schoolId);
    const updateData = {
      status: newStatus,
      updatedAt: new Date().toISOString()
    };
    if (newStatus === 'approved') {
      updateData.permittedModules = permittedModules;
      // Initialize empty API keys if not present
      updateData.apiKeys = { googleMaps: '', cloudinary: '' };
    }
    await updateDoc(schoolRef, updateData);
  } catch (error) {
    console.error("Error updating school status:", error);
    throw error;
  }
};

export const updateSchoolAPIKeys = async (schoolId, apiKeys) => {
  try {
    const schoolRef = doc(db, "schools", schoolId);
    await updateDoc(schoolRef, {
      apiKeys,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error updating API keys:", error);
    throw error;
  }
};

export const getSchools = async (status = null) => {
  try {
    let q = collection(db, "schools");
    if (status) {
      q = query(q, where("status", "==", status));
    }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting schools:", error);
    throw error;
  }
};

export const getSchool = async (schoolId) => {
  try {
    const docRef = doc(db, "schools", schoolId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error("Error getting school:", error);
    throw error;
  }
};


export const updateSchool = async (schoolId, updateData) => {
  try {
    const schoolRef = doc(db, "schools", schoolId);
    await updateDoc(schoolRef, {
      ...updateData,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error updating school:", error);
    throw error;
  }
};

// --- General Functions for Subcollections (Classes, Students, Staff, etc) ---
export const addSubDocument = async (schoolId, subCollection, data) => {
  try {
    const docRef = await addDoc(collection(db, `schools/${schoolId}/${subCollection}`), {
      ...data,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    console.error(`Error adding to ${subCollection}:`, error);
    throw error;
  }
};

export const updateSubDocument = async (schoolId, collectionName, docId, data) => {
  try {
    const docRef = doc(db, `schools/${schoolId}/${collectionName}`, docId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error updating ${collectionName}:`, error);
    throw error;
  }
};

export const deleteSubDocument = async (schoolId, collectionName, docId) => {
  try {
    await deleteDoc(doc(db, `schools/${schoolId}/${collectionName}`, docId));
  } catch (error) {
    console.error(`Error deleting ${collectionName}:`, error);
    throw error;
  }
};

export const getSubCollection = async (schoolId, subCollection) => {
  try {
    const querySnapshot = await getDocs(collection(db, `schools/${schoolId}/${subCollection}`));
    const data = [];
    querySnapshot.forEach((doc) => {
      data.push({ id: doc.id, ...doc.data() });
    });
    return data;
  } catch (error) {
    console.error(`Error getting ${subCollection}:`, error);
    throw error;
  }
};

export const getStudentsByClass = async (schoolId, classId) => {
  try {
    const studentsRef = collection(db, `schools/${schoolId}/students`);
    const q = query(studentsRef, where("classId", "==", classId));
    const querySnapshot = await getDocs(q);
    const students = [];
    querySnapshot.forEach((doc) => {
      students.push({ id: doc.id, ...doc.data() });
    });
    return students;
  } catch (error) {
    console.error("Error getting students by class:", error);
    throw error;
  }
};

// --- Attendance Operations ---
export const getAttendance = async (schoolId, classId, dateString) => {
  try {
    const docId = `${classId}_${dateString}`;
    const docRef = doc(db, `schools/${schoolId}/attendance`, docId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error("Error getting attendance:", error);
    throw error;
  }
};

export const subscribeToAttendance = (schoolId, classId, date, callback) => {
  const docRef = doc(db, `schools/${schoolId}/attendance`, `${classId}_${date}`);
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() });
    } else {
      callback(null);
    }
  }, (error) => {
    console.error("Error subscribing to attendance:", error);
  });
};



export const getAttendanceForClass = async (schoolId, classId) => {
  try {
    const q = query(
      collection(db, `schools/${schoolId}/attendance`),
      where("classId", "==", classId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting class attendance:", error);
    throw error;
  }
};



export const saveAttendance = async (schoolId, classId, dateString, teacherId, records) => {
  try {
    const docId = `${classId}_${dateString}`;
    const docRef = doc(db, `schools/${schoolId}/attendance`, docId);
    await setDoc(docRef, {
      classId,
      date: dateString,
      markedBy: teacherId,
      records,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error("Error saving attendance:", error);
    throw error;
  }
};

// --- Plan Management Operations ---
export const createPlan = async (planData) => {
  try {
    const docRef = await addDoc(collection(db, "plans"), {
      ...planData,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating plan:", error);
    throw error;
  }
};

export const getPlans = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "plans"));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting plans:", error);
    throw error;
  }
};

export const updatePlan = async (planId, planData) => {
  try {
    const planRef = doc(db, "plans", planId);
    await updateDoc(planRef, {
      ...planData,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error updating plan:", error);
    throw error;
  }
};

export const deletePlan = async (planId) => {
  try {
    await deleteDoc(doc(db, "plans", planId));
  } catch (error) {
    console.error("Error deleting plan:", error);
    throw error;
  }
};

// --- Chat Operations ---
export const sendMessage = async (schoolId, studentId, teacherId, parentId, senderId, senderRole, text, mediaUrl = null, mediaType = null) => {
  try {
    const chatRoomId = `${studentId}_${teacherId}`;
    const messagesRef = collection(db, `schools/${schoolId}/chats/${chatRoomId}/messages`);
    
    await addDoc(messagesRef, {
      senderId,
      senderRole,
      text,
      mediaUrl,
      mediaType,
      createdAt: new Date().toISOString()
    });

    const chatRef = doc(db, `schools/${schoolId}/chats`, chatRoomId);
    await setDoc(chatRef, {
      studentId,
      teacherId,
      parentId, // could be null if not yet linked
      lastMessage: text || (mediaType ? `Sent a ${mediaType}` : 'Sent an attachment'),
      lastMessageTime: new Date().toISOString()
    }, { merge: true });

  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

export const subscribeToMessages = (schoolId, studentId, teacherId, callback) => {
  const chatRoomId = `${studentId}_${teacherId}`;
  const messagesRef = collection(db, `schools/${schoolId}/chats/${chatRoomId}/messages`);
  const q = query(messagesRef, orderBy("createdAt", "asc"));
  
  return onSnapshot(q, (snapshot) => {
    const messages = [];
    snapshot.forEach((doc) => {
      messages.push({ id: doc.id, ...doc.data() });
    });
    callback(messages);
  }, (error) => {
    console.error("Error subscribing to messages:", error);
  });
};

export const deleteChatMessage = async (schoolId, chatRoomId, messageId) => {
  try {
    const messageRef = doc(db, `schools/${schoolId}/chats/${chatRoomId}/messages`, messageId);
    await deleteDoc(messageRef);
  } catch (error) {
    console.error("Error deleting chat message:", error);
    throw error;
  }
};

export const getChatThreads = async (schoolId) => {
  try {
    const chatsRef = collection(db, `schools/${schoolId}/chats`);
    const q = query(chatsRef, orderBy("lastMessageTime", "desc"));
    const querySnapshot = await getDocs(q);
    const threads = [];
    querySnapshot.forEach((doc) => {
      threads.push({ id: doc.id, ...doc.data() });
    });
    return threads;
  } catch (error) {
    console.error("Error getting chat threads:", error);
    throw error;
  }
};

export const cleanupOldChatAudio = async (schoolId) => {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const timeLimit = oneWeekAgo.toISOString();

    const chatsRef = collection(db, `schools/${schoolId}/chats`);
    const chatSnapshot = await getDocs(chatsRef);
    
    let cleanedCount = 0;
    const batch = writeBatch(db);
    let batchCount = 0;

    for (const chatDoc of chatSnapshot.docs) {
      const messagesRef = collection(db, `schools/${schoolId}/chats/${chatDoc.id}/messages`);
      const q = query(
        messagesRef,
        where("mediaType", "==", "audio"),
        where("createdAt", "<", timeLimit)
      );
      
      const messagesSnap = await getDocs(q);
      messagesSnap.forEach((msgDoc) => {
        batch.update(msgDoc.ref, {
          mediaUrl: null,
          mediaType: null,
          text: msgDoc.data().text ? msgDoc.data().text + '\n[Voice message automatically removed to save storage]' : '[Voice message automatically removed to save storage]'
        });
        cleanedCount++;
        batchCount++;
      });
      
      if (batchCount >= 400) {
        await batch.commit();
        batchCount = 0;
      }
    }
    
    if (batchCount > 0) {
      await batch.commit();
    }
    
    return cleanedCount;
  } catch (error) {
    console.error("Error cleaning up audio messages:", error);
    throw error;
  }
};

export const getTeachersForChat = async (schoolId) => {
  try {
    const usersRef = collection(db, "users");
    const q = query(
      usersRef, 
      where("schoolId", "==", schoolId),
      where("role", "==", "teacher")
    );
    const querySnapshot = await getDocs(q);
    const teachers = [];
    querySnapshot.forEach(doc => {
      teachers.push({ id: doc.id, ...doc.data() });
    });
    return teachers;
  } catch (error) {
    console.error("Error getting teachers:", error);
    throw error;
  }
};

export const uploadChatMedia = async (schoolId, chatRoomId, file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result);
    };
    reader.onerror = () => {
      reject(new Error("Failed to read file as Base64"));
    };
    reader.readAsDataURL(file);
  });
};

export const checkParentRegistration = async (schoolId, studentId) => {
  try {
    const usersRef = collection(db, "users");
    const q = query(
      usersRef, 
      where("schoolId", "==", schoolId),
      where("linkedStudentId", "==", studentId),
      where("role", "==", "parent")
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const parentDoc = querySnapshot.docs[0];
      return { id: parentDoc.id, ...parentDoc.data() };
    }
    return null;
  } catch (error) {
    console.error("Error checking parent registration:", error);
    throw error;
  }
};

// --- Fee Management Operations ---
export const createFeeStructure = async (schoolId, feeData) => {
  try {
    // 1. Create the Fee Structure document
    const feeRef = await addDoc(collection(db, `schools/${schoolId}/feeStructures`), {
      ...feeData,
      createdAt: new Date().toISOString()
    });

    // 2. Fetch all students in the applicable class
    const students = await getStudentsByClass(schoolId, feeData.classId);

    // 3. Batch create invoices for all students in the class
    const batch = writeBatch(db);
    students.forEach(student => {
      const invoiceRef = doc(collection(db, `schools/${schoolId}/invoices`));
      batch.set(invoiceRef, {
        studentId: student.id,
        feeId: feeRef.id,
        feeName: feeData.name,
        amount: Number(feeData.amount),
        dueDate: feeData.dueDate,
        status: 'Pending',
        createdAt: new Date().toISOString()
      });
    });

    await batch.commit();
    return { feeId: feeRef.id, invoiceCount: students.length };
  } catch (error) {
    console.error("Error creating fee structure & invoices:", error);
    throw error;
  }
};

export const getInvoices = async (schoolId) => {
  try {
    const invoicesRef = collection(db, `schools/${schoolId}/invoices`);
    const q = query(invoicesRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    const invoices = [];
    querySnapshot.forEach((doc) => {
      invoices.push({ id: doc.id, ...doc.data() });
    });
    return invoices;
  } catch (error) {
    console.error("Error getting invoices:", error);
    throw error;
  }
};

export const markInvoicePaid = async (schoolId, invoiceId) => {
  try {
    const invoiceRef = doc(db, `schools/${schoolId}/invoices`, invoiceId);
    await updateDoc(invoiceRef, {
      status: 'Paid',
      paidAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error marking invoice paid:", error);
    throw error;
  }
};

// --- Timetable Management Operations ---
export const getTimetable = async (schoolId, classId) => {
  try {
    const docRef = doc(db, `schools/${schoolId}/timetables`, classId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().schedule || {};
    }
    return {};
  } catch (error) {
    console.error("Error getting timetable:", error);
    throw error;
  }
};

export const saveTimetable = async (schoolId, classId, scheduleData) => {
  try {
    const docRef = doc(db, `schools/${schoolId}/timetables`, classId);
    await setDoc(docRef, {
      classId,
      schedule: scheduleData,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error("Error saving timetable:", error);
    throw error;
  }
};

// --- Transport Management Operations ---
export const createTransportRoute = async (schoolId, routeData) => {
  try {
    const routeRef = await addDoc(collection(db, `schools/${schoolId}/transportRoutes`), {
      ...routeData,
      assignedStudents: [],
      createdAt: new Date().toISOString()
    });
    return routeRef.id;
  } catch (error) {
    console.error("Error creating transport route:", error);
    throw error;
  }
};

export const getTransportRoutes = async (schoolId) => {
  try {
    const q = query(
      collection(db, `schools/${schoolId}/transportRoutes`),
      orderBy("name", "asc")
    );
    const querySnapshot = await getDocs(q);
    const routes = [];
    querySnapshot.forEach((doc) => {
      routes.push({ id: doc.id, ...doc.data() });
    });
    return routes;
  } catch (error) {
    console.error("Error getting transport routes:", error);
    throw error;
  }
};

export const assignStudentToRoute = async (schoolId, routeId, studentId) => {
  try {
    const batch = writeBatch(db);

    // 1. Update the route document
    const routeRef = doc(db, `schools/${schoolId}/transportRoutes`, routeId);
    batch.update(routeRef, {
      assignedStudents: arrayUnion(studentId),
      updatedAt: new Date().toISOString()
    });

    // 2. Update the student document
    const studentRef = doc(db, `schools/${schoolId}/students`, studentId);
    batch.update(studentRef, {
      transportRouteId: routeId,
      updatedAt: new Date().toISOString()
    });

    await batch.commit();
  } catch (error) {
    console.error("Error assigning student to route:", error);
    throw error;
  }
};

// --- Library Management Operations ---
export const addBook = async (schoolId, bookData) => {
  try {
    const bookRef = await addDoc(collection(db, `schools/${schoolId}/books`), {
      ...bookData,
      availableQuantity: bookData.totalQuantity,
      createdAt: new Date().toISOString()
    });
    return bookRef.id;
  } catch (error) {
    console.error("Error adding book:", error);
    throw error;
  }
};

export const getBooks = async (schoolId) => {
  try {
    const q = query(
      collection(db, `schools/${schoolId}/books`),
      orderBy("title", "asc")
    );
    const querySnapshot = await getDocs(q);
    const books = [];
    querySnapshot.forEach((doc) => {
      books.push({ id: doc.id, ...doc.data() });
    });
    return books;
  } catch (error) {
    console.error("Error getting books:", error);
    throw error;
  }
};

export const issueBook = async (schoolId, bookId, studentId, dueDate) => {
  try {
    const batch = writeBatch(db);
    
    // 1. Decrement book quantity
    const bookRef = doc(db, `schools/${schoolId}/books`, bookId);
    batch.update(bookRef, {
      availableQuantity: increment(-1)
    });

    // 2. Create issued record
    const issueRef = doc(collection(db, `schools/${schoolId}/issuedBooks`));
    batch.set(issueRef, {
      bookId,
      studentId,
      issuedAt: new Date().toISOString(),
      dueDate,
      status: 'issued'
    });

    await batch.commit();
  } catch (error) {
    console.error("Error issuing book:", error);
    throw error;
  }
};

export const returnBook = async (schoolId, issueId, bookId) => {
  try {
    const batch = writeBatch(db);
    
    // 1. Increment book quantity
    const bookRef = doc(db, `schools/${schoolId}/books`, bookId);
    batch.update(bookRef, {
      availableQuantity: increment(1)
    });

    // 2. Update issued record
    const issueRef = doc(db, `schools/${schoolId}/issuedBooks`, issueId);
    batch.update(issueRef, {
      status: 'returned',
      returnedAt: new Date().toISOString()
    });

    await batch.commit();
  } catch (error) {
    console.error("Error returning book:", error);
    throw error;
  }
};

export const getIssuedBooks = async (schoolId) => {
  try {
    const q = query(
      collection(db, `schools/${schoolId}/issuedBooks`),
      orderBy("issuedAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    const issues = [];
    querySnapshot.forEach((doc) => {
      issues.push({ id: doc.id, ...doc.data() });
    });
    return issues;
  } catch (error) {
    console.error("Error getting issued books:", error);
    throw error;
  }
};

// --- Examination Operations ---
export const createExam = async (schoolId, examData) => {
  try {
    const examRef = await addDoc(collection(db, `schools/${schoolId}/exams`), {
      ...examData,
      createdAt: new Date().toISOString()
    });
    return examRef.id;
  } catch (error) {
    console.error("Error creating exam:", error);
    throw error;
  }
};

export const getExams = async (schoolId) => {
  try {
    const q = query(
      collection(db, `schools/${schoolId}/exams`),
      orderBy("startDate", "desc")
    );
    const querySnapshot = await getDocs(q);
    const exams = [];
    querySnapshot.forEach((doc) => {
      exams.push({ id: doc.id, ...doc.data() });
    });
    return exams;
  } catch (error) {
    console.error("Error getting exams:", error);
    throw error;
  }
};

export const getExamAssessments = async (schoolId, classId, examId) => {
  try {
    const q = query(
      collection(db, `schools/${schoolId}/assessments`),
      where("classId", "==", classId),
      where("examId", "==", examId)
    );
    const querySnapshot = await getDocs(q);
    const assessments = [];
    querySnapshot.forEach((doc) => {
      assessments.push({ id: doc.id, ...doc.data() });
    });
    return assessments;
  } catch (error) {
    console.error("Error getting exam assessments:", error);
    throw error;
  }
};

// --- Noticeboard Operations ---
export const createNotice = async (schoolId, noticeData) => {
  try {
    const noticeRef = await addDoc(collection(db, `schools/${schoolId}/notices`), {
      ...noticeData,
      type: noticeData.type || 'global',
      classId: noticeData.classId || null,
      viewedBy: [], // Array of { uid, name, role, class }
      createdAt: new Date().toISOString()
    });
    return noticeRef.id;
  } catch (error) {
    console.error("Error creating notice:", error);
    throw error;
  }
};

export const updateNotice = async (schoolId, noticeId, noticeData) => {
  try {
    const noticeRef = doc(db, `schools/${schoolId}/notices`, noticeId);
    await updateDoc(noticeRef, {
      ...noticeData,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error updating notice:", error);
    throw error;
  }
};

export const markNoticeAsViewed = async (schoolId, noticeId, userDetails) => {
  try {
    const noticeRef = doc(db, `schools/${schoolId}/notices`, noticeId);
    // userDetails should be { uid, name, role, class: (optional string) }
    await updateDoc(noticeRef, {
      viewedBy: arrayUnion(userDetails)
    });
  } catch (error) {
    // Fail silently if there's an error so it doesn't crash the UI for users
    console.warn("Could not mark notice as viewed:", error);
  }
};

export const getNotices = async (schoolId, targetAudience = null) => {
  try {
    let q = collection(db, `schools/${schoolId}/notices`);
    
    if (targetAudience) {
      q = query(q, where("audience", "in", [targetAudience, 'all']));
    }
    
    const querySnapshot = await getDocs(q);
    let notices = [];
    querySnapshot.forEach((doc) => {
      notices.push({ id: doc.id, ...doc.data() });
    });
    
    notices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return notices;
  } catch (error) {
    console.error("Error getting notices:", error);
    throw error;
  }
};

export const deleteNotice = async (schoolId, noticeId) => {
  try {
    const noticeRef = doc(db, `schools/${schoolId}/notices`, noticeId);
    await deleteDoc(noticeRef);
  } catch (error) {
    console.error("Error deleting notice:", error);
    throw error;
  }
};

// --- Templates (Report Cards) ---
export const saveTemplate = async (schoolId, templateType, templateData) => {
  try {
    const docRef = doc(db, `schools/${schoolId}/templates`, templateType);
    await setDoc(docRef, {
      ...templateData,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error saving template:", error);
    throw error;
  }
};

export const getTemplate = async (schoolId, templateType) => {
  try {
    const docRef = doc(db, `schools/${schoolId}/templates`, templateType);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error("Error getting template:", error);
    throw error;
  }
};

// --- REAL-TIME SUBSCRIPTION FUNCTIONS ---
// These functions use onSnapshot for real-time updates

export const subscribeToSubCollection = (schoolId, subCollection, callback, onError) => {
  const q = collection(db, `schools/${schoolId}/${subCollection}`);
  return onSnapshot(q, (snapshot) => {
    const data = [];
    snapshot.forEach((doc) => {
      data.push({ id: doc.id, ...doc.data() });
    });
    callback(data);
  }, (error) => {
    console.error(`Error subscribing to ${subCollection}:`, error);
    if (onError) onError(error);
  });
};

export const subscribeToStudentsByClass = (schoolId, classId, callback) => {
  const q = query(
    collection(db, `schools/${schoolId}/students`),
    where("classId", "==", classId)
  );
  return onSnapshot(q, (snapshot) => {
    const data = [];
    snapshot.forEach((doc) => {
      data.push({ id: doc.id, ...doc.data() });
    });
    callback(data);
  }, (error) => {
    console.error("Error subscribing to students by class:", error);
  });
};

export const subscribeToAssessmentsByClass = (schoolId, classId, callback) => {
  const q = query(
    collection(db, `schools/${schoolId}/assessments`),
    where("classId", "==", classId)
  );
  return onSnapshot(q, (snapshot) => {
    const data = [];
    snapshot.forEach((doc) => {
      data.push({ id: doc.id, ...doc.data() });
    });
    data.sort((a, b) => new Date(b.date) - new Date(a.date));
    callback(data);
  });
};

export const subscribeToAttendanceForClass = (schoolId, classId, callback) => {
  const q = query(
    collection(db, `schools/${schoolId}/attendance`),
    where("classId", "==", classId)
  );
  return onSnapshot(q, (snapshot) => {
    const records = [];
    snapshot.forEach((doc) => {
      records.push({ id: doc.id, ...doc.data() });
    });
    callback(records);
  });
};

export const subscribeToAllSchools = (callback) => {
  const q = query(collection(db, "schools"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const schools = [];
    snapshot.forEach((doc) => {
      schools.push({ id: doc.id, ...doc.data() });
    });
    callback(schools);
  });
};

export const subscribeToPlans = (callback) => {
  return onSnapshot(collection(db, "plans"), (snapshot) => {
    const plans = [];
    snapshot.forEach((doc) => {
      plans.push({ id: doc.id, ...doc.data() });
    });
    callback(plans);
  });
};

export const subscribeToTransportRoutes = (schoolId, callback) => {
  const q = query(
    collection(db, `schools/${schoolId}/transportRoutes`),
    orderBy("name", "asc")
  );
  return onSnapshot(q, (snapshot) => {
    const routes = [];
    snapshot.forEach((doc) => {
      routes.push({ id: doc.id, ...doc.data() });
    });
    callback(routes);
  });
};

export const subscribeToBooks = (schoolId, callback) => {
  const q = query(
    collection(db, `schools/${schoolId}/books`),
    orderBy("title", "asc")
  );
  return onSnapshot(q, (snapshot) => {
    const books = [];
    snapshot.forEach((doc) => {
      books.push({ id: doc.id, ...doc.data() });
    });
    callback(books);
  });
};

export const subscribeToIssuedBooks = (schoolId, callback) => {
  const q = query(
    collection(db, `schools/${schoolId}/issuedBooks`),
    orderBy("issuedAt", "desc")
  );
  return onSnapshot(q, (snapshot) => {
    const issues = [];
    snapshot.forEach((doc) => {
      issues.push({ id: doc.id, ...doc.data() });
    });
    callback(issues);
  });
};

export const subscribeToExams = (schoolId, callback) => {
  const q = query(
    collection(db, `schools/${schoolId}/exams`),
    orderBy("startDate", "desc")
  );
  return onSnapshot(q, (snapshot) => {
    const exams = [];
    snapshot.forEach((doc) => {
      exams.push({ id: doc.id, ...doc.data() });
    });
    callback(exams);
  });
};

export const subscribeToExamAssessments = (schoolId, classId, examId, callback) => {
  const q = query(
    collection(db, `schools/${schoolId}/assessments`),
    where("classId", "==", classId),
    where("examId", "==", examId)
  );
  return onSnapshot(q, (snapshot) => {
    const assessments = [];
    snapshot.forEach((doc) => {
      assessments.push({ id: doc.id, ...doc.data() });
    });
    callback(assessments);
  });
};

export const subscribeToGlobalNotices = (schoolId, targetAudience, callback) => {
  let q = collection(db, `schools/${schoolId}/notices`);
  // We can't combine where(type) and where(audience in) without an index, 
  // so we filter locally for now.
  return onSnapshot(q, (snapshot) => {
    let notices = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if ((data.type === 'global' || !data.type) && 
          (!targetAudience || data.audience === targetAudience || data.audience === 'all' || 
           (targetAudience === 'parents' && data.audience === 'students_parents') ||
           (targetAudience === 'students' && data.audience === 'students_parents'))) {
        notices.push({ id: doc.id, ...data });
      }
    });
    notices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    callback(notices);
  });
};

export const subscribeToClassNotices = (schoolId, classId = null, callback) => {
  let q;
  if (classId) {
    q = query(
      collection(db, `schools/${schoolId}/notices`),
      where("type", "==", "class"),
      where("classId", "==", classId)
    );
  } else {
    q = query(
      collection(db, `schools/${schoolId}/notices`),
      where("type", "==", "class")
    );
  }
  
  return onSnapshot(q, (snapshot) => {
    let notices = [];
    snapshot.forEach((doc) => {
      notices.push({ id: doc.id, ...doc.data() });
    });
    notices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    callback(notices);
  });
};

// Keeping the original for backwards compatibility in other places temporarily
export const subscribeToNotices = (schoolId, targetAudience, callback) => {
  let q = collection(db, `schools/${schoolId}/notices`);
  if (targetAudience) {
    q = query(q, where("audience", "in", [targetAudience, 'all']));
  }
  return onSnapshot(q, (snapshot) => {
    let notices = [];
    snapshot.forEach((doc) => {
      notices.push({ id: doc.id, ...doc.data() });
    });
    notices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    callback(notices);
  });
};

export const subscribeToInvoices = (schoolId, callback) => {
  const q = query(collection(db, `schools/${schoolId}/invoices`), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const invoices = [];
    snapshot.forEach((doc) => {
      invoices.push({ id: doc.id, ...doc.data() });
    });
    callback(invoices);
  });
};

// --- Subscription Plans ---
export const subscribeToSubscriptionPlans = (callback) => {
  return onSnapshot(collection(db, "subscriptionPlans"), (snapshot) => {
    const plans = [];
    snapshot.forEach((doc) => {
      plans.push({ id: doc.id, ...doc.data() });
    });
    callback(plans);
  });
};

export const getSubscriptionPlans = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "subscriptionPlans"));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting subscription plans:", error);
    throw error;
  }
};

export const updateSubscriptionPlan = async (planId, planData) => {
  try {
    const planRef = doc(db, 'subscriptionPlans', planId);
    await setDoc(planRef, {
      ...planData,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error("Error updating subscription plan:", error);
    throw error;
  }
};

export const initializeDefaultSubscriptionPlans = async () => {
  const defaults = [
    {
      id: 'base',
      name: 'Base Plan',
      userLimit: 300,
      pricePerUserPerYear: 160,
      cloudStorageGB: 25,
      custom: false,
      modules: { staffManagement: true, studentManagement: true, timetable: true, feeManagement: true, attendance: true, exams: false, library: false, transport: false, lms: false, apiIntegration: false }
    },
    {
      id: 'standard',
      name: 'Standard Plan',
      userLimit: 600,
      pricePerUserPerYear: 240,
      cloudStorageGB: 60,
      custom: false,
      modules: { staffManagement: true, studentManagement: true, timetable: true, feeManagement: true, attendance: true, exams: true, library: true, transport: true, lms: false, apiIntegration: true }
    },
    {
      id: 'premium',
      name: 'Premium Plan',
      userLimit: 1200,
      pricePerUserPerYear: 320,
      cloudStorageGB: 120,
      custom: false,
      modules: { staffManagement: true, studentManagement: true, timetable: true, feeManagement: true, attendance: true, exams: true, library: true, transport: true, lms: true, apiIntegration: true }
    },
    {
      id: 'enterprise',
      name: 'Enterprise Plan',
      userLimit: 0,
      pricePerUserPerYear: 0,
      cloudStorageGB: 0,
      custom: true,
      modules: { staffManagement: true, studentManagement: true, timetable: true, feeManagement: true, attendance: true, exams: true, library: true, transport: true, lms: true, apiIntegration: true }
    }
  ];

  try {
    for (const plan of defaults) {
      const { id, ...data } = plan;
      const planRef = doc(db, 'subscriptionPlans', id);
      await setDoc(planRef, data, { merge: true });
    }
  } catch (error) {
    console.error("Error initializing subscription plans:", error);
    throw error;
  }
};

// ==========================================
// PTM OPERATIONS
// ==========================================

export const createPTM = async (schoolId, ptmData) => {
  try {
    const ptmsRef = collection(db, `schools/${schoolId}/ptms`);
    const docRef = await addDoc(ptmsRef, {
      ...ptmData,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating PTM:", error);
    throw error;
  }
};

export const updatePTM = async (schoolId, ptmId, updates) => {
  try {
    const docRef = doc(db, `schools/${schoolId}/ptms`, ptmId);
    await updateDoc(docRef, updates);
  } catch (error) {
    console.error("Error updating PTM:", error);
    throw error;
  }
};

export const subscribeToClassPTMs = (schoolId, classId, callback) => {
  const q = query(
    collection(db, `schools/${schoolId}/ptms`),
    where("classId", "==", classId)
  );
  return onSnapshot(q, (snapshot) => {
    const data = [];
    snapshot.forEach((doc) => {
      data.push({ id: doc.id, ...doc.data() });
    });
    callback(data);
  });
};

export const subscribeToStudentPTMs = (schoolId, studentId, callback) => {
  const q = query(
    collection(db, `schools/${schoolId}/ptms`),
    where("studentId", "==", studentId)
  );
  return onSnapshot(q, (snapshot) => {
    const data = [];
    snapshot.forEach((doc) => {
      data.push({ id: doc.id, ...doc.data() });
    });
    callback(data);
  });
};

// ==========================================
// PERFORMANCE OPERATIONS
// ==========================================

export const updateStudentPerformanceStatus = async (schoolId, studentId, status) => {
  try {
    const docRef = doc(db, `schools/${schoolId}/students`, studentId);
    await updateDoc(docRef, { performanceStatus: status });
  } catch (error) {
    console.error("Error updating performance status:", error);
    throw error;
  }
};

export const getChatsForTeacher = async (schoolId, teacherId) => {
  const q = query(collection(db, `schools/${schoolId}/chats`), where("teacherId", "==", teacherId));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
