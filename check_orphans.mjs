import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

const env = fs.readFileSync('.env', 'utf-8');
const apiKey = env.match(/VITE_FIREBASE_API_KEY=\"(.*?)\"/)[1];
const authDomain = env.match(/VITE_FIREBASE_AUTH_DOMAIN=\"(.*?)\"/)[1];
const projectId = env.match(/VITE_FIREBASE_PROJECT_ID=\"(.*?)\"/)[1];

const app = initializeApp({ apiKey, authDomain, projectId });
const db = getFirestore(app);

async function run() {
  const routesSnap = await getDocs(collection(db, 'schools/cgs-official-website/transportRoutes'));
  for (const routeDoc of routesSnap.docs) {
    const assigned = routeDoc.data().assignedStudents || [];
    console.log('Route:', routeDoc.data().name, 'has', assigned.length, 'students');
    for (const sId of assigned) {
      const idStr = typeof sId === 'object' ? sId.id || sId.studentId : String(sId);
      const studentRef = doc(db, 'schools/cgs-official-website/students', idStr);
      const studentSnap = await getDoc(studentRef);
      if (studentSnap.exists()) {
        console.log(`  - Student EXISTS: ${idStr} -> ${studentSnap.data().firstName || studentSnap.data().name}`);
      } else {
        console.log(`  - Student MISSING (Deleted): ${idStr}`);
      }
    }
  }
}
run().then(() => process.exit(0)).catch(console.error);
