import React, { useState } from 'react';
import { LuClipboardList, LuSearch, LuFilter, LuCalendar, LuDownload, LuUser } from 'react-icons/lu';

export default function AuditLogs() {
  const [searchTerm, setSearchTerm] = useState('');

  const logs = [
    { id: 'LOG-8912', action: 'Plan Upgrade', user: 'Admin (Greenwood)', details: 'Upgraded to Enterprise Plan', date: '2026-07-11T14:30:00Z', ip: '192.168.1.45', type: 'billing' },
    { id: 'LOG-8911', action: 'Failed Login', user: 'Unknown User', details: '5 failed attempts for superadmin@zuna.com', date: '2026-07-11T12:15:00Z', ip: '45.22.11.9', type: 'security' },
    { id: 'LOG-8910', action: 'API Key Generated', user: 'Admin (Sunrise)', details: 'Generated new API key for SMS gateway', date: '2026-07-10T09:00:00Z', ip: '10.0.0.12', type: 'system' },
    { id: 'LOG-8909', action: 'User Deleted', user: 'SuperAdmin', details: 'Deleted teacher account (ID: 1045)', date: '2026-07-09T16:45:00Z', ip: '192.168.1.1', type: 'data' },
    { id: 'LOG-8908', action: 'Settings Changed', user: 'Admin (Oakridge)', details: 'Updated grading scale to 10-point GPA', date: '2026-07-08T11:20:00Z', ip: '172.16.0.4', type: 'system' },
  ];

  const filteredLogs = logs.filter(l => 
    l.action.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.details.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeColor = (type) => {
    switch(type) {
      case 'security': return 'bg-red-100 text-red-700';
      case 'billing': return 'bg-purple-100 text-purple-700';
      case 'system': return 'bg-blue-100 text-blue-700';
      case 'data': return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="mb-8 shrink-0 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <LuClipboardList className="text-primary-600" /> Audit Logs
          </h1>
          <p className="text-slate-500 mt-1">Track all critical actions, security events, and configuration changes.</p>
        </div>
        <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2">
          <LuDownload size={18} /> Export CSV
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-wrap gap-4 shrink-0">
          <div className="relative flex-1 min-w-[250px] max-w-md">
            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
            />
          </div>
          <button className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2">
            <LuFilter size={18} /> Event Type
          </button>
          <button className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2">
            <LuCalendar size={18} /> Date Range
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 bg-white shadow-sm z-10">
              <tr className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
                <th className="p-4 font-bold">Timestamp</th>
                <th className="p-4 font-bold">Action Event</th>
                <th className="p-4 font-bold">User / Initiator</th>
                <th className="p-4 font-bold">Details</th>
                <th className="p-4 font-bold">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-4 text-sm text-slate-500 whitespace-nowrap">
                    {new Date(log.date).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${getTypeColor(log.type).split(' ')[0]}`}></span>
                      <span className="font-bold text-slate-900">{log.action}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                        <LuUser size={12} />
                      </div>
                      <span className="text-sm font-semibold text-slate-700">{log.user}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-600">
                    {log.details}
                  </td>
                  <td className="p-4">
                    <code className="px-2 py-1 bg-slate-100 text-slate-500 rounded font-mono text-xs">
                      {log.ip}
                    </code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
