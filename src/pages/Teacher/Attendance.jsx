import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getStudentsByClass, getAttendance, saveAttendance, subscribeToStudentsByClass, subscribeToAttendance, getAttendanceForClass } from '../../firebase/firestore';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { LuCalendar as CalendarIcon, LuCircleCheck as CheckCircle2, LuCircleX as XCircle, LuCircleAlert as AlertCircle, LuSave as Save, LuUsers as Users } from 'react-icons/lu';
import toast from 'react-hot-toast';

export default function Attendance() {
  const { userProfile, currentUser } = useAuth();
  const schoolId = userProfile?.schoolId;
  const classId = userProfile?.assignedClassId;

  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedSession, setSelectedSession] = useState('FN');

  const [classDetails, setClassDetails] = useState(null);
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState({}); // { studentId: 'Present' | 'Absent' | 'Late' }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const [viewMode, setViewMode] = useState('daily');
  const [historicalRecords, setHistoricalRecords] = useState([]);
  const [reportStats, setReportStats] = useState({});

  useEffect(() => {
    if (!schoolId || !classId) return;
    
    getDoc(doc(db, `schools/${schoolId}/classes`, classId)).then(classDoc => {
      if (classDoc.exists()) setClassDetails({ id: classDoc.id, ...classDoc.data() });
    });

    const unsubStudents = subscribeToStudentsByClass(schoolId, classId, (studentsData) => {
      studentsData.sort((a, b) => a.firstName.localeCompare(b.firstName));
      setStudents(studentsData);
    });

    return () => unsubStudents();
  }, [schoolId, classId]);

  useEffect(() => {
    if (students.length === 0 || viewMode !== 'daily') return;
    
    setLoading(true);
    const attendanceKey = `${selectedDate}_${selectedSession}`;
    const unsub = subscribeToAttendance(schoolId, classId, attendanceKey, (existingRecord) => {
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
      setLoading(false);
    });

    return () => unsub();
  }, [selectedDate, students, schoolId, classId, viewMode]);

  useEffect(() => {
    if (viewMode === 'daily' || !schoolId || !classId) return;
    
    setLoading(true);
    getAttendanceForClass(schoolId, classId).then(records => {
      setHistoricalRecords(records);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [viewMode, schoolId, classId]);

  useEffect(() => {
    if (viewMode === 'daily' || students.length === 0) return;

    const now = new Date();
    const filteredRecords = historicalRecords.filter(record => {
      // Record date might be stored as "YYYY-MM-DD" or "YYYY-MM-DD_FN"
      const dateString = record.date ? record.date.split('_')[0] : '';
      const recordDate = new Date(dateString);
      
      // Check for valid date
      if (isNaN(recordDate.getTime())) return false;
      
      if (viewMode === 'weekly') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        return recordDate >= sevenDaysAgo && recordDate <= now;
      }
      if (viewMode === 'monthly') {
        return recordDate.getMonth() === now.getMonth() && recordDate.getFullYear() === now.getFullYear();
      }
      if (viewMode === 'term') {
        const recordMonth = recordDate.getMonth();
        const nowMonth = now.getMonth();
        const recordTerm = recordMonth >= 3 && recordMonth <= 8 ? 1 : 2;
        const nowTerm = nowMonth >= 3 && nowMonth <= 8 ? 1 : 2;
        let recordAcademicYear = recordDate.getFullYear();
        if (recordMonth < 3) recordAcademicYear -= 1;
        let nowAcademicYear = now.getFullYear();
        if (nowMonth < 3) nowAcademicYear -= 1;
        return recordTerm === nowTerm && recordAcademicYear === nowAcademicYear;
      }
      return true;
    });

    const stats = {};
    students.forEach(student => {
      stats[student.id] = { present: 0, absent: 0, late: 0, total: 0 };
    });

    filteredRecords.forEach(record => {
      if (!record.records) return;
      Object.keys(record.records).forEach(studentId => {
        if (stats[studentId]) {
          const status = record.records[studentId];
          if (status === 'Present') stats[studentId].present++;
          if (status === 'Absent') stats[studentId].absent++;
          if (status === 'Late') stats[studentId].late++;
          stats[studentId].total++;
        }
      });
    });

    setReportStats(stats);
  }, [historicalRecords, viewMode, students]);

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
      const attendanceKey = `${selectedDate}_${selectedSession}`;
      await saveAttendance(schoolId, classId, attendanceKey, currentUser.uid, attendanceRecords);
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

        <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50/50 p-2 rounded-2xl border border-slate-100">
          <select 
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            className="border-slate-200 rounded-xl focus:ring-primary-500 text-slate-700 font-semibold py-2 pl-4 pr-10 bg-white shadow-sm outline-none"
          >
            <option value="daily">Daily Marking</option>
            <option value="weekly">This Week Report</option>
            <option value="monthly">This Month Report</option>
            <option value="term">This Term Report</option>
          </select>
          {viewMode === 'daily' && (
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                <div className="pl-2 text-slate-400">
                  <CalendarIcon size={20} />
                </div>
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="border-none focus:ring-0 text-slate-700 font-medium py-1 pr-2 bg-transparent cursor-pointer outline-none"
                />
              </div>
              <select 
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                className="border border-slate-200 rounded-xl focus:ring-primary-500 text-slate-700 font-bold py-2.5 px-4 bg-white shadow-sm outline-none"
              >
                <option value="FN">FN (Forenoon)</option>
                <option value="AN">AN (Afternoon)</option>
              </select>
            </div>
          )}
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
          {viewMode === 'daily' && (
            <button 
              onClick={handleSave}
              disabled={saving || loading || students.length === 0}
              className="px-6 py-2 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 shadow-sm disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div> : <Save size={18} />}
              {saving ? 'Saving...' : 'Save Attendance'}
            </button>
          )}
        </div>
        
        <div className="p-4 border-b border-slate-200 bg-white">
          <input 
            type="text" 
            placeholder="Search student by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-1/3 px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-shadow"
          />
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
        ) : viewMode === 'daily' ? (
          <div className="divide-y divide-slate-100">
            {students
              .filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((student) => {
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
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                  <th className="p-4 pl-6">Student Name</th>
                  <th className="p-4">Total Classes</th>
                  <th className="p-4 text-green-600">Present</th>
                  <th className="p-4 text-red-600">Absent</th>
                  <th className="p-4 text-amber-600">Late</th>
                  <th className="p-4 pr-6 text-right">Percentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {students
                  .filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(student => {
                  const stat = reportStats[student.id] || { present: 0, absent: 0, late: 0, total: 0 };
                  const percentage = stat.total === 0 ? 100 : Math.round(((stat.present + stat.late) / stat.total) * 100);
                  
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 pl-6">
                        <div className="font-bold text-slate-900">{student.firstName} {student.lastName}</div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">{student.admissionNumber}</div>
                      </td>
                      <td className="p-4 font-semibold text-slate-600">{stat.total}</td>
                      <td className="p-4 font-semibold text-green-600">{stat.present}</td>
                      <td className="p-4 font-semibold text-red-600">{stat.absent}</td>
                      <td className="p-4 font-semibold text-amber-600">{stat.late}</td>
                      <td className="p-4 pr-6 text-right">
                        <span className={`inline-flex items-center justify-center px-3 py-1 text-xs font-bold rounded-full border ${
                          percentage >= 75 ? 'bg-green-50 text-green-700 border-green-200' : 
                          percentage >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                          'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {percentage}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
