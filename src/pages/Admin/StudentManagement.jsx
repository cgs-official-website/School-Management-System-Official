import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSubCollection, addSubDocument, updateSubDocument, subscribeToSubCollection } from '../../firebase/firestore';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase/config';
import { LuSearch as Search, LuFilter as Filter, LuUserPlus as UserPlus, LuCircleCheck as CheckCircle2, LuGraduationCap as GraduationCap, LuCloudUpload as UploadCloud, LuFileText as FileText, LuExternalLink as ExternalLink, LuX as X, LuEye as Eye } from 'react-icons/lu';
import { TableSkeleton } from '../../components/Skeleton';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

export default function StudentManagement() {
  const { userProfile } = useAuth();
  const schoolId = userProfile?.schoolId;

  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [schoolName, setSchoolName] = useState('');
  const [loading, setLoading] = useState(true);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    admissionNumber: '',
    classId: '',
    parentEmail: '',
    dob: '',
    gender: 'Male',
    status: 'Active'
  });
  const [customData, setCustomData] = useState({});
  const [formSchema, setFormSchema] = useState([]);

  // Upload Modal State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedStudentForUpload, setSelectedStudentForUpload] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // View Modal State
  const [viewStudentModalOpen, setViewStudentModalOpen] = useState(false);
  const [selectedStudentToView, setSelectedStudentToView] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');

  useEffect(() => {
    if (!schoolId) return;

    setLoading(true);
    
    // Fetch School Name statically once
    getDoc(doc(db, 'schools', schoolId)).then(snap => {
      if (snap.exists()) setSchoolName(snap.data().schoolName || 'School');
    });

    const unsubStudents = subscribeToSubCollection(schoolId, 'students', (data) => {
      setStudents(data);
      setLoading(false);
    });

    const unsubClasses = subscribeToSubCollection(schoolId, 'classes', (data) => {
      setClasses(data);
    });

    const fetchSchema = async () => {
      try {
        const snap = await getDoc(doc(db, `schools/${schoolId}/formSchemas/student_admission`));
        if (snap.exists()) {
          setFormSchema(snap.data().fields || []);
        }
      } catch (err) {
        console.error("Error fetching schema:", err);
      }
    };
    fetchSchema();

    return () => {
      unsubStudents();
      unsubClasses();
    };
  }, [schoolId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addSubDocument(schoolId, 'students', {
        ...formData,
        customData,
        createdAt: new Date().toISOString()
      });
      
      setFormData({
        firstName: '', lastName: '', admissionNumber: '', classId: '', parentEmail: '', dob: '', gender: 'Male', status: 'Active'
      });
      setCustomData({});
      setShowForm(false);
      // fetchData(); - Refresh handled by real-time listener
    } catch (error) {
      console.error("Error creating student:", error);
      toast.error("Failed to admit student.");
    } finally {
      setSaving(false);
    }
  };

  const openUploadModal = (student) => {
    setSelectedStudentForUpload(student);
    setUploadFile(null);
    setUploadModalOpen(true);
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);

    if (!selectedStudentForUpload) {
      // BULK IMPORT LOGIC
      try {
        const reader = new FileReader();
        reader.onload = async (evt) => {
          const bstr = evt.target.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);
          
          let successCount = 0;
          for (let i = 0; i < data.length; i++) {
            const row = data[i];
            if (row['First Name'] && row['Last Name'] && row['Admission Number']) {
              await addSubDocument(schoolId, 'students', {
                firstName: row['First Name'],
                lastName: row['Last Name'],
                admissionNumber: row['Admission Number'],
                classId: row['Class ID'] || '',
                parentEmail: row['Parent Email'] || '',
                dob: row['DOB'] || '',
                gender: row['Gender'] || 'Male',
                status: row['Status'] || 'Active',
                createdAt: new Date().toISOString()
              });
              successCount++;
            }
          }
          toast.success(`Successfully imported ${successCount} students!`);
          setUploadModalOpen(false);
          setUploadFile(null);
          // fetchData(); - Refresh handled by real-time listener
        };
        reader.readAsBinaryString(uploadFile);
      } catch (err) {
        console.error(err);
        toast.error("Failed to process Excel file");
      } finally {
        setUploading(false);
      }
      return;
    }

    try {
      const safeSchoolName = schoolName.replace(/[^a-z0-9]/gi, '_').trim();
      const studentName = `${selectedStudentForUpload.firstName} ${selectedStudentForUpload.lastName}`;
      const safeStudentName = studentName.replace(/[^a-z0-9]/gi, '_').trim();
      const safeFileName = uploadFile.name.replace(/[^a-z0-9.]/gi, '_');

      // STRICT PATH: [SchoolName]/Students/[StudentName]/[FileName]
      const storagePath = `${safeSchoolName}/Students/${safeStudentName}/${safeFileName}`;
      const fileRef = ref(storage, storagePath);

      await uploadBytes(fileRef, uploadFile);
      const downloadUrl = await getDownloadURL(fileRef);

      await updateSubDocument(schoolId, 'students', selectedStudentForUpload.id, {
        attachmentUrl: downloadUrl,
        attachmentName: uploadFile.name
      });

      setUploadModalOpen(false);
      fetchData(); // Refresh to show new attachment
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload document.");
    } finally {
      setUploading(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.firstName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      student.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesClass = classFilter === 'all' || student.classId === classFilter;

    return matchesSearch && matchesClass;
  });

  const getClassName = (classId) => {
    const cls = classes.find(c => c.id === classId);
    return cls ? `${cls.name} - ${cls.section}` : 'Unknown';
  };

  if (loading && !showForm) {
    return (
      <div className="p-8 max-w-7xl mx-auto animate-fade-in-up">
        <TableSkeleton rows={5} columns={4} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Student Directory & Attachments</h1>
          <p className="text-slate-500 mt-1">Manage admissions, upload student records, and class assignments.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => {
              setUploadFile(null);
              setSelectedStudentForUpload(null);
              setUploadModalOpen(true);
            }}
            className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl font-medium hover:bg-emerald-200 shadow-sm flex items-center gap-2 transition-colors"
          >
            <UploadCloud size={18} /> Bulk Import
          </button>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 shadow-sm flex items-center gap-2 transition-colors"
          >
            {showForm ? 'Cancel Admission' : <><UserPlus size={18} /> New Admission</>}
          </button>
        </div>
      </div>

      {showForm ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 mb-8 animate-fade-in-down">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
              <UserPlus size={24} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Admit New Student</h2>
          </div>

          <form onSubmit={handleCreate} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">First Name</label>
                <input 
                  type="text" required
                  value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Last Name</label>
                <input 
                  type="text" required
                  value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Admission Number</label>
                <input 
                  type="text" required
                  value={formData.admissionNumber} onChange={(e) => setFormData({...formData, admissionNumber: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 uppercase font-mono"
                  placeholder="e.g. ADM-001"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Assign to Class</label>
                <select 
                  required
                  value={formData.classId} onChange={(e) => setFormData({...formData, classId: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select a Class...</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name} - Section {c.section}</option>
                  ))}
                </select>
                {classes.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">Please create a class in Class Management first.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Parent Email</label>
                <input 
                  type="email" required
                  value={formData.parentEmail} onChange={(e) => setFormData({...formData, parentEmail: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500"
                  placeholder="For parent portal linkage"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Date of Birth</label>
                <input 
                  type="date" required
                  value={formData.dob} onChange={(e) => setFormData({...formData, dob: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Gender</label>
                <select 
                  value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {formSchema.length > 0 && (
              <div className="pt-6 mt-6 border-t border-slate-100">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Additional Details</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  {formSchema.map(field => (
                    <div key={field.id}>
                      {field.type !== 'checkbox' && (
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                      )}
                      
                      {field.type === 'select' ? (
                        <select
                          required={field.required}
                          value={customData[field.id] || ''}
                          onChange={e => setCustomData({...customData, [field.id]: e.target.value})}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                        >
                          <option value="">Select...</option>
                          {field.options && field.options.split(',').map(opt => (
                            <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
                          ))}
                        </select>
                      ) : field.type === 'checkbox' ? (
                        <label className="flex items-center gap-3 mt-1 cursor-pointer">
                          <input
                            type="checkbox"
                            required={field.required}
                            checked={customData[field.id] || false}
                            onChange={e => setCustomData({...customData, [field.id]: e.target.checked})}
                            className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm font-semibold text-slate-700">{field.label} {field.required && <span className="text-red-500">*</span>}</span>
                        </label>
                      ) : (
                        <input
                          type={field.type}
                          required={field.required}
                          value={customData[field.id] || ''}
                          onChange={e => setCustomData({...customData, [field.id]: e.target.value})}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <button 
                type="button" onClick={() => setShowForm(false)}
                className="px-6 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" disabled={saving || classes.length === 0}
                className="px-8 py-2.5 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 shadow-sm disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Admit Student'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 border-b border-slate-200 flex flex-wrap gap-4 items-center justify-between bg-slate-50/50">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search by name or admission number..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
            <div className="flex items-center gap-3">
              <Filter size={18} className="text-slate-400" />
              <select 
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 max-w-[200px]"
              >
                <option value="all">All Classes</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name} - {c.section}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                  <th className="p-4 pl-6">Student Name</th>
                  <th className="p-4">Admission No.</th>
                  <th className="p-4">Class & Section</th>
                  <th className="p-4">Attachment</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-12 text-center text-slate-500">
                      <GraduationCap size={48} className="mx-auto mb-4 text-slate-300" />
                      <p className="text-lg font-medium text-slate-900 mb-1">No students found</p>
                      <p>Try adjusting your search or filters, or admit a new student.</p>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs">
                            {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                          </div>
                          <div className="font-semibold text-slate-900">
                            {student.firstName} {student.lastName}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-slate-600">
                        {student.admissionNumber}
                      </td>
                      <td className="p-4 text-slate-700">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {getClassName(student.classId)}
                        </span>
                      </td>
                      <td className="p-4">
                        {student.attachmentUrl ? (
                          <a href={student.attachmentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors tooltip-trigger" title={student.attachmentName}>
                            <ExternalLink size={12} /> View Doc
                          </a>
                        ) : (
                          <span className="text-slate-400 text-xs italic">No attachment</span>
                        )}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => {
                              setSelectedStudentToView(student);
                              setViewStudentModalOpen(true);
                            }}
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                          <button 
                            onClick={() => openUploadModal(student)}
                            className="p-2 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="Upload Document"
                          >
                            <UploadCloud size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload Document / Bulk Import Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <FileText className="text-primary-600" />
                {selectedStudentForUpload ? 'Upload Document' : 'Bulk Import Students'}
              </h2>
              <button onClick={() => setUploadModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
              {selectedStudentForUpload ? (
                <p className="text-sm text-slate-600 mb-4">
                  Upload a document (e.g. Birth Certificate) for <span className="font-bold text-slate-900">{selectedStudentForUpload.firstName} {selectedStudentForUpload.lastName}</span>. 
                  <br/><span className="text-xs text-slate-400 mt-1 block">File will be securely stored in: {schoolName}/Students/...</span>
                </p>
              ) : (
                <p className="text-sm text-slate-600 mb-4">
                  Upload an Excel or CSV file to bulk import students. Ensure it has columns: First Name, Last Name, Admission Number.
                </p>
              )}

              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 bg-slate-50 relative overflow-hidden group hover:border-primary-400 hover:bg-primary-50 transition-all text-center">
                <input 
                  type="file" 
                  accept={selectedStudentForUpload ? "image/*, .pdf" : ".xlsx, .csv"}
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                />
                <UploadCloud size={32} className={`mx-auto mb-3 ${uploadFile ? 'text-green-500' : 'text-slate-400 group-hover:text-primary-500'}`} />
                {uploadFile ? (
                  <div>
                    <p className="font-semibold text-green-700 text-sm truncate">{uploadFile.name}</p>
                    <p className="text-xs text-green-600 mt-1">Ready to upload</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-slate-700 text-sm">Click or drag file to upload</p>
                    <p className="text-xs text-slate-500 mt-1">{selectedStudentForUpload ? 'PDF, JPG, PNG up to 10MB' : 'Excel or CSV file'}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => setUploadModalOpen(false)}
                className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleUpload}
                disabled={uploading || !uploadFile}
                className="px-6 py-2.5 bg-primary-600 text-white font-bold hover:bg-primary-700 rounded-xl shadow-sm disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {uploading ? 'Uploading...' : 'Upload File'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Student Details Modal */}
      {viewStudentModalOpen && selectedStudentToView && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="text-indigo-600" />
                Student Details
              </h2>
              <button onClick={() => setViewStudentModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-2xl">
                  {selectedStudentToView.firstName.charAt(0)}{selectedStudentToView.lastName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {selectedStudentToView.firstName} {selectedStudentToView.lastName}
                  </h3>
                  <p className="text-sm font-medium text-slate-500">Admission No: <span className="text-slate-800 font-mono">{selectedStudentToView.admissionNumber}</span></p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Class & Section</label>
                  <p className="text-slate-900 font-medium">
                    {getClassName(selectedStudentToView.classId)}
                  </p>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status</label>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {selectedStudentToView.status || 'Active'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Date of Birth</label>
                  <p className="text-slate-900 font-medium">
                    {selectedStudentToView.dob ? new Date(selectedStudentToView.dob).toLocaleDateString() : 'N/A'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Gender</label>
                  <p className="text-slate-900 font-medium">{selectedStudentToView.gender || 'N/A'}</p>
                </div>
                
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Parent Email</label>
                  <p className="text-slate-900 font-medium">{selectedStudentToView.parentEmail || 'N/A'}</p>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Enrolled Date</label>
                  <p className="text-slate-900 font-medium">
                    {selectedStudentToView.createdAt 
                      ? new Date(selectedStudentToView.createdAt).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>

                {/* Render Custom Fields in View Modal */}
                {formSchema.length > 0 && selectedStudentToView.customData && formSchema.map(field => {
                  let val = selectedStudentToView.customData[field.id];
                  if (field.type === 'checkbox') val = val ? 'Yes' : 'No';
                  
                  return (
                    <div key={`view_${field.id}`}>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{field.label}</label>
                      <p className="text-slate-900 font-medium">
                        {val || 'N/A'}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setViewStudentModalOpen(false)}
                className="px-6 py-2 bg-slate-200 text-slate-700 font-bold hover:bg-slate-300 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
