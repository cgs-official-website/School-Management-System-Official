import React, { useState } from 'react';
import { LuCalendarOff, LuPlus, LuHistory, LuCircleCheck, LuClock, LuCircleX } from 'react-icons/lu';
import toast from 'react-hot-toast';

export default function TeacherLeave() {
  const [activeTab, setActiveTab] = useState('apply');
  const [leaveType, setLeaveType] = useState('sick');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [history, setHistory] = useState([
    { id: 'LV-102', type: 'Sick Leave', start: '2026-06-12', end: '2026-06-13', status: 'approved', appliedOn: '2026-06-11' },
    { id: 'LV-101', type: 'Casual Leave', start: '2026-04-05', end: '2026-04-05', status: 'rejected', appliedOn: '2026-03-28' },
  ]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason) {
      toast.error('Please fill in all fields');
      return;
    }
    
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast.success('Leave application submitted successfully');
      setHistory([{
        id: `LV-${Math.floor(Math.random() * 1000)}`,
        type: leaveType === 'sick' ? 'Sick Leave' : leaveType === 'casual' ? 'Casual Leave' : 'Earned Leave',
        start: startDate,
        end: endDate,
        status: 'pending',
        appliedOn: new Date().toISOString().split('T')[0]
      }, ...history]);
      setActiveTab('history');
      setStartDate('');
      setEndDate('');
      setReason('');
    }, 1500);
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'approved': return <span className="flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold uppercase tracking-wider"><LuCircleCheck size={14} /> Approved</span>;
      case 'pending': return <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold uppercase tracking-wider"><LuClock size={14} /> Pending</span>;
      case 'rejected': return <span className="flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold uppercase tracking-wider"><LuCircleX size={14} /> Rejected</span>;
      default: return null;
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto h-full flex flex-col">
      <div className="mb-8 shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <LuCalendarOff className="text-primary-600" /> Leave Application
          </h1>
          <p className="text-slate-500 mt-1">Request time off and track your leave balances.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 shrink-0">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-sm font-bold text-slate-500 mb-1">Casual Leave</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-slate-900">8</span>
            <span className="text-sm font-semibold text-slate-400 mb-1">/ 12 days left</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-sm font-bold text-slate-500 mb-1">Sick Leave</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-slate-900">4</span>
            <span className="text-sm font-semibold text-slate-400 mb-1">/ 8 days left</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-sm font-bold text-slate-500 mb-1">Earned Leave</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-slate-900">15</span>
            <span className="text-sm font-semibold text-slate-400 mb-1">days total</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex border-b border-slate-100 bg-slate-50/50 px-6 pt-4 shrink-0">
          <button 
            onClick={() => setActiveTab('apply')}
            className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'apply' ? 'border-primary-600 text-primary-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
          >
            <LuPlus size={18} /> New Request
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'history' ? 'border-primary-600 text-primary-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
          >
            <LuHistory size={18} /> Request History
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'apply' ? (
            <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Leave Type</label>
                <select 
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white font-medium"
                >
                  <option value="casual">Casual Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="earned">Earned Leave</option>
                  <option value="unpaid">Unpaid Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Start Date</label>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white font-medium text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">End Date</label>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white font-medium text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Reason for Leave</label>
                <textarea 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Please provide a brief explanation..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white h-32 resize-none font-medium"
                ></textarea>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button 
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
                    <th className="p-4 font-bold">Leave Type</th>
                    <th className="p-4 font-bold">Duration</th>
                    <th className="p-4 font-bold">Applied On</th>
                    <th className="p-4 font-bold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-bold text-slate-900">
                        {item.type}
                        <div className="text-xs text-slate-400 font-medium mt-0.5">ID: {item.id}</div>
                      </td>
                      <td className="p-4 text-sm font-semibold text-slate-600">
                        {new Date(item.start).toLocaleDateString()} &rarr; {new Date(item.end).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-sm font-medium text-slate-500">
                        {new Date(item.appliedOn).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right flex justify-end">
                        {getStatusBadge(item.status)}
                      </td>
                    </tr>
                  ))}
                  {history.length === 0 && (
                    <tr>
                      <td colSpan="4" className="text-center py-8 text-slate-500 font-medium">No past requests found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
