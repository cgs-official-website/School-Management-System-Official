import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { subscribeToSubCollection } from '../../firebase/firestore';
import { LuFileText as FileText, LuClock as Clock, LuCircleCheck as CheckCircle2 } from 'react-icons/lu';
import { TableSkeleton } from '../../components/Skeleton';
import toast from 'react-hot-toast';

export default function HomeworkOverview() {
  const { userProfile } = useAuth();
  const schoolId = userProfile?.schoolId;
  const classId = userProfile?.classId;
  const studentId = userProfile?.id; // Parent's child ID

  const [homeworks, setHomeworks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schoolId || !classId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = subscribeToSubCollection(schoolId, 'homeworks', (hwData) => {
      // Filter by the student's class
      const classHw = hwData.filter(hw => hw.classId === classId);
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
            const isOverdue = dueDate < new Date() && hw.status !== 'Completed';

            return (
              <div key={hw.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${isOverdue ? 'bg-red-50 text-red-600' : 'bg-primary-50 text-primary-600'}`}>
                    <FileText size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{hw.title}</h3>
                    <p className="text-slate-600 mt-1">{hw.description}</p>
                  </div>
                </div>

                <div className="flex flex-col sm:items-end gap-2 border-t sm:border-t-0 sm:border-l border-slate-100 pt-4 sm:pt-0 sm:pl-6 min-w-[150px]">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-500">
                    <Clock size={16} />
                    Due: {dueDate.toLocaleDateString()}
                  </div>
                  {/* Status pill (In a real app, this would check a 'student_homework' subcollection) */}
                  {isOverdue ? (
                    <span className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-bold w-fit">
                      Overdue
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-bold w-fit">
                      Pending
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
