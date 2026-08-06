import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { findStudentByAdmission, linkStudentToParent } from '../../firebase/firestore';
import { LuPlus as Plus, LuPencil as Pencil, LuTrash2 as Trash2, LuUsers as Users, LuX as X, LuBaby as Baby, LuLink as LinkIcon, LuSquareCheck as CheckCircle } from 'react-icons/lu';
import toast from 'react-hot-toast';

export default function MyChildren() {
  const { currentUser, userProfile, updateProfileData } = useAuth();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  
  // Link state
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkingIndex, setLinkingIndex] = useState(null);
  const [linkingAdmission, setLinkingAdmission] = useState('');
  const [linkingError, setLinkingError] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    gender: 'Male',
    bloodGroup: '',
    schoolName: '',
    relationship: 'Child'
  });

  useEffect(() => {
    const fetchChildren = async () => {
      if (!currentUser?.uid) return;
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setChildren(userData.children || []);
        }
      } catch (error) {
        console.error("Error fetching children:", error);
        toast.error("Failed to load children.");
      } finally {
        setLoading(false);
      }
    };
    fetchChildren();
  }, [currentUser]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.dob) {
      toast.error("Name and Date of Birth are required.");
      return;
    }

    try {
      let updatedChildren = [...children];
      
      if (editingIndex !== null) {
        updatedChildren[editingIndex] = { ...formData };
      } else {
        updatedChildren.push({ 
          ...formData, 
          id: Date.now().toString() // simple unique id
        });
      }

      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, { children: updatedChildren });
      
      setChildren(updatedChildren);
      toast.success(editingIndex !== null ? "Child updated successfully!" : "Child added successfully!");
      closeModal();
    } catch (error) {
      console.error("Error saving child:", error);
      toast.error("Failed to save child details.");
    }
  };

  const handleEdit = (index) => {
    setFormData({ ...children[index] });
    setEditingIndex(index);
    setIsModalOpen(true);
  };

  const handleDelete = async (index) => {
    if (!window.confirm("Are you sure you want to remove this child?")) return;
    
    try {
      const updatedChildren = children.filter((_, i) => i !== index);
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, { children: updatedChildren });
      
      setChildren(updatedChildren);
      toast.success("Child removed successfully.");
    } catch (error) {
      console.error("Error deleting child:", error);
      toast.error("Failed to remove child.");
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingIndex(null);
    setFormData({
      name: '',
      dob: '',
      gender: 'Male',
      bloodGroup: '',
      schoolName: '',
      relationship: 'Child'
    });
  };

  const handleOpenLinkModal = (index) => {
    setLinkingIndex(index);
    setLinkingAdmission('');
    setLinkingError('');
    setIsLinkModalOpen(true);
  };

  const handleLinkSubmit = async (e) => {
    e.preventDefault();
    setLinkingError('');
    setIsLinking(true);

    try {
      const child = children[linkingIndex];
      // 1. Find the student
      const student = await findStudentByAdmission(userProfile.schoolId, linkingAdmission, child.dob);
      
      if (!student) {
        setLinkingError("No student found matching this Admission Number and the Date of Birth provided in this profile.");
        setIsLinking(false);
        return;
      }

      const studentName = student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Student';

      // 2. Link to parent's profile context
      await linkStudentToParent(currentUser.uid, student.id, student.classId, studentName);
      
      // 3. Update the specific child object locally
      let updatedChildren = [...children];
      updatedChildren[linkingIndex] = {
        ...updatedChildren[linkingIndex],
        studentId: student.id,
        classId: student.classId
      };
      
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, { children: updatedChildren });
      
      setChildren(updatedChildren);
      await updateProfileData();
      
      toast.success("Child officially linked successfully!");
      setIsLinkModalOpen(false);
    } catch (error) {
      console.error("Link error:", error);
      setLinkingError("An error occurred while linking. Please try again.");
    } finally {
      setIsLinking(false);
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
    <div className="p-8 max-w-7xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My Children</h1>
          <p className="text-slate-500 mt-1">Manage personal details of your children.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 shadow-sm flex items-center gap-2 transition-all active:scale-95"
        >
          <Plus size={18} /> Add Child
        </button>
      </div>

      {children.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 text-primary-500">
            <Baby size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Children Added</h3>
          <p className="text-slate-500 max-w-md mx-auto mb-6">You haven't added any children yet. Click the button above to add their details.</p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
          >
            Add Your First Child
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {children.map((child, index) => (
            <div key={child.id || index} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 hover:shadow-md transition-all group relative">
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleEdit(index)}
                  className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Pencil size={18} />
                </button>
                <button 
                  onClick={() => handleDelete(index)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-primary-100 to-primary-50 text-primary-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner shrink-0">
                  {child.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 pr-16">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white truncate">{child.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {child.relationship}
                    </span>
                    {child.studentId ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                        <CheckCircle size={12} /> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200">
                        Unverified
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {!child.studentId && (
                <div className="mb-2">
                  <button 
                    onClick={() => handleOpenLinkModal(index)}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-primary-50 text-primary-700 rounded-xl font-semibold hover:bg-primary-100 transition-colors text-sm"
                  >
                    <LinkIcon size={16} /> Link Official Account
                  </button>
                </div>
              )}

              <div className="space-y-3 text-sm mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Date of Birth</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{new Date(child.dob).toLocaleDateString('en-GB')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Gender</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{child.gender}</span>
                </div>
                {child.bloodGroup && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Blood Group</span>
                    <span className="font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">{child.bloodGroup}</span>
                  </div>
                )}
                {child.schoolName && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">School</span>
                    <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[150px]">{child.schoolName}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-up">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {editingIndex !== null ? 'Edit Child Details' : 'Add Child Details'}
              </h3>
              <button 
                onClick={closeModal} 
                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Full Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. John Doe"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Date of Birth <span className="text-red-500">*</span></label>
                  <input 
                    type="date" 
                    name="dob"
                    value={formData.dob}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 outline-none transition-all text-slate-700 dark:text-slate-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Gender</label>
                  <select 
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 outline-none transition-all bg-white dark:bg-slate-900"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Relationship</label>
                  <select 
                    name="relationship"
                    value={formData.relationship}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 outline-none transition-all bg-white dark:bg-slate-900"
                  >
                    <option value="Child">Child</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Dependent">Dependent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Blood Group</label>
                  <select 
                    name="bloodGroup"
                    value={formData.bloodGroup}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 outline-none transition-all bg-white dark:bg-slate-900"
                  >
                    <option value="">Select...</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">School Name (Optional)</label>
                <input 
                  type="text" 
                  name="schoolName"
                  value={formData.schoolName}
                  onChange={handleInputChange}
                  placeholder="If studying elsewhere..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button 
                  type="button" 
                  onClick={closeModal}
                  className="px-6 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-8 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
                >
                  {editingIndex !== null ? 'Save Changes' : 'Add Child'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link Official Account Modal */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-up">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Link Official Account</h3>
              <button 
                onClick={() => setIsLinkModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleLinkSubmit} className="p-6 space-y-4">
              <div className="bg-primary-50 text-primary-800 p-4 rounded-xl text-sm mb-4">
                Linking <strong>{children[linkingIndex]?.name}</strong>. Their date of birth will be used automatically for verification.
              </div>

              {linkingError && (
                <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium border border-red-200">
                  {linkingError}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Admission Number <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  value={linkingAdmission}
                  onChange={(e) => setLinkingAdmission(e.target.value)}
                  placeholder="e.g. ADM-2024-001"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setIsLinkModalOpen(false)}
                  className="px-6 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isLinking}
                  className="px-8 py-2.5 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isLinking ? 'Verifying...' : 'Link Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
