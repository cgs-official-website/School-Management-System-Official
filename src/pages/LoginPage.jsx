import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { LuEye as Eye, LuEyeOff as EyeOff } from 'react-icons/lu';
import { FiLoader as Loader, FiCheckCircle as CheckCircle } from 'react-icons/fi';
import { loginUser, getUserProfile, loginWithAdmissionNumber } from '../firebase/auth';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const reducedMotion = useReducedMotion();
  
  const [formData, setFormData] = useState({ identifier: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser && userProfile) {
      redirectBasedOnRole(userProfile.role);
    }
  }, [currentUser, userProfile, navigate]);

  const redirectBasedOnRole = (role) => {
    switch (role) {
      case 'superadmin': navigate('/superadmin'); break;
      case 'admin': navigate('/admin'); break;
      case 'teacher': navigate('/teacher'); break;
      case 'parent': navigate('/parent'); break;
      default: navigate('/');
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError(null);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!formData.identifier || !formData.password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let user;
      const { identifier, password } = formData;
      if (identifier.includes('@')) {
        user = await loginUser(identifier, password);
      } else {
        user = await loginWithAdmissionNumber(identifier, password);
      }
      
      const profile = await getUserProfile(user.uid);
      
      if (profile) {
        setSuccess(true);
        setTimeout(() => {
          redirectBasedOnRole(profile.role);
        }, 600); // Wait for success animation
      } else {
        setError("User profile not found. Please contact support.");
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError("Invalid email/admission number or password.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-primary-500 selection:text-white flex flex-col items-center justify-center relative overflow-hidden px-4">
      
      {/* Subtle Background Ambiance */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-200 rounded-full blur-[120px] opacity-40 pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary-300 rounded-full blur-[100px] opacity-30 pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: reducedMotion ? 0 : 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <div className="mb-8 flex flex-col items-center">
          <Link to="/" className="inline-flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg p-1">
            <img src="/logo.png" alt="Zuna Logo" className="w-auto h-12 object-contain group-hover:scale-105 transition-transform drop-shadow-sm filter invert" />
          </Link>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">Welcome back</h2>
          <p className="mt-2 text-sm text-slate-500">Please enter your details to sign in.</p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl border border-slate-200 shadow-[0_8px_32px_rgba(0,0,0,0.05)] rounded-3xl p-8 sm:p-10">
          <form onSubmit={handleLogin} className="space-y-6">
            
            <div className="relative group">
              <input 
                type="text" 
                id="identifier" 
                name="identifier"
                value={formData.identifier}
                onChange={handleChange}
                className="w-full px-5 py-4 rounded-xl bg-white border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none peer text-slate-900 placeholder-transparent disabled:opacity-50" 
                placeholder="Email or Admission No." 
                disabled={loading || success}
                required 
              />
              <label 
                htmlFor="identifier" 
                className="absolute left-5 -top-2.5 bg-white px-1 text-sm font-bold text-slate-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-primary-600 cursor-text"
              >
                Email or Admission No.
              </label>
            </div>

            <div className="relative group">
              <input 
                type={showPassword ? "text" : "password"} 
                id="password" 
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-5 pr-12 py-4 rounded-xl bg-white border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none peer text-slate-900 placeholder-transparent disabled:opacity-50" 
                placeholder="Password" 
                disabled={loading || success}
                required 
              />
              <label 
                htmlFor="password" 
                className="absolute left-5 -top-2.5 bg-white px-1 text-sm font-bold text-slate-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-primary-600 cursor-text"
              >
                Password
              </label>
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none focus:text-primary-600"
                tabIndex="-1"
                disabled={loading || success}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 bg-white text-primary-500 focus:ring-primary-500 focus:ring-offset-white transition-colors cursor-pointer" />
                <span className="text-slate-500 group-hover:text-slate-700 transition-colors">Remember me</span>
              </label>
              <Link to="/forgot-password" className="font-bold text-primary-600 hover:text-primary-700 transition-colors focus:outline-none focus:underline">
                Forgot password?
              </Link>
            </div>

            <motion.div 
              initial={false}
              animate={{ height: error ? 'auto' : 0, opacity: error ? 1 : 0 }}
              className="overflow-hidden"
            >
              <p className="text-red-500 text-sm font-medium text-center">{error}</p>
            </motion.div>

            <button 
              type="submit" 
              disabled={loading || success}
              className="w-full py-4 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity shadow-[0_4px_14px_rgba(229,189,223,0.4)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-primary-500 flex justify-center items-center gap-2 disabled:cursor-not-allowed"
            >
              {success ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2">
                  <CheckCircle size={20} /> Success
                </motion.div>
              ) : loading ? (
                <>
                  <Loader className="animate-spin" size={20} /> Signing in...
                </>
              ) : (
                "Log In"
              )}
            </button>
          </form>
        </div>

        <p className="mt-8 text-center text-sm text-slate-500">
          Don't have a school account yet?{' '}
          <Link to="/register" className="font-bold text-slate-900 hover:text-primary-600 transition-colors focus:outline-none focus:underline">
            Get Started
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
