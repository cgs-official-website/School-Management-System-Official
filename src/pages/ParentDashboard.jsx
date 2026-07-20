import React, { useState, useEffect, Suspense } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logoutUser } from '../firebase/auth';
import { findStudentByAdmission, linkStudentToParent } from '../firebase/firestore';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import TopNavbar from '../components/TopNavbar';
import { LuCircleUser as UserCircle, LuLogOut as LogOut, LuSquareCheck as CheckSquare, LuGraduationCap as GraduationCap, LuCreditCard as CreditCard, LuLink as LinkIcon, LuBell as Bell, LuMenu as Menu, LuX as X, LuFileText as FileText, LuCalendar as Calendar, LuCoffee as Coffee, LuBuilding2 as Building2 } from 'react-icons/lu';
import useSchoolBranding from '../hooks/useSchoolBranding';
import { useNotifications } from '../context/NotificationContext';

export default function ParentDashboard() {
  const { currentUser, userProfile, updateProfileData } = useAuth();
  const { unreadCounts, clearBadge } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Link Student Form State
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [dob, setDob] = useState('');
  const [linkingError, setLinkingError] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  // Apply dynamic title and favicon
  useSchoolBranding(school);

  useEffect(() => {
    if (userProfile && userProfile.role !== 'parent') {
      navigate('/');
    } else if (userProfile?.schoolId) {
      getDoc(doc(db, "schools", userProfile.schoolId)).then(snap => {
        if (snap.exists()) setSchool(snap.data());
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [userProfile, navigate]);

  // Close sidebar on route change for mobile
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const matchedItem = navItems.find(item => location.pathname === item.path);
    if (matchedItem && matchedItem.moduleKey) {
      clearBadge(matchedItem.moduleKey);
    }
  }, [location.pathname, clearBadge]);

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login');
  };

  const handleLinkStudent = async (e) => {
    e.preventDefault();
    setLinkingError('');
    setIsLinking(true);

    try {
      // 1. Find the student
      const student = await findStudentByAdmission(userProfile.schoolId, admissionNumber, dob);
      
      if (!student) {
        setLinkingError("No student found matching this Admission Number and Date of Birth.");
        setIsLinking(false);
        return;
      }

      // 2. Link the student to the parent's profile
      await linkStudentToParent(currentUser.uid, student.id, student.classId);
      
      // 3. Update local auth context to trigger re-render
      await updateProfileData();
    } catch (error) {
      console.error("Link error:", error);
      setLinkingError("An error occurred while linking. Please try again.");
    } finally {
      setIsLinking(false);
    }
  };

  const navItems = [
    { name: 'Student Overview', path: '/parent', icon: UserCircle, exact: true },
    { name: 'Noticeboard', path: '/parent/notices', icon: Bell, moduleKey: 'noticeboard' },
    { name: 'Calendar', path: '/parent/calendar', icon: Calendar },
    { name: 'Attendance', path: '/parent/attendance', icon: CheckSquare },
    { name: 'Canteen', path: '/parent/canteen', icon: Coffee },
    { name: 'Homework', path: '/parent/homework', icon: FileText, moduleKey: 'homework' },
    { name: 'Report Card', path: '/parent/grades', icon: GraduationCap },
    { name: 'Fees & Payments', path: '/parent/fees', icon: CreditCard, moduleKey: 'fees' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex justify-center items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  // --- LOCK SCREEN: Link Student ---
  if (!userProfile?.linkedStudentId) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-xl border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-primary-500"></div>
          
          <div className="w-16 h-16 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center mb-6">
            <LinkIcon size={32} />
          </div>
          
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Link Your Child</h1>
          <p className="text-slate-600 mb-6 text-sm">
            To view academic records, please securely link your account using your child's Admission Number and Date of Birth.
          </p>

          {linkingError && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium border border-red-200">
              {linkingError}
            </div>
          )}

          <form onSubmit={handleLinkStudent} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Admission Number</label>
              <input 
                type="text" 
                required
                value={admissionNumber}
                onChange={(e) => setAdmissionNumber(e.target.value)}
                placeholder="e.g. ADM-2024-001"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Date of Birth</label>
              <input 
                type="date" 
                required
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
              />
            </div>

            <button 
              type="submit" 
              disabled={isLinking}
              className="w-full py-3 bg-primary-600 text-white hover:bg-primary-700 rounded-xl font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
            >
              {isLinking ? 'Verifying...' : 'Link Account securely'}
            </button>
          </form>

          <button 
            onClick={handleLogout}
            className="w-full py-3 mt-4 text-slate-500 hover:text-slate-700 font-semibold transition-colors flex items-center justify-center gap-2 hover:bg-slate-50 rounded-xl"
          >
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f4f7fe] font-sans overflow-hidden p-4 gap-4">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-4 left-4 z-50 w-64 bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-[120%]'}
      `}>
        <div className="px-6 pb-6 pt-8 flex justify-between items-start">

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center p-1 shrink-0">
              <img src="/logo.png" alt="Zuna" className="w-full h-full object-contain" onError={(e) => { e.target.style.display='none'; e.target.nextElementSibling.style.display='block'; }} />
              <div style={{display: 'none'}} className="font-black text-slate-900 text-xl">Z<span className="text-primary-500">.</span></div>
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-black text-slate-900 leading-tight truncate">Zuna<span className="text-primary-500">.</span></h2>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">Parent Portal</p>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-600 p-1">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                `relative flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 font-semibold text-sm ${
                  isActive 
                    ? 'bg-primary-50 text-primary-900 shadow-md shadow-slate-900/20' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-primary-500 rounded-r-md"></div>
                  )}
                  <item.icon size={20} className="shrink-0" />
                  <span>{item.name}</span>
                  {item.moduleKey && unreadCounts[item.moduleKey] > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full select-none shrink-0 ml-auto animate-pulse">
                      {unreadCounts[item.moduleKey]}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 shrink-0 mt-auto">
          <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between border border-slate-100">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold shrink-0">
                {userProfile?.name ? userProfile.name.substring(0, 2).toUpperCase() : userProfile?.email?.substring(0, 2).toUpperCase() || 'PA'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{userProfile?.name || userProfile?.email?.split('@')[0]}</p>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">{userProfile?.role || 'Parent'}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-xl transition-colors shrink-0"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden gap-4 relative">
        <TopNavbar 
          schoolName={school?.schoolName || 'Parent Portal'} 
          schoolLogo={school?.branding?.logoUrl}
          toggleSidebar={() => setIsSidebarOpen(true)} 
          navItems={navItems}
        />
        
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <Suspense fallback={
            <div className="flex-1 flex justify-center items-center h-[50vh]">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
            </div>
          }>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
