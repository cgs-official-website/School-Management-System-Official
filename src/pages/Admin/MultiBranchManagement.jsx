import React, { useState } from 'react';
import { Plus, X, Search, Filter, Edit, Trash2, MapPin } from 'lucide-react';
import { LuBuilding2, LuUsers } from 'react-icons/lu';
import ConfirmModal from '../../components/ConfirmModal';

export default function MultiBranchManagement() {
  const [branches, setBranches] = useState([
    { id: 1, name: 'Main Campus', location: 'Downtown City Center', principal: 'Dr. Robert Smith', studentCount: 1500, status: 'Active' },
    { id: 2, name: 'North Wing Campus', location: 'Northridge Suburb', principal: 'Mrs. Emily Davis', studentCount: 850, status: 'Active' },
    { id: 3, name: 'South Branch', location: 'Southfield Avenue', principal: 'Mr. James Wilson', studentCount: 600, status: 'Maintenance' },
    { id: 4, name: 'East Side Campus', location: 'Eastwood District', principal: 'Ms. Sarah Connor', studentCount: 1200, status: 'Active' },
    { id: 5, name: 'West End Academy', location: 'West End Blvd', principal: 'Mr. David Wallace', studentCount: 950, status: 'Active' },
    { id: 6, name: 'Central High', location: 'Central Square', principal: 'Dr. John Watson', studentCount: 2100, status: 'Active' },
    { id: 7, name: 'Lakeside Branch', location: 'Lakeview Drive', principal: 'Mrs. Hudson', studentCount: 450, status: 'Active' },
    { id: 8, name: 'Hilltop School', location: 'Hilltop Road', principal: 'Mr. Greg Lestrade', studentCount: 300, status: 'Closed' },
    { id: 9, name: 'Valley Campus', location: 'Valley Road', principal: 'Ms. Mary Morstan', studentCount: 700, status: 'Active' },
    { id: 10, name: 'Riverfront Academy', location: 'River Road', principal: 'Dr. Mycroft Holmes', studentCount: 1100, status: 'Active' },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [confirmModalState, setConfirmModalState] = useState({ isOpen: false, idToDelete: null });
  const [formData, setFormData] = useState({ name: '', location: '', principal: '', studentCount: 0, status: 'Active' });
  const [searchTerm, setSearchTerm] = useState('');

  const handleSave = (e) => {
    e.preventDefault();
    if (formData.id) {
      setBranches(branches.map(b => b.id === formData.id ? formData : b));
    } else {
      setBranches([...branches, { ...formData, id: Date.now() }]);
    }
    setShowModal(false);
    setFormData({ name: '', location: '', principal: '', studentCount: 0, status: 'Active' });
  };

  const handleDeleteClick = (id) => {
    setConfirmModalState({ isOpen: true, idToDelete: id });
  };

  const executeDelete = () => {
    const id = confirmModalState.idToDelete;
    if (!id) return;
    setBranches(branches.filter(b => b.id !== id));
    setConfirmModalState({ isOpen: false, idToDelete: null });
  };

  const filteredBranches = branches.filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()) || b.location.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto h-[calc(100vh-2rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Multi-Branch Management</h1>
          <p className="text-slate-500 mt-1">Monitor and manage all school branches from a central dashboard.</p>
        </div>
        <button 
          onClick={() => { setFormData({ name: '', location: '', principal: '', studentCount: 0, status: 'Active' }); setShowModal(true); }}
          className="flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-xl hover:bg-primary-700 transition-all font-medium shadow-sm"
        >
          <Plus size={20} /> Add Branch
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 shrink-0">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <LuBuilding2 size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Branches</p>
            <p className="text-2xl font-bold text-slate-900">{branches.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <LuUsers size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Network Students</p>
            <p className="text-2xl font-bold text-slate-900">
              {branches.reduce((acc, curr) => acc + curr.studentCount, 0).toLocaleString()}
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
              placeholder="Search by branch name or location..."
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
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200">Branch Name</th>
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200">Location</th>
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200">Principal</th>
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200">Total Students</th>
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200">Status</th>
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBranches.map((branch) => (
                <tr key={branch.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-bold text-slate-900">{branch.name}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <MapPin size={16} />
                      {branch.location}
                    </div>
                  </td>
                  <td className="p-4 text-slate-600 font-medium">{branch.principal}</td>
                  <td className="p-4 font-semibold text-slate-700">{branch.studentCount.toLocaleString()}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                      branch.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {branch.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => { setFormData(branch); setShowModal(true); }} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                        <Edit size={18} />
                      </button>
                      <button onClick={() => handleDeleteClick(branch.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredBranches.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-slate-500">
                    No branches found.
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
              <h2 className="text-xl font-bold text-slate-900">{formData.id ? 'Edit' : 'Add'} Branch</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:bg-slate-200 rounded-full p-2 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Branch Name</label>
                  <input 
                    type="text" required
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Full Address / Location</label>
                  <input 
                    type="text" required
                    value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Principal Name</label>
                    <input 
                      type="text" required
                      value={formData.principal} onChange={e => setFormData({...formData, principal: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
                    <select 
                      value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                    >
                      <option>Active</option>
                      <option>Maintenance</option>
                      <option>Closed</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Total Students</label>
                  <input 
                    type="number" min="0" required
                    value={formData.studentCount} onChange={e => setFormData({...formData, studentCount: parseInt(e.target.value)})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-primary-600 text-white font-bold hover:bg-primary-700 rounded-xl shadow-sm transition-colors">Save Branch</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState({ isOpen: false, idToDelete: null })}
        onConfirm={executeDelete}
        title="Delete Branch"
        message="Are you sure you want to delete this branch? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
}
