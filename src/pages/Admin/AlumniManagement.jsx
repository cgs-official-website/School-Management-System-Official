import React, { useState } from 'react';
import { Plus, X, Search, Filter, Edit, Trash2 } from 'lucide-react';
import { LuGraduationCap, LuTrophy } from 'react-icons/lu';
import ConfirmModal from '../../components/ConfirmModal';

export default function AlumniManagement() {
  const [alumni, setAlumni] = useState([
    { id: 1, name: 'Michael Chang', batch: '2015', profession: 'Software Engineer at Google', location: 'San Francisco, CA', email: 'mike@example.com' },
    { id: 2, name: 'Sarah Connor', batch: '2018', profession: 'Medical Student', location: 'Boston, MA', email: 'sarah@example.com' },
    { id: 3, name: 'David Wallace', batch: '2010', profession: 'CFO at Dunder Mifflin', location: 'Scranton, PA', email: 'david@example.com' },
    { id: 4, name: 'Jessica Smith', batch: '2019', profession: 'Data Analyst', location: 'New York, NY', email: 'jessica@example.com' },
    { id: 5, name: 'Tom Hardy', batch: '2012', profession: 'Architect', location: 'London, UK', email: 'tom@example.com' },
    { id: 6, name: 'Emily Blunt', batch: '2014', profession: 'Biologist', location: 'Seattle, WA', email: 'emily@example.com' },
    { id: 7, name: 'Chris Evans', batch: '2011', profession: 'Fitness Trainer', location: 'Los Angeles, CA', email: 'chris@example.com' },
    { id: 8, name: 'Anna Kendrick', batch: '2017', profession: 'Musician', location: 'Austin, TX', email: 'anna@example.com' },
    { id: 9, name: 'Paul Rudd', batch: '2008', profession: 'Comedian', location: 'Chicago, IL', email: 'paul@example.com' },
    { id: 10, name: 'Zendaya', batch: '2020', profession: 'Actress', location: 'Hollywood, CA', email: 'zendaya@example.com' },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [confirmModalState, setConfirmModalState] = useState({ isOpen: false, idToDelete: null });
  const [formData, setFormData] = useState({ name: '', batch: '', profession: '', location: '', email: '' });
  const [searchTerm, setSearchTerm] = useState('');

  const handleSave = (e) => {
    e.preventDefault();
    if (formData.id) {
      setAlumni(alumni.map(a => a.id === formData.id ? formData : a));
    } else {
      setAlumni([...alumni, { ...formData, id: Date.now() }]);
    }
    setShowModal(false);
    setFormData({ name: '', batch: '', profession: '', location: '', email: '' });
  };

  const handleDeleteClick = (id) => {
    setConfirmModalState({ isOpen: true, idToDelete: id });
  };

  const executeDelete = () => {
    const id = confirmModalState.idToDelete;
    if (!id) return;
    setAlumni(alumni.filter(a => a.id !== id));
    setConfirmModalState({ isOpen: false, idToDelete: null });
  };

  const filteredAlumni = alumni.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.batch.includes(searchTerm));

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto h-[calc(100vh-2rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Alumni Management</h1>
          <p className="text-slate-500 mt-1">Connect with and manage the school's alumni network.</p>
        </div>
        <button 
          onClick={() => { setFormData({ name: '', batch: '', profession: '', location: '', email: '' }); setShowModal(true); }}
          className="flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-xl hover:bg-primary-700 transition-all font-medium shadow-sm"
        >
          <Plus size={20} /> Add Alumni
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 shrink-0">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <LuGraduationCap size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Alumni</p>
            <p className="text-2xl font-bold text-slate-900">{alumni.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <LuTrophy size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Notable Alumni</p>
            <p className="text-2xl font-bold text-slate-900">12</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between gap-4 shrink-0">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="Search by name or batch..."
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
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200">Name</th>
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200">Batch</th>
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200">Profession</th>
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200">Location</th>
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAlumni.map((person) => (
                <tr key={person.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-slate-900">{person.name}</div>
                    <div className="text-xs text-slate-500">{person.email}</div>
                  </td>
                  <td className="p-4 font-bold text-indigo-600">{person.batch}</td>
                  <td className="p-4 text-slate-600 font-medium">{person.profession}</td>
                  <td className="p-4 text-slate-600 font-medium">{person.location}</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => { setFormData(person); setShowModal(true); }} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                        <Edit size={18} />
                      </button>
                      <button onClick={() => handleDeleteClick(person.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredAlumni.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-slate-500">
                    No alumni records found.
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
              <h2 className="text-xl font-bold text-slate-900">{formData.id ? 'Edit' : 'Add'} Alumni</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:bg-slate-200 rounded-full p-2 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                    <input 
                      type="text" required
                      value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Graduation Batch</label>
                    <input 
                      type="text" required
                      value={formData.batch} onChange={e => setFormData({...formData, batch: e.target.value})}
                      placeholder="e.g. 2018"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
                  <input 
                    type="email" required
                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Current Profession</label>
                    <input 
                      type="text"
                      value={formData.profession} onChange={e => setFormData({...formData, profession: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Location</label>
                    <input 
                      type="text"
                      value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-primary-600 text-white font-bold hover:bg-primary-700 rounded-xl shadow-sm transition-colors">Save Details</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState({ isOpen: false, idToDelete: null })}
        onConfirm={executeDelete}
        title="Delete Alumni Record"
        message="Are you sure you want to delete this alumni record? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
}
