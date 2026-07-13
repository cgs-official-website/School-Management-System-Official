import React, { useState } from 'react';
import { LuToggleLeft, LuSearch, LuPlus, LuSettings2 } from 'react-icons/lu';
import toast from 'react-hot-toast';

export default function FeatureFlags() {
  const [flags, setFlags] = useState([
    { id: 'flag_1', name: 'Beta AI Grading', key: 'beta_ai_grading', description: 'Enable automated AI grading for essay assignments.', enabled: false, type: 'beta' },
    { id: 'flag_2', name: 'New Chat System', key: 'new_chat_v2', description: 'Switch to the WebSocket-based real-time chat infrastructure.', enabled: true, type: 'core' },
    { id: 'flag_3', name: 'Parent Analytics Dashboard', key: 'parent_analytics', description: 'Show advanced analytics charts in the parent portal.', enabled: true, type: 'feature' },
    { id: 'flag_4', name: 'SMS Notifications Integration', key: 'sms_notifications', description: 'Enable SMS fallback for urgent notices.', enabled: false, type: 'integration' },
    { id: 'flag_5', name: 'Alumni Network Portal', key: 'alumni_portal', description: 'Open access to the new Alumni networking module.', enabled: false, type: 'beta' },
  ]);

  const [searchTerm, setSearchTerm] = useState('');

  const toggleFlag = (id) => {
    setFlags(flags.map(f => {
      if (f.id === id) {
        const newStatus = !f.enabled;
        toast.success(`"${f.name}" is now ${newStatus ? 'ENABLED' : 'DISABLED'} globally.`);
        return { ...f, enabled: newStatus };
      }
      return f;
    }));
  };

  const filteredFlags = flags.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    f.key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getBadgeColor = (type) => {
    switch(type) {
      case 'beta': return 'bg-amber-100 text-amber-700';
      case 'core': return 'bg-blue-100 text-blue-700';
      case 'integration': return 'bg-purple-100 text-purple-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex justify-between items-end mb-8 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <LuToggleLeft className="text-primary-600" /> Feature Flags
          </h1>
          <p className="text-slate-500 mt-1">Globally enable or disable experimental features across all tenant schools.</p>
        </div>
        <button className="px-4 py-2 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors flex items-center gap-2">
          <LuPlus size={18} /> New Flag
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Toolbar */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex gap-4 shrink-0">
          <div className="relative flex-1 max-w-md">
            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="Search flags by name or key..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
            />
          </div>
          <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2">
            <LuSettings2 size={18} /> Filters
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div className="space-y-4">
            {filteredFlags.map(flag => (
              <div key={flag.id} className="flex items-center justify-between p-5 rounded-2xl border border-slate-200 hover:border-primary-200 hover:shadow-md transition-all bg-white group">
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-bold text-lg text-slate-900 truncate">{flag.name}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${getBadgeColor(flag.type)}`}>
                      {flag.type}
                    </span>
                  </div>
                  <p className="text-slate-500 text-sm mb-2">{flag.description}</p>
                  <code className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-mono">
                    {flag.key}
                  </code>
                </div>
                
                <div className="flex items-center gap-6 shrink-0 pl-6 border-l border-slate-100">
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">{flag.enabled ? 'Enabled' : 'Disabled'}</p>
                    <p className="text-xs text-slate-500">For all tenants</p>
                  </div>
                  
                  {/* Toggle Switch */}
                  <button 
                    onClick={() => toggleFlag(flag.id)}
                    className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${flag.enabled ? 'bg-primary-600' : 'bg-slate-200'}`}
                  >
                    <span className="sr-only">Toggle feature</span>
                    <span className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${flag.enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            ))}

            {filteredFlags.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <LuToggleLeft size={48} className="mx-auto mb-4 text-slate-300" />
                <p className="text-lg font-medium text-slate-700">No feature flags found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
