import React, { useState, useEffect } from 'react';
import { LuRadio, LuSend, LuHistory, LuUsers, LuClock } from 'react-icons/lu';
import toast from 'react-hot-toast';

export default function NotificationBroadcast() {
  const [activeTab, setActiveTab] = useState('compose');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetAudience, setTargetAudience] = useState('all_admins');
  const [priority, setPriority] = useState('normal');
  const [sending, setSending] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [history, setHistory] = useState([
    { id: 1, title: 'Scheduled Maintenance', date: '2026-07-10T10:00:00Z', target: 'All Admins', status: 'Sent' },
    { id: 2, title: 'New Feature Release: AI Grading', date: '2026-07-01T14:30:00Z', target: 'All Users', status: 'Sent' }
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const totalPages = Math.ceil(history.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedHistory = history.slice(startIndex, startIndex + itemsPerPage);

  const handleSend = (e) => {
    e.preventDefault();
    if (!title || !message) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSending(true);
    
    // Simulate sending broadcast
    setTimeout(() => {
      setSending(false);
      toast.success("Broadcast sent successfully!");
      setHistory([{
        id: Date.now(),
        title,
        date: new Date().toISOString(),
        target: targetAudience.replace('_', ' '),
        status: 'Sent'
      }, ...history]);
      setTitle('');
      setMessage('');
      setActiveTab('history');
    }, 1500);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto h-full flex flex-col">
      <div className="mb-8 shrink-0">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <LuRadio className="text-primary-600" /> Notification Broadcast
        </h1>
        <p className="text-slate-500 mt-1">Send global alerts and messages across all tenant schools.</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 px-6 pt-4 shrink-0">
          <button 
            onClick={() => setActiveTab('compose')}
            className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'compose' ? 'border-primary-600 text-primary-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
          >
            <LuSend size={18} /> Compose
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'history' ? 'border-primary-600 text-primary-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
          >
            <LuHistory size={18} /> Broadcast History
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {activeTab === 'compose' ? (
            <form onSubmit={handleSend} className="max-w-2xl space-y-6">
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Target Audience</label>
                <div className="flex gap-4">
                  <label className={`flex-1 p-4 rounded-xl border-2 cursor-pointer transition-colors ${targetAudience === 'all_admins' ? 'border-primary-600 bg-primary-50' : 'border-slate-200 hover:border-primary-300'}`}>
                    <input type="radio" name="audience" value="all_admins" checked={targetAudience === 'all_admins'} onChange={(e) => setTargetAudience(e.target.value)} className="sr-only" />
                    <LuUsers className={targetAudience === 'all_admins' ? 'text-primary-600' : 'text-slate-400'} size={24} />
                    <h3 className={`font-bold mt-2 ${targetAudience === 'all_admins' ? 'text-primary-900' : 'text-slate-700'}`}>All School Admins</h3>
                  </label>
                  <label className={`flex-1 p-4 rounded-xl border-2 cursor-pointer transition-colors ${targetAudience === 'all_users' ? 'border-primary-600 bg-primary-50' : 'border-slate-200 hover:border-primary-300'}`}>
                    <input type="radio" name="audience" value="all_users" checked={targetAudience === 'all_users'} onChange={(e) => setTargetAudience(e.target.value)} className="sr-only" />
                    <LuRadio className={targetAudience === 'all_users' ? 'text-primary-600' : 'text-slate-400'} size={24} />
                    <h3 className={`font-bold mt-2 ${targetAudience === 'all_users' ? 'text-primary-900' : 'text-slate-700'}`}>Every Active User</h3>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Broadcast Title</label>
                <input 
                  type="text" 
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Scheduled System Maintenance"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Message Content</label>
                <textarea 
                  required
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Write your announcement here..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white h-40 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Priority Level</label>
                <select 
                  value={priority}
                  onChange={e => setPriority(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                >
                  <option value="normal">Normal - Standard dashboard notice</option>
                  <option value="high">High - Banner alert across portal</option>
                  <option value="urgent">Urgent - Email + Banner alert</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors">
                  Save Draft
                </button>
                <button 
                  type="submit" 
                  disabled={sending}
                  className="px-6 py-2.5 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <LuSend size={18} /> {sending ? 'Broadcasting...' : 'Send Broadcast'}
                </button>
              </div>
            </form>
          ) : (
            <div>
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
                      <th className="p-4 font-bold">Broadcast Title</th>
                      <th className="p-4 font-bold">Target</th>
                      <th className="p-4 font-bold">Sent Date</th>
                      <th className="p-4 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="p-4 font-bold text-slate-900">{item.title}</td>
                        <td className="p-4 text-slate-600 capitalize">{item.target}</td>
                        <td className="p-4 text-slate-600 flex items-center gap-2">
                          <LuClock size={16} className="text-slate-400" />
                          {new Date(item.date).toLocaleString()}
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold uppercase tracking-wider">
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-4 px-6 py-4 border border-slate-200 rounded-2xl bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <span className="text-sm text-slate-500 font-medium">
                    Showing <span className="font-semibold text-slate-900">{startIndex + 1}</span> to{' '}
                    <span className="font-semibold text-slate-900">
                      {Math.min(startIndex + itemsPerPage, history.length)}
                    </span>{' '}
                    of <span className="font-semibold text-slate-900">{history.length}</span> broadcast records
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3.5 py-2 rounded-xl text-sm font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      Previous
                    </button>
                    {Array.from({ length: totalPages }).map((_, idx) => {
                      const pageNum = idx + 1;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`h-9 w-9 flex items-center justify-center rounded-xl text-sm font-bold transition-all ${
                            currentPage === pageNum
                              ? 'bg-primary-600 text-white shadow-sm'
                              : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3.5 py-2 rounded-xl text-sm font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
