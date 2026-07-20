import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { subscribeToSubCollection, updateSubDocument, getSubCollection, addSubDocument } from '../../firebase/firestore';
import { LuFileText as FileText, LuClock as Clock, LuCircleCheck as CheckCircle2, LuUser as User, LuBookOpen as BookOpen } from 'react-icons/lu';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { TableSkeleton } from '../../components/Skeleton';
import toast from 'react-hot-toast';

export default function HomeworkOverview() {
  const { userProfile } = useAuth();
  const schoolId = userProfile?.schoolId;
  const classId = userProfile?.linkedClassId;
  const studentId = userProfile?.linkedStudentId; // Parent's child ID

  const [homeworks, setHomeworks] = useState([]);
  const [studentStatuses, setStudentStatuses] = useState({});
  const [loading, setLoading] = useState(true);

  const handleStatusChange = async (hwId, newStatus) => {
    try {
      const subRef = doc(db, `schools/${schoolId}/homeworks/${hwId}/submissions`, studentId);
      await setDoc(subRef, {
        id: studentId,
        status: newStatus,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
      
      setStudentStatuses(prev => ({ ...prev, [hwId]: newStatus }));
      toast.success("Status updated!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update status");
    }
  };

  useEffect(() => {
    if (!schoolId || !classId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = subscribeToSubCollection(schoolId, 'homeworks', async (hwData) => {
      // Filter by the student's class
      const classHw = hwData.filter(hw => hw.classId === classId);
      
      // Fetch statuses for this student for all these homeworks
      const statuses = {};
      for (const hw of classHw) {
        const subRef = doc(db, `schools/${schoolId}/homeworks/${hw.id}/submissions`, studentId);
        const subSnap = await getDoc(subRef);
        if (subSnap.exists()) {
          statuses[hw.id] = subSnap.data().status;
        } else {
          statuses[hw.id] = 'Not Started';
        }
      }
      setStudentStatuses(statuses);

      // Sort by due date (closest first)
      setHomeworks(classHw.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)));
      setLoading(false);
    });

    return () => unsub();
  }, [schoolId, classId]);

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto animate-fade-in-up">
        <TableSkeleton rows={4} columns={3} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Homework & Assignments</h1>
        <p className="text-slate-500 mt-1">Track upcoming tasks and recent evaluations.</p>
      </div>

      <div className="grid gap-4">
        {homeworks.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
            <CheckCircle2 size={48} className="mx-auto text-emerald-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-900">All caught up!</h3>
            <p className="text-slate-500 mt-1">No pending homework assignments found for this class.</p>
          </div>
        ) : (
          homeworks.map(hw => {
            const dueDate = new Date(hw.dueDate);
            const currentStatus = studentStatuses[hw.id] || 'Not Started';
            const isOverdue = dueDate < new Date() && currentStatus !== 'Completed' && currentStatus !== 'Submitted';

            let statusColor = "bg-slate-100 text-slate-700 border-slate-200";
            if (currentStatus === 'In Progress') statusColor = "bg-amber-50 text-amber-700 border-amber-200";
            if (currentStatus === 'Completed') statusColor = "bg-blue-50 text-blue-700 border-blue-200";
            if (currentStatus === 'Submitted') statusColor = "bg-emerald-50 text-emerald-700 border-emerald-200";

            return (
              <div key={hw.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${isOverdue ? 'bg-red-50 text-red-600' : 'bg-primary-50 text-primary-600'}`}>
                    <FileText size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{hw.title}</h3>
                    <p className="text-slate-600 mt-1 mb-3">{hw.description}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
                      <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                        <BookOpen size={12} /> {hw.subject || 'General'}
                      </span>
                      <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                        <User size={12} /> {hw.teacherName || 'Teacher'}
                      </span>
                      <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                        Assigned: {hw.assignedDate ? new Date(hw.assignedDate).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:items-end gap-3 border-t sm:border-t-0 sm:border-l border-slate-100 pt-4 sm:pt-0 sm:pl-6 min-w-[180px]">
                  <div className={`flex items-center gap-1.5 text-sm font-bold ${isOverdue ? 'text-red-600' : 'text-slate-600'}`}>
                    <Clock size={16} />
                    Due: {dueDate.toLocaleDateString()}
                  </div>
                  
                  <div className="w-full mt-1">
                    <select
                      value={currentStatus}
                      onChange={(e) => handleStatusChange(hw.id, e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-lg border text-sm font-bold focus:ring-2 focus:ring-primary-500 outline-none transition-colors ${statusColor}`}
                    >
                      <option value="Not Started">Not Started</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Submitted">Submitted</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
