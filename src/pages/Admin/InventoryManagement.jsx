import React, { useState } from 'react';
import { Plus, X, Search, Filter, Edit, Trash2 } from 'lucide-react';
import { LuPackage, LuServer } from 'react-icons/lu';
import ConfirmModal from '../../components/ConfirmModal';

export default function InventoryManagement() {
  const [items, setItems] = useState([
    { id: 1, name: 'Projectors', category: 'Electronics', quantity: 15, unit: 'pcs', status: 'In Stock' },
    { id: 2, name: 'Student Desks', category: 'Furniture', quantity: 500, unit: 'pcs', status: 'In Stock' },
    { id: 3, name: 'Whiteboard Markers', category: 'Stationery', quantity: 50, unit: 'boxes', status: 'Low Stock' },
    { id: 4, name: 'Laptops', category: 'Electronics', quantity: 30, unit: 'pcs', status: 'In Stock' },
    { id: 5, name: 'Chalk', category: 'Stationery', quantity: 0, unit: 'boxes', status: 'Out of Stock' },
    { id: 6, name: 'Microscopes', category: 'Laboratory', quantity: 20, unit: 'pcs', status: 'In Stock' },
    { id: 7, name: 'Basketballs', category: 'Sports', quantity: 5, unit: 'pcs', status: 'Low Stock' },
    { id: 8, name: 'Teacher Chairs', category: 'Furniture', quantity: 45, unit: 'pcs', status: 'In Stock' },
    { id: 9, name: 'Test Tubes', category: 'Laboratory', quantity: 200, unit: 'pcs', status: 'In Stock' },
    { id: 10, name: 'Printer Paper', category: 'Stationery', quantity: 10, unit: 'reams', status: 'Low Stock' },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [confirmModalState, setConfirmModalState] = useState({ isOpen: false, idToDelete: null });
  const [formData, setFormData] = useState({ name: '', category: 'Electronics', quantity: 0, unit: 'pcs', status: 'In Stock' });
  const [searchTerm, setSearchTerm] = useState('');

  const handleSave = (e) => {
    e.preventDefault();
    if (formData.id) {
      setItems(items.map(i => i.id === formData.id ? formData : i));
    } else {
      setItems([...items, { ...formData, id: Date.now() }]);
    }
    setShowModal(false);
    setFormData({ name: '', category: 'Electronics', quantity: 0, unit: 'pcs', status: 'In Stock' });
  };

  const handleDeleteClick = (id) => {
    setConfirmModalState({ isOpen: true, idToDelete: id });
  };

  const executeDelete = () => {
    const id = confirmModalState.idToDelete;
    if (!id) return;
    setItems(items.filter(i => i.id !== id));
    setConfirmModalState({ isOpen: false, idToDelete: null });
  };

  const filteredItems = items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()) || i.category.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto h-[calc(100vh-2rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Inventory & Assets</h1>
          <p className="text-slate-500 mt-1">Track school assets, stock, and inventory.</p>
        </div>
        <button 
          onClick={() => { setFormData({ name: '', category: 'Electronics', quantity: 0, unit: 'pcs', status: 'In Stock' }); setShowModal(true); }}
          className="flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-xl hover:bg-primary-700 transition-all font-medium shadow-sm"
        >
          <Plus size={20} /> Add Item
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 shrink-0">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <LuPackage size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Items</p>
            <p className="text-2xl font-bold text-slate-900">{items.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <LuServer size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Low Stock Alerts</p>
            <p className="text-2xl font-bold text-slate-900">{items.filter(i => i.status === 'Low Stock').length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between gap-4 shrink-0">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="Search by name or category..."
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
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200">Item Name</th>
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200">Category</th>
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200">Quantity</th>
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200">Status</th>
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-bold text-slate-900">{item.name}</td>
                  <td className="p-4 text-slate-600 font-medium">{item.category}</td>
                  <td className="p-4 font-semibold text-slate-700">{item.quantity} {item.unit}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                      item.status === 'In Stock' ? 'bg-emerald-100 text-emerald-700' : 
                      item.status === 'Out of Stock' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => { setFormData(item); setShowModal(true); }} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                        <Edit size={18} />
                      </button>
                      <button onClick={() => handleDeleteClick(item.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-slate-500">
                    No items found matching your search.
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
              <h2 className="text-xl font-bold text-slate-900">{formData.id ? 'Edit' : 'Add'} Inventory Item</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:bg-slate-200 rounded-full p-2 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Item Name</label>
                  <input 
                    type="text" required
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Category</label>
                    <select 
                      value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                    >
                      <option>Electronics</option>
                      <option>Furniture</option>
                      <option>Stationery</option>
                      <option>Laboratory</option>
                      <option>Sports</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
                    <select 
                      value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                    >
                      <option>In Stock</option>
                      <option>Low Stock</option>
                      <option>Out of Stock</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Quantity</label>
                    <input 
                      type="number" required min="0"
                      value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Unit</label>
                    <input 
                      type="text" required
                      value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}
                      placeholder="e.g. pcs, boxes"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-primary-600 text-white font-bold hover:bg-primary-700 rounded-xl shadow-sm transition-colors">Save Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState({ isOpen: false, idToDelete: null })}
        onConfirm={executeDelete}
        title="Delete Inventory Item"
        message="Are you sure you want to delete this inventory item? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
}
