import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LuBookOpen as BookOpen, LuUsers as Users, LuLogOut as LogOut, LuLayoutDashboard as LayoutDashboard, LuLink as LinkIcon, LuSettings as Settings, LuCreditCard as CreditCard, LuGraduationCap as GraduationCap, LuCalendar as Calendar, LuBus as Bus, LuLibrary as Library, LuFileText as FileText, LuBell as Bell, LuKey as Key, LuMenu as Menu, LuX as X, LuBuilding2 as Building2, LuCheck as CheckSquare, LuHouse as Home, LuPackage as PackageIcon, LuBriefcase as Briefcase, LuChartBar as BarChart2, LuHeartPulse as HeartPulse, LuCircleAlert as AlertCircle, LuFiles as Files, LuChevronDown as ChevronDown, LuChevronRight as ChevronRight, LuShield as Shield } from 'react-icons/lu';
import { logoutUser } from '../firebase/auth';
import { useAuth } from '../context/AuthContext';
import usePermissions from '../hooks/usePermissions';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import TopNavbar from '../components/TopNavbar';
import useSchoolBranding from '../hooks/useSchoolBranding';

export default function AdminDashboard() {
  const { userProfile } = useAuth();
  const { permissions, canRead } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const [schoolData, setSchoolData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState(['Classes & Sections']); // Default expand if needed

  // Apply dynamic title and favicon
  useSchoolBranding(schoolData);

  useEffect(() => {
    // Check if the school is approved and fetch permissions
    const fetchSchoolData = async () => {
      try {
        if (userProfile && userProfile.schoolId) {
          const schoolDoc = await getDoc(doc(db, 'schools', userProfile.schoolId));
          if (schoolDoc.exists()) {
            const data = schoolDoc.data();
            if (data.status !== 'approved') {
              navigate('/admin/pending');
              return;
            } else {
              setSchoolData(data);
            }
          } else {
            navigate('/admin/pending');
            return;
          }
        } else {
          // If no schoolId, they might need to go to pending
          navigate('/admin/pending');
          return;
        }
      } catch (error) {
        console.error("Error fetching school data:", error);
        navigate('/admin/pending');
      } finally {
        setLoading(false);
      }
    };
    fetchSchoolData();
  }, [userProfile, navigate]);

  // Close sidebar on route change for mobile
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logoutUser();
    navigate('/');
  };

  if (loading || !schoolData) {
    return (
      <div className="min-h-screen bg-slate-50 flex justify-center items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  const allNavItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard, exact: true },
    { name: 'Noticeboard', path: '/admin/notices', icon: Bell, moduleKey: 'noticeboard' },
    { name: 'Environment Setup', path: '/admin/setup', icon: Settings },
    { name: 'Staff Directory', path: '/admin/staff', icon: GraduationCap },
    { 
      name: 'Classes & Sections', 
      path: '/admin/classes', 
      icon: BookOpen,
      moduleKey: 'classes',
      subItems: [
        { name: 'Class List', path: '/admin/classes', icon: BookOpen },
        { name: 'Subject Management', path: '/admin/subjects', icon: BookOpen }
      ]
    },
    { name: 'Student Directory', path: '/admin/students', icon: Users },
    { name: 'HR & Payroll', path: '/admin/hr-payroll', icon: Briefcase, moduleKey: 'hr-payroll' },
    { name: 'Timetables', path: '/admin/timetables', icon: Calendar, moduleKey: 'timetables' },
    { name: 'Calendar', path: '/admin/calendar', icon: Calendar, moduleKey: 'calendar' },
    { name: 'Exams & Results', path: '/admin/exams', icon: FileText, moduleKey: 'exams' },
    { name: 'Fees & Payments', path: '/admin/fees', icon: CreditCard, moduleKey: 'fees' },
    { name: 'Transport', path: '/admin/transport', icon: Bus, moduleKey: 'transport' },
    { name: 'Library', path: '/admin/library', icon: Library, moduleKey: 'library' },
    { name: 'Reports & Analytics', path: '/admin/reports', icon: BarChart2, moduleKey: 'reports' },
    { name: 'API Integrations', path: '/admin/api', icon: Key, moduleKey: 'api' },
    { name: 'Registration Links', path: '/admin/links', icon: LinkIcon, moduleKey: 'links' },
    { name: 'Billing & Plan', path: '/admin/billing', icon: CreditCard, moduleKey: 'billing' },
    { name: 'Settings', path: '/admin/form-builder', icon: Settings, moduleKey: 'form-builder' },
    { name: 'Roles & Permissions', path: '/admin/roles', icon: Shield, moduleKey: 'roles' },
  ];

  const permittedModules = schoolData.permittedModules || [];
  const navItems = allNavItems.filter(item => {
    if (!item.moduleKey) return true;
    return permittedModules.includes(item.moduleKey);
  });

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
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">Admin Portal</p>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-600 p-1">
            <X size={24} />
          </button>
        </div>
          
          <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto custom-scrollbar">
            {navItems.map((item) => {
              const hasSubItems = item.subItems && item.subItems.length > 0;
              const isExpanded = expandedMenus.includes(item.name);

              const toggleMenu = () => {
                if (hasSubItems) {
                  setExpandedMenus(prev => 
                    prev.includes(item.name) 
                      ? prev.filter(name => name !== item.name)
                      : [...prev, item.name]
                  );
                }
              };

              return (
                <div key={item.name} className="space-y-1">
                  <NavLink
                    to={item.path}
                    end={item.exact}
                    onClick={hasSubItems ? toggleMenu : undefined}
                    className={({ isActive }) => {
                      const childActive = hasSubItems && item.subItems.some(sub => location.pathname === sub.path);
                      const active = isActive || childActive;
                      return `relative flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-200 font-semibold text-sm ${
                        active 
                          ? 'bg-primary-50 text-primary-900 shadow-md shadow-slate-900/20' 
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                      }`
                    }}
                  >
                    {({ isActive }) => {
                      const childActive = hasSubItems && item.subItems.some(sub => location.pathname === sub.path);
                      const active = isActive || childActive;
                      return (
                        <>
                          {active && (
                            <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-primary-500 rounded-r-md"></div>
                          )}
                          <div className="flex items-center gap-3">
                            <item.icon size={20} className="shrink-0" />
                            <span>{item.name}</span>
                          </div>
                          {hasSubItems && (
                            <div className="text-slate-400">
                              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </div>
                          )}
                        </>
                      );
                    }}
                  </NavLink>
                  
                  {/* Sub Items */}
                  {hasSubItems && isExpanded && (
                    <div className="pl-11 pr-2 py-1 space-y-1 relative before:absolute before:left-6 before:top-0 before:bottom-2 before:w-[2px] before:bg-slate-100 before:rounded-full">
                      {item.subItems.map(sub => (
                        <NavLink
                          key={sub.name}
                          to={sub.path}
                          className={({ isActive }) => 
                            `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors relative whitespace-nowrap ${
                              isActive
                                ? 'text-primary-700 bg-primary-50/50 before:absolute before:-left-5 before:top-1/2 before:-translate-y-1/2 before:w-2 before:h-2 before:rounded-full before:bg-primary-500'
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                            }`
                          }
                        >
                          {sub.icon && <sub.icon size={16} className="shrink-0" />}
                          {sub.name}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        <div className="p-4 shrink-0 mt-auto">
          <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between border border-slate-100">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold shrink-0">
                {userProfile?.name ? userProfile.name.substring(0, 2).toUpperCase() : userProfile?.email?.substring(0, 2).toUpperCase() || 'AD'}
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
          schoolName={schoolData?.schoolName || 'Admin Portal'} 
          schoolLogo={schoolData?.branding?.logoUrl}
          toggleSidebar={() => setIsSidebarOpen(true)} 
          navItems={navItems}
        />
        
        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
