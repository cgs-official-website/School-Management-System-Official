import React, { useState } from 'react';
import { LuCalendarDays, LuClock, LuMapPin, LuBookOpen } from 'react-icons/lu';

export default function TeacherTimetable() {
  const [currentWeek, setCurrentWeek] = useState('Oct 16 - Oct 20, 2026');

  // Hardcoded schedule for demo
  const schedule = {
    'Monday': [
      { id: 1, time: '08:00 AM - 09:00 AM', subject: 'Mathematics', class: 'Grade 10-A', room: 'Room 204' },
      { id: 2, time: '09:00 AM - 10:00 AM', subject: 'Physics', class: 'Grade 11-B', room: 'Lab 1' },
      { id: 3, time: '11:00 AM - 12:00 PM', subject: 'Mathematics', class: 'Grade 12-A', room: 'Room 305' },
    ],
    'Tuesday': [
      { id: 4, time: '08:00 AM - 09:00 AM', subject: 'Physics', class: 'Grade 11-A', room: 'Lab 1' },
      { id: 5, time: '10:00 AM - 11:00 AM', subject: 'Mathematics', class: 'Grade 10-B', room: 'Room 205' },
      { id: 6, time: '01:00 PM - 02:00 PM', subject: 'Calculus', class: 'Grade 12-B', room: 'Room 306' },
    ],
    'Wednesday': [
      { id: 7, time: '09:00 AM - 10:00 AM', subject: 'Mathematics', class: 'Grade 10-A', room: 'Room 204' },
      { id: 8, time: '11:00 AM - 12:00 PM', subject: 'Physics', class: 'Grade 11-B', room: 'Lab 1' },
    ],
    'Thursday': [
      { id: 9, time: '08:00 AM - 09:00 AM', subject: 'Calculus', class: 'Grade 12-A', room: 'Room 305' },
      { id: 10, time: '01:00 PM - 02:30 PM', subject: 'Physics Lab', class: 'Grade 11-A', room: 'Lab 1' },
    ],
    'Friday': [
      { id: 11, time: '10:00 AM - 11:00 AM', subject: 'Mathematics', class: 'Grade 10-B', room: 'Room 205' },
      { id: 12, time: '11:00 AM - 12:00 PM', subject: 'Calculus', class: 'Grade 12-B', room: 'Room 306' },
    ]
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="mb-8 shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <LuCalendarDays className="text-primary-600" /> My Timetable
          </h1>
          <p className="text-slate-500 mt-1">View your weekly class schedule and teaching periods.</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-700 shadow-sm">
          {currentWeek}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-auto p-2 sm:p-6 custom-scrollbar">
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 min-w-[1000px] xl:min-w-0">
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
