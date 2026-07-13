import React, { useState } from 'react';
import { Plus, X, Search, Filter, Edit, Trash2 } from 'lucide-react';
import { LuHouse, LuUsers } from 'react-icons/lu';
import ConfirmModal from '../../components/ConfirmModal';

export default function HostelManagement() {
  const [rooms, setRooms] = useState([
    { id: 1, roomNumber: '101', block: 'Block A (Boys)', capacity: 2, occupancy: 2, status: 'Full', feePerMonth: 1500 },
    { id: 2, roomNumber: '102', block: 'Block A (Boys)', capacity: 2, occupancy: 1, status: 'Available', feePerMonth: 1500 },
    { id: 3, roomNumber: '201', block: 'Block B (Girls)', capacity: 4, occupancy: 0, status: 'Available', feePerMonth: 1000 },
    { id: 4, roomNumber: '202', block: 'Block B (Girls)', capacity: 4, occupancy: 4, status: 'Full', feePerMonth: 1000 },
    { id: 5, roomNumber: '301', block: 'Block C (Staff)', capacity: 1, occupancy: 1, status: 'Full', feePerMonth: 2000 },
    { id: 6, roomNumber: '103', block: 'Block A (Boys)', capacity: 2, occupancy: 0, status: 'Available', feePerMonth: 1500 },
    { id: 7, roomNumber: '104', block: 'Block A (Boys)', capacity: 2, occupancy: 2, status: 'Full', feePerMonth: 1500 },
    { id: 8, roomNumber: '203', block: 'Block B (Girls)', capacity: 4, occupancy: 2, status: 'Available', feePerMonth: 1000 },
    { id: 9, roomNumber: '204', block: 'Block B (Girls)', capacity: 4, occupancy: 3, status: 'Available', feePerMonth: 1000 },
    { id: 10, roomNumber: '302', block: 'Block C (Staff)', capacity: 1, occupancy: 0, status: 'Available', feePerMonth: 2000 },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [confirmModalState, setConfirmModalState] = useState({ isOpen: false, idToDelete: null });
  const [formData, setFormData] = useState({ roomNumber: '', block: 'Block A (Boys)', capacity: 2, occupancy: 0, status: 'Available', feePerMonth: 0 });
  const [searchTerm, setSearchTerm] = useState('');

  const handleSave = (e) => {
    e.preventDefault();
    const updatedStatus = formData.occupancy >= formData.capacity ? 'Full' : 'Available';
    const finalData = { ...formData, status: updatedStatus };
    if (formData.id) {
      setRooms(rooms.map(r => r.id === formData.id ? finalData : r));
    } else {
      setRooms([...rooms, { ...finalData, id: Date.now() }]);
    }
    setShowModal(false);
    setFormData({ roomNumber: '', block: 'Block A (Boys)', capacity: 2, occupancy: 0, status: 'Available', feePerMonth: 0 });
  };

  const handleDeleteClick = (id) => {
    setConfirmModalState({ isOpen: true, idToDelete: id });
  };

  const executeDelete = () => {
    const id = confirmModalState.idToDelete;
    if (!id) return;
    setRooms(rooms.filter(r => r.id !== id));
    setConfirmModalState({ isOpen: false, idToDelete: null });
  };

  const filteredRooms = rooms.filter(r => r.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) || r.block.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto h-[calc(100vh-2rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Hostel Management</h1>
          <p className="text-slate-500 mt-1">Manage hostel rooms, allocations, and capacity.</p>
        </div>
        <button 
          onClick={() => { setFormData({ roomNumber: '', block: 'Block A (Boys)', capacity: 2, occupancy: 0, status: 'Available', feePerMonth: 0 }); setShowModal(true); }}
          className="flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-xl hover:bg-primary-700 transition-all font-medium shadow-sm"
        >
          <Plus size={20} /> Add Room
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 shrink-0">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <LuHouse size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Rooms</p>
            <p className="text-2xl font-bold text-slate-900">{rooms.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <LuUsers size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Occupancy</p>
            <p className="text-2xl font-bold text-slate-900">{rooms.reduce((acc, curr) => acc + curr.occupancy, 0)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between gap-4 shrink-0">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="Search by room or block..."
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
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200">Room Number</th>
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200">Block/Building</th>
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200">Capacity</th>
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200">Monthly Fee</th>
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200">Status</th>
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRooms.map((room) => (
                <tr key={room.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-bold text-slate-900">Room {room.roomNumber}</td>
                  <td className="p-4 text-slate-600 font-medium">{room.block}</td>
                  <td className="p-4">
                    <div className="text-sm font-semibold text-slate-700">{room.occupancy} / {room.capacity}</div>
                    <div className="w-24 h-1.5 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${room.occupancy >= room.capacity ? 'bg-red-500' : 'bg-emerald-500'}`} 
                        style={{ width: `${(room.occupancy / room.capacity) * 100}%` }}
                      ></div>
                    </div>
                  </td>
                  <td className="p-4 text-slate-600 font-medium">₹{room.feePerMonth}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                      room.status === 'Full' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {room.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => { setFormData(room); setShowModal(true); }} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                        <Edit size={18} />
                      </button>
                      <button onClick={() => handleDeleteClick(room.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRooms.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-slate-500">
                    No rooms found matching your search.
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
              <h2 className="text-xl font-bold text-slate-900">{formData.id ? 'Edit' : 'Add'} Room</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:bg-slate-200 rounded-full p-2 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Room Number</label>
                    <input 
                      type="text" required
                      value={formData.roomNumber} onChange={e => setFormData({...formData, roomNumber: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Block / Building</label>
                    <select 
                      value={formData.block} onChange={e => setFormData({...formData, block: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                    >
                      <option>Block A (Boys)</option>
                      <option>Block B (Girls)</option>
                      <option>Block C (Staff)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Total Capacity</label>
                    <input 
                      type="number" required min="1"
                      value={formData.capacity} onChange={e => setFormData({...formData, capacity: parseInt(e.target.value)})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Current Occupancy</label>
                    <input 
                      type="number" required min="0" max={formData.capacity}
                      value={formData.occupancy} onChange={e => setFormData({...formData, occupancy: parseInt(e.target.value)})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Fee Per Month (₹)</label>
                  <input 
                    type="number" required min="0"
                    value={formData.feePerMonth} onChange={e => setFormData({...formData, feePerMonth: parseFloat(e.target.value)})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-primary-600 text-white font-bold hover:bg-primary-700 rounded-xl shadow-sm transition-colors">Save Room</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState({ isOpen: false, idToDelete: null })}
        onConfirm={executeDelete}
        title="Delete Room"
        message="Are you sure you want to delete this room? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
}
