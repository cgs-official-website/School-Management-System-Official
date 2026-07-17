import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSubCollection, createFeeStructure, getInvoices, markInvoicePaid, subscribeToSubCollection, subscribeToInvoices } from '../../firebase/firestore';
import { LuCreditCard as CreditCard, LuPlus as Plus, LuCircleCheck as CheckCircle2, LuSearch as Search, LuX as X, LuReceipt as Receipt, LuIndianRupee as DollarSign, LuTrendingUp as TrendingUp, LuTriangleAlert as AlertTriangle } from 'react-icons/lu';
import toast from 'react-hot-toast';

export default function FeeManagement() {
  const { userProfile } = useAuth();
  const schoolId = userProfile?.schoolId;

  const [classes, setClasses] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [students, setStudents] = useState({}); // Map of studentId -> student data
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Dashboard Stats
  const [stats, setStats] = useState({ expected: 0, collected: 0, outstanding: 0 });

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newFee, setNewFee] = useState({
    name: '',
    amount: '',
    dueDate: new Date().toISOString().split('T')[0],
    classId: ''
  });

  useEffect(() => {
    if (!schoolId) return;

    setLoading(true);
    let classesUnsub, studentsUnsub, invoicesUnsub;

    classesUnsub = subscribeToSubCollection(schoolId, 'classes', setClasses);

    studentsUnsub = subscribeToSubCollection(schoolId, 'students', (studentsData) => {
      const studentMap = {};
      studentsData.forEach(s => studentMap[s.id] = s);
      setStudents(studentMap);
    });

    invoicesUnsub = subscribeToInvoices(schoolId, (invoicesData) => {
      setInvoices(invoicesData);
      calculateStats(invoicesData);
      setLoading(false);
    });

    return () => {
      if (classesUnsub) classesUnsub();
      if (studentsUnsub) studentsUnsub();
      if (invoicesUnsub) invoicesUnsub();
    };
  }, [schoolId]);

  const calculateStats = (invoicesData) => {
    let expected = 0, collected = 0, outstanding = 0;
    invoicesData.forEach(inv => {
      expected += inv.amount;
      if (inv.status === 'Paid') {
        collected += inv.amount;
      } else {
        outstanding += inv.amount;
      }
    });
    setStats({ expected, collected, outstanding });
  };

  const handleCreateFee = async (e) => {
    e.preventDefault();
    if (!newFee.name || !newFee.amount || !newFee.classId) return;
    setCreating(true);

    try {
      const result = await createFeeStructure(schoolId, newFee);
      // Re-fetch invoices handled by listener
      
      if (result && result.invoiceCount === 0) {
        toast.error("Fee assigned, but NO invoices were generated because there are no active students in this class!", { duration: 5000 });
      } else {
        toast.success(`Fee assigned successfully! Generated ${result.invoiceCount} invoices.`);
      }
      
      setShowCreateModal(false);
      setNewFee({ name: '', amount: '', dueDate: new Date().toISOString().split('T')[0], classId: '' });
    } catch (error) {
      console.error("Error creating fee:", error);
      toast.error("Failed to create fee and generate invoices.");
    } finally {
      setCreating(false);
    }
  };

  const handleMarkPaid = async (invoiceId) => {
    try {
      await markInvoicePaid(schoolId, invoiceId);
      // Optimistically update local state - Handled by real-time listener
      const updatedInvoices = invoices.map(inv => 
        inv.id === invoiceId ? { ...inv, status: 'Paid', paidAt: new Date().toISOString() } : inv
      );
      setInvoices(updatedInvoices);
      calculateStats(updatedInvoices);
    } catch (error) {
      toast.error("Failed to record payment.");
    }
  };

  // Filter invoices based on search
  const filteredInvoices = invoices.filter(inv => {
    if (!searchQuery) return true;
    const student = students[inv.studentId];
    if (!student) return false;
    const searchTerm = searchQuery.toLowerCase();
    return (
      student.firstName.toLowerCase().includes(searchTerm) ||
      student.lastName.toLowerCase().includes(searchTerm) ||
      student.admissionNumber.toLowerCase().includes(searchTerm) ||
      inv.feeName.toLowerCase().includes(searchTerm)
    );
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto pb-24">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Fee Management</h1>
          <p className="text-slate-500 mt-1">Track revenue and manage student payments.</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 shadow-sm flex items-center gap-2 transition-colors"
        >
          <Plus size={18} /> Assign New Fee
        </button>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <Receipt size={28} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Expected</p>
            <p className="text-2xl font-black text-slate-900">₹{stats.expected.toLocaleString()}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center">
            <TrendingUp size={28} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Collected Revenue</p>
            <p className="text-2xl font-black text-slate-900">₹{stats.collected.toLocaleString()}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
            <AlertTriangle size={28} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Outstanding</p>
            <p className="text-2xl font-black text-slate-900">₹{stats.outstanding.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap gap-4 items-center justify-between bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by student, admission no, or fee name..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm transition-all bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                <th className="p-4 pl-6">Student</th>
                <th className="p-4">Fee Details</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-16 text-center text-slate-500">
                    <CreditCard size={48} className="mx-auto mb-4 text-slate-300" />
                    <p className="font-bold text-slate-900 mb-1">No invoices found</p>
                    <p>Assign a fee to a class to generate invoices.</p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const student = students[inv.studentId];
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 pl-6">
                        {student ? (
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm border border-slate-200">
                              {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">
                                {student.firstName} {student.lastName}
                              </div>
                              <div className="text-xs text-slate-500 font-mono mt-0.5">
                                {student.admissionNumber}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unknown Student</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-900">{inv.feeName}</div>
                        <div className="text-xs text-slate-500">Due: {inv.dueDate}</div>
                      </td>
                      <td className="p-4 font-mono font-bold text-slate-700">
                        ₹{inv.amount.toLocaleString()}
                      </td>
                      <td className="p-4">
                        {inv.status === 'Paid' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                            <CheckCircle2 size={14} /> Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                            <AlertTriangle size={14} /> Pending
                          </span>
                        )}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        {inv.status === 'Pending' && (
                          <button 
                            onClick={() => handleMarkPaid(inv.id)}
                            className="px-4 py-2 bg-primary-50 text-primary-700 hover:bg-primary-600 hover:text-white rounded-xl font-bold transition-colors border border-primary-100 hover:border-primary-600 text-xs"
                          >
                            Record Payment
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Fee Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="text-xl font-bold text-slate-900">Assign New Fee</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateFee} className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
              <div className="p-6 space-y-6 flex-1">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Fee Description</label>
                  <input 
                    type="text" required
                    value={newFee.name}
                    onChange={(e) => setNewFee({...newFee, name: e.target.value})}
                    placeholder="e.g. Term 1 Tuition"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Amount (₹)</label>
                    <input 
                      type="number" required min="0" step="0.01"
                      value={newFee.amount}
                      onChange={(e) => setNewFee({...newFee, amount: e.target.value})}
                      placeholder="e.g. 1500"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Due Date</label>
                    <input 
                      type="date" required
                      value={newFee.dueDate}
                      onChange={(e) => setNewFee({...newFee, dueDate: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Apply to Class</label>
                  <select 
                    required
                    value={newFee.classId}
                    onChange={(e) => setNewFee({...newFee, classId: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option value="">Select a class...</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name} - Section {c.section}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-2">
                    Invoices will be automatically generated for all students currently enrolled in this class.
                  </p>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                <button 
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={creating}
                  className="px-6 py-2.5 bg-primary-600 text-white font-bold hover:bg-primary-700 rounded-xl shadow-sm transition-colors"
                >
                  {creating ? 'Saving...' : 'Assign Fee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
