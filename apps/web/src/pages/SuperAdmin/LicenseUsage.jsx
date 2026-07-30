import React, { useState, useEffect } from 'react';
import { LuKey, LuSearch, LuTriangleAlert, LuCircleCheck, LuTrendingUp } from 'react-icons/lu';

export default function LicenseUsage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const schools = [
    { id: 1, name: 'Greenwood High', plan: 'Enterprise', students: { current: 1850, limit: 2000 }, teachers: { current: 145, limit: 150 }, status: 'healthy' },
    { id: 2, name: 'Oakridge International', plan: 'Pro', students: { current: 495, limit: 500 }, teachers: { current: 50, limit: 50 }, status: 'warning' },
    { id: 3, name: 'Sunrise Academy', plan: 'Basic', students: { current: 120, limit: 100 }, teachers: { current: 12, limit: 10 }, status: 'exceeded' },
    { id: 4, name: 'Lakeside Public School', plan: 'Pro', students: { current: 340, limit: 500 }, teachers: { current: 28, limit: 50 }, status: 'healthy' },
  ];

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredSchools = schools.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const totalPages = Math.ceil(filteredSchools.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSchools = filteredSchools.slice(startIndex, startIndex + itemsPerPage);

  const getStatusBadge = (status) => {
    switch(status) {
      case 'healthy': return <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700"><LuCircleCheck size={14} /> Healthy</span>;
      case 'warning': return <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700"><LuTriangleAlert size={14} /> Near Limit</span>;
      case 'exceeded': return <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700"><LuTrendingUp size={14} /> Exceeded</span>;
      default: return null;
    }
  };

  const getUsageBar = (current, limit) => {
    const percentage = Math.min((current / limit) * 100, 100);
    const colorClass = percentage >= 100 ? 'bg-red-500' : percentage > 85 ? 'bg-amber-500' : 'bg-green-500';
    return (
      <div className="w-full">
        <div className="flex justify-between text-xs mb-1 font-semibold">
          <span className="text-slate-700">{current} used</span>
          <span className="text-slate-500">{limit} limit</span>
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full ${colorClass} transition-all`} style={{ width: `${percentage}%` }}></div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col">
      <div className="mb-8 shrink-0 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <LuKey className="text-primary-600" /> License & Usage Management
          </h1>
          <p className="text-slate-500 mt-1">Monitor active users across all tenant schools to ensure plan compliance.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 shrink-0">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
            <LuKey size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500">Total Active Licenses</p>
            <p className="text-2xl font-black text-slate-900">2,805</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <LuTriangleAlert size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500">Schools Near Limit</p>
            <p className="text-2xl font-black text-slate-900">1</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <LuTrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500">Schools Exceeded Limit</p>
            <p className="text-2xl font-black text-slate-900">1</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden mb-6">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex gap-4 shrink-0">
          <div className="relative flex-1 max-w-md">
            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="Search schools..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 bg-white shadow-sm z-10">
              <tr className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
                <th className="p-4 font-bold">School Name</th>
                <th className="p-4 font-bold">Current Plan</th>
                <th className="p-4 font-bold w-1/4">Student Usage</th>
                <th className="p-4 font-bold w-1/4">Teacher Usage</th>
                <th className="p-4 font-bold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedSchools.map((school) => (
                <tr key={school.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-bold text-slate-900">{school.name}</td>
                  <td className="p-4">
                    <span className="px-3 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg text-sm">{school.plan}</span>
                  </td>
                  <td className="p-4">
                    {getUsageBar(school.students.current, school.students.limit)}
                  </td>
                  <td className="p-4">
                    {getUsageBar(school.teachers.current, school.teachers.limit)}
                  </td>
                  <td className="p-4 text-right flex justify-end">
                    {getStatusBadge(school.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-sm text-slate-500 font-medium">
              Showing <span className="font-semibold text-slate-900">{startIndex + 1}</span> to{' '}
              <span className="font-semibold text-slate-900">
                {Math.min(startIndex + itemsPerPage, filteredSchools.length)}
              </span>{' '}
              of <span className="font-semibold text-slate-900">{filteredSchools.length}</span> schools
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3.5 py-2 rounded-xl text-sm font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNum = idx + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`h-9 w-9 flex items-center justify-center rounded-xl text-sm font-bold transition-all ${
                      currentPage === pageNum
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3.5 py-2 rounded-xl text-sm font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
