import React, { useState, useEffect } from 'react';
import { subscribeToAllSchools, subscribeToPlans } from '../../firebase/firestore';
import { Link } from 'react-router-dom';
import { LuCreditCard as CreditCard, LuArrowUpRight as ArrowUpRight, LuTrendingUp as TrendingUp, LuCircleAlert as AlertCircle, LuCircleCheck as CheckCircle2 } from 'react-icons/lu';

export default function SubscriptionsList() {
  const [schools, setSchools] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    let schoolsUnsub, plansUnsub;

    schoolsUnsub = subscribeToAllSchools((schoolsData) => {
      setSchools(schoolsData);
      setLoading(false);
    });

    plansUnsub = subscribeToPlans((plansData) => {
      setPlans(plansData);
    });

    return () => {
      if (schoolsUnsub) schoolsUnsub();
      if (plansUnsub) plansUnsub();
    };
  }, []);

  // Calculate MRR (Monthly Recurring Revenue)
  const calculateMRR = () => {
    let mrr = 0;
    schools.forEach(school => {
      if (school.status === 'approved' && school.planId) {
        const plan = plans.find(p => p.id === school.planId);
        if (plan) {
          // Simplification: assume all are on monthly billing for MRR
          mrr += plan.priceMonthly;
        }
      }
    });
    return mrr;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Subscriptions Overview</h1>
        <p className="text-slate-500 mt-1">Monitor active tenant subscriptions and revenue.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
        </div>
      ) : (
        <>
          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 text-green-700 rounded-lg">
                  <TrendingUp size={20} />
                </div>
                <h3 className="font-semibold text-slate-600">Total MRR</h3>
              </div>
              <p className="text-3xl font-bold text-slate-900">₹{calculateMRR().toLocaleString()}</p>
            </div>
            
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <CreditCard size={20} />
                </div>
                <h3 className="font-semibold text-slate-600">Active Subscriptions</h3>
              </div>
              <p className="text-3xl font-bold text-slate-900">
                {schools.filter(s => s.status === 'approved' && s.planId).length}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                  <AlertCircle size={20} />
                </div>
                <h3 className="font-semibold text-slate-600">Free Tier / Pending</h3>
              </div>
              <p className="text-3xl font-bold text-slate-900">
                {schools.filter(s => !s.planId).length}
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900">Tenant Subscriptions</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                    <th className="p-4 pl-6">School Name</th>
                    <th className="p-4">Current Plan</th>
                    <th className="p-4">Billing Cycle</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 pr-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {schools.filter(s => s.status === 'approved').map(school => {
                    const plan = plans.find(p => p.id === school.planId);
                    return (
                      <tr key={school.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 pl-6 font-semibold text-slate-900">{school.name}</td>
                        <td className="p-4">
                          {plan ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-primary-100 text-primary-800">
                              {plan.name}
                            </span>
                          ) : (
                            <span className="text-slate-500 italic">No Plan (Free/Trial)</span>
                          )}
                        </td>
                        <td className="p-4 text-slate-600">
                          {plan ? (school.billingCycle || 'Monthly') : '-'}
                        </td>
                        <td className="p-4">
                          {plan ? (
                            <span className="inline-flex items-center gap-1.5 text-green-700 font-medium">
                              <CheckCircle2 size={16} /> Active
                            </span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <Link 
                            to={`/superadmin/tenants/${school.id}`}
                            className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium"
                          >
                            View Details <ArrowUpRight size={16} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  {schools.filter(s => s.status === 'approved').length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-slate-500">
                        No active subscriptions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
