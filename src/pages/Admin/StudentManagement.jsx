import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSubCollection, addSubDocument, updateSubDocument, subscribeToSubCollection } from '../../firebase/firestore';
import { getDoc, doc, deleteDoc } from 'firebase/firestore';
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
    firstName: '', lastName: '', admissionNumber: '', classId: '', parentEmail: '', dob: '', gender: 'Male', status: 'Active',
    age: '', bloodGroup: '', nationality: '', religion: '', motherTongue: '', aadharNumber: '',
    homeAddress: '', parentName: '', parentPhone: '', parentOccupation: '', emergencyContact: '', annualIncome: '', siblingName: '',
    previousSchool: '', previousRecords: '', subjectsChosen: '', busRoute: '',
    tuitionFee: '', hostelFee: '', bookFee: '', otherFee: '', totalFee: ''
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

  // Assign Modal State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedStudentForAssign, setSelectedStudentForAssign] = useState(null);
  const [selectedClassIdForAssign, setSelectedClassIdForAssign] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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
      data.sort((a, b) => {
        const nameCompare = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        if (nameCompare === 0) {
          return a.section.localeCompare(b.section, undefined, { numeric: true, sensitivity: 'base' });
        }
        return nameCompare;
      });
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

    if (!formData.admissionNumber?.trim()) {
      toast.error("Admission number is required.");
      return;
    }

    const isDuplicate = students.some(
      s => s.admissionNumber?.toLowerCase() === formData.admissionNumber.trim().toLowerCase()
    );

    if (isDuplicate) {
      toast.error(`Student with Admission Number ${formData.admissionNumber} already exists.`);
      return;
    }

    setSaving(true);
    try {
      await addSubDocument(schoolId, 'students', {
        ...formData,
        customData,
        createdAt: new Date().toISOString()
      });
      
      setFormData({
        firstName: '', lastName: '', admissionNumber: '', classId: '', parentEmail: '', dob: '', gender: 'Male', status: 'Active',
        age: '', bloodGroup: '', nationality: '', religion: '', motherTongue: '', aadharNumber: '',
        homeAddress: '', parentName: '', parentPhone: '', parentOccupation: '', emergencyContact: '', annualIncome: '', siblingName: '',
        previousSchool: '', previousRecords: '', subjectsChosen: '', busRoute: '',
        tuitionFee: '', hostelFee: '', bookFee: '', otherFee: '', totalFee: ''
      });
      setCustomData({});
      setShowForm(false);
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
      setUploadModalOpen(false);
      const loadingToastId = toast.loading("Processing bulk import...");
      try {
        const reader = new FileReader();
        reader.onload = async (evt) => {
          try {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);
            
            let successCount = 0;
            let skipCount = 0;
            let replaceCount = 0;
            const importedAdmissions = new Set();
            const existingAdmissionsMap = new Map(students.map(s => [s.admissionNumber?.toLowerCase(), s]));

            for (let i = 0; i < data.length; i++) {
              const row = data[i];
              if (row['Full Name'] && row['Admission Number']) {
                const admissionNumber = row['Admission Number']?.toString().trim();
                
                if (!admissionNumber) {
                  skipCount++;
                  continue;
                }

                const lowerAdmission = admissionNumber.toLowerCase();

                // Skip duplicates within the imported file itself
                if (importedAdmissions.has(lowerAdmission)) {
                  skipCount++;
                  continue;
                }

                // If exists in database, delete the old one completely to replace it
                if (existingAdmissionsMap.has(lowerAdmission)) {
                  const existingStudent = existingAdmissionsMap.get(lowerAdmission);
                  await deleteDoc(doc(db, 'schools', schoolId, 'students', existingStudent.id));
                  replaceCount++;
                }

                importedAdmissions.add(lowerAdmission);

                const fullName = row['Full Name'].toString().trim();
                const nameParts = fullName.split(' ');
                const firstName = nameParts[0];
                const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
                
                await addSubDocument(schoolId, 'students', {
                  firstName: firstName,
                  lastName: lastName,
                  admissionNumber: admissionNumber,
                  dob: row['Date of Birth']?.toString() || '',
                  age: row['Age']?.toString() || '',
                  gender: row['Gender']?.toString() || 'Male',
                  bloodGroup: row['Blood Group']?.toString() || '',
                  nationality: row['Nationality']?.toString() || '',
                  religion: row['Religion']?.toString() || '',
                  motherTongue: row['Mother Tongue']?.toString() || '',
                  aadharNumber: row['Aadhar Number']?.toString() || '',
                  homeAddress: row['Home Address']?.toString() || '',
                  parentName: row['Parent/Guardian Name']?.toString() || '',
                  parentPhone: row['Parent/Guardian Phone Number']?.toString() || '',
                  parentEmail: row['Parent/Guardian Email Address']?.toString() || '',
                  parentOccupation: row['Parent/Guardian Occupation']?.toString() || '',
                  emergencyContact: row['Emergency Contact Number']?.toString() || '',
                  annualIncome: row['Annual Income (INR)']?.toString() || '',
                  siblingName: row['Sibling Name (Same School: Y/N)']?.toString() || '',
                  previousSchool: row['Previous School Name']?.toString() || '',
                  previousRecords: row['Previous Academic Records/Report Card Status']?.toString() || '',
                  subjectsChosen: row['Subjects Chosen']?.toString() || '',
                  busRoute: row['School Bus Route/Stop']?.toString() || '',
                  tuitionFee: row['Tuition Fee (INR)']?.toString() || '',
                  hostelFee: row['Hostel Fee (INR)']?.toString() || '',
                  bookFee: row['Book Fee (INR)']?.toString() || '',
                  otherFee: row['Other Fee (INR)']?.toString() || '',
                  totalFee: row['Total Fee (INR)']?.toString() || '',
                  username: row['Username']?.toString() || '',
                  password: row['Password']?.toString() || '',
                  status: 'Active',
                  classId: '',
                  createdAt: new Date().toISOString()
                });
                successCount++;
              }
            }
            if (skipCount > 0 || replaceCount > 0) {
              toast.success(`Imported ${successCount} (Replaced: ${replaceCount}). Skipped ${skipCount} duplicates.`, { id: loadingToastId });
            } else {
              toast.success(`Successfully imported ${successCount} students!`, { id: loadingToastId });
            }
          } catch(err) {
            console.error(err);
            toast.error("Failed to parse Excel file", { id: loadingToastId });
          } finally {
            setUploadFile(null);
            setUploading(false);
          }
        };
        reader.readAsBinaryString(uploadFile);
      } catch (err) {
        console.error(err);
        toast.error("Failed to process Excel file", { id: loadingToastId });
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
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload document.");
    } finally {
      setUploading(false);
    }
  };

  const openAssignModal = (student) => {
    setSelectedStudentForAssign(student);
    setSelectedClassIdForAssign(student.classId || '');
    setAssignModalOpen(true);
  };

  const handleAssignClass = async () => {
    if (!selectedStudentForAssign) return;
    setAssigning(true);
    try {
      await updateSubDocument(schoolId, 'students', selectedStudentForAssign.id, {
        classId: selectedClassIdForAssign
      });
      toast.success("Class assigned successfully");
      setAssignModalOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to assign class");
    } finally {
      setAssigning(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.firstName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      student.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesClass = classFilter === 'all' || student.classId === classFilter;
    const matchesGender = genderFilter === 'all' || student.gender === genderFilter;

    return matchesSearch && matchesClass && matchesGender;
  }).sort((a, b) => {
    return a.admissionNumber.localeCompare(b.admissionNumber, undefined, { numeric: true, sensitivity: 'base' });
  });

  // Metrics
  const totalStudents = students.length;
  const activeStudents = students.filter(s => s.status === 'Active').length;
  const maleStudents = students.filter(s => s.gender === 'Male').length;
  const femaleStudents = students.filter(s => s.gender === 'Female').length;

  // Pagination Logic
  const totalPages = Math.ceil(filteredStudents.length / rowsPerPage) || 1;
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, classFilter, genderFilter, rowsPerPage]);

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
            <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-3 mb-4">Personal Information</h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">First Name *</label>
                  <input type="text" required value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Last Name *</label>
                  <input type="text" required value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Date of Birth *</label>
                  <input type="date" required value={formData.dob} onChange={(e) => setFormData({...formData, dob: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Age</label>
                  <input type="number" value={formData.age} onChange={(e) => setFormData({...formData, age: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Gender *</label>
                  <select value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Blood Group</label>
                  <input type="text" value={formData.bloodGroup} onChange={(e) => setFormData({...formData, bloodGroup: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white" placeholder="e.g. O+" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nationality</label>
                  <input type="text" value={formData.nationality} onChange={(e) => setFormData({...formData, nationality: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Religion</label>
                  <input type="text" value={formData.religion} onChange={(e) => setFormData({...formData, religion: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Mother Tongue</label>
                  <input type="text" value={formData.motherTongue} onChange={(e) => setFormData({...formData, motherTongue: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Aadhar Number</label>
                  <input type="text" value={formData.aadharNumber} onChange={(e) => setFormData({...formData, aadharNumber: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white" placeholder="12-digit number" />
                </div>
              </div>
            </div>

            <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-3 mb-4">Contact Information</h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-3">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Home Address</label>
                  <textarea value={formData.homeAddress} onChange={(e) => setFormData({...formData, homeAddress: e.target.value})} rows="2" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"></textarea>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Parent/Guardian Name</label>
                  <input type="text" value={formData.parentName} onChange={(e) => setFormData({...formData, parentName: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Parent Email *</label>
                  <input type="email" required value={formData.parentEmail} onChange={(e) => setFormData({...formData, parentEmail: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Parent Phone Number</label>
                  <input type="text" value={formData.parentPhone} onChange={(e) => setFormData({...formData, parentPhone: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Parent Occupation</label>
                  <input type="text" value={formData.parentOccupation} onChange={(e) => setFormData({...formData, parentOccupation: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Emergency Contact Number</label>
                  <input type="text" value={formData.emergencyContact} onChange={(e) => setFormData({...formData, emergencyContact: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Annual Income</label>
                  <input type="text" value={formData.annualIncome} onChange={(e) => setFormData({...formData, annualIncome: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Sibling Name (Same School)</label>
                  <input type="text" value={formData.siblingName} onChange={(e) => setFormData({...formData, siblingName: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white" />
                </div>
              </div>
            </div>

            <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-3 mb-4">Academic Information</h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Assign to Class *</label>
                  <select required value={formData.classId} onChange={(e) => setFormData({...formData, classId: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white">
                    <option value="">Select a Class...</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name} - Section {c.section}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Admission Number *</label>
                  <input type="text" required value={formData.admissionNumber} onChange={(e) => setFormData({...formData, admissionNumber: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white uppercase font-mono" placeholder="e.g. ADM-001" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Previous School Name</label>
                  <input type="text" value={formData.previousSchool} onChange={(e) => setFormData({...formData, previousSchool: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Previous Records (Link/Note)</label>
                  <input type="text" value={formData.previousRecords} onChange={(e) => setFormData({...formData, previousRecords: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Subjects Chosen (Higher Ed)</label>
                  <input type="text" value={formData.subjectsChosen} onChange={(e) => setFormData({...formData, subjectsChosen: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white" />
                </div>
              </div>
            </div>

            <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-3 mb-4">Transportation Details</h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">School Bus Route/Stop</label>
                  <input type="text" value={formData.busRoute} onChange={(e) => setFormData({...formData, busRoute: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white" placeholder="e.g. Route 4 - Main Street" />
                </div>
              </div>
            </div>

            <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-3 mb-4">Fee Configuration</h3>
              <div className="grid md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Tuition Fee</label>
                  <input type="number" value={formData.tuitionFee} onChange={(e) => setFormData({...formData, tuitionFee: e.target.value, totalFee: (Number(e.target.value || 0) + Number(formData.hostelFee || 0) + Number(formData.bookFee || 0) + Number(formData.otherFee || 0)).toString()})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Hostel Fee (If Req)</label>
                  <input type="number" value={formData.hostelFee} onChange={(e) => setFormData({...formData, hostelFee: e.target.value, totalFee: (Number(formData.tuitionFee || 0) + Number(e.target.value || 0) + Number(formData.bookFee || 0) + Number(formData.otherFee || 0)).toString()})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Book Fee</label>
                  <input type="number" value={formData.bookFee} onChange={(e) => setFormData({...formData, bookFee: e.target.value, totalFee: (Number(formData.tuitionFee || 0) + Number(formData.hostelFee || 0) + Number(e.target.value || 0) + Number(formData.otherFee || 0)).toString()})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Other Fee</label>
                  <input type="number" value={formData.otherFee} onChange={(e) => setFormData({...formData, otherFee: e.target.value, totalFee: (Number(formData.tuitionFee || 0) + Number(formData.hostelFee || 0) + Number(formData.bookFee || 0) + Number(e.target.value || 0)).toString()})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white" />
                </div>
                <div className="md:col-span-4 bg-primary-50 p-4 rounded-xl flex items-center justify-between border border-primary-100">
                  <span className="font-bold text-primary-800">Total Calculated Fee:</span>
                  <span className="font-black text-primary-700 text-lg">₹{formData.totalFee || '0'}</span>
                </div>
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
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in-up">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 border-b border-slate-100 bg-slate-50/30">
            <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex items-center gap-3">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><GraduationCap size={20} /></div>
              <div><p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Students</p><p className="text-xl font-bold text-slate-900">{totalStudents}</p></div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex items-center gap-3">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle2 size={20} /></div>
              <div><p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active</p><p className="text-xl font-bold text-slate-900">{activeStudents}</p></div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex items-center gap-3">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><UserPlus size={20} /></div>
              <div><p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Boys</p><p className="text-xl font-bold text-slate-900">{maleStudents}</p></div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex items-center gap-3">
              <div className="p-3 bg-pink-50 text-pink-600 rounded-xl"><UserPlus size={20} /></div>
              <div><p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Girls</p><p className="text-xl font-bold text-slate-900">{femaleStudents}</p></div>
            </div>
          </div>

          <div className="p-4 border-b border-slate-200 flex flex-wrap gap-4 items-center justify-between bg-white">
            <div className="relative flex-1 min-w-[250px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search by name or admission number..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Filter size={18} className="text-slate-400 hidden sm:block" />
              <select 
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              <select 
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Classes</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name} - {c.section}</option>
                ))}
              </select>
              <div className="h-6 w-px bg-slate-200 hidden sm:block mx-1"></div>
              <select 
                value={rowsPerPage}
                onChange={(e) => setRowsPerPage(Number(e.target.value))}
                className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={10}>10 rows</option>
                <option value={20}>20 rows</option>
                <option value={50}>50 rows</option>
              </select>
            </div>
          </div>

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
                {paginatedStudents.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-12 text-center text-slate-500">
                      <GraduationCap size={48} className="mx-auto mb-4 text-slate-300" />
                      <p className="text-lg font-medium text-slate-900 mb-1">No students found</p>
                      <p>Try adjusting your search or filters, or admit a new student.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 shrink-0 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
                            {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                          </div>
                          <div className="font-semibold text-slate-900 leading-snug">
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
                          <button 
                            onClick={() => openAssignModal(student)}
                            className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                          >
                            {student.classId ? 'Change Class' : 'Assign'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50 rounded-b-3xl">
              <span className="text-sm text-slate-500">
                Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, filteredStudents.length)} of {filteredStudents.length} entries
              </span>
              <div className="flex gap-2">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-50 hover:bg-slate-50 transition-colors"
                >
                  Previous
                </button>
                <div className="flex items-center justify-center px-3 py-1.5 text-sm font-medium text-slate-700">
                  Page {currentPage} of {totalPages}
                </div>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-50 hover:bg-slate-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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
                  Upload an Excel or CSV file to bulk import students. Ensure it has columns: Full Name, Admission Number.
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

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Class & Section</label>
                    <p className="text-slate-900 font-medium">{getClassName(selectedStudentToView.classId)}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status</label>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {selectedStudentToView.status || 'Active'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Date of Birth</label>
                    <p className="text-slate-900 font-medium">{selectedStudentToView.dob ? new Date(selectedStudentToView.dob).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Age</label>
                    <p className="text-slate-900 font-medium">{selectedStudentToView.age || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Gender</label>
                    <p className="text-slate-900 font-medium">{selectedStudentToView.gender || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Blood Group</label>
                    <p className="text-slate-900 font-medium">{selectedStudentToView.bloodGroup || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nationality</label>
                    <p className="text-slate-900 font-medium">{selectedStudentToView.nationality || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Religion</label>
                    <p className="text-slate-900 font-medium">{selectedStudentToView.religion || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Mother Tongue</label>
                    <p className="text-slate-900 font-medium">{selectedStudentToView.motherTongue || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Aadhar Number</label>
                    <p className="text-slate-900 font-medium">{selectedStudentToView.aadharNumber || 'N/A'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Home Address</label>
                    <p className="text-slate-900 font-medium">{selectedStudentToView.homeAddress || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Parent Name</label>
                    <p className="text-slate-900 font-medium">{selectedStudentToView.parentName || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Parent Email</label>
                    <p className="text-slate-900 font-medium">{selectedStudentToView.parentEmail || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Parent Phone</label>
                    <p className="text-slate-900 font-medium">{selectedStudentToView.parentPhone || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Parent Occupation</label>
                    <p className="text-slate-900 font-medium">{selectedStudentToView.parentOccupation || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Emergency Contact</label>
                    <p className="text-slate-900 font-medium">{selectedStudentToView.emergencyContact || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Annual Income</label>
                    <p className="text-slate-900 font-medium">{selectedStudentToView.annualIncome || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Sibling (Same School)</label>
                    <p className="text-slate-900 font-medium">{selectedStudentToView.siblingName || 'N/A'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Previous School</label>
                    <p className="text-slate-900 font-medium">{selectedStudentToView.previousSchool || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Previous Records</label>
                    <p className="text-slate-900 font-medium">{selectedStudentToView.previousRecords || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Subjects Chosen</label>
                    <p className="text-slate-900 font-medium">{selectedStudentToView.subjectsChosen || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Bus Route</label>
                    <p className="text-slate-900 font-medium">{selectedStudentToView.busRoute || 'N/A'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tuition Fee</label>
                    <p className="text-slate-900 font-medium">{selectedStudentToView.tuitionFee ? `₹${selectedStudentToView.tuitionFee}` : 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Hostel Fee</label>
                    <p className="text-slate-900 font-medium">{selectedStudentToView.hostelFee ? `₹${selectedStudentToView.hostelFee}` : 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Book Fee</label>
                    <p className="text-slate-900 font-medium">{selectedStudentToView.bookFee ? `₹${selectedStudentToView.bookFee}` : 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Other Fee</label>
                    <p className="text-slate-900 font-medium">{selectedStudentToView.otherFee ? `₹${selectedStudentToView.otherFee}` : 'N/A'}</p>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-slate-200">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Fee</label>
                    <p className="text-primary-700 font-black text-lg">{selectedStudentToView.totalFee ? `₹${selectedStudentToView.totalFee}` : 'N/A'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Enrolled Date</label>
                    <p className="text-slate-900 font-medium">
                      {selectedStudentToView.createdAt 
                        ? new Date(selectedStudentToView.createdAt).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>

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

      {assignModalOpen && selectedStudentForAssign && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="text-xl font-bold text-slate-900">Assign Class</h2>
              <button onClick={() => setAssignModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
              <p className="text-slate-600 mb-6">
                Select a class to assign <span className="font-bold text-slate-900">{selectedStudentForAssign.firstName} {selectedStudentForAssign.lastName}</span> to.
              </p>

              <div className="space-y-4">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Select Class & Section</label>
                <select 
                  value={selectedClassIdForAssign}
                  onChange={(e) => setSelectedClassIdForAssign(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                >
                  <option value="">-- Unassigned --</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name} - {c.section}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0 flex justify-end gap-3">
              <button 
                onClick={() => setAssignModalOpen(false)}
                className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleAssignClass}
                disabled={assigning}
                className="px-6 py-2.5 bg-primary-600 text-white font-bold hover:bg-primary-700 rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {assigning ? (
                  <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Saving...</>
                ) : (
                  'Save Assignment'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}