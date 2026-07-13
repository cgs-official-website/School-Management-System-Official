import React, { useState } from 'react';
import { LuLifeBuoy, LuSearch, LuFilter, LuMessageSquare, LuCircleCheck, LuClock } from 'react-icons/lu';

export default function SupportTickets() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const tickets = [
    { id: 'TKT-001', school: 'Greenwood High', subject: 'Billing issue with new plan', status: 'open', priority: 'high', date: '2026-07-10T09:30:00Z', messages: 3 },
    { id: 'TKT-002', school: 'Oakridge International', subject: 'How to add custom subjects?', status: 'pending', priority: 'medium', date: '2026-07-11T10:15:00Z', messages: 2 },
    { id: 'TKT-003', school: 'Sunrise Academy', subject: 'Parents not receiving SMS', status: 'open', priority: 'high', date: '2026-07-11T14:20:00Z', messages: 1 },
    { id: 'TKT-004', school: 'Lakeside Public School', subject: 'Request for API keys', status: 'resolved', priority: 'low', date: '2026-07-05T11:00:00Z', messages: 5 },
  ];

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = t.school.toLowerCase().includes(searchTerm.toLowerCase()) || t.subject.toLowerCase().includes(searchTerm.toLowerCase()) || t.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch(status) {
      case 'resolved': return <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 w-fit"><LuCircleCheck size={14} /> Resolved</span>;
      case 'pending': return <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 w-fit"><LuClock size={14} /> Pending Reply</span>;
      case 'open': return <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 w-fit"><LuMessageSquare size={14} /> Open</span>;
      default: return null;
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'low': return 'text-slate-600 bg-slate-50 border-slate-200';
      default: return 'text-slate-600';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="mb-8 shrink-0 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <LuLifeBuoy className="text-primary-600" /> Support Tickets
          </h1>
          <p className="text-slate-500 mt-1">Manage support requests and technical issues from tenant school admins.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex gap-4 shrink-0">
          <div className="relative flex-1 max-w-md">
            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="Search by ticket ID, school, or subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white text-slate-700 font-semibold"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="pending">Pending Reply</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-4">
            {filteredTickets.map(ticket => (
              <div key={ticket.id} className="flex flex-col sm:flex-row gap-4 p-5 rounded-2xl border border-slate-200 hover:border-primary-300 hover:shadow-md transition-all cursor-pointer bg-white group">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-black text-slate-400 group-hover:text-primary-500 transition-colors">{ticket.id}</span>
                    {getStatusBadge(ticket.status)}
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority} priority
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">{ticket.subject}</h3>
                  <p className="text-sm text-slate-500 font-medium">From: <span className="text-slate-700">{ticket.school}</span></p>
                </div>
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 sm:border-l border-slate-100 pt-4 sm:pt-0 sm:pl-6">
                  <div className="text-sm font-semibold text-slate-500 flex items-center gap-1">
                    <LuMessageSquare size={16} /> {ticket.messages} replies
                  </div>
                  <div className="text-xs text-slate-400 font-medium">
                    Updated {new Date(ticket.date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}

            {filteredTickets.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <LuLifeBuoy size={48} className="mx-auto mb-4 text-slate-300" />
                <p className="text-lg font-medium text-slate-700">No support tickets found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
