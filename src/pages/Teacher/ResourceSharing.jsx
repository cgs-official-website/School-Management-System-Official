import React, { useState } from 'react';
import { LuFolderDown, LuSearch, LuPlus, LuFileText, LuLink, LuVideo, LuImage, LuTrash2, LuDownload, LuExternalLink } from 'react-icons/lu';

export default function ResourceSharing() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const resources = [
    { id: 'RES-001', title: 'Calculus Chapter 4 Notes', type: 'document', subject: 'Mathematics', class: 'Grade 12', size: '2.4 MB', date: '2026-09-12' },
    { id: 'RES-002', title: 'Newton Laws Explainer', type: 'video', subject: 'Physics', class: 'Grade 11', url: 'https://youtube.com', date: '2026-09-15' },
    { id: 'RES-003', title: 'Algebra Formula Sheet', type: 'image', subject: 'Mathematics', class: 'Grade 10', size: '1.1 MB', date: '2026-09-18' },
    { id: 'RES-004', title: 'Thermodynamics Simulation', type: 'link', subject: 'Physics', class: 'Grade 11', url: 'https://phet.colorado.edu', date: '2026-09-20' },
  ];

  const filteredResources = resources.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) || r.subject.toLowerCase().includes(searchTerm.toLowerCase());
    if (activeTab === 'all') return matchesSearch;
    return matchesSearch && r.type === activeTab;
  });

  const getTypeIcon = (type) => {
    switch(type) {
      case 'document': return <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><LuFileText size={20} /></div>;
      case 'video': return <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0"><LuVideo size={20} /></div>;
      case 'image': return <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0"><LuImage size={20} /></div>;
      case 'link': return <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0"><LuLink size={20} /></div>;
      default: return <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center shrink-0"><LuFileText size={20} /></div>;
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="mb-8 shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <LuFolderDown className="text-primary-600" /> Digital Resources
          </h1>
          <p className="text-slate-500 mt-1">Upload study materials, notes, and links to share with your students.</p>
        </div>
        <button className="px-6 py-2.5 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-colors flex items-center gap-2">
          <LuPlus size={18} /> Add Resource
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex border-b border-slate-100 bg-slate-50/50 px-6 pt-4 shrink-0 overflow-x-auto custom-scrollbar">
          {['all', 'document', 'video', 'link', 'image'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 capitalize whitespace-nowrap ${activeTab === tab ? 'border-primary-600 text-primary-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
            >
              {tab === 'all' ? 'All Files' : `${tab}s`}
            </button>
          ))}
        </div>

        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex gap-4 shrink-0">
          <div className="relative flex-1 max-w-md">
            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="Search resources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredResources.map(resource => (
              <div key={resource.id} className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-primary-300 hover:shadow-md transition-all group flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    {getTypeIcon(resource.type)}
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-tight line-clamp-2" title={resource.title}>{resource.title}</h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{resource.size || 'External URL'}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 mb-6">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                    {resource.class}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-primary-50 text-primary-600">
                    {resource.subject}
                  </span>
                </div>
                
                <div className="pt-4 border-t border-slate-100 flex justify-between items-center mt-auto">
                  <span className="text-xs font-semibold text-slate-400">{new Date(resource.date).toLocaleDateString()}</span>
                  <div className="flex gap-2">
                    <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                      <LuTrash2 size={16} />
                    </button>
                    {(resource.type === 'link' || resource.type === 'video') ? (
                      <button className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="Open Link">
                        <LuExternalLink size={16} />
                      </button>
                    ) : (
                      <button className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="Download File">
                        <LuDownload size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredResources.length === 0 && (
              <div className="col-span-full text-center py-12 text-slate-500">
                <LuFolderDown size={48} className="mx-auto mb-4 text-slate-300" />
                <p className="text-lg font-medium text-slate-700">No resources found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
