import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getStudentsByClass } from '../../firebase/firestore';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { LuUsers as Users, LuSearch as Search, LuGraduationCap as GraduationCap, LuMail as Mail, LuCircleCheck as CheckCircle2 } from 'react-icons/lu';

export default function ClassRoster() {
  const { userProfile } = useAuth();
  const schoolId = userProfile?.schoolId;
  const classId = userProfile?.assignedClassId;

  const [classDetails, setClassDetails] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (schoolId && classId) {
      fetchData();
    }
  }, [schoolId, classId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Class details
      const classDoc = await getDoc(doc(db, `schools/${schoolId}/classes`, classId));
      if (classDoc.exists()) {
        setClassDetails({ id: classDoc.id, ...classDoc.data() });
      }

      // Fetch Students
      const studentsData = await getStudentsByClass(schoolId, classId);
      // Sort alphabetically by first name
      studentsData.sort((a, b) => a.firstName.localeCompare(b.firstName));
      setStudents(studentsData);
    } catch (error) {
      console.error("Error fetching roster data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase()) || 
           student.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto pb-24">
      <div className="mb-8 bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-primary-500/20 rounded-full blur-2xl translate-y-1/2"></div>
        
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white border border-white/20 mb-4 backdrop-blur-sm">
            <Users size={14} /> My Assigned Class
          </span>
          <h1 className="text-4xl md:text-5xl font-black mb-2 tracking-tight">
            {classDetails ? `${classDetails.name} - Section ${classDetails.section}` : 'Loading Class...'}
          </h1>
          <p className="text-slate-300 text-lg flex items-center gap-2">
            <GraduationCap size={20} className="text-primary-400"/> 
            {students.length} Students Enrolled
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap gap-4 items-center justify-between bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search students by name or admission number..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm transition-all"
            />
          </div>
        </div>

        {/* Roster Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                <th className="p-4 pl-6">Student Name</th>
                <th className="p-4">Admission No.</th>
                <th className="p-4">Gender</th>
                <th className="p-4">Parent Email</th>
                <th className="p-4 pr-6 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-16 text-center text-slate-500">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <GraduationCap size={32} className="text-slate-400" />
                    </div>
                    <p className="text-lg font-bold text-slate-900 mb-1">No students found</p>
                    <p>There are no students matching your search, or none assigned to this class yet.</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm border border-primary-200 shadow-sm">
                          {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">
                            {student.firstName} {student.lastName}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <CheckCircle2 size={10} className="text-green-500"/> Active
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-mono font-medium text-slate-600 bg-slate-50/30">
                      {student.admissionNumber}
                    </td>
                    <td className="p-4 text-slate-600">
                      {student.gender}
                    </td>
                    <td className="p-4 text-slate-600">
                      <div className="flex items-center gap-2">
                        <Mail size={14} className="text-slate-400" />
                        {student.parentEmail || <span className="text-slate-400 italic">Not provided</span>}
                      </div>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      {/* These actions will be wired up in subsequent modules */}
                      <div className="flex justify-end gap-2">
                        <button className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-primary-700 hover:bg-primary-50 border border-slate-200 hover:border-primary-200 rounded-lg transition-colors">
                          Add Grade
                        </button>
                        <button className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-green-700 hover:bg-green-50 border border-slate-200 hover:border-green-200 rounded-lg transition-colors">
                          Attendance
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
