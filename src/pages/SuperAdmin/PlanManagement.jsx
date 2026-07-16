import React, { useState, useEffect } from 'react';
import { subscribeToPlans, createPlan, updatePlan, deletePlan } from '../../firebase/firestore';
import { LuPlus as Plus, LuPen as Edit2, LuTrash2 as Trash2, LuCircleCheck as CheckCircle2, LuSave as Save, LuX as X } from 'react-icons/lu';
import ConfirmModal from '../../components/ConfirmModal';

export default function PlanManagement() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal / Form state
  const [isEditing, setIsEditing] = useState(false);
  const [confirmModalState, setConfirmModalState] = useState({ isOpen: false, idToDelete: null });
  const [currentPlan, setCurrentPlan] = useState({
    name: '',
    priceMonthly: 0,
    priceYearly: 0,
    limits: {
      maxStudents: 100,
      maxStaff: 10,
      storageGB: 5
    },
    features: ['Basic Support', 'Standard Reports']
  });
  const [featureInput, setFeatureInput] = useState('');

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToPlans((data) => {
      setPlans(data);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleCreateDefaults = async () => {
    const defaults = [
      {
        name: 'Starter',
        priceMonthly: 49,
        priceYearly: 490,
        limits: { maxStudents: 100, maxStaff: 10, storageGB: 5 },
        features: ['Up to 100 Students', 'Basic Reporting', 'Email Support']
      },
      {
        name: 'Professional',
        priceMonthly: 99,
        priceYearly: 990,
        limits: { maxStudents: 500, maxStaff: 50, storageGB: 25 },
        features: ['Up to 500 Students', 'Advanced Analytics', 'Priority Support', 'Parent Portal']
      },
      {
        name: 'Enterprise',
        priceMonthly: 299,
        priceYearly: 2990,
        limits: { maxStudents: 10000, maxStaff: 500, storageGB: 100 },
        features: ['Unlimited Students', 'Custom Branding', 'Dedicated Account Manager', 'API Access']
      }
    ];

    setLoading(true);
    try {
      for (const p of defaults) {
        await createPlan(p);
      }
      // fetchPlans() handled by real-time listener
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const openEditor = (plan = null) => {
    if (plan) {
      setCurrentPlan(plan);
    } else {
      setCurrentPlan({
        name: '',
        priceMonthly: 0,
        priceYearly: 0,
        limits: { maxStudents: 100, maxStaff: 10, storageGB: 5 },
        features: []
      });
    }
    setIsEditing(true);
  };

  const closeEditor = () => {
    setIsEditing(false);
    setFeatureInput('');
  };

  const handleSavePlan = async () => {
    setLoading(true);
    try {
      if (currentPlan.id) {
        await updatePlan(currentPlan.id, currentPlan);
      } else {
        await createPlan(currentPlan);
      }
      closeEditor();
    } catch (error) {
      console.error("Error saving plan:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id) => {
    setConfirmModalState({ isOpen: true, idToDelete: id });
  };

  const executeDelete = async () => {
    const id = confirmModalState.idToDelete;
    if (!id) return;
    
    setLoading(true);
    try {
      await deletePlan(id);
      // await fetchPlans(); handled by listener
    } catch (error) {
      console.error("Error deleting plan:", error);
    } finally {
      setLoading(false);
      setConfirmModalState({ isOpen: false, idToDelete: null });
    }
  };

  const addFeature = () => {
    if (featureInput.trim()) {
      setCurrentPlan({
        ...currentPlan,
        features: [...currentPlan.features, featureInput.trim()]
      });
      setFeatureInput('');
    }
  };

  const removeFeature = (idx) => {
    const newFeatures = currentPlan.features.filter((_, i) => i !== idx);
    setCurrentPlan({ ...currentPlan, features: newFeatures });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Subscription Plans</h1>
          <p className="text-slate-500 mt-1">Manage pricing tiers, limits, and features available to tenants.</p>
        </div>
        <div className="flex gap-3">
          {plans.length === 0 && (
            <button 
              onClick={handleCreateDefaults}
              className="px-4 py-2 bg-amber-100 text-amber-700 rounded-xl font-medium hover:bg-amber-200 transition-colors"
            >
              Seed Default Plans
            </button>
          )}
          <button 
            onClick={() => openEditor()}
            className="px-4 py-2 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 shadow-sm flex items-center gap-2"
          >
            <Plus size={18} />
            Create New Plan
          </button>
        </div>
      </div>

      {loading && !isEditing ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No plans defined</h3>
          <p className="text-slate-500 mt-1 mb-6">Create your first pricing tier to allow tenants to upgrade.</p>
          <button 
            onClick={handleCreateDefaults}
            className="px-6 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
          >
            Create Starter Plans Automatically
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 relative flex flex-col">
              <div className="absolute top-6 right-6 flex gap-2">
                <button 
                  onClick={() => openEditor(plan)}
                  className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => handleDeleteClick(plan.id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-extrabold text-slate-900">₹{plan.priceMonthly}</span>
                <span className="text-slate-500 font-medium">/mo</span>
              </div>

              <div className="space-y-4 mb-8 flex-1">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Usage Limits</p>
                  <ul className="space-y-2">
                    <li className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Students</span>
                      <span className="font-semibold text-slate-900">{plan.limits.maxStudents === 10000 ? 'Unlimited' : plan.limits.maxStudents}</span>
                    </li>
                    <li className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Staff Accounts</span>
                      <span className="font-semibold text-slate-900">{plan.limits.maxStaff === 500 ? 'Unlimited' : plan.limits.maxStaff}</span>
                    </li>
                    <li className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Storage</span>
                      <span className="font-semibold text-slate-900">{plan.limits.storageGB} GB</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Features</p>
                  <ul className="space-y-2">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                        <CheckCircle2 size={16} className="text-primary-500 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 sm:p-6 overflow-y-auto pt-10 md:pt-20">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="text-xl font-bold text-slate-900">{currentPlan.id ? 'Edit Plan' : 'Create New Plan'}</h2>
              <button onClick={closeEditor} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Plan Name</label>
                  <input 
                    type="text" 
                    value={currentPlan.name}
                    onChange={(e) => setCurrentPlan({...currentPlan, name: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g. Basic Plan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Price (₹)</label>
                  <input 
                    type="number" 
                    value={currentPlan.priceMonthly}
                    onChange={(e) => setCurrentPlan({...currentPlan, priceMonthly: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Yearly Price (₹)</label>
                  <input 
                    type="number" 
                    value={currentPlan.priceYearly}
                    onChange={(e) => setCurrentPlan({...currentPlan, priceYearly: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">Plan Limits</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Max Students</label>
                    <input 
                      type="number" 
                      value={currentPlan.limits.maxStudents}
                      onChange={(e) => setCurrentPlan({
                        ...currentPlan, 
                        limits: { ...currentPlan.limits, maxStudents: Number(e.target.value) }
                      })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Max Staff</label>
                    <input 
                      type="number" 
                      value={currentPlan.limits.maxStaff}
                      onChange={(e) => setCurrentPlan({
                        ...currentPlan, 
                        limits: { ...currentPlan.limits, maxStaff: Number(e.target.value) }
                      })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Storage (GB)</label>
                    <input 
                      type="number" 
                      value={currentPlan.limits.storageGB}
                      onChange={(e) => setCurrentPlan({
                        ...currentPlan, 
                        limits: { ...currentPlan.limits, storageGB: Number(e.target.value) }
                      })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">Features Included</h3>
                <div className="space-y-2 mb-3">
                  {currentPlan.features.map((f, idx) => (
                    <div key={idx} className="flex items-center justify-between px-4 py-2 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-sm text-slate-700">{f}</span>
                      <button onClick={() => removeFeature(idx)} className="text-red-500 hover:text-red-700 p-1">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addFeature()}
                    placeholder="Add a feature (e.g. Priority Support)"
                    className="flex-1 px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                  <button onClick={addFeature} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-sm transition-colors">
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
              <button onClick={closeEditor} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors">
                Cancel
              </button>
              <button 
                onClick={handleSavePlan}
                className="px-6 py-2.5 bg-primary-600 text-white font-medium hover:bg-primary-700 rounded-xl shadow-sm flex items-center gap-2 transition-colors"
              >
                <Save size={18} />
                Save Plan
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState({ isOpen: false, idToDelete: null })}
        onConfirm={executeDelete}
        title="Delete Plan"
        message="Are you sure you want to delete this subscription plan? Existing tenants on this plan may be affected. This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
}
