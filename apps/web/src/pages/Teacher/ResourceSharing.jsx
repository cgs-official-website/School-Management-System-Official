import React, { useState, useEffect } from 'react';
import { LuFolderDown, LuSearch, LuPlus, LuFileText, LuLink, LuVideo, LuImage, LuTrash2, LuDownload, LuExternalLink, LuX } from 'react-icons/lu';
import { useAuth } from '../../context/AuthContext';
import { subscribeToSubCollection, addSubDocument, deleteSubDocument } from '../../firebase/firestore';
import toast from 'react-hot-toast';

export default function ResourceSharing() {
  const { userProfile, currentUser } = useAuth();
  const schoolId = userProfile?.schoolId;

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [resources, setResources] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal & Form State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    type: 'document',
    class: '',
    subject: '',
    url: ''
  });

  // Subscribe to Resources, Classes, and Subjects
  useEffect(() => {
    if (!schoolId) return;

    setLoading(true);
    let resourcesUnsub, classesUnsub, subjectsUnsub;

    resourcesUnsub = subscribeToSubCollection(schoolId, 'resources', (data) => {
      // Sort resources by date descending
      const sorted = data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setResources(sorted);
      setLoading(false);
    });

    classesUnsub = subscribeToSubCollection(schoolId, 'classes', (data) => {
      setClasses(data.sort((a, b) => a.name.localeCompare(b.name)));
    });

    subjectsUnsub = subscribeToSubCollection(schoolId, 'subjects', (data) => {
      setSubjects(data.sort((a, b) => a.name.localeCompare(b.name)));
    });

    return () => {
      if (resourcesUnsub) resourcesUnsub();
      if (classesUnsub) classesUnsub();
      if (subjectsUnsub) subjectsUnsub();
    };
  }, [schoolId]);

  const handleOpenCreate = () => {
    setFormData({
      title: '',
      type: 'document',
      class: classes[0]?.name ? `${classes[0].name} - Section ${classes[0].section}` : '',
      subject: subjects[0]?.name || '',
      url: ''
    });
    setShowModal(true);
  };

  const handleDelete = async (resourceId) => {
    if (!window.confirm("Are you sure you want to delete this resource?")) return;

    try {
      await deleteSubDocument(schoolId, 'resources', resourceId);
      toast.success("Resource deleted successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete resource.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.class || !formData.subject || !selectedFile) {
      toast.error("Please fill in all fields and select a file.");
      return;
    }

    setSubmitting(true);
    try {
      let sizeStr = 'Unknown';
      if (selectedFile.size) {
        if (selectedFile.size > 1024 * 1024) {
          sizeStr = (selectedFile.size / (1024 * 1024)).toFixed(1) + ' MB';
        } else {
          sizeStr = (selectedFile.size / 1024).toFixed(0) + ' KB';
        }
      }

      const resourceData = {
        title: formData.title,
        type: formData.type,
        class: formData.class,
        subject: formData.subject,
        url: '#',
        size: sizeStr,
        date: new Date().toISOString(),
        teacherId: currentUser.uid
      };

      await addSubDocument(schoolId, 'resources', resourceData);
      toast.success("Resource uploaded successfully (mock file saved)!");
      setSelectedFile(null);
      setShowModal(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to save resource.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredResources = resources.filter(r => {
    const matchesSearch = 
      (r.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (r.subject || '').toLowerCase().includes(searchTerm.toLowerCase());
    
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
        <button 
          onClick={handleOpenCreate}
          className="px-6 py-2.5 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-colors flex items-center gap-2"
        >
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
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredResources.map(resource => (
                <div key={resource.id} className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-primary-300 hover:shadow-md transition-all group flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      {getTypeIcon(resource.type)}
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 leading-tight line-clamp-2" title={resource.title}>
                          {resource.title}
                        </h3>
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
                    <span className="text-xs font-semibold text-slate-400">
                      {resource.date ? new Date(resource.date).toLocaleDateString() : 'No Date'}
                    </span>
                    <div className="flex gap-2">
                      {resource.teacherId === currentUser.uid && (
                        <button 
                          onClick={() => handleDelete(resource.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" 
                          title="Delete"
                        >
                          <LuTrash2 size={16} />
                        </button>
                      )}
                      <a 
                        href={resource.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title={resource.type === 'link' || resource.type === 'video' ? 'Open Link' : 'Download File'}
                      >
                        {resource.type === 'link' || resource.type === 'video' ? (
                          <LuExternalLink size={16} />
                        ) : (
                          <LuDownload size={16} />
                        )}
                      </a>
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
          )}
        </div>
      </div>

      {/* Add Resource Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <form 
            onSubmit={handleSubmit}
            className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden transform transition-all flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Add New Resource</h3>
              <button 
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition-colors"
              >
                <LuX size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Resource Title</label>
                <input
                  type="text"
                  placeholder="e.g. Calculus Chapter 4 Notes"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:outline-none text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Resource Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:outline-none text-sm font-medium"
                >
                  <option value="document">Document (PDF/Doc)</option>
                  <option value="video">Video Explainer</option>
                  <option value="image">Image / Diagram</option>
                  <option value="link">Web Link / Simulator</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Class / Section</label>
                {classes.length > 0 ? (
                  <select
                    value={formData.class}
                    onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:outline-none text-sm font-medium"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={`${c.name} - Section ${c.section}`}>
                        {c.name} - Section {c.section}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="e.g. Grade 12"
                    value={formData.class}
                    onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:outline-none text-sm font-medium"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Subject</label>
                {subjects.length > 0 ? (
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:outline-none text-sm font-medium"
                  >
                    {subjects.map(s => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="e.g. Physics"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:outline-none text-sm font-medium"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Upload File</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-200 border-dashed rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer relative group">
                  <div className="space-y-1 text-center">
                    <LuFolderDown className="mx-auto h-12 w-12 text-slate-400 group-hover:text-primary-500 transition-colors" />
                    <div className="flex text-sm text-slate-600 justify-center">
                      <label className="relative cursor-pointer bg-white rounded-md font-bold text-primary-600 hover:text-primary-700 focus-within:outline-none">
                        <span>{selectedFile ? 'Change file' : 'Select a file'}</span>
                        <input 
                          type="file" 
                          className="sr-only" 
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              setSelectedFile(file);
                              if (!formData.title) {
                                setFormData(prev => ({ ...prev, title: file.name.substring(0, file.name.lastIndexOf('.')) || file.name }));
                              }
                            }
                          }}
                        />
                      </label>
                    </div>
                    <p className="text-xs text-slate-500">Any file up to 20MB</p>
                    {selectedFile && (
                      <div className="mt-2 p-2 bg-slate-100/80 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 flex items-center justify-between gap-3">
                        <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                        <span className="text-slate-500 shrink-0">({selectedFile.size > 1024 * 1024 ? (selectedFile.size / (1024 * 1024)).toFixed(1) + ' MB' : (selectedFile.size / 1024).toFixed(0) + ' KB'})</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-white rounded-xl text-sm font-bold text-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors disabled:opacity-50"
              >
                {submitting ? 'Adding...' : 'Save Resource'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
