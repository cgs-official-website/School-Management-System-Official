import React, { useState } from 'react';
import { Plus, X, Search, Filter, Edit, Trash2 } from 'lucide-react';
import { LuHeartPulse, LuStethoscope } from 'react-icons/lu';
import ConfirmModal from '../../components/ConfirmModal';

export default function HealthRecords() {
  const [records, setRecords] = useState([
    { id: 1, name: 'Alice Smith', bloodGroup: 'O+', lastCheckup: '2026-05-15', allergies: 'Peanuts', status: 'Healthy' },
    { id: 2, name: 'Bob Johnson', bloodGroup: 'A-', lastCheckup: '2026-06-20', allergies: 'None', status: 'Needs Follow-up' },
    { id: 3, name: 'Charlie Davis', bloodGroup: 'B+', lastCheckup: '2026-07-01', allergies: 'Dust', status: 'Healthy' },
    { id: 4, name: 'Diana Prince', bloodGroup: 'AB+', lastCheckup: '2026-07-05', allergies: 'Pollen', status: 'Healthy' },
    { id: 5, name: 'Evan Wright', bloodGroup: 'O-', lastCheckup: '2026-07-10', allergies: 'None', status: 'Needs Follow-up' },
    { id: 6, name: 'Fiona Gallagher', bloodGroup: 'A+', lastCheckup: '2026-07-11', allergies: 'Dairy', status: 'Healthy' },
    { id: 7, name: 'George Miller', bloodGroup: 'B-', lastCheckup: '2026-07-12', allergies: 'None', status: 'Healthy' },
    { id: 8, name: 'Hannah Abbott', bloodGroup: 'AB-', lastCheckup: '2026-07-12', allergies: 'Latex', status: 'Needs Follow-up' },
    { id: 9, name: 'Ian Malcolm', bloodGroup: 'O+', lastCheckup: '2026-07-13', allergies: 'None', status: 'Healthy' },
    { id: 10, name: 'Julia Roberts', bloodGroup: 'A-', lastCheckup: '2026-07-13', allergies: 'Shellfish', status: 'Healthy' },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [confirmModalState, setConfirmModalState] = useState({ isOpen: false, idToDelete: null });
  const [formData, setFormData] = useState({ name: '', bloodGroup: 'O+', lastCheckup: new Date().toISOString().split('T')[0], allergies: 'None', status: 'Healthy' });
  const [searchTerm, setSearchTerm] = useState('');

  const handleSave = (e) => {
    e.preventDefault();
    if (formData.id) {
      setRecords(records.map(r => r.id === formData.id ? formData : r));
    } else {
      setRecords([...records, { ...formData, id: Date.now() }]);
    }
    setShowModal(false);
    setFormData({ name: '', bloodGroup: 'O+', lastCheckup: new Date().toISOString().split('T')[0], allergies: 'None', status: 'Healthy' });
  };

  const handleDeleteClick = (id) => {
    setConfirmModalState({ isOpen: true, idToDelete: id });
  };

  const executeDelete = () => {
    const id = confirmModalState.idToDelete;
    if (!id) return;
    setRecords(records.filter(r => r.id !== id));
    setConfirmModalState({ isOpen: false, idToDelete: null });
  };

  const filteredRecords = records.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto h-[calc(100vh-2rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Health & Medical Records</h1>
          <p className="text-slate-500 mt-1">Manage student health profiles and infirmary visits.</p>
        </div>
        <button 
          onClick={() => { setFormData({ name: '', bloodGroup: 'O+', lastCheckup: new Date().toISOString().split('T')[0], allergies: 'None', status: 'Healthy' }); setShowModal(true); }}
          className="flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-xl hover:bg-primary-700 transition-all font-medium shadow-sm"
        >
          <Plus size={20} /> Add Record
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 shrink-0">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
            <LuHeartPulse size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Records</p>
            <p className="text-2xl font-bold text-slate-900">{records.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <LuStethoscope size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Needs Follow-up</p>
            <p className="text-2xl font-bold text-slate-900">{records.filter(r => r.status === 'Needs Follow-up').length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between gap-4 shrink-0">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="Search by student name..."
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
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200">Student Name</th>
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200">Blood Group</th>
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200">Allergies</th>
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200">Last Checkup</th>
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200">Status</th>
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-bold text-slate-900">{record.name}</td>
                  <td className="p-4 text-rose-600 font-bold">{record.bloodGroup}</td>
                  <td className="p-4 text-slate-600 font-medium">{record.allergies}</td>
                  <td className="p-4 text-slate-600 font-medium">{new Date(record.lastCheckup).toLocaleDateString()}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                      record.status === 'Healthy' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => { setFormData(record); setShowModal(true); }} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                        <Edit size={18} />
                      </button>
                      <button onClick={() => handleDeleteClick(record.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-slate-500">
                    No medical records found.
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
              <h2 className="text-xl font-bold text-slate-900">{formData.id ? 'Edit' : 'Add'} Health Record</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:bg-slate-200 rounded-full p-2 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Student Name</label>
                    <input 
                      type="text" required
                      value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Blood Group</label>
                    <select 
                      value={formData.bloodGroup} onChange={e => setFormData({...formData, bloodGroup: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                    >
                      <option>A+</option><option>A-</option>
                      <option>B+</option><option>B-</option>
                      <option>AB+</option><option>AB-</option>
                      <option>O+</option><option>O-</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Last Checkup</label>
                    <input 
                      type="date" required
                      value={formData.lastCheckup} onChange={e => setFormData({...formData, lastCheckup: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
                    <select 
                      value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                    >
                      <option>Healthy</option>
                      <option>Needs Follow-up</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Known Allergies / Conditions</label>
                  <textarea 
                    value={formData.allergies} onChange={e => setFormData({...formData, allergies: e.target.value})}
                    placeholder="e.g. Peanuts, Dust..."
                    rows="3"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 custom-scrollbar"
                  ></textarea>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-primary-600 text-white font-bold hover:bg-primary-700 rounded-xl shadow-sm transition-colors">Save Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState({ isOpen: false, idToDelete: null })}
        onConfirm={executeDelete}
        title="Delete Health Record"
        message="Are you sure you want to delete this health record? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
}
