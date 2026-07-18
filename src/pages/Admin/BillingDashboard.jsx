import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { subscribeToSubscriptionPlans } from '../../firebase/firestore';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useNavigate } from 'react-router-dom';
import { LuCreditCard as CreditCard, LuZap as Zap, LuCircleCheck as CheckCircle2, LuCircleAlert as AlertCircle, LuFileText as FileText, LuDownload as Download } from 'react-icons/lu';
import { TableSkeleton } from '../../components/Skeleton';

export default function BillingDashboard() {
  const { userProfile } = useAuth();
  const schoolId = userProfile?.schoolId;
  const navigate = useNavigate();

  const [school, setSchool] = useState(null);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  // Mocked invoices
  const invoices = [
    { id: 'INV-2026-001', date: '2026-07-01', amount: 99, status: 'paid', plan: 'Professional' },
    { id: 'INV-2026-002', date: '2026-06-01', amount: 99, status: 'paid', plan: 'Professional' },
    { id: 'INV-2026-003', date: '2026-05-01', amount: 49, status: 'paid', plan: 'Starter' }
  ];

  useEffect(() => {
    if (!schoolId) return;

    setLoading(true);
    let plansUnsub, schoolUnsub;

    let allPlans = [];

    plansUnsub = subscribeToSubscriptionPlans((data) => {
      allPlans = data;
      updateCurrentPlan();
    });

    schoolUnsub = onSnapshot(doc(db, 'schools', schoolId), (docSnap) => {
      if (docSnap.exists()) {
        setSchool(docSnap.data());
        updateCurrentPlan(docSnap.data().planId);
      }
      setLoading(false);
    });

    const updateCurrentPlan = (planId = school?.planId) => {
      if (planId && allPlans.length > 0) {
        const p = allPlans.find(plan => plan.id === planId);
        setCurrentPlan(p);
      }
    };

    return () => {
      if (plansUnsub) plansUnsub();
      if (schoolUnsub) schoolUnsub();
    };
  }, [schoolId]);

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto animate-fade-in-up">
        <TableSkeleton rows={5} columns={4} />
      </div>
    );
  }

  // Mock usage data
  const mockUsage = {
    students: 320,
    staff: 24,
    storageGB: 12.5
  };

  const getPercentage = (used, max) => {
    if (max > 9000) return 10; // Unlimited basically
    return Math.min(Math.round((used / max) * 100), 100);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Billing & Subscriptions</h1>
        <p className="text-slate-500 mt-1">Manage your plan, limits, and billing history.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Col: Current Plan & Usage */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-50 rounded-full mix-blend-multiply opacity-50"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <div>
                <p className="text-sm font-bold text-amber-600 uppercase tracking-wider mb-1">Current Plan</p>
                <h2 className="text-3xl font-extrabold text-slate-900">
                  {currentPlan ? currentPlan.name : 'Free Trial'}
                </h2>
                {currentPlan && (
                  <p className="text-slate-500 mt-2">
                    Billing cycle: <span className="font-semibold text-slate-700 capitalize">{school?.billingCycle || 'monthly'}</span> &middot; Next charge: <span className="font-semibold text-slate-700">Next cycle</span>
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className="text-4xl font-extrabold text-slate-900 mb-2">
                  ₹{currentPlan ? (school?.billingCycle === 'yearly' ? currentPlan.pricePerUserPerYear : Math.round((currentPlan.pricePerUserPerYear || 0) / 12)) : 0}<span className="text-lg text-slate-500 font-medium">/{school?.billingCycle === 'yearly' ? 'yr' : 'mo'}</span>
                </div>
                <button 
                  onClick={() => navigate('/admin/upgrade')}
                  className="px-5 py-2 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Zap size={16} /> Upgrade Plan
                </button>
              </div>
            </div>

            <div className="space-y-6 pt-6 border-t border-slate-100 relative z-10">
              <h3 className="text-lg font-bold text-slate-900">Current Usage</h3>
              
              {currentPlan ? (
                <>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium text-slate-700">Students</span>
                      <span className="text-slate-500"><span className="font-bold text-slate-900">{mockUsage.students}</span> / {currentPlan.userLimit > 0 ? currentPlan.userLimit : 'Unlimited'}</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${getPercentage(mockUsage.students, currentPlan.userLimit || 1) > 90 ? 'bg-red-500' : 'bg-primary-500'}`} 
                        style={{ width: `${getPercentage(mockUsage.students, currentPlan.userLimit || 10000)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium text-slate-700">Staff Accounts</span>
                      <span className="text-slate-500"><span className="font-bold text-slate-900">{mockUsage.staff}</span> / {currentPlan.userLimit > 0 ? Math.floor(currentPlan.userLimit * 0.1) : 'Unlimited'}</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${getPercentage(mockUsage.staff, (currentPlan.userLimit * 0.1) || 1) > 90 ? 'bg-red-500' : 'bg-primary-500'}`} 
                        style={{ width: `${getPercentage(mockUsage.staff, (currentPlan.userLimit * 0.1) || 1000)}%` }}
                      ></div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-slate-600 text-sm">
                  You are currently on a free trial with limited capacity. Upgrade to a paid plan to unlock features.
                </div>
              )}
            </div>
          </div>

          {/* Invoices */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Billing History</h3>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                  <th className="p-4 pl-6">Invoice</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6 text-right">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 pl-6 font-medium text-slate-900 flex items-center gap-2">
                      <FileText size={16} className="text-slate-400" /> {inv.id}
                    </td>
                    <td className="p-4 text-slate-600">{new Date(inv.date).toLocaleDateString()}</td>
                    <td className="p-4 font-semibold text-slate-900">₹{inv.amount}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700">
                        <CheckCircle2 size={12} /> Paid
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <button className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                        <Download size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Col: Payment Method */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900">Payment Method</h3>
              <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">Edit</button>
            </div>
            
            <div className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl bg-slate-50">
              <div className="w-12 h-8 bg-slate-200 rounded flex items-center justify-center font-bold text-slate-600 text-xs tracking-wider">
                VISA
              </div>
              <div>
                <p className="font-semibold text-slate-900">•••• •••• •••• 4242</p>
                <p className="text-xs text-slate-500">Expires 12/28</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4 leading-relaxed">
              This card will be automatically charged ₹{currentPlan ? currentPlan.priceMonthly : 0} on the 1st of every month.
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
            <div className="flex gap-3 text-slate-700 mb-2">
              <AlertCircle size={20} className="text-amber-500 shrink-0" />
              <h3 className="font-bold text-slate-900">Need Help?</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4 pl-8">
              If you have questions about your billing or need a custom enterprise plan, please contact our support team.
            </p>
            <button className="w-full py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
