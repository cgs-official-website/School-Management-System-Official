import React from 'react';
import { LuChartBar, LuTrendingUp, LuUsers, LuIndianRupee, LuGraduationCap } from 'react-icons/lu';
import * as XLSX from 'xlsx';

export default function ReportsAnalytics() {
  const metrics = [
    { title: 'Total Revenue (YTD)', value: '₹1,240,500', trend: '+14%', icon: LuIndianRupee, color: 'bg-emerald-500' },
    { title: 'Student Enrollment', value: '3,250', trend: '+5%', icon: LuUsers, color: 'bg-blue-500' },
    { title: 'Average Attendance', value: '94.2%', trend: '-1.2%', icon: LuTrendingUp, color: 'bg-indigo-500' },
    { title: 'Graduation Rate', value: '98.5%', trend: '+0.5%', icon: LuGraduationCap, color: 'bg-purple-500' },
  ];

  const handleDownload = () => {
    try {
      const data = metrics.map(m => ({
        Metric: m.title,
        Value: m.value,
        Trend: m.trend
      }));

      const revenueData = [
        { Month: 'Jan', Revenue: '₹40,000' },
        { Month: 'Feb', Revenue: '₹60,000' },
        { Month: 'Mar', Revenue: '₹45,000' },
        { Month: 'Apr', Revenue: '₹80,000' },
        { Month: 'May', Revenue: '₹55,000' },
        { Month: 'Jun', Revenue: '₹90,000' },
        { Month: 'Jul', Revenue: '₹70,000' }
      ];

      const attendanceData = [
        { Day: 'Mon', Attendance: '95%' },
        { Day: 'Tue', Attendance: '92%' },
        { Day: 'Wed', Attendance: '88%' },
        { Day: 'Thu', Attendance: '96%' },
        { Day: 'Fri', Attendance: '98%' },
        { Day: 'Sat', Attendance: '90%' },
        { Day: 'Sun', Attendance: '94%' }
      ];

      const wb = XLSX.utils.book_new();
      
      const wsMetrics = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, wsMetrics, "KPI Metrics");

      const wsRevenue = XLSX.utils.json_to_sheet(revenueData);
      XLSX.utils.book_append_sheet(wb, wsRevenue, "Revenue Overview");

      const wsAttendance = XLSX.utils.json_to_sheet(attendanceData);
      XLSX.utils.book_append_sheet(wb, wsAttendance, "Attendance Trends");

      XLSX.writeFile(wb, "School_Performance_Report.xlsx");
    } catch (error) {
      console.error("Failed to export report:", error);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto h-[calc(100vh-2rem)] flex flex-col overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-end mb-8 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Reports & Analytics</h1>
          <p className="text-slate-500 mt-1">Key performance metrics and school insights.</p>
        </div>
        <button 
          onClick={handleDownload}
          className="bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl hover:bg-slate-50 transition-all font-medium shadow-sm active:scale-95"
        >
          Download Full Report
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 shrink-0">
        {metrics.map((metric, idx) => (
          <div key={idx} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white ${metric.color}`}>
                <metric.icon size={24} />
              </div>
              <span className={`text-sm font-bold ${metric.trend.startsWith('+') ? 'text-emerald-600' : 'text-red-500'}`}>
                {metric.trend}
              </span>
            </div>
            <div>
              <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider">{metric.title}</p>
              <h2 className="text-3xl font-bold text-slate-900 mt-1">{metric.value}</h2>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[400px]">
        {/* Mock Chart 1 */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Revenue Overview</h3>
          <div className="flex-1 flex items-end justify-between gap-2 border-b border-slate-100 pb-2">
            {[40, 60, 45, 80, 55, 90, 70].map((h, i) => (
              <div key={i} className="w-full bg-emerald-100 rounded-t-md relative group hover:bg-emerald-200 transition-colors" style={{ height: `${h}%` }}>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  ₹{h}k
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium">
            <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span>
          </div>
        </div>

        {/* Mock Chart 2 */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Attendance Trends</h3>
          <div className="flex-1 flex items-end justify-between gap-2 border-b border-slate-100 pb-2">
            {[95, 92, 88, 96, 98, 90, 94].map((h, i) => (
              <div key={i} className="w-full bg-indigo-100 rounded-t-md relative group hover:bg-indigo-200 transition-colors" style={{ height: `${h}%` }}>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  {h}%
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium">
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
          </div>
        </div>
      </div>
    </div>
  );
}
