import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSubCollection, addSubDocument, updateSubDocument, subscribeToSubCollection } from '../../firebase/firestore';
import { getDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase/config';
import { LuSearch as Search, LuFilter as Filter, LuUserPlus as UserPlus, LuCircleCheck as CheckCircle2, LuGraduationCap as GraduationCap, LuCloudUpload as UploadCloud, LuFileText as FileText, LuExternalLink as ExternalLink, LuX as X, LuEye as Eye, LuTrash2 as Trash } from 'react-icons/lu';
import { TableSkeleton } from '../../components/Skeleton';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import ConfirmModal from '../../components/ConfirmModal';

export default function StudentManagement() {
  const { userProfile } = useAuth();
  const schoolId = userProfile?.schoolId;
  const hasEditPermission = userProfile?.role?.toLowerCase() === 'admin' || userProfile?.role?.toLowerCase() === 'superadmin' || userProfile?.role?.toLowerCase() === 'staff';

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
  const [isEditMode, setIsEditMode] = useState(false);
  const [editStudentData, setEditStudentData] = useState(null);
  const [editCustomData, setEditCustomData] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Assign Modal State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedStudentForAssign, setSelectedStudentForAssign] = useState(null);
  const [selectedClassIdForAssign, setSelectedClassIdForAssign] = useState('');
  const [assigning, setAssigning] = useState(false);

  const [confirmDeleteState, setConfirmDeleteState] = useState({ isOpen: false, id: null, name: '' });

  const handleDeleteStudent = async (studentId) => {
    try {
      await deleteDoc(doc(db, `schools/${schoolId}/students`, studentId));
      toast.success("Student deleted successfully!");
      setConfirmDeleteState({ isOpen: false, id: null, name: '' });
    } catch (error) {
      console.error("Error deleting student:", error);
      toast.error("Failed to delete student.");
    }
  };

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
        const snap = await getDoc(doc(db, `schools/${schoolId}/formSchemas/students`));
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

  // Handle field change in Edit Mode
  const handleEditFieldChange = (field, value) => {
    setEditStudentData(prev => ({ ...prev, [field]: value }));
  };

  // Handle fee fields change and calculate total dynamically in Edit Mode
  const handleEditFeeChange = (field, value) => {
    const updated = { ...editStudentData, [field]: value };
    const tuition = Number(updated.tuitionFee || 0);
    const hostel = Number(updated.hostelFee || 0);
    const book = Number(updated.bookFee || 0);
    const other = Number(updated.otherFee || 0);
    updated.totalFee = (tuition + hostel + book + other).toString();
    setEditStudentData(updated);
  };

  // Check if any fields have been modified in Edit Mode
  const isStudentFormDirty = () => {
    if (!editStudentData) return false;
    const fieldsToCompare = [
      'firstName', 'lastName', 'middleName', 'admissionNumber', 'dob', 'gender',
      'bloodGroup', 'nationality', 'religion', 'motherTongue', 'aadharNumber',
      'studentPhone', 'studentEmail', 'classId', 'rollNumber', 'admissionDate', 'status',
      'parentName', 'parentPhone', 'parentOccupation', 'parentEmail',
      'motherName', 'motherPhone', 'motherOccupation', 'motherEmail',
      'guardianName', 'guardianPhone', 'guardianRelationship',
      'addressLine1', 'addressLine2', 'city', 'district', 'state', 'country', 'pincode',
      'previousSchool', 'identificationMarks', 'medicalInfo', 'transportDetails', 'hostelDetails',
      'tuitionFee', 'hostelFee', 'bookFee', 'otherFee', 'totalFee'
    ];
    for (const f of fieldsToCompare) {
      const v1 = (selectedStudentToView[f] || '').toString().trim();
      const v2 = (editStudentData[f] || '').toString().trim();
      if (v1 !== v2) return true;
    }
    if (formSchema.length > 0) {
      for (const field of formSchema) {
        const v1 = (selectedStudentToView.customData?.[field.id] || '').toString().trim();
        const v2 = (editCustomData[field.id] || '').toString().trim();
        if (v1 !== v2) return true;
      }
    }
    return false;
  };

  // Close or Cancel handler
  const handleModalCloseOrCancel = () => {
    if (isEditMode && isStudentFormDirty()) {
      setShowDiscardConfirm(true);
    } else {
      setViewStudentModalOpen(false);
      setIsEditMode(false);
    }
  };

  // Listen to Escape key globally when view modal is open
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && viewStudentModalOpen) {
        if (isEditMode && isStudentFormDirty()) {
          setShowDiscardConfirm(true);
        } else {
          setViewStudentModalOpen(false);
          setIsEditMode(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewStudentModalOpen, isEditMode, editStudentData, editCustomData, selectedStudentToView]);

  // Log audit helper
  const logStudentAudit = async (studentId, studentName, actionPerformed, modifiedFields) => {
    if (!schoolId) return;
    try {
      await addSubDocument(schoolId, 'student_audit_logs', {
        studentId,
        studentName,
        userName: userProfile?.name || userProfile?.email || 'Unknown User',
        userRole: userProfile?.role || 'Staff',
        timestamp: new Date().toISOString(),
        actionPerformed,
        modifiedFields
      });
    } catch (e) {
      console.error("Failed to write student audit log:", e);
    }
  };

  // Validate fields in edit student form
  const validateEditStudent = () => {
    const errors = {};
    if (!editStudentData.firstName?.trim()) errors.firstName = "First name is required";
    if (!editStudentData.lastName?.trim()) errors.lastName = "Last name is required";
    
    if (!editStudentData.admissionNumber?.trim()) {
      errors.admissionNumber = "Admission number is required";
    } else {
      const isDuplicate = students.some(
        s => s.id !== selectedStudentToView.id && s.admissionNumber?.toLowerCase() === editStudentData.admissionNumber.trim().toLowerCase()
      );
      if (isDuplicate) {
        errors.admissionNumber = "Admission number must be unique";
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (editStudentData.studentEmail?.trim() && !emailRegex.test(editStudentData.studentEmail)) {
      errors.studentEmail = "Invalid email format";
    }
    if (editStudentData.parentEmail?.trim() && !emailRegex.test(editStudentData.parentEmail)) {
      errors.parentEmail = "Invalid email format";
    }
    if (editStudentData.motherEmail?.trim() && !emailRegex.test(editStudentData.motherEmail)) {
      errors.motherEmail = "Invalid email format";
    }

    const phoneRegex = /^\d{10}$/;
    if (editStudentData.studentPhone?.trim() && !phoneRegex.test(editStudentData.studentPhone)) {
      errors.studentPhone = "Mobile number must be 10 digits";
    }
    if (editStudentData.parentPhone?.trim() && !phoneRegex.test(editStudentData.parentPhone)) {
      errors.parentPhone = "Mobile number must be 10 digits";
    }
    if (editStudentData.motherPhone?.trim() && !phoneRegex.test(editStudentData.motherPhone)) {
      errors.motherPhone = "Mobile number must be 10 digits";
    }
    if (editStudentData.guardianPhone?.trim() && !phoneRegex.test(editStudentData.guardianPhone)) {
      errors.guardianPhone = "Mobile number must be 10 digits";
    }

    if (editStudentData.aadharNumber?.trim() && !/^\d{12}$/.test(editStudentData.aadharNumber)) {
      errors.aadharNumber = "Aadhaar number must be 12 digits";
    }

    if (editStudentData.dob && new Date(editStudentData.dob) > new Date()) {
      errors.dob = "Date of Birth cannot be in the future";
    }

    if (editStudentData.rollNumber?.trim() && editStudentData.classId) {
      const isRollDuplicate = students.some(
        s => s.id !== selectedStudentToView.id &&
             s.classId === editStudentData.classId &&
             s.rollNumber?.toLowerCase() === editStudentData.rollNumber.trim().toLowerCase()
      );
      if (isRollDuplicate) {
        errors.rollNumber = "Roll Number already exists in this class";
      }
    }

    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save changes
  const handleSaveStudentEdit = async () => {
    if (!validateEditStudent()) {
      toast.error("Please resolve the validation errors.");
      return;
    }

    try {
      const cleanedData = {};
      const fieldsToSave = [
        'firstName', 'lastName', 'middleName', 'admissionNumber', 'dob', 'gender',
        'bloodGroup', 'nationality', 'religion', 'motherTongue', 'aadharNumber',
        'studentPhone', 'studentEmail', 'classId', 'rollNumber', 'admissionDate', 'status',
        'parentName', 'parentPhone', 'parentOccupation', 'parentEmail',
        'motherName', 'motherPhone', 'motherOccupation', 'motherEmail',
        'guardianName', 'guardianPhone', 'guardianRelationship',
        'addressLine1', 'addressLine2', 'city', 'district', 'state', 'country', 'pincode',
        'previousSchool', 'identificationMarks', 'medicalInfo', 'transportDetails', 'hostelDetails',
        'tuitionFee', 'hostelFee', 'bookFee', 'otherFee', 'totalFee'
      ];
      for (const f of fieldsToSave) {
        cleanedData[f] = (editStudentData[f] || '').toString().trim();
      }

      if (cleanedData.dob) {
        const birthDate = new Date(cleanedData.dob);
        const today = new Date();
        let calculatedAge = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          calculatedAge--;
        }
        cleanedData.age = calculatedAge.toString();
      }

      const modifiedFields = [];
      const userFriendlyLabels = {
        firstName: 'First Name',
        lastName: 'Last Name',
        middleName: 'Middle Name',
        admissionNumber: 'Admission Number',
        dob: 'Date of Birth',
        gender: 'Gender',
        bloodGroup: 'Blood Group',
        nationality: 'Nationality',
        religion: 'Religion',
        motherTongue: 'Mother Tongue',
        aadharNumber: 'Aadhaar Number',
        studentPhone: 'Student Phone',
        studentEmail: 'Student Email',
        classId: 'Class ID',
        rollNumber: 'Roll Number',
        admissionDate: 'Admission Date',
        status: 'Status',
        parentName: "Father's Name",
        parentPhone: "Father's Phone",
        parentOccupation: "Father's Occupation",
        parentEmail: "Father's Email",
        motherName: "Mother's Name",
        motherPhone: "Mother's Phone",
        motherOccupation: "Mother's Occupation",
        motherEmail: "Mother's Email",
        guardianName: 'Guardian Name',
        guardianPhone: 'Guardian Phone',
        guardianRelationship: 'Guardian Relationship',
        addressLine1: 'Address Line 1',
        addressLine2: 'Address Line 2',
        city: 'City',
        district: 'District',
        state: 'State',
        country: 'Country',
        pincode: 'Pincode',
        previousSchool: 'Previous School',
        identificationMarks: 'Identification Marks',
        medicalInfo: 'Medical Information',
        transportDetails: 'Transport Details',
        hostelDetails: 'Hostel Details',
        tuitionFee: 'Tuition Fee',
        hostelFee: 'Hostel Fee',
        bookFee: 'Book Fee',
        otherFee: 'Other Fee',
        totalFee: 'Total Fee'
      };

      for (const f of fieldsToSave) {
        const v1 = (selectedStudentToView[f] || '').toString().trim();
        const v2 = cleanedData[f];
        if (v1 !== v2) {
          modifiedFields.push({
            fieldName: userFriendlyLabels[f] || f,
            previousValue: v1 || 'N/A',
            updatedValue: v2 || 'N/A'
          });
        }
      }

      if (formSchema.length > 0) {
        for (const field of formSchema) {
          const v1 = (selectedStudentToView.customData?.[field.id] || '').toString().trim();
          const v2 = (editCustomData[field.id] || '').toString().trim();
          if (v1 !== v2) {
            modifiedFields.push({
              fieldName: field.label,
              previousValue: v1 || 'N/A',
              updatedValue: v2 || 'N/A'
            });
          }
        }
      }

      const updateData = {
        ...cleanedData,
        customData: editCustomData,
        lastUpdatedBy: userProfile?.name || userProfile?.email || 'Unknown User',
        lastUpdatedAt: new Date().toISOString()
      };

      await updateSubDocument(schoolId, 'students', selectedStudentToView.id, updateData);

      const studentName = `${cleanedData.firstName} ${cleanedData.lastName}`;
      await logStudentAudit(selectedStudentToView.id, studentName, 'Student Updated', modifiedFields);

      toast.success("Student details updated successfully.");
      
      const updatedStudentObj = {
        ...selectedStudentToView,
        ...updateData
      };
      setSelectedStudentToView(updatedStudentObj);
      setIsEditMode(false);
    } catch (e) {
      console.error(e);
      toast.error("Failed to save changes.");
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
                              setIsEditMode(false);
                              setEditStudentData(null);
                              setEditCustomData({});
                              setEditErrors({});
                              setShowDiscardConfirm(false);
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
                             onClick={() => setConfirmDeleteState({ isOpen: true, id: student.id, name: `${student.firstName} ${student.lastName}` })}
                             className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                             title="Delete Student"
                           >
                             <Trash size={18} />
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
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="text-indigo-600" />
                {isEditMode ? 'Edit Student Details' : 'Student Details'}
              </h2>
              <button onClick={handleModalCloseOrCancel} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-2xl shrink-0">
                  {selectedStudentToView.firstName?.charAt(0) || ''}{selectedStudentToView.lastName?.charAt(0) || ''}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-slate-900 truncate">
                    {selectedStudentToView.firstName} {selectedStudentToView.middleName ? `${selectedStudentToView.middleName} ` : ''}{selectedStudentToView.lastName}
                  </h3>
                  <p className="text-sm font-medium text-slate-500">
                    Admission No:{' '}
                    <span className="text-slate-800 font-mono font-bold">
                      {selectedStudentToView.admissionNumber}
                    </span>
                  </p>
                </div>
              </div>

              {!isEditMode ? (
                /* VIEW MODE */
                <div className="space-y-6">
                  {/* Personal Information */}
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/60">
                    <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b border-slate-200/80">Personal Information</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">First Name</label>
                        <p className="text-slate-950 font-semibold">{selectedStudentToView.firstName || '—'}</p>
                      </div>
                      {selectedStudentToView.middleName && (
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Middle Name</label>
                          <p className="text-slate-950 font-semibold">{selectedStudentToView.middleName}</p>
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Last Name</label>
                        <p className="text-slate-950 font-semibold">{selectedStudentToView.lastName || '—'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Date of Birth</label>
                        <p className="text-slate-950 font-semibold">{selectedStudentToView.dob ? new Date(selectedStudentToView.dob).toLocaleDateString() : '—'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Age</label>
                        <p className="text-slate-950 font-semibold">{selectedStudentToView.age || '—'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Gender</label>
                        <p className="text-slate-950 font-semibold">{selectedStudentToView.gender || '—'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Blood Group</label>
                        <p className="text-slate-950 font-semibold">{selectedStudentToView.bloodGroup || '—'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nationality</label>
                        <p className="text-slate-950 font-semibold">{selectedStudentToView.nationality || '—'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Religion</label>
                        <p className="text-slate-950 font-semibold">{selectedStudentToView.religion || '—'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Mother Tongue</label>
                        <p className="text-slate-950 font-semibold">{selectedStudentToView.motherTongue || '—'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Aadhaar Number</label>
                        <p className="text-slate-950 font-semibold">{selectedStudentToView.aadharNumber || '—'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Student Phone</label>
                        <p className="text-slate-950 font-semibold">{selectedStudentToView.studentPhone || '—'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Student Email</label>
                        <p className="text-slate-950 font-semibold">{selectedStudentToView.studentEmail || '—'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Academic Information */}
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/60">
                    <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b border-slate-200/80">Academic Information</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Class & Section</label>
                        <p className="text-slate-950 font-semibold">{getClassName(selectedStudentToView.classId)}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Roll Number</label>
                        <p className="text-slate-950 font-semibold">{selectedStudentToView.rollNumber || '—'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Admission Date</label>
                        <p className="text-slate-950 font-semibold">{selectedStudentToView.admissionDate ? new Date(selectedStudentToView.admissionDate).toLocaleDateString() : '—'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status</label>
                        <div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            selectedStudentToView.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {selectedStudentToView.status || 'Active'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Parent / Guardian Information */}
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/60">
                    <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b border-slate-200/80">Parent / Guardian Information</h4>
                    <div className="space-y-4">
                      {/* Father info */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pb-3 border-b border-slate-200/50">
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Father's Name</label>
                          <p className="text-slate-950 font-semibold">{selectedStudentToView.parentName || '—'}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Father's Phone</label>
                          <p className="text-slate-950 font-semibold">{selectedStudentToView.parentPhone || '—'}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Father's Email</label>
                          <p className="text-slate-950 font-semibold truncate">{selectedStudentToView.parentEmail || '—'}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Occupation</label>
                          <p className="text-slate-950 font-semibold">{selectedStudentToView.parentOccupation || '—'}</p>
                        </div>
                      </div>
                      {/* Mother info */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pb-3 border-b border-slate-200/50">
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Mother's Name</label>
                          <p className="text-slate-950 font-semibold">{selectedStudentToView.motherName || '—'}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Mother's Phone</label>
                          <p className="text-slate-950 font-semibold">{selectedStudentToView.motherPhone || '—'}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Mother's Email</label>
                          <p className="text-slate-950 font-semibold truncate">{selectedStudentToView.motherEmail || '—'}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Occupation</label>
                          <p className="text-slate-950 font-semibold">{selectedStudentToView.motherOccupation || '—'}</p>
                        </div>
                      </div>
                      {/* Guardian info */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Guardian Name</label>
                          <p className="text-slate-950 font-semibold">{selectedStudentToView.guardianName || '—'}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Guardian Phone</label>
                          <p className="text-slate-950 font-semibold">{selectedStudentToView.guardianPhone || '—'}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Relationship</label>
                          <p className="text-slate-950 font-semibold">{selectedStudentToView.guardianRelationship || '—'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Address Information */}
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/60">
                    <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b border-slate-200/80">Address Information</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="col-span-1 sm:col-span-3">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Address Line 1</label>
                        <p className="text-slate-950 font-semibold">{selectedStudentToView.addressLine1 || selectedStudentToView.homeAddress || '—'}</p>
                      </div>
                      <div className="col-span-1 sm:col-span-3">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Address Line 2</label>
                        <p className="text-slate-950 font-semibold">{selectedStudentToView.addressLine2 || '—'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">City</label>
                        <p className="text-slate-950 font-semibold">{selectedStudentToView.city || '—'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">District</label>
                        <p className="text-slate-950 font-semibold">{selectedStudentToView.district || '—'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">State</label>
                        <p className="text-slate-950 font-semibold">{selectedStudentToView.state || '—'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Country</label>
                        <p className="text-slate-950 font-semibold">{selectedStudentToView.country || '—'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Pincode</label>
                        <p className="text-slate-950 font-semibold">{selectedStudentToView.pincode || '—'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Other Details */}
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/60">
                    <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b border-slate-200/80">Other Details</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Previous School</label>
                        <p className="text-slate-950 font-semibold">{selectedStudentToView.previousSchool || '—'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Identification Marks</label>
                        <p className="text-slate-950 font-semibold">{selectedStudentToView.identificationMarks || '—'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Transport Details</label>
                        <p className="text-slate-950 font-semibold">{selectedStudentToView.transportDetails || selectedStudentToView.busRoute || '—'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Hostel Details</label>
                        <p className="text-slate-950 font-semibold">{selectedStudentToView.hostelDetails || '—'}</p>
                      </div>
                      <div className="col-span-1 sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Medical Information</label>
                        <p className="text-slate-950 font-semibold whitespace-pre-line">{selectedStudentToView.medicalInfo || '—'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Fee Configuration */}
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/60">
                    <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b border-slate-200/80">Fee Configuration</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tuition Fee</label>
                        <p className="text-slate-950 font-semibold">{selectedStudentToView.tuitionFee ? `₹${selectedStudentToView.tuitionFee}` : '—'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Hostel Fee</label>
                        <p className="text-slate-950 font-semibold">{selectedStudentToView.hostelFee ? `₹${selectedStudentToView.hostelFee}` : '—'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Book Fee</label>
                        <p className="text-slate-950 font-semibold">{selectedStudentToView.bookFee ? `₹${selectedStudentToView.bookFee}` : '—'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Other Fee</label>
                        <p className="text-slate-950 font-semibold">{selectedStudentToView.otherFee ? `₹${selectedStudentToView.otherFee}` : '—'}</p>
                      </div>
                      <div className="col-span-2 sm:col-span-4 pt-2 border-t border-slate-200/60 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Fee</span>
                        <span className="text-primary-700 font-black text-lg">{selectedStudentToView.totalFee ? `₹${selectedStudentToView.totalFee}` : '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Schema / Custom Fields */}
                  {formSchema.length > 0 && selectedStudentToView.customData && (
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/60">
                      <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b border-slate-200/80">Additional Details</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {formSchema.map(field => {
                          let val = selectedStudentToView.customData[field.id];
                          if (field.type === 'checkbox') val = val ? 'Yes' : 'No';
                          return (
                            <div key={`view_${field.id}`}>
                              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{field.label}</label>
                              <p className="text-slate-950 font-semibold">{val || '—'}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* System & Metadata Information */}
                  <div className="bg-slate-100/50 p-4 rounded-2xl border border-slate-200/40 text-xs text-slate-500 space-y-1">
                    <p>Student ID: <span className="font-mono font-semibold text-slate-700">{selectedStudentToView.id}</span></p>
                    <p>Created Date: <span className="font-semibold text-slate-700">{selectedStudentToView.createdAt ? new Date(selectedStudentToView.createdAt).toLocaleString() : 'N/A'}</span></p>
                    {selectedStudentToView.createdBy && <p>Created By: <span className="font-semibold text-slate-700">{selectedStudentToView.createdBy}</span></p>}
                    {selectedStudentToView.lastUpdatedAt && <p>Last Updated Date: <span className="font-semibold text-slate-700">{new Date(selectedStudentToView.lastUpdatedAt).toLocaleString()}</span></p>}
                    {selectedStudentToView.lastUpdatedBy && <p>Last Updated By: <span className="font-semibold text-slate-700">{selectedStudentToView.lastUpdatedBy}</span></p>}
                  </div>
                </div>
              ) : (
                /* EDIT MODE */
                <div className="space-y-6 animate-fade-in">
                  {/* Personal Information Edit */}
                  <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-200">
                    <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b border-slate-200">Personal Information</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">First Name *</label>
                        <input
                          type="text"
                          value={editStudentData.firstName || ''}
                          onChange={e => handleEditFieldChange('firstName', e.target.value)}
                          className={`w-full px-3 py-2 rounded-xl border bg-white focus:ring-2 focus:ring-primary-500 ${editErrors.firstName ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'}`}
                        />
                        {editErrors.firstName && <span className="text-red-500 text-xs mt-1 block">{editErrors.firstName}</span>}
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Middle Name</label>
                        <input
                          type="text"
                          value={editStudentData.middleName || ''}
                          onChange={e => handleEditFieldChange('middleName', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Last Name *</label>
                        <input
                          type="text"
                          value={editStudentData.lastName || ''}
                          onChange={e => handleEditFieldChange('lastName', e.target.value)}
                          className={`w-full px-3 py-2 rounded-xl border bg-white focus:ring-2 focus:ring-primary-500 ${editErrors.lastName ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'}`}
                        />
                        {editErrors.lastName && <span className="text-red-500 text-xs mt-1 block">{editErrors.lastName}</span>}
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Admission Number *</label>
                        <input
                          type="text"
                          value={editStudentData.admissionNumber || ''}
                          onChange={e => handleEditFieldChange('admissionNumber', e.target.value)}
                          className={`w-full px-3 py-2 rounded-xl border bg-white focus:ring-2 focus:ring-primary-500 ${editErrors.admissionNumber ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'}`}
                        />
                        {editErrors.admissionNumber && <span className="text-red-500 text-xs mt-1 block">{editErrors.admissionNumber}</span>}
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Date of Birth</label>
                        <input
                          type="date"
                          value={editStudentData.dob || ''}
                          onChange={e => handleEditFieldChange('dob', e.target.value)}
                          className={`w-full px-3 py-2 rounded-xl border bg-white focus:ring-2 focus:ring-primary-500 ${editErrors.dob ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'}`}
                        />
                        {editErrors.dob && <span className="text-red-500 text-xs mt-1 block">{editErrors.dob}</span>}
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Gender</label>
                        <select
                          value={editStudentData.gender || 'Male'}
                          onChange={e => handleEditFieldChange('gender', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Blood Group</label>
                        <input
                          type="text"
                          value={editStudentData.bloodGroup || ''}
                          onChange={e => handleEditFieldChange('bloodGroup', e.target.value)}
                          placeholder="e.g. O+, A-"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nationality</label>
                        <input
                          type="text"
                          value={editStudentData.nationality || ''}
                          onChange={e => handleEditFieldChange('nationality', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Religion</label>
                        <input
                          type="text"
                          value={editStudentData.religion || ''}
                          onChange={e => handleEditFieldChange('religion', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Mother Tongue</label>
                        <input
                          type="text"
                          value={editStudentData.motherTongue || ''}
                          onChange={e => handleEditFieldChange('motherTongue', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Aadhaar Number</label>
                        <input
                          type="text"
                          value={editStudentData.aadharNumber || ''}
                          onChange={e => handleEditFieldChange('aadharNumber', e.target.value)}
                          className={`w-full px-3 py-2 rounded-xl border bg-white focus:ring-2 focus:ring-primary-500 ${editErrors.aadharNumber ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'}`}
                        />
                        {editErrors.aadharNumber && <span className="text-red-500 text-xs mt-1 block">{editErrors.aadharNumber}</span>}
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Student Phone</label>
                        <input
                          type="text"
                          value={editStudentData.studentPhone || ''}
                          onChange={e => handleEditFieldChange('studentPhone', e.target.value)}
                          className={`w-full px-3 py-2 rounded-xl border bg-white focus:ring-2 focus:ring-primary-500 ${editErrors.studentPhone ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'}`}
                        />
                        {editErrors.studentPhone && <span className="text-red-500 text-xs mt-1 block">{editErrors.studentPhone}</span>}
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Student Email</label>
                        <input
                          type="email"
                          value={editStudentData.studentEmail || ''}
                          onChange={e => handleEditFieldChange('studentEmail', e.target.value)}
                          className={`w-full px-3 py-2 rounded-xl border bg-white focus:ring-2 focus:ring-primary-500 ${editErrors.studentEmail ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'}`}
                        />
                        {editErrors.studentEmail && <span className="text-red-500 text-xs mt-1 block">{editErrors.studentEmail}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Academic Information Edit */}
                  <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-200">
                    <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b border-slate-200">Academic Information</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Class & Section</label>
                        <select
                          value={editStudentData.classId || ''}
                          onChange={e => handleEditFieldChange('classId', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="">-- Unassigned --</option>
                          {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.name} - {c.section}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Roll Number</label>
                        <input
                          type="text"
                          value={editStudentData.rollNumber || ''}
                          onChange={e => handleEditFieldChange('rollNumber', e.target.value)}
                          className={`w-full px-3 py-2 rounded-xl border bg-white focus:ring-2 focus:ring-primary-500 ${editErrors.rollNumber ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'}`}
                        />
                        {editErrors.rollNumber && <span className="text-red-500 text-xs mt-1 block">{editErrors.rollNumber}</span>}
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Admission Date</label>
                        <input
                          type="date"
                          value={editStudentData.admissionDate || ''}
                          onChange={e => handleEditFieldChange('admissionDate', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Student Status</label>
                        <select
                          value={editStudentData.status || 'Active'}
                          onChange={e => handleEditFieldChange('status', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Parent / Guardian Information Edit */}
                  <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-200">
                    <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b border-slate-200">Parent / Guardian Information</h4>
                    <div className="space-y-4">
                      {/* Father details */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pb-3 border-b border-slate-200/50">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Father's Name</label>
                          <input
                            type="text"
                            value={editStudentData.parentName || ''}
                            onChange={e => handleEditFieldChange('parentName', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Father's Phone</label>
                          <input
                            type="text"
                            value={editStudentData.parentPhone || ''}
                            onChange={e => handleEditFieldChange('parentPhone', e.target.value)}
                            className={`w-full px-3 py-2 rounded-xl border bg-white focus:ring-2 focus:ring-primary-500 ${editErrors.parentPhone ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'}`}
                          />
                          {editErrors.parentPhone && <span className="text-red-500 text-xs mt-1 block">{editErrors.parentPhone}</span>}
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Father's Email</label>
                          <input
                            type="email"
                            value={editStudentData.parentEmail || ''}
                            onChange={e => handleEditFieldChange('parentEmail', e.target.value)}
                            className={`w-full px-3 py-2 rounded-xl border bg-white focus:ring-2 focus:ring-primary-500 ${editErrors.parentEmail ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'}`}
                          />
                          {editErrors.parentEmail && <span className="text-red-500 text-xs mt-1 block">{editErrors.parentEmail}</span>}
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Occupation</label>
                          <input
                            type="text"
                            value={editStudentData.parentOccupation || ''}
                            onChange={e => handleEditFieldChange('parentOccupation', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                      </div>

                      {/* Mother details */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pb-3 border-b border-slate-200/50">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Mother's Name</label>
                          <input
                            type="text"
                            value={editStudentData.motherName || ''}
                            onChange={e => handleEditFieldChange('motherName', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Mother's Phone</label>
                          <input
                            type="text"
                            value={editStudentData.motherPhone || ''}
                            onChange={e => handleEditFieldChange('motherPhone', e.target.value)}
                            className={`w-full px-3 py-2 rounded-xl border bg-white focus:ring-2 focus:ring-primary-500 ${editErrors.motherPhone ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'}`}
                          />
                          {editErrors.motherPhone && <span className="text-red-500 text-xs mt-1 block">{editErrors.motherPhone}</span>}
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Mother's Email</label>
                          <input
                            type="email"
                            value={editStudentData.motherEmail || ''}
                            onChange={e => handleEditFieldChange('motherEmail', e.target.value)}
                            className={`w-full px-3 py-2 rounded-xl border bg-white focus:ring-2 focus:ring-primary-500 ${editErrors.motherEmail ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'}`}
                          />
                          {editErrors.motherEmail && <span className="text-red-500 text-xs mt-1 block">{editErrors.motherEmail}</span>}
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Occupation</label>
                          <input
                            type="text"
                            value={editStudentData.motherOccupation || ''}
                            onChange={e => handleEditFieldChange('motherOccupation', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                      </div>

                      {/* Guardian details */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Guardian Name</label>
                          <input
                            type="text"
                            value={editStudentData.guardianName || ''}
                            onChange={e => handleEditFieldChange('guardianName', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Guardian Phone</label>
                          <input
                            type="text"
                            value={editStudentData.guardianPhone || ''}
                            onChange={e => handleEditFieldChange('guardianPhone', e.target.value)}
                            className={`w-full px-3 py-2 rounded-xl border bg-white focus:ring-2 focus:ring-primary-500 ${editErrors.guardianPhone ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'}`}
                          />
                          {editErrors.guardianPhone && <span className="text-red-500 text-xs mt-1 block">{editErrors.guardianPhone}</span>}
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Relationship</label>
                          <input
                            type="text"
                            value={editStudentData.guardianRelationship || ''}
                            onChange={e => handleEditFieldChange('guardianRelationship', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Address Information Edit */}
                  <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-200">
                    <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b border-slate-200">Address Information</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="col-span-1 sm:col-span-3">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Address Line 1</label>
                        <input
                          type="text"
                          value={editStudentData.addressLine1 || editStudentData.homeAddress || ''}
                          onChange={e => handleEditFieldChange('addressLine1', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div className="col-span-1 sm:col-span-3">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Address Line 2</label>
                        <input
                          type="text"
                          value={editStudentData.addressLine2 || ''}
                          onChange={e => handleEditFieldChange('addressLine2', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">City</label>
                        <input
                          type="text"
                          value={editStudentData.city || ''}
                          onChange={e => handleEditFieldChange('city', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">District</label>
                        <input
                          type="text"
                          value={editStudentData.district || ''}
                          onChange={e => handleEditFieldChange('district', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">State</label>
                        <input
                          type="text"
                          value={editStudentData.state || ''}
                          onChange={e => handleEditFieldChange('state', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Country</label>
                        <input
                          type="text"
                          value={editStudentData.country || ''}
                          onChange={e => handleEditFieldChange('country', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Pincode</label>
                        <input
                          type="text"
                          value={editStudentData.pincode || ''}
                          onChange={e => handleEditFieldChange('pincode', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Other Details Edit */}
                  <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-200">
                    <h4 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider mb-4 pb-2 border-b border-slate-200">Other Details</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Previous School</label>
                        <input
                          type="text"
                          value={editStudentData.previousSchool || ''}
                          onChange={e => handleEditFieldChange('previousSchool', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Identification Marks</label>
                        <input
                          type="text"
                          value={editStudentData.identificationMarks || ''}
                          onChange={e => handleEditFieldChange('identificationMarks', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Transport Details</label>
                        <input
                          type="text"
                          value={editStudentData.transportDetails || editStudentData.busRoute || ''}
                          onChange={e => handleEditFieldChange('transportDetails', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Hostel Details</label>
                        <input
                          type="text"
                          value={editStudentData.hostelDetails || ''}
                          onChange={e => handleEditFieldChange('hostelDetails', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div className="col-span-1 sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Medical Information</label>
                        <textarea
                          rows={3}
                          value={editStudentData.medicalInfo || ''}
                          onChange={e => handleEditFieldChange('medicalInfo', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Fee Configuration Edit */}
                  <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-200">
                    <h4 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider mb-4 pb-2 border-b border-slate-200">Fee Configuration</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Tuition Fee</label>
                        <input
                          type="number"
                          value={editStudentData.tuitionFee || ''}
                          onChange={e => handleEditFeeChange('tuitionFee', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Hostel Fee</label>
                        <input
                          type="number"
                          value={editStudentData.hostelFee || ''}
                          onChange={e => handleEditFeeChange('hostelFee', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Book Fee</label>
                        <input
                          type="number"
                          value={editStudentData.bookFee || ''}
                          onChange={e => handleEditFeeChange('bookFee', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Other Fee</label>
                        <input
                          type="number"
                          value={editStudentData.otherFee || ''}
                          onChange={e => handleEditFeeChange('otherFee', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-4 pt-2 border-t border-slate-200 flex justify-between items-center bg-primary-50/50 p-3 rounded-xl">
                        <span className="text-xs font-bold text-primary-800 uppercase tracking-wider">Total Fee</span>
                        <span className="text-primary-700 font-black text-lg">₹{editStudentData.totalFee || '0'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Schema / Custom Fields Edit */}
                  {formSchema.length > 0 && (
                    <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-200">
                      <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b border-slate-200">Additional Details</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {formSchema.map(field => (
                          <div key={`edit_${field.id}`}>
                            {field.type !== 'checkbox' && (
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                {field.label} {field.required && <span className="text-red-500">*</span>}
                              </label>
                            )}
                            
                            {field.type === 'select' ? (
                              <select
                                required={field.required}
                                value={editCustomData[field.id] || ''}
                                onChange={e => setEditCustomData({ ...editCustomData, [field.id]: e.target.value })}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500"
                              >
                                <option value="">Select...</option>
                                {field.options && field.options.split(',').map(opt => (
                                  <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
                                ))}
                              </select>
                            ) : field.type === 'checkbox' ? (
                              <label className="flex items-center gap-3 mt-2 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  required={field.required}
                                  checked={editCustomData[field.id] || false}
                                  onChange={e => setEditCustomData({ ...editCustomData, [field.id]: e.target.checked })}
                                  className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                />
                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{field.label} {field.required && <span className="text-red-500">*</span>}</span>
                              </label>
                            ) : (
                              <input
                                type={field.type}
                                required={field.required}
                                value={editCustomData[field.id] || ''}
                                onChange={e => setEditCustomData({ ...editCustomData, [field.id]: e.target.value })}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Read-Only System Metadata Section in Edit Mode */}
                  <div className="bg-slate-100/50 p-4 rounded-2xl border border-slate-200/40 text-xs text-slate-400 space-y-1 select-none">
                    <p>Student ID: <span className="font-mono font-semibold">{selectedStudentToView.id}</span> (Read-only)</p>
                    <p>Created Date: <span>{selectedStudentToView.createdAt ? new Date(selectedStudentToView.createdAt).toLocaleString() : 'N/A'}</span> (Read-only)</p>
                    {selectedStudentToView.createdBy && <p>Created By: <span>{selectedStudentToView.createdBy}</span> (Read-only)</p>}
                    {selectedStudentToView.lastUpdatedAt && <p>Last Updated Date: <span>{new Date(selectedStudentToView.lastUpdatedAt).toLocaleString()}</span> (Read-only)</p>}
                    {selectedStudentToView.lastUpdatedBy && <p>Last Updated By: <span>{selectedStudentToView.lastUpdatedBy}</span> (Read-only)</p>}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              {isEditMode ? (
                <>
                  <button 
                    onClick={handleModalCloseOrCancel}
                    className="px-6 py-2.5 bg-slate-200 text-slate-700 font-bold hover:bg-slate-300 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveStudentEdit}
                    className="px-6 py-2.5 bg-primary-600 text-white font-bold hover:bg-primary-700 rounded-xl transition-colors shadow-sm"
                  >
                    Save
                  </button>
                </>
              ) : (
                <>
                  {hasEditPermission && (
                    <button 
                      onClick={() => {
                        setEditStudentData({ ...selectedStudentToView });
                        setEditCustomData({ ...selectedStudentToView.customData });
                        setEditErrors({});
                        setIsEditMode(true);
                      }}
                      className="px-6 py-2 bg-primary-600 text-white font-bold hover:bg-primary-700 rounded-xl transition-colors shadow-sm"
                    >
                      Edit
                    </button>
                  )}
                  <button 
                    onClick={handleModalCloseOrCancel}
                    className="px-6 py-2 bg-slate-200 text-slate-700 font-bold hover:bg-slate-300 rounded-xl transition-colors"
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Discard Unsaved Changes Warning Modal */}
      {showDiscardConfirm && (
        <ConfirmModal 
          isOpen={showDiscardConfirm}
          onClose={() => setShowDiscardConfirm(false)}
          onConfirm={() => {
            setShowDiscardConfirm(false);
            setIsEditMode(false);
            setViewStudentModalOpen(false);
          }}
          title="Unsaved Changes"
          message="You have unsaved changes. Are you sure you want to discard them?"
          confirmText="Discard Changes"
          cancelText="Continue Editing"
          type="danger"
        />
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

      <ConfirmModal
        isOpen={confirmDeleteState.isOpen}
        title="Delete Student"
        message={`Are you sure you want to delete the student "${confirmDeleteState.name}"? This action cannot be undone.`}
        onConfirm={() => handleDeleteStudent(confirmDeleteState.id)}
        onCancel={() => setConfirmDeleteState({ isOpen: false, id: null, name: '' })}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

    </div>
  );
}
