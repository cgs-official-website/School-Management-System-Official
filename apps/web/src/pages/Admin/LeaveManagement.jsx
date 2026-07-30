import React, { useState, useEffect } from 'react';
import { LuCheck, LuX, LuCalendar, LuUser, LuClock, LuDownload, LuFileText, LuInbox } from 'react-icons/lu';
import { useAuth } from '../../context/AuthContext';
import { subscribeToSubCollection, updateSubDocument } from '../../firebase/firestore';
import toast from 'react-hot-toast';

export default function LeaveManagement() {
  const { userProfile } = useAuth();
  const schoolId = userProfile?.schoolId;

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedLeave, setSelectedLeave] = useState(null);

  useEffect(() => {
    if (!schoolId) return;

    setLoading(true);
    const unsub = subscribeToSubCollection(schoolId, 'leaves', (data) => {
      // Sort leaves by submittedAt descending
      const sorted = data.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
      setLeaves(sorted);
      setLoading(false);
    });

    return () => {
      if (unsub) unsub();
    };
  }, [schoolId]);

  const handleStatusUpdate = async (leaveId, newStatus) => {
    if (!window.confirm(`Are you sure you want to mark this request as ${newStatus}?`)) return;

    try {
      await updateSubDocument(schoolId, 'leaves', leaveId, { status: newStatus });
      toast.success(`Leave request ${newStatus.toLowerCase()} successfully!`);
      setSelectedLeave(null);
    } catch (error) {
      console.error(error);
      toast.error(`Failed to update leave request.`);
    }
  };

  const pendingLeaves = leaves.filter(l => l.status === 'Pending');
  const pastLeaves = leaves.filter(l => l.status !== 'Pending');

  const getRoleBadge = (role) => {
    if (role === 'teacher') {
      return <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[11px] font-bold uppercase tracking-wider">Teacher</span>;
    }
    return <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-[11px] font-bold uppercase tracking-wider">Student</span>;
  };

  const getStatusBadge = (status) => {
    if (status === 'Approved') {
      return <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold uppercase tracking-wider">Approved</span>;
    }
    return <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold uppercase tracking-wider">Rejected</span>;
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto h-full flex flex-col animate-fade-in-up">
      {/* Header */}
      <div className="mb-8 shrink-0">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Leave Management</h1>
        <p className="text-slate-500 mt-1">Review, approve, or reject leave requests from teachers and students.</p>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 px-6 pt-4 shrink-0">
          <button 
            onClick={() => setActiveTab('pending')}
            className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'pending' ? 'border-primary-600 text-primary-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
          >
            <LuClock size={18} /> Pending Requests ({pendingLeaves.length})
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'history' ? 'border-primary-600 text-primary-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
          >
            <LuFileText size={18} /> History ({pastLeaves.length})
          </button>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
            </div>
          ) : (
            <>
              {activeTab === 'pending' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pendingLeaves.map(leave => (
                    <div 
                      key={leave.id} 
                      onClick={() => setSelectedLeave(leave)}
                      className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-primary-350 hover:shadow-md hover:scale-[1.01] transition-all flex flex-col justify-between cursor-pointer"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-2">
                            <LuUser className="text-slate-400" size={16} />
                            <div>
                              <p className="font-bold text-slate-900 leading-none">{leave.applicantName}</p>
                              <p className="text-[10px] text-slate-400 mt-1 font-semibold">Submitted: {new Date(leave.submittedAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          {getRoleBadge(leave.applicantRole)}
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-xs font-extrabold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 w-fit">
                            <LuCalendar size={14} />
                            {new Date(leave.startDate).toLocaleDateString()} — {new Date(leave.endDate).toLocaleDateString()}
                          </div>
                          <p className="text-xs font-bold text-primary-600 uppercase tracking-wider">{leave.leaveType}</p>
                          <p className="text-sm font-semibold text-slate-700 leading-relaxed italic line-clamp-3">
                            "{leave.reason}"
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-6 text-xs text-slate-400 font-bold">
                        <span>Click to view details</span>
                        {leave.supportingDoc && (
                          <span className="bg-primary-50 text-primary-700 px-2 py-0.5 rounded text-[10px]">Has Document</span>
                        )}
                      </div>
                    </div>
                  ))}

                  {pendingLeaves.length === 0 && (
                    <div className="col-span-full text-center py-12 text-slate-500">
                      <LuInbox size={48} className="mx-auto mb-4 text-slate-300" />
                      <p className="text-lg font-medium text-slate-700">No pending leave requests.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pastLeaves.map(leave => (
                    <div 
                      key={leave.id} 
                      onClick={() => setSelectedLeave(leave)}
                      className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-primary-350 hover:shadow-md hover:scale-[1.01] transition-all flex flex-col justify-between cursor-pointer opacity-85"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-2">
                            <LuUser className="text-slate-400" size={16} />
                            <div>
                              <p className="font-bold text-slate-900 leading-none">{leave.applicantName}</p>
                              <p className="text-[10px] text-slate-400 mt-1 font-semibold">Submitted: {new Date(leave.submittedAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          {getStatusBadge(leave.status)}
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                            <LuCalendar size={14} />
                            {new Date(leave.startDate).toLocaleDateString()} — {new Date(leave.endDate).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-2">
                            {getRoleBadge(leave.applicantRole)}
                            <span className="text-xs font-bold text-primary-600 uppercase tracking-wider">{leave.leaveType}</span>
                          </div>
                          <p className="text-sm font-semibold text-slate-700 leading-relaxed italic line-clamp-3">
                            "{leave.reason}"
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-6 text-xs text-slate-400 font-bold">
                        <span>Click to view details</span>
                        {leave.supportingDoc && (
                          <span className="bg-primary-50 text-primary-700 px-2 py-0.5 rounded text-[10px]">Has Document</span>
                        )}
                      </div>
                    </div>
                  ))}

                  {pastLeaves.length === 0 && (
                    <div className="col-span-full text-center py-12 text-slate-500">
                      <LuFileText size={48} className="mx-auto mb-4 text-slate-300" />
                      <p className="text-lg font-medium text-slate-700">No leave request history available.</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Details Dialog Popup */}
      {selectedLeave && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-fade-in-up">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden transform transition-all flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">Leave Details</h3>
                <p className="text-xs text-slate-500 mt-1 font-semibold">Submitted by {selectedLeave.applicantName} ({selectedLeave.applicantRole})</p>
              </div>
              <button 
                onClick={() => setSelectedLeave(null)}
                className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition-colors"
              >
                <LuX size={22} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Leave Type</span>
                  <p className="text-sm font-bold text-primary-700 mt-0.5">{selectedLeave.leaveType}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Submission Date</span>
                  <p className="text-sm font-bold text-slate-700 mt-0.5">{new Date(selectedLeave.submittedAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-500">Duration Range</span>
                <p className="text-sm font-bold text-slate-800 mt-0.5 flex items-center gap-1.5">
                  <LuCalendar size={16} className="text-primary-500" />
                  {new Date(selectedLeave.startDate).toLocaleDateString()} — {new Date(selectedLeave.endDate).toLocaleDateString()}
                </p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">Reason for Request</span>
                <p className="text-sm font-semibold text-slate-700 leading-relaxed mt-1.5 border border-slate-100 p-4 rounded-2xl bg-slate-50/30 italic">
                  "{selectedLeave.reason}"
                </p>
              </div>

              {selectedLeave.supportingDoc && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LuFileText size={20} className="text-slate-400" />
                    <div>
                      <p className="text-xs font-bold text-slate-700">{selectedLeave.supportingDoc.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-bold">{selectedLeave.supportingDoc.size}</p>
                    </div>
                  </div>
                  <a
                    href={selectedLeave.supportingDoc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition-colors"
                  >
                    <LuDownload size={14} />
                    Download Doc
                  </a>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
              {selectedLeave.status === 'Pending' ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate(selectedLeave.id, 'Rejected')}
                    className="px-5 py-2.5 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 rounded-xl text-sm font-bold transition-colors flex items-center gap-1.5"
                  >
                    <LuX size={18} />
                    Reject Leave
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate(selectedLeave.id, 'Approved')}
                    className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    <LuCheck size={18} />
                    Approve Leave
                  </button>
                </>
              ) : (
                <div className="w-full flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase">Status:</span>
                    {getStatusBadge(selectedLeave.status)}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedLeave(null)}
                    className="px-5 py-2 border border-slate-200 hover:bg-white rounded-xl text-sm font-bold text-slate-700 transition-colors"
                  >
                    Close Details
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
