import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { registerUser } from '../firebase/auth';
import { addSubDocument } from '../firebase/firestore';
import { db } from '../firebase/config';
import { getDoc, doc } from 'firebase/firestore';
import { LuUser as UserIcon, LuLock as LockIcon, LuHash as HashIcon, LuBuilding2 } from 'react-icons/lu';
import Captcha from '../components/Captcha';

export default function ParentRegistration() {
  const { schoolId } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    admissionNumber: '',
    password: ''
  });
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState(null);
  const [captchaValid, setCaptchaValid] = useState(false);
  
  const captchaRef = React.useRef(null);

  React.useEffect(() => {
    const fetchSchool = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'schools', schoolId));
        if (docSnap.exists()) {
          setSchool(docSnap.data());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSchool();
  }, [schoolId]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!captchaValid) {
      setError("Please complete the verification code correctly.");
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      setError("Password must be at least 8 characters and include uppercase, lowercase, number, and special character.");
      return;
    }

    setIsRegistering(true);
    setError(null);
    try {
      const syntheticEmail = `${formData.admissionNumber.replace(/[^a-zA-Z0-9]/g, '')}@parent.zuna.com`.toLowerCase();

      const user = await registerUser(syntheticEmail, formData.password, 'parent', {
        name: formData.name,
        schoolId: schoolId,
        studentAdmissionNumber: formData.admissionNumber,
        isParentAuth: true
      });

      await addSubDocument(schoolId, 'parents', {
        userId: user.uid,
        name: formData.name,
        studentAdmissionNumber: formData.admissionNumber
      });

      navigate('/parent');
    } catch (err) {
      console.error(err);
      setError("Registration failed. Please check your details and try again.");
      if (captchaRef.current) captchaRef.current.regenerate();
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="h-screen flex w-full font-sans bg-white overflow-hidden">
      {/* Left Side */}
      <div className="hidden lg:flex lg:w-[60%] h-full relative flex-col justify-center items-center bg-white z-20">
        
        {/* Wavy edge sticking out to the right */}
        <div className="absolute top-0 -right-[98px] h-full w-24 overflow-hidden pointer-events-none">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full text-white fill-current">
            <path d="M0,0 C80,25 20,50 80,75 C100,85 40,100 0,100 Z" />
          </svg>
        </div>

        {/* Abstract Green Blob shapes */}
        <div className="absolute w-[80%] h-[80%] max-w-[600px] max-h-[600px] bg-primary-300 opacity-30 rounded-[40%_60%_70%_30%_/_40%_50%_60%_50%] -z-10 animate-[spin_60s_linear_infinite]"></div>
        <div className="absolute w-[70%] h-[70%] max-w-[500px] max-h-[500px] bg-primary-200 opacity-20 rounded-[60%_40%_30%_70%_/_60%_30%_70%_40%] -z-10 animate-[spin_40s_linear_infinite_reverse]"></div>
        
        {/* Illustration Placeholder */}
        <div className="relative z-10 p-8 flex justify-center items-center">
           <img 
             src="/school_illustration.png" 
             alt="Registration Illustration" 
             className="max-w-md xl:max-w-lg drop-shadow-2xl mix-blend-multiply animate-float" 
             onError={(e) => { e.target.style.display = 'none' }} 
           />
           <div className="absolute inset-0 flex justify-center items-center -z-10">
              <div className="w-64 h-64 border-[20px] border-primary-300/20 rounded-full"></div>
              <div className="absolute w-48 h-48 border-[10px] border-primary-400/20 rounded-lg rotate-45"></div>
           </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-[40%] h-full overflow-y-auto custom-scrollbar bg-slate-900 flex flex-col justify-center items-center py-12 px-4 sm:px-6 relative z-30">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent mb-4"></div>
            <p className="text-slate-400">Loading form...</p>
          </div>
        ) : (
          <div className="w-full max-w-sm px-8 flex flex-col items-center">
            {/* School Branding */}
            {school && (
              <div className="flex flex-col items-center mb-8 bg-white/5 p-6 rounded-2xl border border-white/10 w-full">
                {school.branding?.logoUrl ? (
                  <img src={school.branding.logoUrl} alt="School Logo" className="h-16 w-auto mb-3 object-contain" />
                ) : (
                  <div className="h-16 w-16 bg-white/10 rounded-full flex items-center justify-center mb-3">
                    <LuBuilding2 size={32} className="text-white/50" />
                  </div>
                )}
                <h2 className="text-xl font-bold text-white text-center">{school.schoolName || school.name}</h2>
                <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">Parent Registration</p>
              </div>
            )}

            <form className="w-full space-y-5" onSubmit={handleRegister}>
              <div>
                <label className="block text-sm text-white/90 mb-1 ml-2 font-medium">
                  Your Full Name
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-4 text-white/70">
                    <UserIcon size={18} />
                  </div>
                  <input
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary-400 transition-all shadow-inner"
                    placeholder=""
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/90 mb-1 ml-2 font-medium">
                  Student Admission Number
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-4 text-white/70">
                    <HashIcon size={18} />
                  </div>
                  <input
                    name="admissionNumber"
                    type="text"
                    required
                    value={formData.admissionNumber}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary-400 transition-all shadow-inner uppercase"
                    placeholder=""
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/90 mb-1 ml-2 font-medium">
                  Create Password
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-4 text-white/70">
                    <LockIcon size={18} />
                  </div>
                  <input
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary-400 transition-all shadow-inner"
                    placeholder=""
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <div className="bg-white p-4 rounded-2xl">
                  <Captcha ref={captchaRef} onChange={setCaptchaValid} />
                </div>
              </div>

              <div className="pt-4 flex justify-center">
                <button
                  type="submit"
                  disabled={isRegistering}
                  className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl shadow-lg text-sm font-bold text-white bg-primary-600 hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-white/50 transition-all uppercase tracking-widest disabled:opacity-50"
                >
                  {isRegistering ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  ) : (
                    'CREATE ACCOUNT'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
