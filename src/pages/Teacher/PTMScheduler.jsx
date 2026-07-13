import React, { useState } from 'react';
import { LuCalendarClock, LuPlus, LuCalendarCheck, LuClock, LuUsers, LuCircleCheck, LuVideo, LuMapPin, LuCircleX } from 'react-icons/lu';

export default function PTMScheduler() {
  const [activeTab, setActiveTab] = useState('upcoming');

  const meetings = [
    { id: 'PTM-101', parent: 'John Smith (Father of Alice)', student: 'Alice Smith', class: 'Grade 10-A', date: '2026-10-18', time: '02:00 PM', status: 'confirmed', type: 'online' },
    { id: 'PTM-102', parent: 'Sarah Johnson (Mother of Bob)', student: 'Bob Johnson', class: 'Grade 10-A', date: '2026-10-18', time: '02:30 PM', status: 'pending', type: 'in-person' },
    { id: 'PTM-103', parent: 'Michael Brown (Father of Charlie)', student: 'Charlie Brown', class: 'Grade 10-B', date: '2026-10-19', time: '04:00 PM', status: 'confirmed', type: 'online' },
  ];

  const getStatusBadge = (status) => {
    switch(status) {
      case 'confirmed': return <span className="flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold uppercase tracking-wider"><LuCircleCheck size={14} /> Confirmed</span>;
      case 'pending': return <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold uppercase tracking-wider"><LuClock size={14} /> Pending</span>;
      case 'cancelled': return <span className="flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold uppercase tracking-wider"><LuCircleX size={14} /> Cancelled</span>;
      default: return null;
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="mb-8 shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <LuCalendarClock className="text-primary-600" /> PTM Scheduler
          </h1>
          <p className="text-slate-500 mt-1">Manage Parent-Teacher Meetings and set your availability.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2">
            <LuClock size={18} /> Manage Availability
          </button>
          <button className="px-6 py-2.5 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-colors flex items-center gap-2">
            <LuPlus size={18} /> Book Meeting
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex border-b border-slate-100 bg-slate-50/50 px-6 pt-4 shrink-0">
          <button 
            onClick={() => setActiveTab('upcoming')}
            className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'upcoming' ? 'border-primary-600 text-primary-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
          >
            <LuCalendarCheck size={18} /> Upcoming Meetings
          </button>
          <button 
            onClick={() => setActiveTab('past')}
            className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'past' ? 'border-primary-600 text-primary-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
          >
            <LuCalendarClock size={18} /> Past Meetings
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {meetings.map(meeting => (
              <div key={meeting.id} className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-primary-300 hover:shadow-md transition-all flex flex-col group">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 group-hover:bg-primary-50 group-hover:text-primary-500 transition-colors">
                      <LuUsers size={24} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 leading-tight">{meeting.parent}</h3>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">Ref: {meeting.student}</p>
                    </div>
                  </div>
                  {getStatusBadge(meeting.status)}
                </div>
                
                <div className="bg-slate-50 rounded-xl p-4 mb-4 flex-1">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Date & Time</p>
                      <p className="text-sm font-semibold text-slate-700">{new Date(meeting.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at {meeting.time}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Meeting Type</p>
                      <p className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                        {meeting.type === 'online' ? <LuVideo size={14} className="text-blue-500" /> : <LuMapPin size={14} className="text-amber-500" />}
                        <span className="capitalize">{meeting.type}</span>
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-2">
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg">{meeting.class}</span>
                  
                  {meeting.status === 'pending' ? (
                    <div className="flex gap-2">
                      <button className="px-4 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors">Decline</button>
                      <button className="px-4 py-1.5 bg-primary-600 text-white text-xs font-bold rounded-lg hover:bg-primary-700 transition-colors">Approve</button>
                    </div>
                  ) : (
                    <button className="text-sm font-bold text-primary-600 hover:text-primary-700">View Details &rarr;</button>
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
