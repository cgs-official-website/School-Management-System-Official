import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { LuUser, LuMapPin, LuBriefcase, LuCreditCard, LuSave } from 'react-icons/lu';

export default function ProfileSetup() {
  const { currentUser, userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teacherDocId, setTeacherDocId] = useState(null);
  
  const [formData, setFormData] = useState({
    dob: '',
    bloodGroup: '',
    phone: '',
    address: '',
    qualifications: '',
    experience: '',
    bankName: '',
    accountNumber: '',
    ifscCode: ''
  });

  useEffect(() => {
    const fetchTeacherProfile = async () => {
      if (!currentUser || !userProfile?.schoolId) return;
      try {
        const q = query(
          collection(db, `schools/${userProfile.schoolId}/teachers`),
          where("userId", "==", currentUser.uid)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const docData = snapshot.docs[0];
          setTeacherDocId(docData.id);
          const data = docData.data();
          setFormData(prev => ({
            ...prev,
            dob: data.dob || '',
            bloodGroup: data.bloodGroup || '',
            phone: data.phone || '',
            address: data.address || '',
            qualifications: data.qualifications || '',
            experience: data.experience || '',
            bankName: data.bankName || '',
            accountNumber: data.accountNumber || '',
            ifscCode: data.ifscCode || ''
          }));
        }
      } catch (error) {
        console.error("Error fetching teacher profile", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTeacherProfile();
  }, [currentUser, userProfile]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!teacherDocId) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, `schools/${userProfile.schoolId}/teachers`, teacherDocId), {
        ...formData,
        updatedAt: new Date().toISOString()
      });
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile", error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Profile Setup</h1>
        <p className="text-slate-500 mt-1">Complete your profile to unlock all features.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Personal Details */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 transition-all hover:shadow-md">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
            <LuUser className="text-primary-500" /> Personal Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Date of Birth</label>
              <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Blood Group</label>
              <input type="text" name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} placeholder="e.g. O+" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Phone Number</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+91 XXXXX XXXXX" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all" />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 transition-all hover:shadow-md">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
            <LuMapPin className="text-indigo-500" /> Address Details
          </h2>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Full Address</label>
            <textarea name="address" value={formData.address} onChange={handleChange} rows="3" placeholder="Enter your full residential address" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all"></textarea>
          </div>
        </div>

        {/* Professional Details */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 transition-all hover:shadow-md">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
            <LuBriefcase className="text-amber-500" /> Professional Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Qualifications</label>
              <input type="text" name="qualifications" value={formData.qualifications} onChange={handleChange} placeholder="e.g. M.Sc, B.Ed" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Years of Experience</label>
              <input type="number" name="experience" value={formData.experience} onChange={handleChange} placeholder="e.g. 5" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 outline-none transition-all" />
            </div>
          </div>
        </div>

        {/* Bank Details */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 transition-all hover:shadow-md">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
            <LuCreditCard className="text-emerald-500" /> Bank Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Bank Name</label>
              <input type="text" name="bankName" value={formData.bankName} onChange={handleChange} placeholder="e.g. HDFC Bank" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Account Number</label>
              <input type="text" name="accountNumber" value={formData.accountNumber} onChange={handleChange} placeholder="1234567890" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">IFSC Code</label>
              <input type="text" name="ifscCode" value={formData.ifscCode} onChange={handleChange} placeholder="HDFC0001234" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none uppercase transition-all" />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-[0_4px_14px_0_rgb(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0">
            {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div> : <LuSave size={18} />}
            {saving ? 'Saving...' : 'Save Profile Details'}
          </button>
        </div>
      </form>
    </div>
  );
}
