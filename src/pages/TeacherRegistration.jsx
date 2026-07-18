import React, { useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { registerUser } from '../firebase/auth';
import { db } from '../firebase/config';
import { getDoc, doc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { LuUser as UserIcon, LuLock as LockIcon, LuMail as MailIcon, LuBriefcase as BriefcaseIcon, LuPhone as PhoneIcon, LuHash as HashIcon, LuBuilding2 } from 'react-icons/lu';
import Captcha from '../components/Captcha';

export default function TeacherRegistration() {
  const { schoolId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlEmail = searchParams.get('email') || '';
  const urlEmpId = searchParams.get('empId') || '';

  const [formData, setFormData] = useState({
    name: '',
    email: urlEmail,
    employeeId: urlEmpId,
    password: ''
  });
  const [customFieldsData, setCustomFieldsData] = useState({});
  const [school, setSchool] = useState(null);
  const [formConfig, setFormConfig] = useState([]);
  const [loading, setLoading] = useState(true); // Start loading while fetching school
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState(null);
  const [captchaValid, setCaptchaValid] = useState(false);
  
  const captchaRef = React.useRef(null);

  React.useEffect(() => {
    const fetchSchool = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'schools', schoolId));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSchool(data);
          if (data.staffFormConfig) {
            setFormConfig(data.staffFormConfig);
          }
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

  const handleCustomFieldChange = (e) => {
    setCustomFieldsData({ ...customFieldsData, [e.target.name]: e.target.value });
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

    if (customFieldsData.phone) {
      const phoneRegex = /^(?:\+91|91)?[6789]\d{9}$/;
      if (!phoneRegex.test(customFieldsData.phone.replace(/\s+/g, ''))) {
        setError("Please enter a valid Indian phone number.");
        return;
      }
    }

    setIsRegistering(true);
    setError(null);
    try {
      // Find the pending staff document
      const q = query(
        collection(db, `schools/${schoolId}/teachers`),
        where("email", "==", formData.email),
        where("employeeId", "==", formData.employeeId)
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setError("Invalid registration link. No matching invitation found.");
        setIsRegistering(false);
        return;
      }
      
      const teacherDoc = querySnapshot.docs[0];
      const teacherData = teacherDoc.data();
      
      if (teacherData.status === 'Active') {
        setError("This account has already been registered. Please login instead.");
        setIsRegistering(false);
        return;
      }

      // Register the auth account
      const user = await registerUser(formData.email, formData.password, 'teacher', {
        name: formData.name,
        schoolId: schoolId
      });

      // Update existing document
      await updateDoc(doc(db, `schools/${schoolId}/teachers`, teacherDoc.id), {
        userId: user.uid,
        name: formData.name,
        status: 'Active',
        ...customFieldsData
      });

      navigate('/teacher');
    } catch (err) {
      console.error(err);
      setError("Registration failed. Please try again.");
      if (captchaRef.current) captchaRef.current.regenerate();
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-primary-500 selection:text-white flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row h-auto md:h-[90vh] max-h-[800px] min-h-[600px] border border-slate-100">
        
        {/* Left Gradient Panel */}
        <div className="w-full md:w-1/2 p-4 hidden md:flex flex-col relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500 via-indigo-600 to-cyan-400 rounded-2xl m-4 z-0">
             <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-white/20 blur-[60px] rounded-full mix-blend-screen animate-pulse pointer-events-none"></div>
             <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-300/30 blur-[80px] rounded-full mix-blend-screen animate-[pulse_4s_ease-in-out_infinite_reverse] pointer-events-none"></div>
          </div>
          
          <div className="relative z-10 flex flex-col h-full justify-between p-8 text-white">
            <Link to="/" className="inline-flex items-center gap-2 group focus:outline-none focus:ring-2 focus:ring-white/50 rounded-lg w-max">
              <img src="/logo.png" alt="Zuna Logo" className="w-auto h-10 object-contain drop-shadow-sm filter brightness-0 invert" />
            </Link>

            <div className="mt-auto">
              <p className="text-sm font-medium text-white/80 mb-2">Staff Registration</p>
              <h1 className="text-3xl lg:text-4xl font-bold leading-tight">
                Get access to your personal hub for clarity and productivity
              </h1>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="w-full md:w-1/2 p-6 sm:p-8 lg:p-12 flex flex-col bg-white relative overflow-y-auto overflow-x-hidden custom-scrollbar">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent mb-4"></div>
              <p className="text-slate-500 font-medium">Loading form...</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {/* Mobile Logo & School Branding */}
              <div className="flex items-center justify-between mb-8">
                {school && (
                  <div className="flex items-center gap-3">
                    {school.branding?.logoUrl ? (
                      <img src={school.branding.logoUrl} alt="School Logo" className="h-10 w-auto object-contain" />
                    ) : (
                      <div className="h-10 w-10 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600">
                        <LuBuilding2 size={20} />
                      </div>
                    )}
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 leading-tight">{school.schoolName || school.name}</h2>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Staff</p>
                    </div>
                  </div>
                )}
                <div className="md:hidden">
                  <Link to="/">
                    <img src="/logo.png" alt="Zuna Logo" className="w-auto h-8 object-contain" />
                  </Link>
                </div>
              </div>

              <div className="mb-8">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Create an account</h2>
                <p className="text-sm text-slate-500">Access your tasks, notes, and projects anytime, anywhere - and keep everything flowing in one place.</p>
              </div>

              {error && (
                <div className="w-full mb-6 p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg border border-red-100">
                  {error}
                </div>
              )}

              <form className="w-full space-y-5" onSubmit={handleRegister}>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-sm font-bold text-slate-700">Full Name</label>
                    <input
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg bg-white border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none text-slate-900 disabled:opacity-50 placeholder-slate-400"
                      placeholder="John Doe"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-bold text-slate-700">Your email</label>
                    <input
                      name="email"
                      type="email"
                      required
                      disabled={!!urlEmail}
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none text-slate-900 disabled:opacity-50 placeholder-slate-400"
                      placeholder="you@example.com"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="block text-sm font-bold text-slate-700">Employee ID</label>
                    <input
                      name="employeeId"
                      type="text"
                      required
                      disabled={!!urlEmpId}
                      value={formData.employeeId}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none text-slate-900 disabled:opacity-50 placeholder-slate-400"
                      placeholder="EMP-1024"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-bold text-slate-700">Password</label>
                    <input
                      name="password"
                      type="password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg bg-white border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none text-slate-900 disabled:opacity-50 placeholder-slate-400"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {/* Dynamic Custom Fields */}
                {formConfig.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-slate-100 mt-4">
                    {formConfig.map((field) => (
                      <div key={field.name} className="space-y-1">
                        <label className="block text-sm font-bold text-slate-700">{field.label}</label>
                        <input
                          name={field.name}
                          type="text"
                          required={field.required}
                          value={customFieldsData[field.name] || ''}
                          onChange={handleCustomFieldChange}
                          className="w-full px-4 py-3 rounded-lg bg-white border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none text-slate-900 disabled:opacity-50 placeholder-slate-400"
                          placeholder={field.label}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-2">
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <Captcha ref={captchaRef} onChange={setCaptchaValid} />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isRegistering}
                    className="w-full flex justify-center items-center py-3.5 px-4 rounded-lg shadow-md text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRegistering ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        <span>Creating...</span>
                      </div>
                    ) : (
                      'Get Started'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
