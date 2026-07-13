import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSubCollection, getNotices } from '../../firebase/firestore';
import { 
  LuUsers as Users, 
  LuGraduationCap as GraduationCap, 
  LuBookOpen as BookOpen, 
  LuBell as Bell,
  LuTrendingUp as TrendingUp,
  LuWallet as Wallet,
  LuCalendarDays as Calendar
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

  useEffect(() => {
    if (!schoolId) return;

    const fetchDashboardData = async () => {
      try {
        const [studentsData, staffData, classesData, noticesData] = await Promise.all([
          getSubCollection(schoolId, 'students'),
          getSubCollection(schoolId, 'teachers'),
          getSubCollection(schoolId, 'classes'),
          getNotices(schoolId)
        ]);

        setStats({
          students: studentsData.length,
          staff: staffData.length,
          classes: classesData.length,
          notices: noticesData.length
        });

        // Get 3 most recent notices
        setRecentNotices(noticesData.slice(0, 3));
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Dashboard Overview</h1>
            <p className="text-sm text-slate-500 mt-1">Welcome back, here's what's happening at your school today.</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 shadow-sm border border-slate-200">
            <Calendar className="h-5 w-5 text-slate-400" />
            <span className="text-sm font-medium text-slate-700">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
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
