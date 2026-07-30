import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { LuCreditCard as CreditCard, LuReceipt as Receipt, LuCircleCheck as CheckCircle2, LuTrendingUp as TrendingUp, LuTriangleAlert as AlertTriangle, LuInfo as Info } from 'react-icons/lu';
import toast from 'react-hot-toast';

export default function ParentFees() {
  const { userProfile } = useAuth();
  const schoolId = userProfile?.schoolId;
  const studentId = userProfile?.linkedStudentId;

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalInvoiced: 0, paid: 0, outstanding: 0 });
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!schoolId || !studentId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    // Subscribe to invoices for the linked student
    const q = query(
      collection(db, `schools/${schoolId}/invoices`),
      where("studentId", "==", studentId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const invoicesData = [];
      let totalInvoiced = 0;
      let paid = 0;
      let outstanding = 0;

      snapshot.forEach((doc) => {
        const inv = { id: doc.id, ...doc.data() };
        invoicesData.push(inv);

        totalInvoiced += inv.amount || 0;
        if (inv.status === 'Paid') {
          paid += inv.amount || 0;
        } else {
          outstanding += inv.amount || 0;
        }
      });

      // Sort invoices by due date desc
      invoicesData.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));

      setInvoices(invoicesData);
      setStats({ totalInvoiced, paid, outstanding });
      setLoading(false);
    }, (error) => {
      console.error("Error subscribing to invoices:", error);
      toast.error("Failed to load fee details.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [schoolId, studentId]);

  const handleSimulatePayment = async (invoice) => {
    setSelectedInvoice(invoice);
  };

  const executePayment = async () => {
    if (!selectedInvoice) return;
    setPaying(true);

    try {
      // Import functions locally to execute payment mark
      const { markInvoicePaid } = await import('../../firebase/firestore');
      await markInvoicePaid(schoolId, selectedInvoice.id);
      
      toast.success(`Payment of ₹${selectedInvoice.amount} for "${selectedInvoice.name}" successfully processed!`);
      setSelectedInvoice(null);
    } catch (e) {
      console.error(e);
      toast.error("Failed to process payment. Please try again.");
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Fees & Payments</h1>
          <p className="text-slate-500 text-sm">Monitor fee invoices, receipts, and outstanding dues for your linked student.</p>
        </div>
      </div>

      {/* Stats Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Invoiced */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-slate-400"></div>
          <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center">
            <Receipt size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Invoiced</p>
            <p className="text-2xl font-black text-slate-900 mt-1">₹{stats.totalInvoiced.toLocaleString()}</p>
          </div>
        </div>

        {/* Paid */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500"></div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Paid Amount</p>
            <p className="text-2xl font-black text-slate-950 mt-1">₹{stats.paid.toLocaleString()}</p>
          </div>
        </div>

        {/* Outstanding */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-amber-500"></div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Outstanding Balance</p>
            <p className="text-2xl font-black text-amber-600 mt-1">₹{stats.outstanding.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Dues Alert Banner */}
      {stats.outstanding > 0 && (
        <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-4 flex items-center gap-3 text-amber-800">
          <Info className="shrink-0 text-amber-600" size={20} />
          <div className="text-sm font-medium">
            You have an outstanding balance of <span className="font-bold">₹{stats.outstanding.toLocaleString()}</span>. Please settle pending invoices before their due date.
          </div>
        </div>
      )}

      {/* Invoices List */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-950">Invoice Log</h2>
        </div>

        {invoices.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Receipt className="mx-auto mb-3 opacity-40" size={48} />
            <p className="font-medium text-sm">No fee invoices generated yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/30">
                  <th className="py-4 px-6">Fee Details</th>
                  <th className="py-4 px-6">Due Date</th>
                  <th className="py-4 px-6">Amount</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {invoices.map((inv) => {
                  const isOverdue = new Date(inv.dueDate) < new Date() && inv.status !== 'Paid';
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <p className="font-semibold text-slate-900">{inv.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Invoiced on {new Date(inv.createdAt).toLocaleDateString()}</p>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`font-medium ${isOverdue ? 'text-red-500 font-semibold' : 'text-slate-600'}`}>
                          {new Date(inv.dueDate).toLocaleDateString()}
                          {isOverdue && <span className="ml-1 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-black uppercase">Overdue</span>}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-bold text-slate-900">₹{inv.amount.toLocaleString()}</span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          inv.status === 'Paid' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50' 
                            : 'bg-amber-50 text-amber-700 border border-amber-200/50'
                        }`}>
                          {inv.status === 'Paid' && <CheckCircle2 size={12} />}
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        {inv.status !== 'Paid' ? (
                          <button
                            onClick={() => handleSimulatePayment(inv)}
                            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all hover:scale-[1.02]"
                          >
                            Pay Dues
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs font-medium italic">Fully Settled</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Simulated Payment Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-100 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-slate-950 mb-2">Simulate Fee Payment</h3>
            <p className="text-slate-500 text-sm mb-4">
              You are simulating a secure online payment of <span className="font-bold text-slate-900">₹{selectedInvoice.amount}</span> for <strong>{selectedInvoice.name}</strong>.
            </p>
            <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100 space-y-2">
              <div className="flex justify-between text-xs font-medium text-slate-400">
                <span>INVOICE</span>
                <span className="text-slate-800 font-mono">#{selectedInvoice.id.slice(0, 8).toUpperCase()}</span>
              </div>
              <div className="flex justify-between text-xs font-medium text-slate-400">
                <span>DUE DATE</span>
                <span className="text-slate-800">{new Date(selectedInvoice.dueDate).toLocaleDateString()}</span>
              </div>
              <div className="border-t border-slate-200 my-2 pt-2 flex justify-between text-sm font-bold text-slate-900">
                <span>Total Amount Due</span>
                <span>₹{selectedInvoice.amount}</span>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                disabled={paying}
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={paying}
                onClick={executePayment}
                className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl text-sm transition-all flex items-center gap-2 shadow-md shadow-primary-500/20"
              >
                {paying ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Simulate Payment</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
