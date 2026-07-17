import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSchool, updateSchool } from '../../firebase/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { LuSave as Save, LuBuilding2 as Building2, LuMapPin as MapPin, LuPhone as Phone, LuGlobe as Globe, LuImage as ImageIcon, LuPalette as Palette, LuCalendar as Calendar, LuCircleCheck as CheckCircle2, LuSettings as Settings } from 'react-icons/lu';
import toast from 'react-hot-toast';

export default function EnvironmentSetup() {
  const { userProfile, updateProfileData } = useAuth(); // Assume we can refresh auth context
  const schoolId = userProfile?.schoolId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    contactPhone: '',
    location: '',
    website: '',
    branding: {
      logoUrl: '',
      primaryColor: '#f59e0b' // Default amber-500
    },
    academicConfig: {
      currentYear: '2026-2027',
      termType: 'Semester'
    }
  });
  const [customData, setCustomData] = useState({});
  const [formSchema, setFormSchema] = useState([]);

  useEffect(() => {
    if (schoolId) fetchSchoolData();
  }, [schoolId]);

  const fetchSchoolData = async () => {
    try {
      const data = await getSchool(schoolId);
      if (data) {
        setFormData({
          name: data.name || '',
          contactPhone: data.contactPhone || '',
          location: data.location || '',
          website: data.website || '',
          branding: data.branding || { logoUrl: '', primaryColor: '#f59e0b' },
          academicConfig: data.academicConfig || { currentYear: '2026-2027', termType: 'Semester' }
        });
        if (data.customData) {
          setCustomData(data.customData);
        }
      }

      // Fetch Schema
      const schemaSnap = await getDoc(doc(db, `schools/${schoolId}/formSchemas/environment_setup`));
      if (schemaSnap.exists()) {
        setFormSchema(schemaSnap.data().fields || []);
      }
    } catch (error) {
      console.error("Error fetching school:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg('');
    try {
      await updateSchool(schoolId, {
        ...formData,
        customData
      });
      setSuccessMsg('Environment settings saved successfully!');
      
      // Update local profile context if branding changed
      if (formData.branding.logoUrl !== userProfile?.school?.branding?.logoUrl || 
          formData.branding.primaryColor !== userProfile?.school?.branding?.primaryColor ||
          formData.name !== userProfile?.schoolName) {
        updateProfileData({
          schoolName: formData.name,
          school: {
            ...userProfile.school,
            branding: formData.branding
          }
        });
      }

      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      console.error("Error saving setup:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Logo file size must be less than 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({
          ...formData,
          branding: { ...formData.branding, logoUrl: reader.result }
        });
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto pb-24">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Environment Setup</h1>
          <p className="text-slate-500 mt-1">Configure your school's branding, contact info, and academic settings.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 shadow-sm flex items-center gap-2 disabled:opacity-50 transition-colors"
        >
          {saving ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div> : <Save size={18} />}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {successMsg && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl flex items-center gap-3 animate-fade-in-down">
          <CheckCircle2 size={20} className="text-green-600" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      <div className="space-y-8">
        {/* General Information */}
        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
            <Building2 className="text-primary-600" size={24} />
            <h2 className="text-xl font-bold text-slate-900">General Information</h2>
          </div>
          <div className="p-8 grid md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1">School Name</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2"><MapPin size={16} className="text-slate-400"/> Location / Address</label>
              <input 
                type="text" 
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2"><Phone size={16} className="text-slate-400"/> Contact Phone</label>
              <input 
                type="tel" 
                value={formData.contactPhone}
                onChange={(e) => setFormData({...formData, contactPhone: e.target.value})}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2"><Globe size={16} className="text-slate-400"/> Official Website</label>
              <input 
                type="url" 
                value={formData.website}
                onChange={(e) => setFormData({...formData, website: e.target.value})}
                placeholder="https://www.yourschool.edu"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
        </section>

        {/* Branding */}
        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
            <Palette className="text-primary-600" size={24} />
            <h2 className="text-xl font-bold text-slate-900">Branding & Theming</h2>
          </div>
          <div className="p-8 grid md:grid-cols-2 gap-8 items-start">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2"><ImageIcon size={16} className="text-slate-400"/> Upload Logo</label>
              <p className="text-xs text-slate-500 mb-3">Upload your school's logo image (PNG/JPG/SVG, max 2MB).</p>
              <input 
                type="file" 
                accept="image/*"
                onChange={handleLogoUpload}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 transition-all cursor-pointer"
              />
              
              <div className="mt-6">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Primary Brand Color</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="color" 
                    value={formData.branding.primaryColor}
                    onChange={(e) => setFormData({...formData, branding: { ...formData.branding, primaryColor: e.target.value }})}
                    className="h-12 w-12 rounded cursor-pointer border-0 p-0"
                  />
                  <input 
                    type="text" 
                    value={formData.branding.primaryColor}
                    onChange={(e) => setFormData({...formData, branding: { ...formData.branding, primaryColor: e.target.value }})}
                    className="w-32 px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono uppercase"
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 flex flex-col items-center justify-center min-h-[200px] text-center">
              <p className="text-sm font-semibold text-slate-500 mb-4 uppercase tracking-wider">Preview</p>
              {formData.branding.logoUrl ? (
                <img src={formData.branding.logoUrl} alt="School Logo" className="h-16 object-contain mb-4" onError={(e) => { e.target.src = ''; e.target.className='hidden'; }} />
              ) : (
                <div className="h-16 w-16 bg-slate-200 rounded-full flex items-center justify-center mb-4">
                  <ImageIcon className="text-slate-400" size={32} />
                </div>
              )}
              <div 
                className="px-6 py-2 rounded-lg text-white font-medium shadow-sm transition-colors"
                style={{ backgroundColor: formData.branding.primaryColor }}
              >
                Sample Button
              </div>
            </div>
          </div>
        </section>

        {/* Academic Settings */}
        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
            <Calendar className="text-primary-600" size={24} />
            <h2 className="text-xl font-bold text-slate-900">Academic Configuration</h2>
          </div>
          <div className="p-8 grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Current Academic Year</label>
              <select 
                value={formData.academicConfig.currentYear}
                onChange={(e) => setFormData({...formData, academicConfig: { ...formData.academicConfig, currentYear: e.target.value }})}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              >
                <option value="2025-2026">2025 - 2026</option>
                <option value="2026-2027">2026 - 2027</option>
                <option value="2027-2028">2027 - 2028</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Term Type</label>
              <select 
                value={formData.academicConfig.termType}
                onChange={(e) => setFormData({...formData, academicConfig: { ...formData.academicConfig, termType: e.target.value }})}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              >
                <option value="Trimester_TN">Term I, Term II, Term III</option>
                <option value="Quarterly_HalfYearly_Annual">Quarterly, Half Yearly, Annual</option>
                <option value="Semester">Semesters (2 terms)</option>
                <option value="Annual">Annual (1 term)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Custom Form Builder Settings */}
        {formSchema.length > 0 && (
          <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
              <Settings className="text-primary-600" size={24} />
              <h2 className="text-xl font-bold text-slate-900">Additional Settings</h2>
            </div>
            <div className="p-8 grid md:grid-cols-2 gap-6">
              {formSchema.map(field => (
                <div key={field.id} className={field.type === 'checkbox' ? 'col-span-2' : ''}>
                  {field.type !== 'checkbox' && (
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                  )}
                  
                  {field.type === 'select' ? (
                    <select
                      required={field.required}
                      value={customData[field.id] || ''}
                      onChange={e => setCustomData({...customData, [field.id]: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white transition-all"
                    >
                      <option value="">Select...</option>
                      {field.options && field.options.split(',').map(opt => (
                        <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
                      ))}
                    </select>
                  ) : field.type === 'checkbox' ? (
                    <label className="flex items-center gap-3 mt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        required={field.required}
                        checked={customData[field.id] || false}
                        onChange={e => setCustomData({...customData, [field.id]: e.target.checked})}
                        className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm font-semibold text-slate-700">{field.label} {field.required && <span className="text-red-500">*</span>}</span>
                    </label>
                  ) : (
                    <input
                      type={field.type}
                      required={field.required}
                      value={customData[field.id] || ''}
                      onChange={e => setCustomData({...customData, [field.id]: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 transition-all"
                    />
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
