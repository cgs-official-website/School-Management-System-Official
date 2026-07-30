import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { subscribeToAttendanceForClass, subscribeToAssessmentsByClass } from '../../firebase/firestore';
import { LuCircleUser as UserCircle, LuCalendar as Calendar, LuGraduationCap as GraduationCap, LuCircleCheck as CheckCircle2, LuTrendingUp as TrendingUp, LuTriangleAlert as AlertTriangle } from 'react-icons/lu';

export default function StudentOverview() {
  const { userProfile } = useAuth();
  const schoolId = userProfile?.schoolId;
  const studentId = userProfile?.linkedStudentId;
  const classId = userProfile?.linkedClassId;

  const [student, setStudent] = useState(null);
  const [resolvedClassId, setResolvedClassId] = useState(classId);
  const [classDetails, setClassDetails] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState({ total: 0, present: 0, absent: 0, late: 0 });
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to student document to get actual classId
  useEffect(() => {
    if (!schoolId || !studentId) return;

    const unsub = onSnapshot(doc(db, `schools/${schoolId}/students`, studentId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStudent({ id: docSnap.id, ...data });
        if (data.classId) {
          setResolvedClassId(data.classId);
        }
      }
    });

    return () => unsub();
  }, [schoolId, studentId]);

  // Subscribe to class-related details once classId is resolved
  useEffect(() => {
    if (!schoolId || !studentId || !resolvedClassId) return;

    setLoading(true);
    let classUnsub, attendanceUnsub, assessmentsUnsub;

    classUnsub = onSnapshot(doc(db, `schools/${schoolId}/classes`, resolvedClassId), (docSnap) => {
      if (docSnap.exists()) setClassDetails({ id: docSnap.id, ...docSnap.data() });
    });

    attendanceUnsub = subscribeToAttendanceForClass(schoolId, resolvedClassId, (attendanceDocs) => {
      let present = 0, absent = 0, late = 0, total = 0;
      attendanceDocs.forEach(docData => {
        const record = docData.records?.[studentId];
        if (record) {
          total++;
          if (record === 'Present') present++;
          else if (record === 'Absent') absent++;
          else if (record === 'Late') late++;
        }
      });
      setAttendanceStats({ total, present, absent, late });
    });

    assessmentsUnsub = subscribeToAssessmentsByClass(schoolId, resolvedClassId, (assessmentsData) => {
      const gradedAssessments = assessmentsData.filter(a => a.grades && a.grades[studentId] !== undefined);
      setAssessments(gradedAssessments);
      setLoading(false);
    });

    return () => {
      if (classUnsub) classUnsub();
      if (attendanceUnsub) attendanceUnsub();
      if (assessmentsUnsub) assessmentsUnsub();
    };
  }, [schoolId, studentId, resolvedClassId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!student) return <div className="p-8">Error loading student data.</div>;

  // Calculate overall attendance %
  const attendancePercentage = attendanceStats.total === 0 
    ? 0 
    : Math.round(((attendanceStats.present + attendanceStats.late) / attendanceStats.total) * 100);

  return (
    <div className="p-8 max-w-7xl mx-auto pb-24">
      {/* Student Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 text-3xl font-black border-4 border-white/10 shrink-0 shadow-xl">
            {student.firstName.charAt(0)}{student.lastName.charAt(0)}
          </div>
          <div className="text-center md:text-left">
            <h1 className="text-4xl font-black mb-2 tracking-tight">
              {student.firstName} {student.lastName}
            </h1>
            <p className="text-slate-300 text-lg flex flex-wrap items-center justify-center md:justify-start gap-3">
              <span className="flex items-center gap-1"><GraduationCap size={18} className="text-primary-400"/> {classDetails ? `${classDetails.name} - ${classDetails.section}` : 'Class'}</span>
              <span className="text-slate-500">•</span>
              <span className="font-mono text-sm bg-slate-800/50 px-2 py-1 rounded text-slate-300">ID: {student.admissionNumber}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Attendance Summary */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Calendar size={20} className="text-primary-500" />
                Attendance Summary
              </h2>
            </div>

            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-32 h-32 rounded-full relative">
                {/* Visual ring approximation */}
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  {attendanceStats.total === 0 ? (
                    <circle cx="64" cy="64" r="52" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-slate-200" />
                  ) : (
                    <>
                      <circle cx="64" cy="64" r="52" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-slate-100" />
                      <circle 
                        cx="64" 
                        cy="64" 
                        r="52" 
                        fill="transparent" 
                        stroke="currentColor" 
                        strokeWidth="8" 
                        className={`transition-all duration-1000 ${
                          attendancePercentage >= 90 
                            ? 'text-green-500' 
                            : attendancePercentage >= 75 
                              ? 'text-amber-500' 
                              : 'text-red-500'
                        }`} 
                        strokeDasharray={`${(attendancePercentage / 100) * 326.7} 326.7`} 
                      />
                    </>
                  )}
                </svg>
                <div className="text-3xl font-black text-slate-900">
                  {attendanceStats.total === 0 ? '--' : `${attendancePercentage}%`}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="bg-green-50 rounded-xl p-2 border border-green-100">
                <div className="font-bold text-green-700 text-lg">{attendanceStats.present}</div>
                <div className="text-green-600/70 text-xs uppercase tracking-wider font-semibold mt-0.5">Present</div>
              </div>
              <div className="bg-amber-50 rounded-xl p-2 border border-amber-100">
                <div className="font-bold text-amber-700 text-lg">{attendanceStats.late}</div>
                <div className="text-amber-600/70 text-xs uppercase tracking-wider font-semibold mt-0.5">Late</div>
              </div>
              <div className="bg-red-50 rounded-xl p-2 border border-red-100">
                <div className="font-bold text-red-700 text-lg">{attendanceStats.absent}</div>
                <div className="text-red-600/70 text-xs uppercase tracking-wider font-semibold mt-0.5">Absent</div>
              </div>
            </div>
            
            {attendanceStats.total === 0 ? (
              <div className="mt-6 bg-slate-50 text-slate-500 p-3 rounded-xl border border-slate-200/60 text-center text-xs font-semibold uppercase tracking-wider">
                No Attendance Recorded Yet
              </div>
            ) : attendancePercentage < 80 ? (
              <div className="mt-6 bg-red-50 text-red-700 p-3 rounded-xl border border-red-200 text-sm flex gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <p>Attendance has dropped below 80%. Please monitor.</p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Recent Grades */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp size={20} className="text-primary-500" />
                Recent Assessments
              </h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-0">
              {assessments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                  <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 size={32} />
                  </div>
                  <h3 className="text-slate-900 font-bold mb-1">No Grades Yet</h3>
                  <p className="text-slate-500 text-sm">Assessments and grades will appear here once published by the teacher.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {assessments.map(assessment => {
                    const marks = assessment.grades[studentId];
                    const percentage = Math.round((marks / assessment.totalMarks) * 100);
                    
                    return (
                      <div key={assessment.id} className="p-4 sm:p-6 hover:bg-slate-50/50 transition-colors flex items-center justify-between gap-4">
                        <div>
                          <h4 className="font-bold text-slate-900">{assessment.title}</h4>
                          <p className="text-sm text-slate-500 mt-0.5">{assessment.date}</p>
                        </div>
                        <div className="flex items-center gap-4 text-right">
                          <div className="hidden sm:block">
                            <div className="text-sm font-medium text-slate-900">{marks} <span className="text-slate-400">/ {assessment.totalMarks}</span></div>
                            <div className="text-xs text-slate-500">Marks</div>
                          </div>
                          <div className={`px-4 py-2 rounded-xl border font-black text-lg w-20 text-center ${
                            percentage >= 80 ? 'bg-green-50 text-green-700 border-green-200' : 
                            percentage >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                            'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {percentage}%
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
