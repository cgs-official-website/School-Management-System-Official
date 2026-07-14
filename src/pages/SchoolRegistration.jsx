import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { LuCheck as Check, LuShieldCheck as ShieldCheck, LuArrowRight as ArrowRight, LuArrowLeft as ArrowLeft, LuBuilding2, LuUser, LuCreditCard, LuFileText } from 'react-icons/lu';
import { FiLoader as Loader } from 'react-icons/fi';
import { createSchool, getPlans, generateSchoolId } from '../firebase/firestore';
import { registerUser } from '../firebase/auth';
import { doc, collection } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function SchoolRegistration() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reducedMotion = useReducedMotion();
  const selectedPlanId = searchParams.get('plan') || 'free';

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Plans data
  const [plans, setPlans] = useState([]);
  const [selectedPlanDetails, setSelectedPlanDetails] = useState(null);

  // Form Data
  const [formData, setFormData] = useState({
    schoolName: '',
    schoolType: 'School',
    location: '',
    studentCount: '',
    adminName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    termsAccepted: false,
    udise: '',
    boardAffiliation: ''
  });

  const [files, setFiles] = useState({
    regCertFile: null,
    panFile: null
  });

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const fetchedPlans = await getPlans();
        setPlans(fetchedPlans);
        const plan = fetchedPlans.find(p => p.id === selectedPlanId) || fetchedPlans[0];
        setSelectedPlanDetails(plan);
      } catch (err) {
        console.error("Error fetching plans", err);
      }
    };
    fetchPlans();
  }, [selectedPlanId]);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
    if (error) setError(null);
  };

  const handleFileChange = (e, name) => {
    if (e.target.files[0]) {
      setFiles({ ...files, [name]: e.target.files[0] });
    }
  };

  const validateStep1 = () => {
    if (!formData.schoolName || !formData.location || !formData.studentCount) {
      setError("Please fill in all required fields.");
      return false;
    }
    if (!files.regCertFile || !files.panFile) {
      setError("Please upload both Registration Certificate and PAN Card.");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.adminName || !formData.email || !formData.phone || !formData.password) {
      setError("Please fill in all required fields.");
      return false;
    }

    // Indian Phone Number Validation (10 digits starting with 6-9, optional +91)
    const phoneRegex = /^(?:\+91|91)?[6789]\d{9}$/;
    if (!phoneRegex.test(formData.phone.replace(/\s+/g, ''))) {
      setError("Please enter a valid Indian phone number.");
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return false;
    }
    
    // Strong Password Validation: Min 8 chars, mixed case, numbers, special char
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      setError("Password must be at least 8 characters and include uppercase, lowercase, number, and special character.");
      return false;
    }
    
    return true;
  };

  const validateStep3 = () => {
    if (!formData.termsAccepted) {
      setError("You must accept the terms and conditions.");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setError(null);
    setStep(prev => Math.min(prev + 1, 3));
  };

  const handleBack = () => {
    setError(null);
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep3()) return;

    setLoading(true);
    setError(null);

    try {
      // Mock File Uploads for now to avoid CORS storage issues
      let regCertUrl = 'https://via.placeholder.com/150?text=RegCert';
      let panUrl = 'https://via.placeholder.com/150?text=PAN';

      const newSchoolId = await generateSchoolId();

      // 1. Create Auth User
      const user = await registerUser(formData.email, formData.password, 'admin', { 
        name: formData.adminName,
        schoolId: newSchoolId 
      });
      
      // 2. Create School Document with status 'pending'
      await createSchool({
        name: formData.schoolName,
        schoolName: formData.schoolName,
        schoolType: formData.schoolType,
        studentCount: formData.studentCount,
        adminId: user.uid,
        ownerId: user.uid, 
        adminEmail: formData.email,
        contactEmail: formData.email,
        contactPhone: formData.phone,
        phone: formData.phone,
        location: formData.location,
        plan: selectedPlanDetails?.id || 'free',
        verificationDetails: {
          udise: formData.udise,
          boardAffiliation: formData.boardAffiliation,
          regCertUrl,
          panUrl
        }
      }, newSchoolId);

      // 3. Redirect to pending/success
      navigate('/admin/pending');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError("This email is already in use.");
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Password Strength Simple Indicator
  const getPasswordStrength = (pass) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length > 6) score += 33;
    if (/[A-Z]/.test(pass)) score += 33;
    if (/[0-9!@#$]/.test(pass)) score += 34;
    return score;
  };

  const strength = getPasswordStrength(formData.password);

  const steps = [
    { num: 1, title: 'School Info', icon: LuBuilding2 },
    { num: 2, title: 'Admin Account', icon: LuUser },
    { num: 3, title: 'Confirmation', icon: LuCreditCard }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-primary-500 selection:text-white flex flex-col items-center justify-center relative overflow-x-hidden px-4 py-12">
      
      {/* Decorative background blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 lg:w-[500px] lg:h-[500px] bg-primary-200 rounded-full blur-[150px] opacity-40 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 lg:w-[500px] lg:h-[500px] bg-primary-300 rounded-full blur-[150px] opacity-30 pointer-events-none"></div>

      <div className="w-full max-w-2xl relative z-10">
        
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg p-1">
            <img src="/logo.png" alt="Zuna Logo" className="w-auto h-12 object-contain group-hover:scale-105 transition-transform drop-shadow-sm filter invert" />
          </Link>
        </div>

        {/* Stepper */}
        <div className="mb-10 px-4">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 rounded-full -z-10"></div>
            <motion.div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-primary-600 to-primary-500 rounded-full -z-10"
              initial={{ width: '0%' }}
              animate={{ width: `${((step - 1) / 2) * 100}%` }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            />
            {steps.map((s) => (
              <div key={s.num} className="flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors duration-300 ${
                  step >= s.num ? 'bg-primary-500 text-white shadow-[0_4px_14px_rgba(229,189,223,0.4)]' : 'bg-white text-slate-400 border border-slate-200'
                }`}>
                  {step > s.num ? <Check size={20} /> : <s.icon size={20} />}
                </div>
                <span className={`text-xs font-bold uppercase tracking-wider ${step >= s.num ? 'text-primary-600' : 'text-slate-500'}`}>
                  {s.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Card */}
        <motion.div 
          initial={{ opacity: 0, y: reducedMotion ? 0 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="bg-white/90 backdrop-blur-xl border border-slate-200 shadow-[0_8px_32px_rgba(0,0,0,0.05)] rounded-[40px] p-8 sm:p-12 overflow-hidden relative"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={{ opacity: 0, x: reducedMotion ? 0 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: reducedMotion ? 0 : -20 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-3xl font-black mb-2 text-slate-900">{steps[step-1].title}</h2>
              <p className="text-slate-500 mb-8">
                {step === 1 && "Tell us about your institution to get started."}
                {step === 2 && "Create the primary owner account for this workspace."}
                {step === 3 && "Review your selected plan and accept our terms."}
              </p>

              <div className="space-y-6">
                {/* --- STEP 1: School Info --- */}
                {step === 1 && (
                  <>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="relative group">
                        <input type="text" id="schoolName" name="schoolName" value={formData.schoolName} onChange={handleChange} className="w-full px-5 py-4 rounded-xl bg-white border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none peer text-slate-900 placeholder-transparent" placeholder="School Name" />
                        <label htmlFor="schoolName" className="absolute left-5 -top-2.5 bg-white px-1 text-sm font-bold text-slate-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-primary-600">Institution Name *</label>
                      </div>
                      
                      <div className="relative group">
                        <select id="schoolType" name="schoolType" value={formData.schoolType} onChange={handleChange} className="w-full px-5 py-4 rounded-xl bg-white border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none text-slate-900 appearance-none">
                          <option value="School">K-12 School</option>
                          <option value="College">College / University</option>
                          <option value="Coaching">Coaching Institute</option>
                          <option value="Other">Other</option>
                        </select>
                        <label htmlFor="schoolType" className="absolute left-5 -top-2.5 bg-white px-1 text-sm font-bold text-primary-600">Institution Type *</label>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="relative group">
                        <input type="text" id="location" name="location" value={formData.location} onChange={handleChange} className="w-full px-5 py-4 rounded-xl bg-white border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none peer text-slate-900 placeholder-transparent" placeholder="City, State" />
                        <label htmlFor="location" className="absolute left-5 -top-2.5 bg-white px-1 text-sm font-bold text-slate-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-primary-600">City / State *</label>
                      </div>

                      <div className="relative group">
                        <select id="studentCount" name="studentCount" value={formData.studentCount} onChange={handleChange} className="w-full px-5 py-4 rounded-xl bg-white border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none text-slate-900 appearance-none">
                          <option value="" disabled>Select range</option>
                          <option value="0-500">0 - 500</option>
                          <option value="501-1000">501 - 1000</option>
                          <option value="1001-5000">1001 - 5000</option>
                          <option value="5000+">5000+</option>
                        </select>
                        <label htmlFor="studentCount" className="absolute left-5 -top-2.5 bg-white px-1 text-sm font-bold text-primary-600">Expected Students *</label>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-200">
                      <h4 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-wider">Required Documents</h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 relative">
                          <label className="text-sm font-bold text-slate-500 mb-2 block">Registration Cert *</label>
                          <input type="file" accept=".pdf,.jpg,.png" onChange={(e) => handleFileChange(e, 'regCertFile')} className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-primary-50 file:text-primary-600 hover:file:bg-primary-100 transition-colors w-full" />
                        </div>
                        <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 relative">
                          <label className="text-sm font-bold text-slate-500 mb-2 block">Institution PAN Card *</label>
                          <input type="file" accept=".pdf,.jpg,.png" onChange={(e) => handleFileChange(e, 'panFile')} className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-primary-50 file:text-primary-600 hover:file:bg-primary-100 transition-colors w-full" />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* --- STEP 2: Admin Info --- */}
                {step === 2 && (
                  <>
                    <div className="relative group">
                      <input type="text" id="adminName" name="adminName" value={formData.adminName} onChange={handleChange} className="w-full px-5 py-4 rounded-xl bg-white border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none peer text-slate-900 placeholder-transparent" placeholder="Admin Name" />
                      <label htmlFor="adminName" className="absolute left-5 -top-2.5 bg-white px-1 text-sm font-bold text-slate-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-primary-600">Full Name *</label>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="relative group">
                        <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-5 py-4 rounded-xl bg-white border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none peer text-slate-900 placeholder-transparent" placeholder="Email Address" />
                        <label htmlFor="email" className="absolute left-5 -top-2.5 bg-white px-1 text-sm font-bold text-slate-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-primary-600">Work Email *</label>
                      </div>
                      <div className="relative group">
                        <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-5 py-4 rounded-xl bg-white border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none peer text-slate-900 placeholder-transparent" placeholder="Phone Number" />
                        <label htmlFor="phone" className="absolute left-5 -top-2.5 bg-white px-1 text-sm font-bold text-slate-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-primary-600">Phone Number *</label>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <div className="relative group">
                          <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} className="w-full px-5 py-4 rounded-xl bg-white border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none peer text-slate-900 placeholder-transparent" placeholder="Password" />
                          <label htmlFor="password" className="absolute left-5 -top-2.5 bg-white px-1 text-sm font-bold text-slate-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-primary-600">Password *</label>
                        </div>
                        {formData.password && (
                          <div className="flex gap-1 h-1.5 px-1">
                            <div className={`h-full flex-1 rounded-full ${strength > 0 ? 'bg-red-400' : 'bg-slate-200'}`}></div>
                            <div className={`h-full flex-1 rounded-full ${strength > 33 ? 'bg-amber-400' : 'bg-slate-200'}`}></div>
                            <div className={`h-full flex-1 rounded-full ${strength > 66 ? 'bg-green-400' : 'bg-slate-200'}`}></div>
                          </div>
                        )}
                      </div>

                      <div className="relative group">
                        <input type="password" id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="w-full px-5 py-4 rounded-xl bg-white border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none peer text-slate-900 placeholder-transparent" placeholder="Confirm Password" />
                        <label htmlFor="confirmPassword" className="absolute left-5 -top-2.5 bg-white px-1 text-sm font-bold text-slate-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-primary-600">Confirm Password *</label>
                      </div>
                    </div>
                  </>
                )}

                {/* --- STEP 3: Plan & Confirmation --- */}
                {step === 3 && (
                  <div className="space-y-8">
                    <div className="bg-gradient-to-tr from-primary-50 to-white border border-primary-200 rounded-2xl p-6 relative overflow-hidden">
                      <div className="absolute -right-4 -top-4 text-primary-200/50">
                        <LuCreditCard size={120} />
                      </div>
                      <div className="relative z-10">
                        <h4 className="text-primary-600 font-bold uppercase tracking-wider text-sm mb-1">Selected Plan</h4>
                        <div className="flex items-end gap-4 mb-4">
                          <h3 className="text-3xl font-black text-slate-900">{selectedPlanDetails?.name || 'Loading...'}</h3>
                          <div className="text-slate-500 font-medium pb-1">
                            <span className="text-xl text-slate-900">₹{selectedPlanDetails?.priceMonthly || '0'}</span> / mo
                          </div>
                        </div>
                        <ul className="space-y-2 text-sm text-slate-600">
                          <li className="flex items-center gap-2"><Check size={16} className="text-primary-500"/> Up to {selectedPlanDetails?.limits?.maxStudents || '0'} Students</li>
                          <li className="flex items-center gap-2"><Check size={16} className="text-primary-500"/> Up to {selectedPlanDetails?.limits?.maxStaff || '0'} Staff</li>
                        </ul>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-6">
                      <label className="flex items-start gap-4 cursor-pointer group">
                        <div className="mt-1">
                          <input type="checkbox" name="termsAccepted" checked={formData.termsAccepted} onChange={handleChange} className="w-5 h-5 rounded border-slate-300 bg-white text-primary-500 focus:ring-primary-500 focus:ring-offset-white cursor-pointer" />
                        </div>
                        <span className="text-sm text-slate-500 leading-relaxed group-hover:text-slate-700 transition-colors">
                          I agree to the Zuna <a href="#" className="text-primary-600 hover:underline">Terms of Service</a> and <a href="#" className="text-primary-600 hover:underline">Privacy Policy</a>. I understand my account will be manually verified before activation.
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Error Message */}
          <motion.div 
            initial={false}
            animate={{ height: error ? 'auto' : 0, opacity: error ? 1 : 0 }}
            className="overflow-hidden mt-6"
          >
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-sm font-medium flex items-center gap-2">
              <ShieldCheck size={18} /> {error}
            </div>
          </motion.div>

          {/* Action Buttons */}
          <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between">
            {step > 1 ? (
              <button 
                onClick={handleBack}
                disabled={loading}
                className="px-6 py-3 text-slate-500 font-bold hover:text-slate-900 transition-colors flex items-center gap-2 focus:outline-none"
              >
                <ArrowLeft size={18} /> Back
              </button>
            ) : (
              <div></div> // Spacer
            )}

            {step < 3 ? (
              <button 
                onClick={handleNext}
                className="px-8 py-3 bg-slate-50 border border-slate-200 text-primary-600 font-bold rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                Next Step <ArrowRight size={18} />
              </button>
            ) : (
              <button 
                onClick={handleSubmit}
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity shadow-[0_4px_14px_rgba(229,189,223,0.4)] flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <><Loader className="animate-spin" size={18} /> Creating...</> : <><ShieldCheck size={18} /> Complete Registration</>}
              </button>
            )}
          </div>

        </motion.div>
      </div>
    </div>
  );
}
