import React, { useState } from 'react';
import { Plus, X, Search, Filter, Trash2, Download, FileText } from 'lucide-react';
import { LuFiles, LuFolderOpen } from 'react-icons/lu';
import ConfirmModal from '../../components/ConfirmModal';

export default function DocumentManagement() {
  const [documents, setDocuments] = useState([
    { id: 1, name: 'Q3 Financial Report.pdf', category: 'Financial', size: '2.4 MB', date: '2026-07-01' },
    { id: 2, name: 'Student Handbook 2026.docx', category: 'Administrative', size: '1.1 MB', date: '2026-06-15' },
    { id: 3, name: 'Curriculum Guidelines.pdf', category: 'Academic', size: '4.5 MB', date: '2026-05-10' },
    { id: 4, name: 'Staff Code of Conduct.pdf', category: 'Administrative', size: '1.8 MB', date: '2026-07-05' },
    { id: 5, name: 'Annual Budget 2026.xlsx', category: 'Financial', size: '3.2 MB', date: '2026-07-10' },
    { id: 6, name: 'Syllabus - Grade 10.pdf', category: 'Academic', size: '5.1 MB', date: '2026-07-11' },
    { id: 7, name: 'Parent Consent Form.pdf', category: 'Administrative', size: '0.5 MB', date: '2026-07-12' },
    { id: 8, name: 'Audit Report 2025.pdf', category: 'Financial', size: '8.4 MB', date: '2026-07-12' },
    { id: 9, name: 'Lab Safety Manual.pdf', category: 'Academic', size: '2.9 MB', date: '2026-07-13' },
    { id: 10, name: 'Holiday Schedule.pdf', category: 'Administrative', size: '0.3 MB', date: '2026-07-13' },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [confirmModalState, setConfirmModalState] = useState({ isOpen: false, idToDelete: null });
  const [formData, setFormData] = useState({ name: '', category: 'Administrative' });
  const [searchTerm, setSearchTerm] = useState('');

  const handleUpload = (e) => {
    e.preventDefault();
    if (formData.name) {
      setDocuments([...documents, { 
        id: Date.now(), 
        name: formData.name + '.pdf', 
        category: formData.category, 
        size: (Math.random() * 5 + 0.5).toFixed(1) + ' MB', 
        date: new Date().toISOString().split('T')[0] 
      }]);
    }
    setShowModal(false);
    setFormData({ name: '', category: 'Administrative' });
  };

  const handleDeleteClick = (id) => {
    setConfirmModalState({ isOpen: true, idToDelete: id });
  };

  const executeDelete = () => {
    const id = confirmModalState.idToDelete;
    if (!id) return;
    setDocuments(documents.filter(d => d.id !== id));
    setConfirmModalState({ isOpen: false, idToDelete: null });
  };

  const filteredDocs = documents.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.category.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto h-[calc(100vh-2rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Document Management</h1>
          <p className="text-slate-500 mt-1">Securely store, organize, and access institutional files.</p>
        </div>
        <button 
          onClick={() => { setFormData({ name: '', category: 'Administrative' }); setShowModal(true); }}
          className="flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-xl hover:bg-primary-700 transition-all font-medium shadow-sm"
        >
          <Plus size={20} /> Upload File
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 shrink-0">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <LuFiles size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Files</p>
            <p className="text-2xl font-bold text-slate-900">{documents.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <LuFolderOpen size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Storage Used</p>
            <p className="text-2xl font-bold text-slate-900">
              {documents.reduce((acc, curr) => acc + parseFloat(curr.size), 0).toFixed(1)} MB
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between gap-4 shrink-0">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="Search by filename or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-slate-50 focus:bg-white transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200">File Name</th>
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200">Category</th>
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200">Size</th>
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200">Date Uploaded</th>
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <FileText className="text-indigo-500" size={20} />
                      <span className="font-bold text-slate-900">{doc.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-slate-600 font-medium">
                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                      {doc.category}
                    </span>
                  </td>
                  <td className="p-4 text-slate-600 font-medium">{doc.size}</td>
                  <td className="p-4 text-slate-600 font-medium">{new Date(doc.date).toLocaleDateString()}</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                        <Download size={18} />
                      </button>
                      <button onClick={() => handleDeleteClick(doc.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredDocs.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-slate-500">
                    No files found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in-up">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="text-xl font-bold text-slate-900">Upload Document</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:bg-slate-200 rounded-full p-2 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleUpload} className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Document Name (without extension)</label>
                  <input 
                    type="text" required
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g. Employee Handbook"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Category</label>
                  <select 
                    value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option>Administrative</option>
                    <option>Academic</option>
                    <option>Financial</option>
                    <option>Legal</option>
                    <option>Others</option>
                  </select>
                </div>

                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center bg-slate-50">
                   <p className="text-slate-500 text-sm">Click here to browse files or drag and drop (Mock)</p>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-primary-600 text-white font-bold hover:bg-primary-700 rounded-xl shadow-sm transition-colors">Upload</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState({ isOpen: false, idToDelete: null })}
        onConfirm={executeDelete}
        title="Delete Document"
        message="Are you sure you want to delete this document? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
}
