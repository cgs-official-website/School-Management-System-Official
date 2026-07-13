import React, { useState, useEffect } from 'react';
import { getAllSchools, updateSchoolStatus } from '../../firebase/firestore';
import { LuBuilding2 as Building2, LuSearch as Search, LuCircleCheck as CheckCircle2, LuCircleAlert as AlertCircle, LuBan as Ban, LuMail as Mail, LuPhone as Phone, LuCalendar as Calendar, LuSettings as Settings, LuX as X, LuShieldCheck as ShieldCheck, LuExternalLink as ExternalLink, LuFileText as FileText, LuDownload as Download } from 'react-icons/lu';
import toast from 'react-hot-toast';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import ConfirmModal from '../../components/ConfirmModal';

const mockSchools = [
  { id: 't1', name: 'Springfield Elementary', email: 'contact@springfield.edu', phone: '+1 234 567 8900', status: 'approved', createdAt: '2026-07-01' },
  { id: 't2', name: 'Shelbyville High', email: 'admin@shelbyville.edu', phone: '+1 234 567 8901', status: 'pending', createdAt: '2026-07-05' },
  { id: 't3', name: 'Capital City Academy', email: 'info@capitalcity.edu', phone: '+1 234 567 8902', status: 'approved', createdAt: '2026-07-08' },
  { id: 't4', name: 'Ogdenville School', email: 'hello@ogdenville.edu', phone: '+1 234 567 8903', status: 'rejected', createdAt: '2026-07-10' },
  { id: 't5', name: 'North Haverbrook Prep', email: 'contact@northhaverbrook.edu', phone: '+1 234 567 8904', status: 'approved', createdAt: '2026-07-11' },
  { id: 't6', name: 'Waverly Hills High', email: 'admin@waverly.edu', phone: '+1 234 567 8905', status: 'pending', createdAt: '2026-07-12' },
  { id: 't7', name: 'Cypress Creek High', email: 'info@cypresscreek.edu', phone: '+1 234 567 8906', status: 'approved', createdAt: '2026-07-12' },
  { id: 't8', name: 'West Springfield Elementary', email: 'contact@westspringfield.edu', phone: '+1 234 567 8907', status: 'pending', createdAt: '2026-07-13' },
  { id: 't9', name: 'East Shelbyville Academy', email: 'hello@eastshelbyville.edu', phone: '+1 234 567 8908', status: 'approved', createdAt: '2026-07-13' },
  { id: 't10', name: 'South Park Elementary', email: 'admin@southpark.edu', phone: '+1 234 567 8909', status: 'approved', createdAt: '2026-07-13' }
];

const AVAILABLE_MODULES = [
  { id: 'timetables', label: 'Timetables & Scheduling' },
  { id: 'transport', label: 'Transport Management (GPS/Routes)' },
  { id: 'library', label: 'Library Management' },
  { id: 'exams', label: 'Examinations & Report Cards' },
  { id: 'noticeboard', label: 'Noticeboard & Announcements' },
  { id: 'media', label: 'Media & Cloudinary Integration' }
];

export default function TenantManagement() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [showModal, setShowModal] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [selectedModules, setSelectedModules] = useState([]);
  const [saving, setSaving] = useState(false);
  
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configData, setConfigData] = useState({});
  const [savingConfig, setSavingConfig] = useState(false);
  
  const [previewDoc, setPreviewDoc] = useState(null); // { url, title }
  const [modalAction, setModalAction] = useState('approve'); // 'approve' | 'edit'
  const [confirmModalState, setConfirmModalState] = useState({ isOpen: false, schoolId: null });

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    setLoading(true);
    try {
      const data = await getAllSchools();
      setSchools(data.length > 0 ? data : mockSchools);
      
      // AUTO-HEAL: Fix any disconnected admins (created before the LandingPage fix)
      // Since SuperAdmin has full DB access, this will successfully patch broken user documents
      data.forEach(async (school) => {
        if (school.adminId) {
          try {
            const userRef = doc(db, 'users', school.adminId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const userData = userSnap.data();
              if (!userData.schoolId) {
                await updateDoc(userRef, { schoolId: school.id });
                console.log(`Auto-healed admin connection for school: ${school.name}`);
              }
            }
          } catch (healErr) {
            console.error("Auto-heal failed for user:", school.adminId, healErr);
          }
        }
      });

    } catch (error) {
      console.error("Failed to fetch schools:", error);
      toast.error("Failed to load tenants");
    } finally {
      setLoading(false);
    }
  };

  const openApprovalModal = (school) => {
    setSelectedSchool(school);
    setModalAction('approve');
    // Pre-select based on plan, or default empty. For demo, we leave it empty or select all.
    setSelectedModules(school.permittedModules || []);
    setShowModal(true);
  };

  const openEditModal = (school) => {
    setSelectedSchool(school);
    setModalAction('edit');
    setSelectedModules(school.permittedModules || []);
    setShowModal(true);
  };

  const toggleModule = (moduleId) => {
    setSelectedModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(m => m !== moduleId)
        : [...prev, moduleId]
    );
  };

  const handleSavePermissions = async () => {
    setSaving(true);
    try {
      await updateSchoolStatus(selectedSchool.id, 'approved', selectedModules);
      setSchools(schools.map(s => s.id === selectedSchool.id ? { ...s, status: 'approved', permittedModules: selectedModules } : s));
      setShowModal(false);
    } catch (error) {
      console.error("Failed to save:", error);
      toast.error("Failed to save permissions.");
    } finally {
      setSaving(false);
    }
  };

  const handleSuspendClick = (schoolId) => {
    setConfirmModalState({ isOpen: true, schoolId });
  };

  const executeSuspend = async () => {
    const schoolId = confirmModalState.schoolId;
    if (!schoolId) return;
    try {
      await updateSchoolStatus(schoolId, 'suspended', []); // Doesn't matter, status is suspended
      setSchools(schools.map(s => s.id === schoolId ? { ...s, status: 'suspended' } : s));
    } catch (error) {
      toast.error("Failed to suspend");
    } finally {
      setConfirmModalState({ isOpen: false, schoolId: null });
    }
  };

  const filteredSchools = schools.filter(school => {
    const matchesSearch = school.schoolName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          school.adminEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || school.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto pb-24 h-[calc(100vh-2rem)] flex flex-col">
      <div className="flex justify-between items-end mb-8 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tenant Management</h1>
          <p className="text-slate-500 mt-1">Manage licenses and access for all schools on the platform.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 mb-6 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search by school name or admin email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 transition-shadow"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'pending', 'approved', 'suspended'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-colors ${
                statusFilter === status 
                  ? 'bg-primary-600 text-white shadow-sm' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm">
                <th className="p-4 font-semibold w-1/3">School Details</th>
                <th className="p-4 font-semibold">Contact Info</th>
                <th className="p-4 font-semibold">Plan</th>
                <th className="p-4 font-semibold">Registration Date</th>
                <th className="p-4 font-semibold text-center">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSchools.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-slate-500">
                    <Building2 size={48} className="mx-auto mb-4 text-slate-300" />
                    <p className="text-lg font-medium text-slate-900">No tenants found</p>
                    <p>Try adjusting your search or filters.</p>
                  </td>
                </tr>
              ) : (
                filteredSchools.map((school) => (
                  <tr key={school.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-bold">
                          {school.schoolName?.charAt(0) || 'S'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{school.schoolName}</div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">ID: {school.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <Mail size={14} className="text-slate-400" />
                          {school.adminEmail}
                        </div>
                        {school.phone && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Phone size={14} className="text-slate-400" />
                            {school.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 uppercase tracking-wider border border-slate-200">
                        {school.plan}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar size={14} className="text-slate-400" />
                        {new Date(school.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                        ${school.status === 'approved' ? 'bg-green-100 text-green-700 border border-green-200' : 
                          school.status === 'pending' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 
                          'bg-red-100 text-red-700 border border-red-200'}`}
                      >
                        {school.status === 'approved' && <CheckCircle2 size={12} />}
                        {school.status === 'pending' && <AlertCircle size={12} />}
                        {school.status === 'suspended' && <Ban size={12} />}
                        {school.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        {school.status === 'pending' && (
                          <button
                            onClick={() => openApprovalModal(school)}
                            className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors tooltip-trigger"
                            title="Review Application"
                          >
                            <FileText size={18} />
                          </button>
                        )}
                        {school.status === 'approved' && (
                          <>
                            <button
                              onClick={() => openEditModal(school)}
                              className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors"
                              title="Edit Permissions"
                            >
                              <Settings size={18} />
                            </button>
                            <button
                              onClick={() => handleSuspendClick(school.id)}
                              className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-colors"
                              title="Suspend Tenant"
                            >
                              <Ban size={18} />
                            </button>
                          </>
                        )}
                        {school.status === 'suspended' && (
                          <button
                            onClick={() => openApprovalModal(school)}
                            className="p-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-xl transition-colors"
                            title="Restore Tenant"
                          >
                            <CheckCircle2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permissions Modal */}
      {showModal && selectedSchool && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="text-primary-600" />
                {modalAction === 'approve' ? 'Approve Tenant & Assign Modules' : 'Edit Tenant Modules'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h3 className="font-bold text-slate-900">{selectedSchool.schoolName}</h3>
                <p className="text-sm text-slate-500 mt-1">Purchased Plan: <span className="font-bold uppercase tracking-wider text-slate-700">{selectedSchool.plan}</span></p>
              </div>

              {/* Legal Verification Section */}
              {modalAction === 'approve' && selectedSchool.verificationDetails && (
                <div className="mb-6 border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <FileText size={16} className="text-primary-600" />
                      Legal Verification Documents
                    </h4>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">UDISE Code</p>
                        <p className="font-medium text-slate-900">{selectedSchool.verificationDetails.udise || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Board Affiliation</p>
                        <p className="font-medium text-slate-900">{selectedSchool.verificationDetails.boardAffiliation || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                      {selectedSchool.verificationDetails.regCertUrl && (
                        <button onClick={() => setPreviewDoc({ url: selectedSchool.verificationDetails.regCertUrl, title: 'Registration Certificate' })} className="w-full flex items-center justify-between p-3 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
                          <span className="font-semibold text-sm">View Registration Certificate</span>
                          <ExternalLink size={16} />
                        </button>
                      )}
                      {selectedSchool.verificationDetails.panUrl && (
                        <button onClick={() => setPreviewDoc({ url: selectedSchool.verificationDetails.panUrl, title: 'PAN / TAN Card' })} className="w-full flex items-center justify-between p-3 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors">
                          <span className="font-semibold text-sm">View PAN / TAN Card</span>
                          <ExternalLink size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <h4 className="font-semibold text-slate-900 mb-3 text-sm uppercase tracking-wider">Select Permitted Modules</h4>
              <p className="text-sm text-slate-500 mb-4">Core modules (Dashboard, Students, Staff, Billing) are always included.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {AVAILABLE_MODULES.map(module => (
                  <label key={module.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox"
                      checked={selectedModules.includes(module.id)}
                      onChange={() => toggleModule(module.id)}
                      className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="font-medium text-slate-700">{module.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors">
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleSavePermissions}
                disabled={saving} 
                className="px-6 py-2.5 bg-primary-600 text-white font-bold hover:bg-primary-700 rounded-xl shadow-sm transition-colors"
              >
                {saving ? 'Saving...' : modalAction === 'approve' ? 'Approve & Save' : 'Save Permissions'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Document Preview Modal --- */}
      {previewDoc && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 lg:p-8">
          <div className="bg-white w-full max-w-5xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="font-bold text-xl text-slate-900">{previewDoc.title}</h3>
              <div className="flex items-center gap-3">
                <a 
                  href={previewDoc.url} 
                  download 
                  target="_blank" 
                  rel="noreferrer" 
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-semibold shadow-sm"
                >
                  <Download size={18} /> Download Original
                </a>
                <button 
                  onClick={() => setPreviewDoc(null)} 
                  className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-200/50 p-2 lg:p-6 overflow-hidden flex justify-center items-center">
              {/* iframe is excellent for rendering both PDFs and Images securely in a sandboxed way */}
              <iframe 
                src={previewDoc.url} 
                className="w-full h-full rounded-2xl bg-white shadow-inner border border-slate-200" 
                title={previewDoc.title} 
              />
            </div>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState({ isOpen: false, schoolId: null })}
        onConfirm={executeSuspend}
        title="Suspend Tenant"
        message="Are you sure you want to suspend this tenant? They will lose access to the platform."
        confirmText="Suspend"
        type="danger"
      />
    </div>
  );
}
