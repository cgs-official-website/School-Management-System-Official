import React, { useState } from 'react';
import { LuBookOpen, LuPlus, LuSearch, LuCalendar, LuFileText, LuCircleCheck, LuClock } from 'react-icons/lu';

export default function LessonPlans() {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [searchTerm, setSearchTerm] = useState('');

  const plans = [
    { id: 'LP-001', subject: 'Mathematics', topic: 'Derivatives & Applications', date: '2026-10-18', status: 'draft', class: 'Grade 12-A' },
    { id: 'LP-002', subject: 'Physics', topic: 'Thermodynamics Laws', date: '2026-10-19', status: 'ready', class: 'Grade 11-B' },
    { id: 'LP-003', subject: 'Calculus', topic: 'Integration Techniques', date: '2026-10-20', status: 'ready', class: 'Grade 12-B' },
    { id: 'LP-004', subject: 'Mathematics', topic: 'Linear Algebra', date: '2026-10-15', status: 'completed', class: 'Grade 10-A' },
  ];

  const filteredPlans = plans.filter(p => {
    const matchesSearch = p.topic.toLowerCase().includes(searchTerm.toLowerCase()) || p.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const isPast = new Date(p.date) < new Date('2026-10-16');
    if (activeTab === 'upcoming') return matchesSearch && !isPast;
    return matchesSearch && isPast;
  });

  const getStatusBadge = (status) => {
    switch(status) {
      case 'ready': return <span className="flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold uppercase tracking-wider"><LuCircleCheck size={14} /> Ready</span>;
      case 'draft': return <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold uppercase tracking-wider"><LuClock size={14} /> Draft</span>;
      case 'completed': return <span className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold uppercase tracking-wider"><LuFileText size={14} /> Completed</span>;
      default: return null;
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="mb-8 shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <LuBookOpen className="text-primary-600" /> Lesson Plans
          </h1>
          <p className="text-slate-500 mt-1">Create, organize, and track your daily lesson plans.</p>
        </div>
        <button className="px-6 py-2.5 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-colors flex items-center gap-2">
          <LuPlus size={18} /> New Plan
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex border-b border-slate-100 bg-slate-50/50 px-6 pt-4 shrink-0">
          <button 
            onClick={() => setActiveTab('upcoming')}
            className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'upcoming' ? 'border-primary-600 text-primary-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
          >
            <LuCalendar size={18} /> Upcoming Lessons
          </button>
          <button 
            onClick={() => setActiveTab('past')}
            className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'past' ? 'border-primary-600 text-primary-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
          >
            <LuFileText size={18} /> Past Lessons
          </button>
        </div>

        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex gap-4 shrink-0">
          <div className="relative flex-1 max-w-md">
            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="Search by topic or subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlans.map(plan => (
              <div key={plan.id} className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-primary-300 hover:shadow-md transition-all group flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 mb-2 inline-block">
                      {plan.class}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 leading-tight">{plan.topic}</h3>
                  </div>
                  {getStatusBadge(plan.status)}
                </div>
                
                <p className="text-sm font-semibold text-primary-600 mb-6 flex-1">{plan.subject}</p>
                
                <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-sm font-medium text-slate-500">
                  <span className="flex items-center gap-1"><LuCalendar size={14} /> {new Date(plan.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  <button className="text-primary-600 hover:text-primary-700 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    Edit Plan &rarr;
                  </button>
                </div>
              </div>
            ))}

            {filteredPlans.length === 0 && (
              <div className="col-span-full text-center py-12 text-slate-500">
                <LuBookOpen size={48} className="mx-auto mb-4 text-slate-300" />
                <p className="text-lg font-medium text-slate-700">No lesson plans found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
