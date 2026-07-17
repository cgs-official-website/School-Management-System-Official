import React, { useState, useEffect } from 'react';
import { subscribeToSubscriptionPlans, updateSubscriptionPlan, initializeDefaultSubscriptionPlans } from '../../firebase/firestore';
import { LuPlus as Plus, LuPen as Edit2, LuCheck as Check, LuX as X, LuSave as Save, LuSettings as Settings, LuDatabase as Database } from 'react-icons/lu';
import toast from 'react-hot-toast';

const ALL_MODULES = {
  staffManagement: 'Staff Management',
  studentManagement: 'Student Management',
  timetable: 'Timetable Management',
  feeManagement: 'Fee Management',
  attendance: 'Attendance Tracking',
  exams: 'Exam & Report Cards',
  library: 'Library Management',
  transport: 'Transport Management',
  lms: 'LMS Integration',
  apiIntegration: '3rd Party API Integration'
};

const PLAN_ORDER = ['base', 'standard', 'premium', 'enterprise'];

export default function PlanManagement() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToSubscriptionPlans((data) => {
      // Sort plans according to PLAN_ORDER
      const sortedPlans = [...data].sort((a, b) => PLAN_ORDER.indexOf(a.id) - PLAN_ORDER.indexOf(b.id));
      setPlans(sortedPlans);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleInitializeDefaults = async () => {
    setLoading(true);
    try {
      await initializeDefaultSubscriptionPlans();
      toast.success("Default plans initialized!");
    } catch (err) {
      toast.error("Failed to initialize plans.");
    }
    setLoading(false);
  };

  const openEditor = (plan) => {
    // Make a deep copy to edit
    setCurrentPlan(JSON.parse(JSON.stringify(plan)));
    setIsEditing(true);
  };

  const closeEditor = () => {
    setIsEditing(false);
    setCurrentPlan(null);
  };

  const handleSavePlan = async () => {
    setLoading(true);
    try {
      await updateSubscriptionPlan(currentPlan.id, currentPlan);
      toast.success(`${currentPlan.name} updated successfully!`);
      closeEditor();
    } catch (error) {
      console.error("Error saving plan:", error);
      toast.error("Failed to update plan.");
    } finally {
      setLoading(false);
    }
  };

  const handleModuleToggle = (moduleKey) => {
    setCurrentPlan(prev => ({
      ...prev,
      modules: {
        ...prev.modules,
        [moduleKey]: !prev.modules[moduleKey]
      }
    }));
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Subscription Plans</h1>
          <p className="text-slate-500 mt-1">Manage pricing tiers, limits, and module access for tenant schools.</p>
        </div>
        <button 
          onClick={handleInitializeDefaults}
          className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold transition-colors"
        >
          <Database size={18} /> Initialize Defaults
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-10 h-10 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center">
          <Settings size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">No Plans Configured</h3>
          <p className="text-slate-500 mb-6">Click "Initialize Defaults" to set up the 4-tier pricing structure.</p>
          <button 
            onClick={handleInitializeDefaults}
            className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-sm"
          >
            <Database size={20} /> Initialize Default Plans
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {plans.map(plan => (
            <div key={plan.id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
              <div className={`p-6 border-b ${plan.id === 'premium' ? 'bg-primary-50 border-primary-100' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">{plan.name}</h3>
                  {plan.id === 'premium' && (
                    <span className="text-[10px] font-black uppercase tracking-wider bg-primary-600 text-white px-2.5 py-1 rounded-full">Popular</span>
                  )}
                </div>
                
                <div className="mb-2">
                  {plan.custom ? (
                    <span className="text-3xl font-black text-slate-900">Custom</span>
                  ) : (
                    <div className="flex items-end gap-1">
                      <span className="text-3xl font-black text-slate-900">INR {plan.pricePerUserPerYear}</span>
                      <span className="text-slate-500 text-sm font-semibold mb-1">/user/year</span>
                    </div>
                  )}
                </div>
                
                <div className="text-sm font-medium text-slate-600 flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                  {plan.custom ? 'Unlimited Users' : `Up to ${plan.userLimit} Users`}
                </div>
                <div className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                  {plan.custom ? 'Custom Storage' : `${plan.cloudStorageGB} GB Cloud Storage`}
                </div>
              </div>

              <div className="p-6 flex-1 bg-white">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Modules Included</h4>
                <ul className="space-y-3">
                  {Object.entries(ALL_MODULES).map(([key, label]) => {
                    const hasModule = plan.modules && plan.modules[key];
                    return (
                      <li key={key} className="flex items-center gap-3">
                        {hasModule ? (
                          <div className="text-emerald-500 bg-emerald-50 p-0.5 rounded"><Check size={14} strokeWidth={3} /></div>
                        ) : (
                          <div className="text-slate-300 bg-slate-50 p-0.5 rounded"><X size={14} strokeWidth={3} /></div>
                        )}
                        <span className={`text-sm font-medium ${hasModule ? 'text-slate-700' : 'text-slate-400 line-through'}`}>{label}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 shrink-0">
                <button 
                  onClick={() => openEditor(plan)}
                  className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 hover:text-primary-600 hover:border-primary-200 px-4 py-2.5 rounded-xl font-bold transition-all shadow-sm"
                >
                  <Edit2 size={18} /> Edit Plan Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Plan Editor Modal */}
      {isEditing && currentPlan && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="text-xl font-bold text-slate-900">Edit {currentPlan.name}</h2>
              <button onClick={closeEditor} className="text-slate-400 hover:bg-slate-200 rounded-full p-2 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Plan Name</label>
                  <input 
                    type="text" 
                    value={currentPlan.name} 
                    onChange={e => setCurrentPlan({...currentPlan, name: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 font-medium text-slate-900"
                  />
                </div>
                
                {!currentPlan.custom && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Price (INR/user/year)</label>
                    <input 
                      type="number" 
                      value={currentPlan.pricePerUserPerYear} 
                      onChange={e => setCurrentPlan({...currentPlan, pricePerUserPerYear: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 font-medium text-slate-900"
                    />
                  </div>
                )}
                
                {!currentPlan.custom && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">User Limit</label>
                    <input 
                      type="number" 
                      value={currentPlan.userLimit} 
                      onChange={e => setCurrentPlan({...currentPlan, userLimit: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 font-medium text-slate-900"
                    />
                  </div>
                )}
                
                {!currentPlan.custom && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Cloud Storage (GB)</label>
                    <input 
                      type="number" 
                      value={currentPlan.cloudStorageGB} 
                      onChange={e => setCurrentPlan({...currentPlan, cloudStorageGB: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 font-medium text-slate-900"
                    />
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2">Module Access Checklist</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.entries(ALL_MODULES).map(([key, label]) => {
                    const isChecked = currentPlan.modules[key] || false;
                    return (
                      <label key={key} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isChecked ? 'bg-primary-50 border-primary-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                        <div className={`w-6 h-6 rounded flex items-center justify-center border-2 transition-colors ${isChecked ? 'bg-primary-500 border-primary-500 text-white' : 'border-slate-300 text-transparent'}`}>
                          <Check size={14} strokeWidth={4} />
                        </div>
                        <input 
                          type="checkbox"
                          className="hidden"
                          checked={isChecked}
                          onChange={() => handleModuleToggle(key)}
                        />
                        <span className={`font-semibold text-sm ${isChecked ? 'text-primary-900' : 'text-slate-600'}`}>{label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <button onClick={closeEditor} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
              <button 
                onClick={handleSavePlan}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white font-bold hover:bg-primary-700 disabled:bg-primary-400 rounded-xl shadow-sm transition-colors"
              >
                <Save size={20} /> {loading ? 'Saving...' : 'Save Plan Details'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
