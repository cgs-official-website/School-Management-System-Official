import React, { useState } from 'react';
import { LuTrendingUp, LuSearch, LuChevronDown, LuFilter, LuDownload, LuAward } from 'react-icons/lu';

export default function PerformanceTracking() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('Grade 10-A');

  const students = [
    { id: 'STU-001', name: 'Alice Smith', attendance: 92, avgGrade: 'A', lastExam: 88, status: 'improving' },
    { id: 'STU-002', name: 'Bob Johnson', attendance: 75, avgGrade: 'C', lastExam: 62, status: 'warning' },
    { id: 'STU-003', name: 'Charlie Brown', attendance: 98, avgGrade: 'A+', lastExam: 95, status: 'excellent' },
    { id: 'STU-004', name: 'Diana Prince', attendance: 85, avgGrade: 'B', lastExam: 78, status: 'stable' },
    { id: 'STU-005', name: 'Ethan Hunt', attendance: 65, avgGrade: 'D', lastExam: 55, status: 'critical' },
  ];

  const filteredStudents = students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

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
    return 'text-red-600';
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="mb-8 shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <LuTrendingUp className="text-primary-600" /> Student Performance
          </h1>
          <p className="text-slate-500 mt-1">Track academic progress and attendance trends for your assigned classes.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2">
            <LuDownload size={18} /> Export
          </button>
          <div className="relative group cursor-pointer">
            <div className="bg-primary-600 px-4 py-2 rounded-xl text-white font-bold shadow-sm flex items-center gap-2 hover:bg-primary-700 transition-colors">
              {selectedClass} <LuChevronDown size={18} />
            </div>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              {['Grade 10-A', 'Grade 10-B', 'Grade 11-A', 'Grade 12-B'].map(cls => (
                <div 
                  key={cls}
                  onClick={() => setSelectedClass(cls)}
                  className="px-4 py-2 hover:bg-slate-50 rounded-lg text-sm font-semibold text-slate-700"
                >
                  {cls}
                </div>
              ))}
            </div>
          </div>
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
              <span className="text-3xl font-black text-slate-900">B+</span>
              <span className="text-sm font-semibold text-green-500">+2% from last term</span>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <p className="text-sm font-bold text-slate-500 mb-1">Students at Risk</p>
          <span className="text-3xl font-black text-red-600">2</span>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <p className="text-sm font-bold text-slate-500 mb-1">Avg Attendance</p>
          <span className="text-3xl font-black text-slate-900">83%</span>
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
          <button className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2">
            <LuFilter size={18} /> Filters
          </button>
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
                <tr key={student.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group">
                  <td className="p-4 pl-6">
                    <p className="font-bold text-slate-900 group-hover:text-primary-600 transition-colors">{student.name}</p>
                    <p className="text-xs text-slate-400 font-semibold">{student.id}</p>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`font-bold ${student.attendance < 75 ? 'text-red-600' : 'text-slate-700'}`}>
                      {student.attendance}%
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="font-bold text-slate-700">{student.lastExam}/100</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`text-lg font-black ${getGradeColor(student.avgGrade)}`}>
                      {student.avgGrade}
                    </span>
                  </td>
                  <td className="p-4 pr-6 text-right flex justify-end">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${getStatusColor(student.status)}`}>
                      {student.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-slate-500 font-medium">No students found matching your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
