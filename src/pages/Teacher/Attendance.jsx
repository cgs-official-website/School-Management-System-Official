import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getStudentsByClass, getAttendance, saveAttendance } from '../../firebase/firestore';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { LuCalendar as CalendarIcon, LuCircleCheck as CheckCircle2, LuCircleX as XCircle, LuCircleAlert as AlertCircle, LuSave as Save, LuUsers as Users } from 'react-icons/lu';
import toast from 'react-hot-toast';

export default function Attendance() {
  const { userProfile, currentUser } = useAuth();
  const schoolId = userProfile?.schoolId;
  const classId = userProfile?.assignedClassId;

  // Format today's date as YYYY-MM-DD for the input
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);

  const [classDetails, setClassDetails] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState({}); // { studentId: 'Present' | 'Absent' | 'Late' }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (schoolId && classId) {
      fetchClassAndStudents();
    }
  }, [schoolId, classId]);

  useEffect(() => {
    if (students.length > 0) {
      fetchAttendanceForDate();
    }
  }, [selectedDate, students]);

  const fetchClassAndStudents = async () => {
    try {
      const classDoc = await getDoc(doc(db, `schools/${schoolId}/classes`, classId));
      if (classDoc.exists()) setClassDetails({ id: classDoc.id, ...classDoc.data() });

      const studentsData = await getStudentsByClass(schoolId, classId);
      studentsData.sort((a, b) => a.firstName.localeCompare(b.firstName));
      setStudents(studentsData);
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  const fetchAttendanceForDate = async () => {
    setLoading(true);
    try {
      const existingRecord = await getAttendance(schoolId, classId, selectedDate);
      
      const newRecords = {};
      if (existingRecord && existingRecord.records) {
        // Load existing statuses
        students.forEach(student => {
          newRecords[student.id] = existingRecord.records[student.id] || 'Present';
        });
      } else {
        // Default everyone to Present
        students.forEach(student => {
          newRecords[student.id] = 'Present';
        });
      }
      setAttendanceRecords(newRecords);
    } catch (error) {
      console.error("Error fetching attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId, status) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg('');
    try {
      await saveAttendance(schoolId, classId, selectedDate, currentUser.uid, attendanceRecords);
      setSuccessMsg('Attendance saved successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
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

  if (!classId) {
    return <div className="p-8 text-center text-slate-500">You must be assigned to a class to take attendance.</div>;
  }

  return (
    <div className="p-8 max-w-5xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Attendance</h1>
          <p className="text-slate-500 mt-1">
            {classDetails ? `${classDetails.name} - Section ${classDetails.section}` : 'Loading...'}
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
          <div className="pl-3 text-slate-400">
            <CalendarIcon size={20} />
          </div>
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border-none focus:ring-0 text-slate-700 font-medium py-2 pr-4 bg-transparent cursor-pointer"
          />
        </div>
      </div>

      {successMsg && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl flex items-center gap-3 animate-fade-in-down">
          <CheckCircle2 size={20} className="text-green-600" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 pl-2">
            <Users size={18} />
            <span>{students.length} Students</span>
          </div>
          <button 
            onClick={handleSave}
            disabled={saving || loading || students.length === 0}
            className="px-6 py-2 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 shadow-sm disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div> : <Save size={18} />}
            {saving ? 'Saving...' : 'Save Attendance'}
          </button>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="p-20 flex justify-center">
             <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
          </div>
        ) : students.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <p className="text-lg font-bold text-slate-900 mb-1">No students found</p>
            <p>There are no students enrolled in this class yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {students.map((student) => {
              const currentStatus = attendanceRecords[student.id];

              return (
                <div key={student.id} className="p-4 pl-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm border border-slate-200 shadow-sm">
                      {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">
                        {student.firstName} {student.lastName}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        {student.admissionNumber}
                      </div>
                    </div>
                  </div>

                  {/* Status Toggles */}
                  <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 w-full sm:w-auto">
                    <button 
                      onClick={() => handleStatusChange(student.id, 'Present')}
                      className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
                        currentStatus === 'Present' ? 'bg-white text-green-700 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {currentStatus === 'Present' && <CheckCircle2 size={16} className="text-green-500"/>}
                      Present
                    </button>
                    
                    <button 
                      onClick={() => handleStatusChange(student.id, 'Absent')}
                      className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
                        currentStatus === 'Absent' ? 'bg-white text-red-700 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {currentStatus === 'Absent' && <XCircle size={16} className="text-red-500"/>}
                      Absent
                    </button>

                    <button 
                      onClick={() => handleStatusChange(student.id, 'Late')}
                      className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
                        currentStatus === 'Late' ? 'bg-white text-amber-700 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {currentStatus === 'Late' && <AlertCircle size={16} className="text-amber-500"/>}
                      Late
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
