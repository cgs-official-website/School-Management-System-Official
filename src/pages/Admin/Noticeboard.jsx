import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createNotice, getNotices, deleteNotice, subscribeToNotices } from '../../firebase/firestore';
import { LuBell as Bell, LuPlus as Plus, LuX as X, LuTrash2 as Trash2, LuMegaphone as Megaphone, LuUsers as Users, LuGraduationCap as GraduationCap, LuTriangleAlert as AlertTriangle, LuCircleCheck as CheckCircle2, LuSend as Send } from 'react-icons/lu';
import toast from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';

const mockNotices = [
  { id: 'm1', title: 'Welcome to the new academic year', content: 'Classes begin next week.', targetAudience: 'All', date: '2026-07-01' },
  { id: 'm2', title: 'Parent-Teacher Meeting', content: 'Scheduled for Friday.', targetAudience: 'Parents', date: '2026-07-05' },
  { id: 'm3', title: 'Sports Day Rehearsal', content: 'Please bring your kits.', targetAudience: 'Students', date: '2026-07-10' },
  { id: 'm4', title: 'Staff Meeting', content: 'Mandatory staff meeting in the main hall.', targetAudience: 'Teachers', date: '2026-07-12' },
  { id: 'm5', title: 'Library Renovation', content: 'Library closed for maintenance.', targetAudience: 'All', date: '2026-07-15' },
  { id: 'm6', title: 'Exam Schedule Released', content: 'Midterm exams schedule is up.', targetAudience: 'Students', date: '2026-07-20' },
  { id: 'm7', title: 'Fee Payment Deadline', content: 'Last date is 31st July.', targetAudience: 'Parents', date: '2026-07-22' },
  { id: 'm8', title: 'Science Fair Entries', content: 'Submit your projects to Mr. Smith.', targetAudience: 'Students', date: '2026-07-25' },
  { id: 'm9', title: 'Workshop on Cyber Security', content: 'For all high school students.', targetAudience: 'Students', date: '2026-07-28' },
  { id: 'm10', title: 'Holiday Announcement', content: 'School closed on Monday for Labor Day.', targetAudience: 'All', date: '2026-08-01' },
];

export default function Noticeboard() {
  const { userProfile, currentUser } = useAuth();
  const schoolId = userProfile?.schoolId;

  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [confirmModalState, setConfirmModalState] = useState({ isOpen: false, noticeId: null });
  const [newNotice, setNewNotice] = useState({
    title: '',
    message: '',
    audience: 'all',
    priority: 'normal',
    sendWhatsApp: false
  });

  useEffect(() => {
    if (!schoolId) return;

    setLoading(true);
    const unsubscribe = subscribeToNotices(schoolId, null, (data) => {
      setNotices(data.length > 0 ? data : mockNotices);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [schoolId]);

  const handleCreateNotice = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createNotice(schoolId, {
        ...newNotice,
        authorId: currentUser.uid,
        authorName: userProfile.firstName + ' ' + userProfile.lastName
      });
      // Listener handles state update
      if (newNotice.sendWhatsApp) {
        // Simulate WhatsApp API integration
        console.log(`[WhatsApp API] Broadcasting to ${newNotice.audience}: ${newNotice.title}`);
        toast.success("Notice published! WhatsApp messages queued for delivery.");
      } else {
        toast.success("Notice published successfully!");
      }
      setShowCreateModal(false);
      setNewNotice({ title: '', message: '', audience: 'all', priority: 'normal', sendWhatsApp: false });
    } catch (error) {
      toast.error("Failed to create notice.");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteClick = (noticeId) => {
    setConfirmModalState({ isOpen: true, noticeId });
  };

  const executeDeleteNotice = async () => {
    const noticeId = confirmModalState.noticeId;
    if (!noticeId) return;
    try {
      await deleteNotice(schoolId, noticeId);
      // Listener handles state update
    } catch (error) {
      toast.error("Failed to delete notice.");
    } finally {
      setConfirmModalState({ isOpen: false, noticeId: null });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto pb-24">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Megaphone className="text-primary-600" />
            Noticeboard
          </h1>
          <p className="text-slate-500 mt-1">Broadcast important announcements to teachers and parents.</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-2.5 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 shadow-sm flex items-center gap-2 transition-colors"
        >
          <Plus size={20} /> Create Notice
        </button>
      </div>

      <div className="space-y-4">
        {notices.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500">
            <Bell size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-medium text-slate-900">No active notices</p>
            <p>Click "Create Notice" to broadcast your first announcement.</p>
          </div>
        ) : (
          notices.map((notice) => {
            const isHighPriority = notice.priority === 'high';
            return (
              <div 
                key={notice.id} 
                className={`bg-white rounded-3xl border p-6 flex flex-col md:flex-row gap-6 shadow-sm transition-all hover:shadow-md
                  ${isHighPriority ? 'border-red-200 bg-red-50/10' : 'border-slate-200'}
                `}
              >
                <div className="flex-1 space-y-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      {isHighPriority && (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold uppercase tracking-wider">
                          <AlertTriangle size={14} /> High Priority
                        </span>
                      )}
                      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider
                        ${notice.audience === 'all' ? 'bg-purple-100 text-purple-700' : 
                          notice.audience === 'teachers' ? 'bg-blue-100 text-blue-700' : 
                          'bg-green-100 text-green-700'}
                      `}>
                        {notice.audience === 'all' && <Users size={14} />}
                        {notice.audience === 'teachers' && <GraduationCap size={14} />}
                        {notice.audience === 'parents' && <Users size={14} />}
                        To: {notice.audience}
                      </span>
                      <span className="text-sm font-medium text-slate-400 ml-auto">
                        {new Date(notice.createdAt).toLocaleString(undefined, {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">{notice.title}</h3>
                  </div>
                  
                  <div className="text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
                    {notice.message}
                  </div>
                  
                  <div className="text-sm font-medium text-slate-400">
                    Posted by: {notice.authorName}
                  </div>
                </div>
                
                <div className="shrink-0 flex items-start md:items-center">
                  <button 
                    onClick={() => handleDeleteClick(notice.id)}
                    className="p-3 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors tooltip-trigger"
                    title="Delete Notice"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Bell className="text-primary-600" /> Broadcast Notice
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateNotice} className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
              <div className="p-6 space-y-6 flex-1">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Notice Title</label>
                  <input 
                    type="text" required
                    value={newNotice.title}
                    onChange={(e) => setNewNotice({...newNotice, title: e.target.value})}
                    placeholder="e.g. School closed tomorrow"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white font-medium"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Message</label>
                  <textarea 
                    required rows="4"
                    value={newNotice.message}
                    onChange={(e) => setNewNotice({...newNotice, message: e.target.value})}
                    placeholder="Type the full announcement here..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white font-medium resize-none"
                  ></textarea>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Target Audience</label>
                    <select 
                      value={newNotice.audience}
                      onChange={(e) => setNewNotice({...newNotice, audience: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white font-medium"
                    >
                      <option value="all">Everyone (Teachers & Parents)</option>
                      <option value="teachers">Teachers Only</option>
                      <option value="parents">Parents Only</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Priority</label>
                    <select 
                      value={newNotice.priority}
                      onChange={(e) => setNewNotice({...newNotice, priority: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white font-medium"
                    >
                      <option value="normal">Normal</option>
                      <option value="high">High (Urgent)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl cursor-pointer hover:bg-emerald-100 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={newNotice.sendWhatsApp}
                      onChange={(e) => setNewNotice({...newNotice, sendWhatsApp: e.target.checked})}
                      className="w-5 h-5 text-emerald-600 border-emerald-300 rounded focus:ring-emerald-500 cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-emerald-900">Broadcast via WhatsApp</span>
                      <span className="text-xs font-medium text-emerald-700">Send an instant SMS alert to the target audience</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="px-6 py-2.5 bg-primary-600 text-white font-bold hover:bg-primary-700 rounded-xl shadow-sm flex items-center gap-2 transition-colors">
                  {creating ? 'Sending...' : <><Send size={18} /> Broadcast</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState({ isOpen: false, noticeId: null })}
        onConfirm={executeDeleteNotice}
        title="Delete Notice"
        message="Are you sure you want to delete this notice? It will be removed from all user dashboards immediately."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
}
