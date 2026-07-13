import React, { useState } from 'react';
import { LuUserCog, LuSearch, LuPlus, LuShieldCheck, LuCopy } from 'react-icons/lu';

export default function RolePermissions() {
  const [searchTerm, setSearchTerm] = useState('');

  const roles = [
    { id: 1, name: 'School Admin', type: 'System Default', users: 145, description: 'Full access to a specific school tenant.', permissions: ['All School Modules'] },
    { id: 2, name: 'Teacher', type: 'System Default', users: 2850, description: 'Access to assigned classes, attendance, and grades.', permissions: ['Classes', 'Attendance', 'Grades', 'Noticeboard'] },
    { id: 3, name: 'Accountant', type: 'Custom Template', users: 45, description: 'Access to billing and fee management only.', permissions: ['Fee Management', 'Financial Reports'] },
    { id: 4, name: 'Librarian', type: 'Custom Template', users: 112, description: 'Access to library inventory and issues.', permissions: ['Library Management', 'Inventory'] },
  ];

  const filteredRoles = roles.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="mb-8 shrink-0 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <LuUserCog className="text-primary-600" /> Role & Permission Templates
          </h1>
          <p className="text-slate-500 mt-1">Define global role templates that tenants can use or inherit.</p>
        </div>
        <button className="px-4 py-2 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-colors flex items-center gap-2">
          <LuPlus size={18} /> New Role Template
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex gap-4 shrink-0">
          <div className="relative flex-1 max-w-md">
            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="Search role templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredRoles.map(role => (
              <div key={role.id} className="p-6 rounded-3xl border border-slate-200 hover:border-primary-300 hover:shadow-lg transition-all bg-white group flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold text-slate-900">{role.name}</h3>
                      {role.type === 'System Default' && (
                        <LuShieldCheck className="text-blue-500" size={18} title="System Default Role" />
                      )}
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${role.type === 'System Default' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                      {role.type}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-slate-900">{role.users.toLocaleString()}</p>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Users</p>
                  </div>
                </div>
                
                <p className="text-sm text-slate-600 mb-6 flex-1">{role.description}</p>
                
                <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                  <div className="flex flex-wrap gap-2">
                    {role.permissions.map((perm, idx) => (
                      <span key={idx} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg">
                        {perm}
                      </span>
                    ))}
                    {role.permissions.length === 0 && <span className="text-xs text-slate-400 italic">No specific modules assigned</span>}
                  </div>
                  <button className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors ml-4 shrink-0" title="Duplicate Template">
                    <LuCopy size={18} />
                  </button>
                </div>
              </div>
            ))}

            {filteredRoles.length === 0 && (
              <div className="col-span-2 text-center py-12 text-slate-500">
                <LuUserCog size={48} className="mx-auto mb-4 text-slate-300" />
                <p className="text-lg font-medium text-slate-700">No role templates found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
