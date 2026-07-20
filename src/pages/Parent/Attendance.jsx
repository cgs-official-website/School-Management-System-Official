import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { subscribeToAttendanceForClass } from '../../firebase/firestore';
import { LuCalendar as Calendar, LuCircleCheck as CheckCircle2, LuCircleX as XCircle, LuCircleAlert as AlertCircle } from 'react-icons/lu';

export default function ParentAttendance() {
  const { userProfile } = useAuth();
  const schoolId = userProfile?.schoolId;
  const classId = userProfile?.linkedClassId;
  const studentId = userProfile?.linkedStudentId;

  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schoolId || !classId || !studentId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = subscribeToAttendanceForClass(schoolId, classId, (docs) => {
      const records = [];
      docs.forEach(doc => {
        const status = doc.records?.[studentId];
        if (status) {
          records.push({
            id: doc.id,
            date: doc.date,
            status: status,
          });
        }
      });
      // Sort by date descending
      records.sort((a, b) => new Date(b.date) - new Date(a.date));
      setAttendanceRecords(records);
      setLoading(false);
    });

    return () => unsub();
  }, [schoolId, classId, studentId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  const getStatusIcon = (status) => {
    if (status === 'Present') return <CheckCircle2 size={20} className="text-green-500" />;
    if (status === 'Absent') return <XCircle size={20} className="text-red-500" />;
    if (status === 'Late') return <AlertCircle size={20} className="text-amber-500" />;
    return null;
  };

  const getStatusColor = (status) => {
    if (status === 'Present') return 'bg-green-50 text-green-700 border-green-200';
    if (status === 'Absent') return 'bg-red-50 text-red-700 border-red-200';
    if (status === 'Late') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const presentCount = attendanceRecords.filter(r => r.status === 'Present').length;
  const absentCount = attendanceRecords.filter(r => r.status === 'Absent').length;
  const lateCount = attendanceRecords.filter(r => r.status === 'Late').length;
  const totalCount = attendanceRecords.length;
  const percentage = totalCount === 0 ? 100 : Math.round(((presentCount + lateCount) / totalCount) * 100);

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto animate-fade-in-up pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Detailed Attendance</h1>
        <p className="text-slate-500 mt-1">View your child's daily attendance records.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
          <div className="text-3xl font-black text-slate-900 mb-1">{percentage}%</div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Overall</div>
        </div>
        <div className="bg-green-50 p-6 rounded-2xl border border-green-100 shadow-sm text-center">
          <div className="text-3xl font-black text-green-700 mb-1">{presentCount}</div>
          <div className="text-xs font-bold text-green-600/70 uppercase tracking-wider">Present</div>
        </div>
        <div className="bg-red-50 p-6 rounded-2xl border border-red-100 shadow-sm text-center">
          <div className="text-3xl font-black text-red-700 mb-1">{absentCount}</div>
          <div className="text-xs font-bold text-red-600/70 uppercase tracking-wider">Absent</div>
        </div>
        <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 shadow-sm text-center">
          <div className="text-3xl font-black text-amber-700 mb-1">{lateCount}</div>
          <div className="text-xs font-bold text-amber-600/70 uppercase tracking-wider">Late</div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {attendanceRecords.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <Calendar size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-bold text-slate-900 mb-1">No Records Found</p>
            <p>No attendance records have been marked yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {attendanceRecords.map(record => (
              <div key={record.id} className="p-4 sm:p-6 hover:bg-slate-50/50 transition-colors flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 border border-slate-200">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{new Date(record.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                  </div>
                </div>
                <div className={`px-4 py-1.5 rounded-lg border font-bold text-sm flex items-center gap-2 ${getStatusColor(record.status)}`}>
                  {getStatusIcon(record.status)}
                  {record.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
