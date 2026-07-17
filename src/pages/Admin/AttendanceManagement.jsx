import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { subscribeToSubCollection, subscribeToAttendance, saveAttendance } from '../../firebase/firestore';
import { Check as LuCheck, X as LuX, Clock as LuClock, Save as Save, Calendar as Calendar, Users as Users, AlertCircle as AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AttendanceManagement() {
  const { userProfile, currentUser } = useAuth();
  const schoolId = userProfile?.schoolId;

  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [attendanceRecord, setAttendanceRecord] = useState(null); // The raw doc from DB
  const [currentMarkings, setCurrentMarkings] = useState({}); // Local state for editing
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 1. Fetch Classes and all Students
  useEffect(() => {
    if (!schoolId) return;
    
    setLoading(true);
    const unsubClasses = subscribeToSubCollection(schoolId, 'classes', (data) => {
      setClasses(data);
      if (data.length > 0 && !selectedClassId) {
        setSelectedClassId(data[0].id);
      }
      setLoading(false);
    });

    const unsubStudents = subscribeToSubCollection(schoolId, 'students', (data) => {
      setStudents(data);
    });

    return () => {
      unsubClasses();
      unsubStudents();
    };
  }, [schoolId]);

  // 2. Filter students for the selected class
  const classStudents = useMemo(() => {
    return (students || []).filter(s => s.classId === selectedClassId && s.status === 'Active');
  }, [students, selectedClassId]);

  // 3. Fetch attendance for selected class and date
  useEffect(() => {
    if (!schoolId || !selectedClassId || !selectedDate) return;
    
    const unsub = subscribeToAttendance(schoolId, selectedClassId, selectedDate, (data) => {
      setAttendanceRecord(data);
      if (data && data.records) {
        setCurrentMarkings(data.records);
      } else {
        // Initialize default "Present" for all active students if no record exists
        const initial = {};
        classStudents.forEach(s => {
          initial[s.id] = { status: 'Present', remarks: '' };
        });
        setCurrentMarkings(initial);
      }
    });

    return () => unsub();
  }, [schoolId, selectedClassId, selectedDate, classStudents.length]); // Depend on classStudents.length to re-initialize if new students arrive

  const handleStatusChange = (studentId, status) => {
    setCurrentMarkings(prev => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), status }
    }));
  };

  const handleSave = async () => {
    if (!schoolId || !selectedClassId || !selectedDate) return;
    setSaving(true);
    try {
      await saveAttendance(
        schoolId, 
        selectedClassId, 
        selectedDate, 
        currentUser.uid, 
        currentMarkings
      );
      toast.success("Attendance saved successfully!");
    } catch (error) {
      toast.error("Failed to save attendance.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto h-[calc(100vh-2rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Attendance Management</h1>
          <p className="text-slate-500 mt-1">Track and manage student attendance daily.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving || classStudents.length === 0}
          className="flex items-center gap-2 bg-primary-600 text-white px-6 py-2.5 rounded-xl hover:bg-primary-700 transition-all font-bold shadow-sm disabled:opacity-50"
        >
          {saving ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div> : <Save size={20} />}
          {saving ? 'Saving...' : 'Save Attendance'}
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
        
        {/* Top Selection Bar */}
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row gap-6 shrink-0">
          <div className="flex-1">
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <Users size={16} className="text-slate-400" /> Select Class & Section
            </label>
            <select 
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white font-medium"
            >
              {(classes || []).length === 0 && <option value="">No classes found</option>}
              {(classes || []).map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name} - Section {cls.section}</option>
              ))}
            </select>
          </div>
          
          <div className="flex-1 max-w-xs">
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <Calendar size={16} className="text-slate-400" /> Attendance Date
            </label>
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white font-medium"
            />
          </div>
        </div>

        {/* Info Banner */}
        {attendanceRecord ? (
          <div className="bg-blue-50 px-6 py-3 border-b border-blue-100 flex items-center gap-2 text-sm text-blue-800 font-medium shrink-0">
            <AlertCircle size={16} /> 
            Attendance was previously saved for this class on {new Date(selectedDate).toLocaleDateString()}. Any changes will overwrite the previous record.
          </div>
        ) : (
          <div className="bg-amber-50 px-6 py-3 border-b border-amber-100 flex items-center gap-2 text-sm text-amber-800 font-medium shrink-0">
            <AlertCircle size={16} /> 
            No attendance record found for this date. All students are marked as "Present" by default.
          </div>
        )}

        {/* Student List */}
        <div className="flex-1 overflow-auto custom-scrollbar relative">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-white sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-4 pl-6 font-bold text-slate-700 border-b border-slate-200 w-16">Roll No</th>
                <th className="p-4 font-bold text-slate-700 border-b border-slate-200">Student Name</th>
                <th className="p-4 font-bold text-slate-700 border-b border-slate-200 text-center w-[400px]">Mark Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...classStudents].sort((a, b) => String(a.rollNumber || '').localeCompare(String(b.rollNumber || ''), undefined, { numeric: true })).map((student) => {
                const mark = currentMarkings[student.id] || { status: 'Present' };
                
                return (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="p-4 pl-6 text-slate-500 font-medium">
                      {student.rollNumber || '-'}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{student.firstName} {student.lastName}</div>
                      <div className="text-xs font-medium text-slate-500">ID: {student.admissionNumber}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleStatusChange(student.id, 'Present')}
                          className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold border transition-all flex-1 max-w-[120px] ${
                            mark.status === 'Present' 
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm' 
                              : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <LuCheck size={16} /> Present
                        </button>
                        <button 
                          onClick={() => handleStatusChange(student.id, 'Absent')}
                          className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold border transition-all flex-1 max-w-[120px] ${
                            mark.status === 'Absent' 
                              ? 'bg-red-100 text-red-700 border-red-200 shadow-sm' 
                              : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <LuX size={16} /> Absent
                        </button>
                        <button 
                          onClick={() => handleStatusChange(student.id, 'Late')}
                          className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold border transition-all flex-1 max-w-[120px] ${
                            mark.status === 'Late' 
                              ? 'bg-amber-100 text-amber-700 border-amber-200 shadow-sm' 
                              : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <LuClock size={16} /> Late
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              
              {classStudents.length === 0 && !loading && (
                <tr>
                  <td colSpan="3" className="p-16 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users size={32} className="text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">No Students Found</h3>
                    <p className="text-slate-500 max-w-sm mx-auto">
                      There are no active students in this class. Please add students in the Student Directory.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
