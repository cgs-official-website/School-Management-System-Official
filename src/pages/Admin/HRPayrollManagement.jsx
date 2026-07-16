import React, { useState, useEffect } from 'react';
import { Plus, X, Search, Filter, Edit, Trash2, Download } from 'lucide-react';
import { LuBriefcase, LuCircleDollarSign } from 'react-icons/lu';
import ConfirmModal from '../../components/ConfirmModal';
import { useAuth } from '../../context/AuthContext';
import { subscribeToSubCollection, addSubDocument, updateSubDocument, deleteSubDocument } from '../../firebase/firestore';
import toast from 'react-hot-toast';

export default function HRPayrollManagement() {
  const { userProfile } = useAuth();
  const schoolId = userProfile?.schoolId;

  const [payrolls, setPayrolls] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [confirmModalState, setConfirmModalState] = useState({ isOpen: false, idToDelete: null });
  const [formData, setFormData] = useState({ teacherId: '', name: '', role: '', baseSalary: 0, deductions: 0, status: 'Pending', pfCalculated: 0 });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!schoolId) return;
    
    const unsubTeachers = subscribeToSubCollection(schoolId, 'teachers', (data) => {
      setTeachers(data);
    });

    const unsubPayroll = subscribeToSubCollection(schoolId, 'payroll', (data) => {
      setPayrolls(data);
      setLoading(false);
    });

    return () => {
      unsubTeachers();
      unsubPayroll();
    };
  }, [schoolId]);

  const calculatePF = (salary) => {
    // April 2026 Rules: 12% of Basic, capped at ₹15,000 basic (i.e. max ₹1800)
    const pfCeiling = 15000;
    const applicableSalary = Math.min(salary, pfCeiling);
    return Math.round(applicableSalary * 0.12);
  };

  const handleTeacherSelect = (teacherId) => {
    const selected = teachers.find(t => t.id === teacherId);
    if (selected) {
      const name = selected.name || `${selected.firstName || ''} ${selected.lastName || ''}`.trim();
      const role = selected.role || 'Staff'; 
      setFormData(prev => ({ ...prev, teacherId, name, role }));
    } else {
      setFormData(prev => ({ ...prev, teacherId: '', name: '', role: '' }));
    }
  };

  const handleSalaryChange = (val) => {
    const salary = parseFloat(val) || 0;
    const pf = calculatePF(salary);
    setFormData(prev => ({ 
      ...prev, 
      baseSalary: salary, 
      deductions: pf,
      pfCalculated: pf
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.teacherId) {
      toast.error("Please select a staff member");
      return;
    }

    try {
      if (formData.id) {
        await updateSubDocument(schoolId, 'payroll', formData.id, formData);
        toast.success("Payroll updated successfully");
      } else {
        await addSubDocument(schoolId, 'payroll', {
          ...formData,
          month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
          createdAt: new Date().toISOString()
        });
        toast.success("Payroll record added");
      }
      setShowModal(false);
      setFormData({ teacherId: '', name: '', role: '', baseSalary: 0, deductions: 0, status: 'Pending', pfCalculated: 0 });
    } catch (err) {
      console.error(err);
      toast.error("Failed to save payroll record");
    }
  };

  const handleDeleteClick = (id) => {
    setConfirmModalState({ isOpen: true, idToDelete: id });
  };

  const executeDelete = async () => {
    const id = confirmModalState.idToDelete;
    if (!id) return;
    try {
      await deleteSubDocument(schoolId, 'payroll', id);
      toast.success("Record deleted");
    } catch (err) {
      toast.error("Failed to delete record");
    }
    setConfirmModalState({ isOpen: false, idToDelete: null });
  };

  const filteredPayrolls = payrolls.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.role.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto h-[calc(100vh-2rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">HR & Payroll</h1>
          <p className="text-slate-500 mt-1">Manage staff salaries, deductions, and payslips.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl hover:bg-slate-50 transition-all font-medium shadow-sm">
            <Download size={20} /> Export Report
          </button>
          <button 
            onClick={() => { setFormData({ teacherId: '', name: '', role: '', baseSalary: 0, deductions: 0, status: 'Pending', pfCalculated: 0 }); setShowModal(true); }}
            className="flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-xl hover:bg-primary-700 transition-all font-medium shadow-sm"
          >
            <Plus size={20} /> Add Record
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 shrink-0">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <LuCircleDollarSign size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Payroll</p>
            <p className="text-2xl font-bold text-slate-900">
              ₹{payrolls.reduce((acc, curr) => acc + (curr.baseSalary - curr.deductions), 0).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <LuBriefcase size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Staff Count</p>
            <p className="text-2xl font-bold text-slate-900">{payrolls.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between gap-4 shrink-0">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="Search by name or role..."
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
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200">Staff Name</th>
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200">Role</th>
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200">Base Salary</th>
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200">Deductions</th>
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200">Net Pay</th>
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200">Status</th>
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayrolls.map((payroll) => {
                const netPay = payroll.baseSalary - payroll.deductions;
                return (
                  <tr key={payroll.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-bold text-slate-900">{payroll.name}</td>
                    <td className="p-4 text-slate-600 font-medium">{payroll.role}</td>
                    <td className="p-4 text-slate-700">₹{payroll.baseSalary.toLocaleString()}</td>
                    <td className="p-4 text-red-600">-₹{payroll.deductions.toLocaleString()}</td>
                    <td className="p-4 font-bold text-emerald-600">₹{netPay.toLocaleString()}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                        payroll.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {payroll.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => { setFormData(payroll); setShowModal(true); }} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                          <Edit size={18} />
                        </button>
                        <button onClick={() => handleDeleteClick(payroll.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredPayrolls.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-12 text-center text-slate-500">
                    No payroll records found.
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
              <h2 className="text-xl font-bold text-slate-900">{formData.id ? 'Edit' : 'Add'} Payroll Record</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:bg-slate-200 rounded-full p-2 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Staff Member</label>
                    <select
                      required
                      value={formData.teacherId}
                      onChange={e => handleTeacherSelect(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                      disabled={!!formData.id}
                    >
                      <option value="">Select Staff...</option>
                      {teachers.map(t => {
                        const displayName = t.name || `${t.firstName || ''} ${t.lastName || ''}`.trim();
                        return (
                          <option key={t.id} value={t.id}>{displayName || 'Unnamed Staff'}</option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Role / Position</label>
                    <input 
                      type="text" required
                      value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Base Salary (₹)</label>
                    <input 
                      type="number" required min="0"
                      value={formData.baseSalary} onChange={e => handleSalaryChange(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Total Deductions (₹)</label>
                    <input 
                      type="number" required min="0"
                      value={formData.deductions} onChange={e => setFormData({...formData, deductions: parseFloat(e.target.value) || 0})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Includes 12% PF (₹{formData.pfCalculated || 0}). Edit if needed.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
                  <select 
                    value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option>Paid</option>
                    <option>Pending</option>
                  </select>
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
        title="Delete Payroll Record"
        message="Are you sure you want to delete this payroll record? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
}
