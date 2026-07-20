import React, { useEffect, useState, Suspense } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LuUsers as Users, LuLogOut as LogOut, LuSquareCheck as CheckSquare, LuGraduationCap as GraduationCap, LuMessageSquare as MessageSquare, LuLock as Lock, LuBell as Bell, LuMenu as Menu, LuX as X, LuFileText as FileText, LuCalendar as Calendar, LuBuilding2 as Building2, LuCalendarDays, LuBookOpen, LuCalendarOff, LuTrendingUp, LuFolderDown, LuCalendarClock, LuBanknote, LuUser as UserIcon } from 'react-icons/lu';
import { logoutUser } from '../firebase/auth';
import { useAuth } from '../context/AuthContext';
import { getDoc, doc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import TopNavbar from '../components/TopNavbar';
import useSchoolBranding from '../hooks/useSchoolBranding';
import { useNotifications } from '../context/NotificationContext';

export default function TeacherDashboard() {
  const { currentUser, userProfile } = useAuth();
  const { unreadCounts, clearBadge } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState(null);
  const [teacherDoc, setTeacherDoc] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Apply dynamic title and favicon
  useSchoolBranding(school);

  // Fallback check to ensure role is correct
  useEffect(() => {
    if (userProfile && userProfile.role !== 'teacher') {
      navigate('/');
    } else if (userProfile?.schoolId) {
      // Fetch school info for branding/name
      getDoc(doc(db, "schools", userProfile.schoolId)).then(snap => {
        if (snap.exists()) setSchool(snap.data());
        
        // Also fetch teacher doc for profile completion
        if (userProfile.role === 'teacher') {
          const uid = currentUser?.uid || userProfile?.uid;
          if (uid) {
            const q = query(collection(db, `schools/${userProfile.schoolId}/teachers`), where("userId", "==", uid));
            getDocs(q).then(async (teacherSnap) => {
               if (!teacherSnap.empty) {
                 setTeacherDoc(teacherSnap.docs[0].data());
                 setLoading(false);
               } else if (currentUser?.email) {
                 // Fallback to email lookup
                 const emailQ = query(collection(db, `schools/${userProfile.schoolId}/teachers`), where("email", "==", currentUser.email.trim()));
                 const emailSnap = await getDocs(emailQ);
                 if (!emailSnap.empty) {
                   const docId = emailSnap.docs[0].id;
                   const { updateDoc } = await import('firebase/firestore');
                   await updateDoc(doc(db, `schools/${userProfile.schoolId}/teachers`, docId), {
                     userId: uid
                   });
                   setTeacherDoc({ ...emailSnap.docs[0].data(), userId: uid });
                   setLoading(false);
                 } else {
                   // Auto-create document if completely missing!
                   const { addSubDocument } = await import('../firebase/firestore');
                   const firstName = userProfile.name ? userProfile.name.split(' ')[0] : currentUser.email.split('@')[0];
                   const lastName = userProfile.name ? userProfile.name.split(' ').slice(1).join(' ') : '';
                   const newTeacherDoc = {
                     userId: uid,
                     email: currentUser.email,
                     firstName,
                     lastName,
                     name: userProfile.name || currentUser.email.split('@')[0],
                     role: 'Staffs',
                     status: 'Active',
                     staff_type: 'teaching',
                     createdAt: new Date().toISOString()
                   };
                   await addSubDocument(userProfile.schoolId, 'teachers', newTeacherDoc);
                   setTeacherDoc(newTeacherDoc);
                   setLoading(false);
                 }
               } else {
                 setLoading(false);
               }
            }).catch(() => setLoading(false));
          } else {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      }).catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [userProfile, navigate]);

  const calculateCompletion = () => {
    if (!teacherDoc) return 0;
    const fields = [
      'dob', 'bloodGroup', 'gender', 'nationality', 'maritalStatus', 
      'mobileNumber', 'residentialAddress', 'emergencyContact', 'fatherGuardianName', 
      'highestQualification', 'degreeSpecialization', 'universityName', 'yearOfPassing', 
      'previousExperience', 'previousOrganization', 'subjectSpecialization', 
      'bankAccountNumber', 'bankName', 'branchName', 'ifscCode'
    ];
    let filled = 0;
    fields.forEach(f => {
      const val = teacherDoc[f] || (
        f === 'mobileNumber' ? teacherDoc.phone :
        f === 'residentialAddress' ? teacherDoc.address :
        f === 'highestQualification' ? teacherDoc.qualifications :
        f === 'previousExperience' ? teacherDoc.experience :
        f === 'bankAccountNumber' ? teacherDoc.accountNumber : null
      );
      if (val && val.toString().trim() !== '') filled++;
    });
    return Math.round((filled / fields.length) * 100);
  };
  
  const completionPercentage = calculateCompletion();

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

  const navItems = [
    { name: 'Class Roster', path: '/teacher', icon: Users, exact: true },
    { name: 'Noticeboard', path: '/teacher/notices', icon: Bell, moduleKey: 'noticeboard' },
    { name: 'Calendar', path: '/teacher/calendar', icon: Calendar },
    { name: 'Timetable', path: '/teacher/timetable', icon: LuCalendarDays },
    { name: 'Lesson Plans', path: '/teacher/lesson-plans', icon: LuBookOpen },
    { name: 'Resources', path: '/teacher/resources', icon: LuFolderDown },
    { name: 'Attendance', path: '/teacher/attendance', icon: CheckSquare },
    { name: 'Homework', path: '/teacher/homework', icon: FileText, moduleKey: 'homework' },
    { name: 'Performance', path: '/teacher/performance', icon: LuTrendingUp },
    { name: 'PTM Scheduler', path: '/teacher/ptm', icon: LuCalendarClock },
    { name: 'Grades & Exams', path: '/teacher/grades', icon: GraduationCap },
    { name: 'Messages', path: '/teacher/chat', icon: MessageSquare },
    { name: 'My Salary', path: '/teacher/salary', icon: LuBanknote },
    { name: 'Profile', path: '/teacher/profile', icon: UserIcon },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex justify-center items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  // Removed strict Awaiting Assignment block so Subject Teachers can access their Timetable and other modules.

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
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">Teacher Portal</p>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-600 p-1">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-4">Menu</p>
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
                {userProfile?.name ? userProfile.name.substring(0, 2).toUpperCase() : userProfile?.email?.substring(0, 2).toUpperCase() || 'TE'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{userProfile?.name || userProfile?.email?.split('@')[0]}</p>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">{userProfile?.role}</p>
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
          schoolName={school?.name || 'Teacher Portal'} 
          schoolLogo={school?.branding?.logoUrl}
          toggleSidebar={() => setIsSidebarOpen(true)} 
          navItems={navItems}
        />
        
        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
          {completionPercentage < 100 && location.pathname !== '/teacher/profile' && (
             <div className="p-4 shrink-0">
               <div onClick={() => navigate('/teacher/profile')} className="cursor-pointer bg-gradient-to-r from-amber-500 to-orange-400 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                  <div className="flex justify-between items-center relative z-10">
                     <div>
                        <h3 className="text-xl font-bold flex items-center gap-2">
                           Complete Your Profile 
                        </h3>
                        <p className="text-white/90 text-sm mt-1 max-w-lg">You are {completionPercentage}% complete. Click here to add missing details like address, qualifications, and bank info to unlock all dashboard features.</p>
                     </div>
                     <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center font-bold text-xl relative shrink-0 border-4 border-white/30">
                        {completionPercentage}%
                     </div>
                  </div>
               </div>
             </div>
          )}
          <div className="flex-1 p-4 pt-0">
            <Suspense fallback={
              <div className="flex-1 flex justify-center items-center h-[50vh]">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
              </div>
            }>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
