import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSubCollection, addSubDocument, subscribeToSubCollection, updateSubDocument } from '../../firebase/firestore';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { LuBookOpen as BookOpen, LuPlus as Plus, LuTrash2 as Trash2, LuUsers as Users } from 'react-icons/lu';
import { TableSkeleton } from '../../components/Skeleton';
import toast from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';

const mockClasses = [
  { id: 'm1', name: 'Grade 1', section: 'A' },
  { id: 'm2', name: 'Grade 1', section: 'B' },
  { id: 'm3', name: 'Grade 2', section: 'A' },
  { id: 'm4', name: 'Grade 3', section: 'A' },
  { id: 'm5', name: 'Grade 3', section: 'B' },
  { id: 'm6', name: 'Grade 4', section: 'A' },
  { id: 'm7', name: 'Grade 5', section: 'A' },
  { id: 'm8', name: 'Grade 6', section: 'A' },
  { id: 'm9', name: 'Grade 6', section: 'B' },
  { id: 'm10', name: 'Grade 7', section: 'A' }
];

export default function ClassManagement() {
  const { userProfile } = useAuth();
  const schoolId = userProfile?.schoolId;

  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', section: '' });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmModalState, setConfirmModalState] = useState({ isOpen: false, classId: null });

  useEffect(() => {
    if (!schoolId) return;
    
    setLoading(true);
    const unsubscribe = subscribeToSubCollection(schoolId, 'classes', (data) => {
      // Sort alphabetically
      data.sort((a, b) => {
        if(a.name === b.name) return a.section.localeCompare(b.section);
        return a.name.localeCompare(b.name);
      });
      setClasses(data.length > 0 ? data : mockClasses);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [schoolId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.section.trim()) return;

    setSaving(true);
    try {
      if (editingId) {
        await updateSubDocument(schoolId, 'classes', editingId, {
          name: formData.name.trim(),
          section: formData.section.trim().toUpperCase(),
        });
        toast.success("Class updated successfully");
      } else {
        await addSubDocument(schoolId, 'classes', {
          name: formData.name.trim(),
          section: formData.section.trim().toUpperCase(),
          createdAt: new Date().toISOString()
        });
        toast.success("Class created successfully");
      }
      setFormData({ name: '', section: '' });
      setShowForm(false);
      setEditingId(null);
    } catch (error) {
      console.error("Error saving class:", error);
      toast.error("Failed to save class");
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (cls) => {
    setEditingId(cls.id);
    setFormData({ name: cls.name, section: cls.section });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteClick = (classId) => {
    setConfirmModalState({ isOpen: true, classId });
  };

  const executeDelete = async () => {
    const classId = confirmModalState.classId;
    if (!classId) return;
    
    try {
      await deleteDoc(doc(db, `schools/${schoolId}/classes`, classId));
      // fetchClasses(); - Handled by real-time listener
    } catch (error) {
      console.error("Error deleting class:", error);
      toast.error("Failed to delete class.");
    } finally {
      setConfirmModalState({ isOpen: false, classId: null });
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto animate-fade-in-up">
        <TableSkeleton rows={5} columns={4} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Class & Section Management</h1>
          <p className="text-slate-500 mt-1">Define the academic structure of your institution.</p>
        </div>
        <button 
          onClick={() => { 
            setShowForm(!showForm); 
            if (showForm) { 
              setEditingId(null); 
              setFormData({name: '', section: ''}); 
            } 
          }}
          className="px-4 py-2 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 shadow-sm flex items-center gap-2 transition-colors"
        >
          {showForm ? 'Cancel' : <><Plus size={18} /> Create New Class</>}
        </button>
      </div>

      {showForm && (
        <div className="mb-8 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm animate-fade-in-down">
          <h3 className="text-lg font-bold text-slate-900 mb-4">{editingId ? 'Edit Class' : 'Add New Class'}</h3>
          <form onSubmit={handleCreate} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Class/Grade Name</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Grade 10, Freshman, Year 1"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                required
              />
            </div>
            <div className="w-full md:w-48">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Section/Group</label>
              <input 
                type="text" 
                value={formData.section}
                onChange={(e) => setFormData({...formData, section: e.target.value})}
                placeholder="e.g., A, B, Science"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent uppercase transition-all"
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={saving}
              className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 transition-colors h-12"
            >
              {saving ? 'Saving...' : (editingId ? 'Update Class' : 'Save Class')}
            </button>
          </form>
        </div>
      )}

      {classes.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen size={32} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No classes found</h3>
          <p className="text-slate-500 mt-1 mb-6">Start by creating classes and sections before admitting students.</p>
          <button 
            onClick={() => setShowForm(true)}
            className="px-6 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
          >
            Create Your First Class
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls) => (
            <div 
              key={cls.id} 
              onClick={() => handleEditClick(cls)}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow relative group cursor-pointer"
            >
              <button 
                onClick={(e) => { e.stopPropagation(); handleDeleteClick(cls.id); }}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 z-10"
                title="Delete Class"
              >
                <Trash2 size={18} />
              </button>

              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center">
                  <BookOpen size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{cls.name}</h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    Section {cls.section}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-500 text-sm mt-4 pt-4 border-t border-slate-100">
                <Users size={16} />
                <span>0 Students currently assigned</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal 
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState({ isOpen: false, classId: null })}
        onConfirm={executeDelete}
        title="Delete Class"
        message="Are you sure you want to delete this class? Make sure no students are currently assigned to it."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
}
