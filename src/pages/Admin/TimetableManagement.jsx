import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSubCollection, saveTimetable, subscribeToSubCollection } from '../../firebase/firestore';
import { LuCalendar as Calendar, LuPlus as Plus, LuX as X, LuClock as Clock, LuBookOpen as BookOpen, LuUser as User, LuTrash2 as Trash2, LuPencil as Edit2 } from 'react-icons/lu';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import toast from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';

export default function TimetableManagement() {
  const { userProfile } = useAuth();
  const schoolId = userProfile?.schoolId;

  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  
  const [schedule, setSchedule] = useState({
    Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: []
  });
  
  const [allTimetables, setAllTimetables] = useState({});
  const [masterDay, setMasterDay] = useState('Monday');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmModalState, setConfirmModalState] = useState({ isOpen: false, day: null, slotId: null });
  const [activeDay, setActiveDay] = useState('Monday');
  const [editingSlotId, setEditingSlotId] = useState(null);
  const [newSlot, setNewSlot] = useState({
    startTime: '09:00',
    endTime: '10:00',
    subject: '',
    teacher: '',
    teacherId: ''
  });

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);
    const unsubClasses = subscribeToSubCollection(schoolId, 'classes', (data) => {
      setClasses(data);
      setLoading(false);
    });
    const unsubTeachers = subscribeToSubCollection(schoolId, 'teachers', (data) => {
      setTeachers(data);
    });
    const unsubSubjects = subscribeToSubCollection(schoolId, 'subjects', (data) => {
      setSubjects(data);
    });
    const unsubAllTimetables = subscribeToSubCollection(schoolId, 'timetables', (data) => {
      const timetablesMap = {};
      data.forEach(t => {
        timetablesMap[t.id] = t.schedule || {};
      });
      setAllTimetables(timetablesMap);
    });
    return () => {
      unsubClasses();
      unsubTeachers();
      unsubSubjects();
      unsubAllTimetables();
    };
  }, [schoolId]);

  useEffect(() => {
    if (schoolId && selectedClassId) {
      setLoading(true);
      const unsub = onSnapshot(doc(db, `schools/${schoolId}/timetables`, selectedClassId), (docSnap) => {
        if (docSnap.exists()) {
          const scheduleData = docSnap.data().schedule || {};
          setSchedule({
            Monday: scheduleData.Monday || [],
            Tuesday: scheduleData.Tuesday || [],
            Wednesday: scheduleData.Wednesday || [],
            Thursday: scheduleData.Thursday || [],
            Friday: scheduleData.Friday || [],
            Saturday: scheduleData.Saturday || []
          });
        } else {
          setSchedule({ Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [] });
        }
        setLoading(false);
      });
      return () => unsub();
    } else {
      setSchedule({ Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [] });
    }
  }, [schoolId, selectedClassId]);

  const handleAddSlot = (e) => {
    e.preventDefault();
    if (!newSlot.subject || !newSlot.teacherId) return;

    const newSchedule = { ...schedule };
    
    if (editingSlotId) {
      newSchedule[activeDay] = newSchedule[activeDay].map(s => 
        s.id === editingSlotId ? { ...s, ...newSlot } : s
      );
    } else {
      const slot = {
        id: Date.now().toString(),
        ...newSlot
      };
      newSchedule[activeDay].push(slot);
    }
    
    // Sort slots by start time
    newSchedule[activeDay].sort((a, b) => a.startTime.localeCompare(b.startTime));
    
    setSchedule(newSchedule);
    setShowAddModal(false);
    setEditingSlotId(null);
    
    // Reset form but keep times (often admins add back-to-back periods)
    setNewSlot({
      startTime: newSlot.endTime, // auto-suggest next period start
      endTime: '',
      subject: '',
      teacher: '',
      teacherId: ''
    });
  };

  const handleEditSlot = (day, slot) => {
    setActiveDay(day);
    setEditingSlotId(slot.id);
    setNewSlot({
      startTime: slot.startTime,
      endTime: slot.endTime,
      subject: slot.subject,
      teacher: slot.teacher,
      teacherId: slot.teacherId || ''
    });
    setShowAddModal(true);
  };

  const handleDeleteClick = (day, slotId) => {
    setConfirmModalState({ isOpen: true, day, slotId });
  };

  const executeDelete = () => {
    const { day, slotId } = confirmModalState;
    if (!day || !slotId) return;
    const newSchedule = { ...schedule };
    newSchedule[day] = newSchedule[day].filter(s => s.id !== slotId);
    setSchedule(newSchedule);
    setConfirmModalState({ isOpen: false, day: null, slotId: null });
  };

  const handleSaveTimetable = async () => {
    if (!selectedClassId) return;
    setSaving(true);
    try {
      await saveTimetable(schoolId, selectedClassId, schedule);
      toast.success("Timetable saved successfully!");
    } catch (error) {
      console.error("Error saving timetable:", error);
      toast.error("Failed to save timetable.");
    } finally {
      setSaving(false);
    }
  };

  if (loading && classes.length === 0) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto pb-24 h-[calc(100vh-2rem)] flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Timetable Management</h1>
          <p className="text-slate-500 mt-1">Structure the weekly schedule for each class.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm w-full md:w-auto">
          <select 
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="px-4 py-2 bg-transparent border-none focus:ring-0 text-slate-700 font-medium w-full md:w-64"
          >
            <option value="">Select a Class...</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name} - Section {c.section}</option>
            ))}
          </select>
          
          <button 
            onClick={handleSaveTimetable}
            disabled={!selectedClassId || saving}
            className="px-6 py-2 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {!selectedClassId ? (
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col min-h-0 overflow-hidden animate-fade-in-up">
          <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 bg-slate-50/50">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Master Timetable</h2>
              <p className="text-sm text-slate-500 font-medium">Overview of all classes for {masterDay}</p>
            </div>
            <div className="flex gap-2 overflow-x-auto max-w-full pb-2 sm:pb-0 custom-scrollbar">
              {daysOfWeek.map(day => (
                <button
                  key={day}
                  onClick={() => setMasterDay(day)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                    masterDay === day 
                      ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20' 
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex-1 overflow-auto p-4 sm:p-6 custom-scrollbar space-y-6">
            {classes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Calendar size={48} className="mb-4 text-slate-200" />
                <p className="font-bold">No classes available.</p>
              </div>
            ) : (
              classes.map(cls => {
                const classSchedule = allTimetables[cls.id]?.[masterDay] || [];
                return (
                  <div key={cls.id} className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white hover:border-primary-200 transition-colors">
                    <div className="bg-slate-50/80 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary-500"></span>
                        {cls.name} - Section {cls.section}
                      </h3>
                      <button 
                        onClick={() => setSelectedClassId(cls.id)}
                        className="text-xs font-bold text-primary-600 hover:text-white bg-primary-50 hover:bg-primary-600 px-3 py-1.5 rounded-lg transition-colors border border-primary-100 hover:border-primary-600 shadow-sm"
                      >
                        Edit Timetable
                      </button>
                    </div>
                    <div className="p-4 bg-white flex gap-4 overflow-x-auto custom-scrollbar">
                      {classSchedule.length === 0 ? (
                        <div className="w-full text-center py-6">
                          <p className="text-sm font-semibold text-slate-400">No periods scheduled for {masterDay}.</p>
                        </div>
                      ) : (
                        classSchedule.map(slot => (
                          <div key={slot.id} className="shrink-0 w-52 border border-slate-100 rounded-xl p-3.5 bg-slate-50/50 hover:bg-white hover:border-primary-200 hover:shadow-md transition-all group">
                            <div className="text-xs font-bold text-primary-600 mb-2 flex items-center gap-1.5">
                              <Clock size={12} />
                              {slot.startTime} - {slot.endTime}
                            </div>
                            <div className="font-bold text-slate-900 mb-1.5 text-sm truncate" title={slot.subject}>
                              {slot.subject}
                            </div>
                            <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 truncate bg-slate-100 px-2 py-1 rounded-md" title={slot.teacher}>
                              <User size={10} className="text-slate-400" />
                              {slot.teacher}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-slate-100 rounded-3xl border border-slate-200 shadow-inner overflow-hidden flex flex-col min-h-0">
          {/* Grid Header (Days) */}
          <div className="grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-slate-200 bg-white border-b border-slate-200 shrink-0">
            {daysOfWeek.map(day => (
              <div key={day} className="p-4 text-center font-bold text-slate-700 uppercase tracking-wider text-sm flex justify-between items-center md:block">
                <span>{day}</span>
                <button 
                  onClick={() => { 
                    setActiveDay(day); 
                    setEditingSlotId(null);
                    setNewSlot({
                      startTime: '09:00',
                      endTime: '10:00',
                      subject: '',
                      teacher: '',
                      teacherId: ''
                    });
                    setShowAddModal(true); 
                  }}
                  className="md:mt-2 text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 p-1.5 md:mx-auto rounded-lg transition-colors flex items-center justify-center"
                  title={`Add slot to ${day}`}
                >
                  <Plus size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* Grid Columns (Slots) */}
          <div className="flex-1 overflow-y-auto p-4 md:p-0">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-0 md:divide-x divide-slate-200 min-h-full">
              {daysOfWeek.map(day => (
                <div key={day} className="bg-slate-50/50 p-2 space-y-3 md:min-h-[500px]">
                  {/* Mobile Day Header (only visible on small screens) */}
                  <h3 className="font-bold text-slate-700 md:hidden mb-2 px-2">{day}</h3>
                  
                  {schedule[day]?.length === 0 ? (
                    <div className="text-center p-4 text-sm text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl mx-2">
                      Free Day
                    </div>
                  ) : (
                    schedule[day].map(slot => (
                      <div key={slot.id} className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm hover:shadow-md transition-shadow group relative">
                        
                        <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1.5">
                          <Clock size={12} className="text-primary-500" />
                          {slot.startTime} - {slot.endTime}
                        </div>
                        
                        <div className="font-bold text-slate-900 mb-2 flex items-start gap-1.5 leading-tight">
                          <BookOpen size={14} className="text-primary-500 shrink-0 mt-0.5" />
                          {slot.subject}
                        </div>
                        
                        <div className="text-xs font-medium text-slate-600 bg-slate-50 px-2 py-1 rounded-lg inline-flex items-center gap-1.5 border border-slate-100">
                          <User size={12} className="text-slate-400" />
                          {slot.teacher}
                        </div>

                        {/* Edit and Delete Buttons (visible on hover) */}
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button 
                            onClick={() => handleEditSlot(day, slot)}
                            className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                            title="Edit Period"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(day, slot.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            title="Delete Period"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Slot Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                {editingSlotId ? <Edit2 className="text-primary-600" /> : <Plus className="text-primary-600" />} 
                {editingSlotId ? `Edit Period in ${activeDay}` : `Add Period to ${activeDay}`}
              </h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddSlot} className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
              <div className="p-6 space-y-6 flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Start Time</label>
                    <input 
                      type="time" required
                      value={newSlot.startTime}
                      onChange={(e) => setNewSlot({...newSlot, startTime: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">End Time</label>
                    <input 
                      type="time" required
                      value={newSlot.endTime}
                      onChange={(e) => setNewSlot({...newSlot, endTime: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Subject</label>
                    <select
                      required
                      value={newSlot.subject}
                      onChange={(e) => setNewSlot({...newSlot, subject: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                    >
                      <option value="">Select Subject...</option>
                      {subjects.map(sub => (
                        <option key={sub.id} value={sub.name}>{sub.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Teacher</label>
                  <select
                    required
                    value={newSlot.teacherId}
                    onChange={(e) => {
                      const teacher = teachers.find(t => t.id === e.target.value);
                      if (teacher) {
                        const displayName = teacher.name || `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim();
                        setNewSlot({...newSlot, teacherId: teacher.id, teacher: displayName});
                      } else {
                        setNewSlot({...newSlot, teacherId: '', teacher: ''});
                      }
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option value="">Select Teacher...</option>
                    {teachers.map(t => {
                      const displayName = t.name || `${t.firstName || ''} ${t.lastName || ''}`.trim();
                      return (
                        <option key={t.id} value={t.id}>{displayName || 'Unnamed Teacher'}</option>
                      );
                    })}
                  </select>
                </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2.5 bg-primary-600 text-white font-bold hover:bg-primary-700 rounded-xl shadow-sm transition-colors"
                >
                  {editingSlotId ? 'Update Period' : 'Add Period'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState({ isOpen: false, day: null, slotId: null })}
        onConfirm={executeDelete}
        title="Delete Timetable Slot"
        message="Are you sure you want to delete this class period? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
}
