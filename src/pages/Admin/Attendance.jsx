import React, { useState, useEffect } from 'react';
import { subscribeToSubCollection, subscribeToStudentsByClass, subscribeToAttendance, saveAttendance } from '../../firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { LuCalendar as CalendarIcon, LuCircleCheck as CheckCircle2, LuSave as Save, LuUsers as Users } from 'react-icons/lu';
import toast from 'react-hot-toast';

export default function Attendance() {
  const { userProfile, currentUser } = useAuth();
  const schoolId = userProfile?.schoolId;

  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    const unsub = subscribeToSubCollection(schoolId, 'classes', (data) => {
      setClasses(data);
      if (data.length > 0 && !selectedClassId) {
        setSelectedClassId(data[0].id);
      }
    });
    return () => unsub();
  }, [schoolId]);

  useEffect(() => {
    if (!schoolId || !selectedClassId) {
      setStudents([]);
      return;
    }
    const unsub = subscribeToStudentsByClass(schoolId, selectedClassId, (data) => {
      data.sort((a, b) => a.firstName.localeCompare(b.firstName));
      setStudents(data);
    });
    return () => unsub();
  }, [schoolId, selectedClassId]);

  useEffect(() => {
    if (students.length === 0 || !selectedClassId) return;
    setLoading(true);
    const unsub = subscribeToAttendance(schoolId, selectedClassId, selectedDate, (existingRecord) => {
      const newRecords = {};
      if (existingRecord && existingRecord.records) {
        students.forEach(student => {
          newRecords[student.id] = existingRecord.records[student.id] || 'Present';
        });
      } else {
        students.forEach(student => {
          newRecords[student.id] = 'Present';
        });
      }
      setAttendanceRecords(newRecords);
      setLoading(false);
    });
    return () => unsub();
  }, [selectedDate, students, schoolId, selectedClassId]);

  const handleStatusChange = (studentId, status) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveAttendance(schoolId, selectedClassId, selectedDate, currentUser.uid, attendanceRecords);
      toast.success('Attendance saved successfully!');
    } catch (error) {
      console.error("Error saving attendance:", error);
      toast.error("Failed to save attendance.");
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Present': return 'bg-green-100 text-green-700 border-green-200';
      case 'Absent': return 'bg-red-100 text-red-700 border-red-200';
      case 'Late': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Attendance Management</h1>
          <p className="text-slate-500 mt-1">View and manage attendance across all classes.</p>
        </div>

        <div className="flex items-center gap-4">
          <select 
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="border-slate-200 rounded-xl focus:ring-primary-500 text-slate-700 font-medium py-2 pl-4 pr-10 bg-white"
          >
            <option value="" disabled>Select Class</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.name} - Section {cls.section}</option>
            ))}
          </select>
          <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
            <CalendarIcon size={20} className="text-slate-400 ml-2" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border-none focus:ring-0 text-slate-700 font-medium py-1 pr-2 bg-transparent cursor-pointer"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 pl-2">
            <Users size={18} />
            <span>{students.length} Students</span>
          </div>
          <button 
            onClick={handleSave}
            disabled={saving || loading || students.length === 0}
            className="px-6 py-2 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
          >
            {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div> : <Save size={18} />}
            {saving ? 'Saving...' : 'Save Attendance'}
          </button>
        </div>

        {loading ? (
          <div className="p-20 flex justify-center">
             <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No students found in this class.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="p-4 text-sm font-semibold text-slate-400">Roll No</th>
                  <th className="p-4 text-sm font-semibold text-slate-400">Student Name</th>
                  <th className="p-4 text-sm font-semibold text-slate-400">Status</th>
                  <th className="p-4 text-sm font-semibold text-slate-400 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="p-4 text-slate-600 font-medium">{student.rollNumber || '-'}</td>
                    <td className="p-4 font-bold text-slate-900">
                      {student.firstName} {student.lastName}
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border ${getStatusColor(attendanceRecords[student.id])}`}>
                        {attendanceRecords[student.id] || 'Present'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        {['Present', 'Absent', 'Late'].map(status => (
                          <button
                            key={status}
                            onClick={() => handleStatusChange(student.id, status)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                              attendanceRecords[student.id] === status 
                                ? getStatusColor(status) 
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
