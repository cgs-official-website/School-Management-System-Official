import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { updateSchoolAPIKeys } from '../../firebase/firestore';
import { LuKey as Key, LuMap as Map, LuImage as ImageIcon, LuSave as Save, LuCircleCheck as CheckCircle2 } from 'react-icons/lu';
import toast from 'react-hot-toast';

export default function APIIntegrations() {
  const { userProfile } = useAuth();
  const schoolId = userProfile?.schoolId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [permittedModules, setPermittedModules] = useState([]);
  const [apiKeys, setApiKeys] = useState({
    googleMaps: '',
    cloudinary: ''
  });

  useEffect(() => {
    if (schoolId) {
      fetchData();
    }
  }, [schoolId]);

  const fetchData = async () => {
    try {
      const schoolDoc = await getDoc(doc(db, 'schools', schoolId));
      if (schoolDoc.exists()) {
        const data = schoolDoc.data();
        setPermittedModules(data.permittedModules || []);
        if (data.apiKeys) {
          setApiKeys({
            googleMaps: data.apiKeys.googleMaps || '',
            cloudinary: data.apiKeys.cloudinary || ''
          });
        }
      }
    } catch (error) {
      console.error("Error fetching school API data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      await updateSchoolAPIKeys(schoolId, apiKeys);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      toast.error("Failed to save API keys");
    } finally {
      setSaving(false);
    }
  };

  const hasTransport = permittedModules.includes('transport');
  const hasMedia = permittedModules.includes('media');

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Key className="text-primary-600" />
          API Integrations
        </h1>
        <p className="text-slate-500 mt-1">Configure third-party API keys required for specific modules.</p>
      </div>

      {!hasTransport && !hasMedia && (
        <div className="bg-amber-50 text-amber-700 p-6 rounded-2xl border border-amber-200 mb-8">
          <p className="font-bold mb-1">No API Configuration Required</p>
          <p className="text-sm">Your currently permitted modules do not require any third-party API configurations.</p>
        </div>
      )}

      {(hasTransport || hasMedia) && (
        <form onSubmit={handleSave} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 md:p-8 space-y-8">
            
            {hasTransport && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Map className="text-blue-500" size={24} />
                  <h2 className="text-xl font-bold text-slate-900">Google Maps API (Transport Module)</h2>
                </div>
                <div className="space-y-4 max-w-2xl">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">API Key</label>
                    <input 
                      type="text"
                      value={apiKeys.googleMaps}
                      onChange={(e) => setApiKeys({...apiKeys, googleMaps: e.target.value})}
                      placeholder="AIzaSy..."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white font-mono"
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      Required for live GPS tracking and route optimization. Must have Maps JavaScript API and Directions API enabled.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {hasTransport && hasMedia && <div className="border-t border-slate-100"></div>}

            {hasMedia && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <ImageIcon className="text-purple-500" size={24} />
                  <h2 className="text-xl font-bold text-slate-900">Cloudinary (Media Module)</h2>
                </div>
                <div className="space-y-4 max-w-2xl">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Cloud Name / API Key</label>
                    <input 
                      type="text"
                      value={apiKeys.cloudinary}
                      onChange={(e) => setApiKeys({...apiKeys, cloudinary: e.target.value})}
                      placeholder="e.g. dxq... / 123..."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white font-mono"
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      Required for uploading student profile photos, library book covers, and noticeboard attachments.
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end items-center gap-4">
            {success && (
              <span className="flex items-center gap-2 text-green-600 font-bold text-sm animate-fade-in">
                <CheckCircle2 size={18} /> Settings Saved
              </span>
            )}
            <button 
              type="submit" 
              disabled={saving}
              className="px-8 py-3 bg-primary-600 text-white font-bold hover:bg-primary-700 rounded-xl shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={20} />
              {saving ? 'Saving...' : 'Save Configurations'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
