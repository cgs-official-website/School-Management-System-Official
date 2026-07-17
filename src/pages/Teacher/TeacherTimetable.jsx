import React, { useState, useEffect } from 'react';
import { LuCalendarDays, LuClock, LuMapPin, LuBookOpen } from 'react-icons/lu';
import { useAuth } from '../../context/AuthContext';
import { subscribeToSubCollection } from '../../firebase/firestore';

export default function TeacherTimetable() {
  const { userProfile } = useAuth();
  const schoolId = userProfile?.schoolId;

  const [currentWeek, setCurrentWeek] = useState('This Week');
  const [viewType, setViewType] = useState('subject'); // 'subject' or 'class'
  const [isClassTeacher, setIsClassTeacher] = useState(false);
  const [classTimetable, setClassTimetable] = useState({
    Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: []
  });
  const [subjectTimetable, setSubjectTimetable] = useState({
    Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: []
  });
  const [schedule, setSchedule] = useState({
    Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: []
  });
  const [loading, setLoading] = useState(true);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  useEffect(() => {
    if (!schoolId || !userProfile) return;

    let teachersData = [];
    let classesData = [];
    let timetablesData = [];
    let loaded = { t: false, c: false, tt: false };

    const processTimetable = () => {
      if (!loaded.t || !loaded.c || !loaded.tt) return;

      // Find current teacher by email or userId
      const currentTeacher = teachersData.find(t => 
        (t.userId && userProfile.id && t.userId === userProfile.id) || 
        (t.email && userProfile.email && t.email === userProfile.email)
      );
      const teacherId = currentTeacher?.id;

      if (!teacherId) {
        setLoading(false);
        return;
      }

      // Map classes
      const classMap = {};
      classesData.forEach(c => {
        classMap[c.id] = `${c.name} - Section ${c.section}`;
      });

      const newSubjectSchedule = { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [] };
      let newClassSchedule = { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [] };
      let hasClass = !!currentTeacher?.assignedClassId;

      timetablesData.forEach(classTimetable => {
        const classId = classTimetable.id;
        const className = classMap[classId] || 'Unknown Class';
        const scheduleData = classTimetable.schedule || {};
        
        // 1. Fill Class Teacher Timetable
        if (currentTeacher?.assignedClassId === classId) {
          days.forEach(day => {
            const daySlots = scheduleData[day] || [];
            daySlots.forEach(slot => {
              newClassSchedule[day].push({
                id: slot.id + classId,
                time: `${slot.startTime} - ${slot.endTime}`,
                startTime: slot.startTime,
                subject: slot.subject,
                class: className,
                room: `Room (Auto)`,
                teacher: slot.teacher || 'Unassigned'
              });
            });
          });
        }

        // 2. Fill Subject Teacher Timetable
        // A teacher teaches a subject if:
        // - They are assigned as Subject Teacher for this class (subjectClassIds array)
        // OR - Their teacherId matches the slot's teacherId
        // OR - Their name matches the slot's teacher name
        const isSubjectClass = currentTeacher?.subjectClassIds?.includes(classId);

        days.forEach(day => {
          const daySlots = scheduleData[day] || [];
          daySlots.forEach(slot => {
            const matchesId = slot.teacherId === teacherId;
            const matchesName = !slot.teacherId && currentTeacher && slot.teacher === (currentTeacher.name || `${currentTeacher.firstName} ${currentTeacher.lastName}`);
            
            if (isSubjectClass || matchesId || matchesName) {
              // Ensure we don't duplicate slots if both conditions are somehow met
              const exists = newSubjectSchedule[day].some(s => s.id === slot.id + classId);
              if (!exists) {
                newSubjectSchedule[day].push({
                  id: slot.id + classId,
                  time: `${slot.startTime} - ${slot.endTime}`,
                  startTime: slot.startTime,
                  subject: slot.subject,
                  class: className,
                  room: `Room (Auto)`
                });
              }
            }
          });
        });
      });

      // Sort slots by time for each day
      days.forEach(day => {
        newSubjectSchedule[day].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
        newClassSchedule[day].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
      });

      setIsClassTeacher(hasClass);
      setSubjectTimetable(newSubjectSchedule);
      setClassTimetable(newClassSchedule);
      setLoading(false);
    };

    const teachersUnsub = subscribeToSubCollection(schoolId, 'teachers', (data) => {
      teachersData = data;
      loaded.t = true;
      processTimetable();
    });

    const classesUnsub = subscribeToSubCollection(schoolId, 'classes', (data) => {
      classesData = data;
      loaded.c = true;
      processTimetable();
    });

    const timetablesUnsub = subscribeToSubCollection(schoolId, 'timetables', (data) => {
      timetablesData = data;
      loaded.tt = true;
      processTimetable();
    });

    return () => {
      teachersUnsub();
      classesUnsub();
      timetablesUnsub();
    };
  }, [schoolId, userProfile]);

  useEffect(() => {
    if (viewType === 'class' && isClassTeacher) {
      setSchedule(classTimetable);
    } else {
      setSchedule(subjectTimetable);
    }
  }, [viewType, subjectTimetable, classTimetable, isClassTeacher]);

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
            <LuCalendarDays className="text-primary-600" /> My Timetable
          </h1>
          <p className="text-slate-500 mt-1">View your weekly class schedule and teaching periods.</p>
        </div>
        <div className="flex gap-3">
          {isClassTeacher && (
            <select
              value={viewType}
              onChange={(e) => setViewType(e.target.value)}
              className="px-4 py-2 bg-white rounded-xl border border-slate-200 text-slate-700 font-bold shadow-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="subject">My Subject Timetable</option>
              <option value="class">My Class Timetable</option>
            </select>
          )}
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-700 shadow-sm">
            {currentWeek}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-auto p-2 sm:p-6 custom-scrollbar">
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 min-w-[1000px] xl:min-w-0 items-start">
            {days.map(day => (
              <div key={day} className="flex flex-col bg-slate-50/50 rounded-2xl border border-slate-100 p-4">
                <div className="text-center pb-4 mb-4 border-b border-slate-200">
                  <h3 className="text-lg font-black text-slate-900">{day}</h3>
                </div>
                
                <div className="flex-1 space-y-4">
                  {schedule[day].length > 0 ? schedule[day].map(period => (
                    <div key={period.id} className="bg-white p-4 rounded-xl border border-slate-200 hover:border-primary-300 hover:shadow-md transition-all group">
                      <div className="flex items-center gap-2 text-xs font-bold text-primary-600 mb-2">
                        <LuClock size={14} />
                        {period.time}
                      </div>
                      <h4 className="text-base font-bold text-slate-900 mb-1">{period.subject}</h4>
                      <p className="text-sm font-semibold text-slate-600 mb-3">{period.class}</p>
                      {viewType === 'class' && period.teacher && (
                        <p className="text-xs font-semibold text-slate-500 mb-3">Teacher: {period.teacher}</p>
                      )}
                      
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-3 border-t border-slate-100">
                        <span className="flex items-center gap-1"><LuMapPin size={12} /> {period.room}</span>
                        <span className="flex items-center gap-1 text-primary-500 group-hover:text-primary-600 cursor-pointer"><LuBookOpen size={12} /> Prep</span>
                      </div>
                    </div>
                  )) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10 opacity-60">
                      <LuCalendarDays size={32} className="mb-2" />
                      <p className="text-sm font-bold">No Classes</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
