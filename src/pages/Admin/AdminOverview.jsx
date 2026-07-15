import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSubCollection, getNotices, subscribeToSubCollection, subscribeToNotices } from '../../firebase/firestore';
import { 
  LuUsers as Users, 
  LuGraduationCap as GraduationCap, 
  LuBookOpen as BookOpen, 
  LuBell as Bell,
  LuTrendingUp as TrendingUp,
  LuWallet as Wallet,
  LuCalendarDays as Calendar,
  LuZap as Zap,
  LuBriefcase as Briefcase,
  LuUser as User,
  LuCheck as Check,
  LuCopy as Copy
} from 'react-icons/lu';

export default function AdminOverview() {
  const { userProfile } = useAuth();
  const schoolId = userProfile?.schoolId;

  const [stats, setStats] = useState({
    students: 0,
    staff: 0,
    classes: 0,
    notices: 0
  });
  
  const [recentNotices, setRecentNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isInviteDropdownOpen, setIsInviteDropdownOpen] = useState(false);
  const [copiedRole, setCopiedRole] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsInviteDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCopyLink = (role) => {
    const link = `${window.location.origin}/register/${role}/${schoolId}`;
    navigator.clipboard.writeText(link);
    setCopiedRole(role);
    setTimeout(() => {
      setCopiedRole(null);
      setIsInviteDropdownOpen(false);
    }, 2000);
  };

  useEffect(() => {
    if (!schoolId) return;

    setLoading(true);
    let studentsUnsub, staffUnsub, classesUnsub, noticesUnsub;

    studentsUnsub = subscribeToSubCollection(schoolId, 'students', (data) => {
      setStats(prev => ({ ...prev, students: data.length }));
    });

    staffUnsub = subscribeToSubCollection(schoolId, 'teachers', (data) => {
      setStats(prev => ({ ...prev, staff: data.length }));
    });

    classesUnsub = subscribeToSubCollection(schoolId, 'classes', (data) => {
      setStats(prev => ({ ...prev, classes: data.length }));
    });

    noticesUnsub = subscribeToNotices(schoolId, null, (data) => {
      setStats(prev => ({ ...prev, notices: data.length }));
      setRecentNotices(data.slice(0, 3));
      setLoading(false); // Stop loading after notices load
    });

    return () => {
      if (studentsUnsub) studentsUnsub();
      if (staffUnsub) staffUnsub();
      if (classesUnsub) classesUnsub();
      if (noticesUnsub) noticesUnsub();
    };
  }, [schoolId]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Students",
      value: stats.students,
      icon: <GraduationCap className="h-6 w-6 text-blue-600" />,
      bg: "bg-blue-50",
      trend: "+12% from last month"
    },
    {
      title: "Teaching Staff",
      value: stats.staff,
      icon: <Users className="h-6 w-6 text-purple-600" />,
      bg: "bg-purple-50",
      trend: "+2 new this month"
    },
    {
      title: "Active Classes",
      value: stats.classes,
      icon: <BookOpen className="h-6 w-6 text-green-600" />,
      bg: "bg-green-50",
      trend: "Across all sections"
    },
    {
      title: "School Notices",
      value: stats.notices,
      icon: <Bell className="h-6 w-6 text-amber-600" />,
      bg: "bg-amber-50",
      trend: `${recentNotices.length} new this week`
    }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="space-y-6 animate-fade-in-up">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Dashboard Overview</h1>
            <p className="text-sm text-slate-500 mt-1">Welcome back, here's what's happening at your school today.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setIsInviteDropdownOpen(!isInviteDropdownOpen)}
                className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl shadow-sm font-semibold transition-all active:scale-[0.98]"
              >
                <Zap size={18} />
                Generate Invite Links
              </button>
              
              {isInviteDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 p-2 z-50">
                  <div className="flex flex-col space-y-1">
                    <button onClick={() => handleCopyLink('teacher')} className="flex items-center justify-between w-full px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-cyan-600 rounded-lg transition-colors group">
                      <div className="flex items-center gap-3">
                        <Users size={18} className="text-cyan-600 group-hover:scale-110 transition-transform" />
                        Teacher Link
                      </div>
                      {copiedRole === 'teacher' ? <Check size={16} className="text-primary-500" /> : <Copy size={16} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />}
                    </button>
                    <button onClick={() => handleCopyLink('parent')} className="flex items-center justify-between w-full px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-amber-600 rounded-lg transition-colors group">
                      <div className="flex items-center gap-3">
                        <User size={18} className="text-amber-600 group-hover:scale-110 transition-transform" />
                        Parent Link
                      </div>
                      {copiedRole === 'parent' ? <Check size={16} className="text-primary-500" /> : <Copy size={16} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 shadow-sm border border-slate-200">
              <Calendar className="h-5 w-5 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, idx) => (
          <div key={idx} className="overflow-hidden rounded-xl bg-white p-6 shadow-sm border border-slate-200 transition-all hover:shadow-md hover:-translate-y-1">
            <div className="flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.bg}`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              <span>{stat.trend}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Notices */}
        <div className="col-span-1 rounded-xl bg-white shadow-sm border border-slate-200 lg:col-span-2">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">Recent Notices</h2>
          </div>
          <div className="p-6">
            {recentNotices.length > 0 ? (
              <div className="space-y-4">
                {recentNotices.map((notice) => (
                  <div key={notice.id} className="group relative flex gap-4 rounded-xl border border-slate-100 p-4 transition-all hover:bg-slate-50">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                      <Bell className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900">{notice.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">{notice.content}</p>
                      <p className="mt-2 text-xs font-medium text-slate-400">
                        {new Date(notice.date).toLocaleDateString()} • {notice.targetAudience ? notice.targetAudience.charAt(0).toUpperCase() + notice.targetAudience.slice(1) : 'All'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-3 rounded-full bg-slate-50 p-3">
                  <Bell className="h-6 w-6 text-slate-400" />
                </div>
                <h3 className="text-sm font-medium text-slate-900">No notices yet</h3>
                <p className="mt-1 text-sm text-slate-500">Create a notice to keep everyone informed.</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions / Status */}
        <div className="col-span-1 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-md">
          <h2 className="text-lg font-semibold text-white">System Status</h2>
          <p className="mt-1 text-sm text-slate-300">All modules running smoothly</p>
          
          <div className="mt-8 space-y-4">
            <div className="rounded-lg bg-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wallet className="h-5 w-5 text-amber-400" />
                  <span className="font-medium">Fee Collection</span>
                </div>
                <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-medium text-emerald-300">Active</span>
              </div>
              <div className="mt-3 h-1.5 w-full rounded-full bg-white/10">
                <div className="h-1.5 w-[75%] rounded-full bg-amber-400"></div>
              </div>
              <div className="mt-2 text-right text-xs text-slate-300">75% Collected</div>
            </div>

            <div className="rounded-lg bg-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-blue-400" />
                  <span className="font-medium">Academic Term</span>
                </div>
                <span className="text-xs font-medium text-slate-300">Term 1</span>
              </div>
              <div className="mt-3 h-1.5 w-full rounded-full bg-white/10">
                <div className="h-1.5 w-[40%] rounded-full bg-blue-400"></div>
              </div>
              <div className="mt-2 text-right text-xs text-slate-300">Week 6 of 15</div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10">
            <button onClick={() => window.location.href = '/admin/setup'} className="w-full rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50">
              Configure Environment
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
