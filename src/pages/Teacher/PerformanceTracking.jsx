import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  subscribeToStudentsByClass, 
  subscribeToAttendanceForClass, 
  subscribeToAssessmentsByClass,
  updateStudentPerformanceStatus
} from '../../firebase/firestore';
import { LuTrendingUp, LuSearch, LuChevronDown, LuFilter, LuDownload, LuAward } from 'react-icons/lu';
import toast from 'react-hot-toast';

export default function PerformanceTracking() {
  const { userProfile } = useAuth();
  const schoolId = userProfile?.schoolId;
  const classId = userProfile?.assignedClassId;

  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [assessmentsData, setAssessmentsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    if (!schoolId || !classId) return;
    
    setLoading(true);
    let unsubStudents, unsubAttendance, unsubAssessments;

    unsubStudents = subscribeToStudentsByClass(schoolId, classId, (data) => {
      setStudents(data);
    });

    unsubAttendance = subscribeToAttendanceForClass(schoolId, classId, (data) => {
      setAttendanceData(data);
    });

    unsubAssessments = subscribeToAssessmentsByClass(schoolId, classId, (data) => {
      setAssessmentsData(data);
      setLoading(false);
    });

    return () => {
      if (unsubStudents) unsubStudents();
      if (unsubAttendance) unsubAttendance();
      if (unsubAssessments) unsubAssessments();
    };
  }, [schoolId, classId]);

  // Calculate dynamic metrics for each student
  const processedStudents = students.map(student => {
    // 1. Calculate Attendance
    let present = 0, total = 0;
    attendanceData.forEach(day => {
      if (day.records && day.records[student.id]) {
        total++;
        if (day.records[student.id] === 'Present' || day.records[student.id] === 'Late') {
          present++;
        }
      }
    });
    const attendancePerc = total > 0 ? Math.round((present / total) * 100) : 0;

    // 2. Calculate Grades
    let totalObtained = 0, totalMax = 0;
    let lastExamScore = '-';
    let lastExamDate = 0;

    assessmentsData.forEach(assessment => {
      const grade = assessment.grades?.[student.id];
      if (grade !== undefined && grade !== '') {
        totalObtained += Number(grade);
        totalMax += Number(assessment.totalMarks);
        
        const assessDate = new Date(assessment.date).getTime();
        if (assessDate > lastExamDate) {
          lastExamDate = assessDate;
          lastExamScore = Math.round((Number(grade) / Number(assessment.totalMarks)) * 100);
        }
      }
    });

    const avgPerc = totalMax > 0 ? (totalObtained / totalMax) * 100 : null;
    let avgGrade = '-';
    if (avgPerc !== null) {
      if (avgPerc >= 90) avgGrade = 'A+';
      else if (avgPerc >= 80) avgGrade = 'A';
      else if (avgPerc >= 70) avgGrade = 'B';
      else if (avgPerc >= 60) avgGrade = 'C';
      else if (avgPerc >= 50) avgGrade = 'D';
      else avgGrade = 'F';
    }

    return {
      ...student,
      attendancePerc,
      avgGrade,
      avgPerc,
      lastExamScore: lastExamScore !== '-' ? `${lastExamScore}%` : '-',
      status: student.performanceStatus || 'stable'
    };
  });

  const filteredStudents = processedStudents.filter(s => 
    `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.admissionNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Summary Metrics
  const classAvgPerc = processedStudents.length > 0 
    ? processedStudents.reduce((sum, s) => sum + (s.avgPerc || 0), 0) / processedStudents.filter(s => s.avgPerc !== null).length || 0 
    : 0;
  
  let classAvgGrade = '-';
  if (classAvgPerc >= 90) classAvgGrade = 'A+';
  else if (classAvgPerc >= 80) classAvgGrade = 'A';
  else if (classAvgPerc >= 70) classAvgGrade = 'B';
  else if (classAvgPerc >= 60) classAvgGrade = 'C';
  else if (classAvgPerc >= 50) classAvgGrade = 'D';
  else if (classAvgPerc > 0) classAvgGrade = 'F';

  const atRiskCount = processedStudents.filter(s => s.status === 'warning' || s.status === 'critical' || (s.avgPerc !== null && s.avgPerc < 50)).length;
  
  const classAvgAttendance = processedStudents.length > 0
    ? Math.round(processedStudents.reduce((sum, s) => sum + s.attendancePerc, 0) / processedStudents.length)
    : 0;


  const handleStatusChange = async (studentId, newStatus) => {
    setUpdatingId(studentId);
    try {
      await updateStudentPerformanceStatus(schoolId, studentId, newStatus);
      toast.success("Status updated");
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'excellent': return 'text-purple-700 bg-purple-100';
      case 'improving': return 'text-green-700 bg-green-100';
      case 'stable': return 'text-blue-700 bg-blue-100';
      case 'warning': return 'text-amber-700 bg-amber-100';
      case 'critical': return 'text-red-700 bg-red-100';
      default: return 'text-slate-700 bg-slate-100';
    }
  };

  const getGradeColor = (grade) => {
    if (grade.includes('A')) return 'text-green-600';
    if (grade.includes('B')) return 'text-blue-600';
    if (grade.includes('C')) return 'text-amber-600';
    if (grade === '-') return 'text-slate-400';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="mb-8 shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <LuTrendingUp className="text-primary-600" /> Student Performance
          </h1>
          <p className="text-slate-500 mt-1">Track academic progress and attendance trends dynamically.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2">
            <LuDownload size={18} /> Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 shrink-0">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm col-span-1 md:col-span-2 flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <LuAward size={32} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500">Class Average</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-slate-900">{classAvgGrade}</span>
              <span className="text-sm font-semibold text-slate-500">{classAvgPerc > 0 ? `${classAvgPerc.toFixed(1)}%` : 'No data'}</span>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <p className="text-sm font-bold text-slate-500 mb-1">Students at Risk</p>
          <span className="text-3xl font-black text-red-600">{atRiskCount}</span>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <p className="text-sm font-bold text-slate-500 mb-1">Avg Attendance</p>
          <span className="text-3xl font-black text-slate-900">{classAvgAttendance}%</span>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex gap-4 shrink-0">
          <div className="relative flex-1 max-w-md">
            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 bg-white shadow-sm z-10">
              <tr className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
                <th className="p-4 font-bold pl-6">Student Name</th>
                <th className="p-4 font-bold text-center">Attendance %</th>
                <th className="p-4 font-bold text-center">Last Exam Score</th>
                <th className="p-4 font-bold text-center">Overall Grade</th>
                <th className="p-4 font-bold pr-6 text-right">Trend Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-4 pl-6">
                    <p className="font-bold text-slate-900 group-hover:text-primary-600 transition-colors">{student.firstName} {student.lastName}</p>
                    <p className="text-xs text-slate-400 font-semibold">{student.admissionNumber}</p>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`font-bold ${student.attendancePerc < 75 ? 'text-red-600' : 'text-slate-700'}`}>
                      {student.attendancePerc}%
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="font-bold text-slate-700">{student.lastExamScore}</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`text-lg font-black ${getGradeColor(student.avgGrade)}`}>
                      {student.avgGrade}
                    </span>
                  </td>
                  <td className="p-4 pr-6 text-right flex justify-end">
                    <select
                      disabled={updatingId === student.id}
                      value={student.status}
                      onChange={(e) => handleStatusChange(student.id, e.target.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border-0 cursor-pointer appearance-none text-center ${getStatusColor(student.status)}`}
                      style={{ textAlignLast: 'center' }}
                    >
                      <option value="excellent">Excellent</option>
                      <option value="improving">Improving</option>
                      <option value="stable">Stable</option>
                      <option value="warning">Warning</option>
                      <option value="critical">Critical</option>
                    </select>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-slate-500 font-medium">No students found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

