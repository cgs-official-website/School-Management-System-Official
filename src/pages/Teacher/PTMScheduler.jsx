import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  subscribeToClassPTMs, 
  subscribeToStudentsByClass, 
  createPTM, 
  updatePTM 
} from '../../firebase/firestore';
import { LuCalendarClock, LuPlus, LuCalendarCheck, LuClock, LuUsers, LuCircleCheck, LuVideo, LuMapPin, LuCircleX, LuX } from 'react-icons/lu';
import toast from 'react-hot-toast';

export default function PTMScheduler() {
  const { userProfile } = useAuth();
  const schoolId = userProfile?.schoolId;
  const classId = userProfile?.assignedClassId;

  const [activeTab, setActiveTab] = useState('upcoming');
  const [meetings, setMeetings] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newMeeting, setNewMeeting] = useState({
    studentId: '',
    date: '',
    time: '',
    type: 'online'
  });

  useEffect(() => {
    if (!schoolId || !classId) return;
    
    setLoading(true);
    let unsubMeetings, unsubStudents;

    unsubMeetings = subscribeToClassPTMs(schoolId, classId, (data) => {
      // sort by date descending
      data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setMeetings(data);
      setLoading(false);
    });

    unsubStudents = subscribeToStudentsByClass(schoolId, classId, (data) => {
      setStudents(data);
    });

    return () => {
      if (unsubMeetings) unsubMeetings();
      if (unsubStudents) unsubStudents();
    };
  }, [schoolId, classId]);

  const handleBookMeeting = async (e) => {
    e.preventDefault();
    if (!newMeeting.studentId || !newMeeting.date || !newMeeting.time) return;

    const student = students.find(s => s.id === newMeeting.studentId);
    if (!student) return;

    setCreating(true);
    try {
      await createPTM(schoolId, {
        classId,
        teacherId: userProfile?.uid,
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        parentName: student.parentName || 'Parent',
        date: newMeeting.date,
        time: newMeeting.time,
        type: newMeeting.type,
        status: 'confirmed'
      });
      toast.success("Meeting booked successfully!");
      setShowCreateModal(false);
      setNewMeeting({ studentId: '', date: '', time: '', type: 'online' });
    } catch (error) {
      toast.error("Failed to book meeting");
    } finally {
      setCreating(false);
    }
  };

  const updateMeetingStatus = async (ptmId, status) => {
    try {
      await updatePTM(schoolId, ptmId, { status });
      toast.success(`Meeting ${status}`);
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'confirmed': return <span className="flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold uppercase tracking-wider"><LuCircleCheck size={14} /> Confirmed</span>;
      case 'pending': return <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold uppercase tracking-wider"><LuClock size={14} /> Pending</span>;
      case 'cancelled': return <span className="flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold uppercase tracking-wider"><LuCircleX size={14} /> Cancelled</span>;
      default: return null;
    }
  };

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  
  const displayedMeetings = meetings.filter(m => {
    if (activeTab === 'upcoming') {
      return m.date >= todayStr;
    } else {
      return m.date < todayStr;
    }
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto h-full flex flex-col relative">
      <div className="mb-8 shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <LuCalendarClock className="text-primary-600" /> PTM Scheduler
          </h1>
          <p className="text-slate-500 mt-1">Manage Parent-Teacher Meetings and set your availability.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowCreateModal(true)} className="px-6 py-2.5 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-colors flex items-center gap-2">
            <LuPlus size={18} /> Book Meeting
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex border-b border-slate-100 bg-slate-50/50 px-6 pt-4 shrink-0">
          <button 
            onClick={() => setActiveTab('upcoming')}
            className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'upcoming' ? 'border-primary-600 text-primary-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
          >
            <LuCalendarCheck size={18} /> Upcoming Meetings
          </button>
          <button 
            onClick={() => setActiveTab('past')}
            className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'past' ? 'border-primary-600 text-primary-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
          >
            <LuCalendarClock size={18} /> Past Meetings
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {displayedMeetings.map(meeting => (
              <div key={meeting.id} className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-primary-300 hover:shadow-md transition-all flex flex-col group">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 group-hover:bg-primary-50 group-hover:text-primary-500 transition-colors">
                      <LuUsers size={24} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 leading-tight">{meeting.parentName}</h3>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">Ref: {meeting.studentName}</p>
                    </div>
                  </div>
                  {getStatusBadge(meeting.status)}
                </div>
                
                <div className="bg-slate-50 rounded-xl p-4 mb-4 flex-1">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Date & Time</p>
                      <p className="text-sm font-semibold text-slate-700">{new Date(meeting.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at {meeting.time}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Meeting Type</p>
                      <p className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                        {meeting.type === 'online' ? <LuVideo size={14} className="text-blue-500" /> : <LuMapPin size={14} className="text-amber-500" />}
                        <span className="capitalize">{meeting.type}</span>
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-2">
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg">Class PTM</span>
                  
                  {meeting.status === 'pending' ? (
                    <div className="flex gap-2">
                      <button onClick={() => updateMeetingStatus(meeting.id, 'cancelled')} className="px-4 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors">Decline</button>
                      <button onClick={() => updateMeetingStatus(meeting.id, 'confirmed')} className="px-4 py-1.5 bg-primary-600 text-white text-xs font-bold rounded-lg hover:bg-primary-700 transition-colors">Approve</button>
                    </div>
                  ) : meeting.status === 'confirmed' && activeTab === 'upcoming' ? (
                    <button onClick={() => updateMeetingStatus(meeting.id, 'cancelled')} className="text-sm font-bold text-red-600 hover:text-red-700">Cancel</button>
                  ) : (
                    <button className="text-sm font-bold text-primary-600 hover:text-primary-700">View Details &rarr;</button>
                  )}
                </div>
              </div>
            ))}
            {displayedMeetings.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-500 font-medium">
                No meetings found in this category.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-slate-900">Book Meeting</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
                <LuX size={20} />
              </button>
            </div>

            <form onSubmit={handleBookMeeting}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Select Student</label>
                  <select 
                    required
                    value={newMeeting.studentId}
                    onChange={(e) => setNewMeeting({...newMeeting, studentId: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option value="">-- Choose Student --</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Date</label>
                    <input 
                      type="date" required min={todayStr}
                      value={newMeeting.date}
                      onChange={(e) => setNewMeeting({...newMeeting, date: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Time</label>
                    <input 
                      type="time" required
                      value={newMeeting.time}
                      onChange={(e) => setNewMeeting({...newMeeting, time: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Meeting Type</label>
                  <select 
                    value={newMeeting.type}
                    onChange={(e) => setNewMeeting({...newMeeting, type: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option value="online">Online (Video Call)</option>
                    <option value="in-person">In-Person</option>
                  </select>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="px-6 py-2.5 bg-primary-600 text-white font-bold hover:bg-primary-700 rounded-xl shadow-sm transition-colors">
                  {creating ? 'Booking...' : 'Book Meeting'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

