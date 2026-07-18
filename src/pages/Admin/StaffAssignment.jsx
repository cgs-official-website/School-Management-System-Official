import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSubCollection, updateSubDocument, addSubDocument, subscribeToSubCollection } from '../../firebase/firestore';
import { getDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase/config';
import { LuSearch as Search, LuShieldCheck as ShieldCheck, LuMail as Mail, LuUsers as Users, LuCircleCheck as CheckCircle2, LuX as X, LuCloudUpload as UploadCloud, LuFileText as FileText, LuExternalLink as ExternalLink, LuDownload as Download, LuFileSpreadsheet as FileSpreadsheet, LuUserPlus as UserPlus, LuEye as Eye, LuFilter as Filter, LuLink as LinkIcon, LuCopy as CopyIcon, LuTrash2 as Trash } from 'react-icons/lu';
import { TableSkeleton } from '../../components/Skeleton';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import CustomFieldsRenderer from '../../components/CustomFieldsRenderer';
import ConfirmModal from '../../components/ConfirmModal';

export default function StaffAssignment() {
  const { userProfile } = useAuth();
  const schoolId = userProfile?.schoolId;

  const [staff, setStaff] = useState([]);
  const [classes, setClasses] = useState([]);
  const [schoolName, setSchoolName] = useState('');
  const [loading, setLoading] = useState(true);

  // Assignment Modal State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectClassIds, setSelectedSubjectClassIds] = useState([]);
  const [saving, setSaving] = useState(false);

  // Upload Modal State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedStaffForUpload, setSelectedStaffForUpload] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [confirmDeleteState, setConfirmDeleteState] = useState({ isOpen: false, id: null, name: '' });

  const handleDeleteStaff = async (staffId) => {
    try {
      await deleteDoc(doc(db, `schools/${schoolId}/teachers`, staffId));
      toast.success("Staff member deleted successfully!");
      setConfirmDeleteState({ isOpen: false, id: null, name: '' });
    } catch (error) {
      console.error("Error deleting staff member:", error);
      toast.error("Failed to delete staff member.");
    }
  };

  // Add Staff Modal State
  const initialStaffFormState = {
    staffId: '',
    firstName: '',
    lastName: '',
    dob: '',
    gender: 'Male',
    nationality: '',
    maritalStatus: 'Single',
    bloodGroup: '',
    aadharNumber: '',
    languagesKnown: '',
    mobileNumber: '',
    email: '',
    residentialAddress: '',
    emergencyContact: '',
    fatherGuardianName: '',
    role: 'Staffs',
    assignedClassId: '',
    staff_type: 'teaching',
    status: 'Active',
    
    // Educational Information
    highestQualification: '',
    degreeSpecialization: '',
    universityName: '',
    yearOfPassing: '',

    // Professional Information
    previousExperience: '0',
    previousOrganization: '',
    subjectSpecialization: '',
    gradesClassesHandled: '',
    professionalCertifications: '',

    // Government & Identity
    govtIdType: 'Aadhaar',
    govtIdNumber: '',
    panNumber: '',
    taxIdDetails: '',

    // Employment Details
    pfNumber: '',
    esicNumber: '',
    uanNumber: '',

    // Banking Information
    bankAccountNumber: '',
    bankName: '',
    branchName: '',
    ifscCode: '',

    // Documents (URLs)
    photoUrl: '',
    academicCertificates: [],
    markSheets: [],
    experienceCertificates: [],
    relievingLetter: [],
    resume: [],
    referenceLetters: [],
    govtIdDocument: [],
    salarySlips: [],
    
    // Custom Data
    customData: {}
  };

  const [addStaffModalOpen, setAddStaffModalOpen] = useState(false);
  const [newStaff, setNewStaff] = useState(initialStaffFormState);
  const [addingStaff, setAddingStaff] = useState(false);
  const [addStaffActiveTab, setAddStaffActiveTab] = useState('Personal');
  const [addStaffErrors, setAddStaffErrors] = useState({});
  const [addStaffFiles, setAddStaffFiles] = useState({
    photo: null,
    academicCertificates: [],
    markSheets: [],
    experienceCertificates: [],
    relievingLetter: [],
    resume: [],
    referenceLetters: [],
    govtIdDocument: [],
    salarySlips: []
  });

  // View Modal State
  const [viewStaffModalOpen, setViewStaffModalOpen] = useState(false);
  const [selectedStaffToView, setSelectedStaffToView] = useState(null);
  const [isStaffEditMode, setIsStaffEditMode] = useState(false);
  const [editStaffData, setEditStaffData] = useState(null);
  const [editStaffErrors, setEditStaffErrors] = useState({});
  const [savingStaffEdit, setSavingStaffEdit] = useState(false);
  const [editStaffDocFiles, setEditStaffDocFiles] = useState({});

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [staffTypeFilter, setStaffTypeFilter] = useState('all');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef(null);
  const activeTabRef = useRef(null);

  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [addStaffActiveTab]);

  useEffect(() => {
    if (!schoolId) return;

    setLoading(true);
    let teachersUnsub, classesUnsub;

    // Fetch school name once
    getDoc(doc(db, 'schools', schoolId)).then(snap => {
      if (snap.exists()) setSchoolName(snap.data().schoolName || 'School');
    });

    teachersUnsub = subscribeToSubCollection(schoolId, 'teachers', (data) => {
      setStaff(data);
      setLoading(false);
    });

    classesUnsub = subscribeToSubCollection(schoolId, 'classes', (data) => {
      data.sort((a, b) => {
        const nameCompare = (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' });
        if (nameCompare === 0) {
          return (a.section || '').localeCompare(b.section || '', undefined, { numeric: true, sensitivity: 'base' });
        }
        return nameCompare;
      });
      setClasses(data);
    });

    return () => {
      if (teachersUnsub) teachersUnsub();
      if (classesUnsub) classesUnsub();
    };
  }, [schoolId]);

  // Click outside to close filter dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setIsFilterDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const openAssignModal = (staffMember) => {
    setSelectedStaff(staffMember);
    setSelectedClassId(staffMember.assignedClassId || '');
    setSelectedSubjectClassIds(staffMember.subjectClassIds || []);
    setAssignModalOpen(true);
  };

  const openUploadModal = (staffMember) => {
    setSelectedStaffForUpload(staffMember);
    setUploadFile(null);
    setUploadModalOpen(true);
  };

  const handleAssign = async () => {
    setSaving(true);
    try {
      await updateSubDocument(schoolId, 'teachers', selectedStaff.id, {
        assignedClassId: selectedClassId,
        subjectClassIds: selectedSubjectClassIds
      });
      setAssignModalOpen(false);
      // Refresh handled by listener
    } catch (error) {
      console.error("Error updating assignment:", error);
      toast.error("Failed to assign class.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);

    if (!selectedStaffForUpload) {
      // BULK IMPORT LOGIC
      const loadingToastId = toast.loading("Processing bulk import...");
      try {
        const reader = new FileReader();
        reader.onload = async (evt) => {
          try {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const rawData = XLSX.utils.sheet_to_json(ws, { defval: '' });

            if (rawData.length === 0) {
              toast.error('The file appears to be empty or has no data rows.', { id: loadingToastId });
              setUploading(false);
              return;
            }

            // Log detected columns for debugging
            console.log('[Bulk Import] Detected columns:', Object.keys(rawData[0]));
            
            // Helper: get value from a row using multiple possible key variants (case+space insensitive)
            const getField = (row, ...aliases) => {
              const normalizedRow = {};
              Object.keys(row).forEach(k => {
                normalizedRow[k.trim().toLowerCase().replace(/\s+/g, ' ')] = row[k];
              });
              for (const alias of aliases) {
                const val = normalizedRow[alias.trim().toLowerCase().replace(/\s+/g, ' ')];
                if (val !== undefined && String(val).trim() !== '') return String(val).trim();
              }
              return '';
            };

            let successCount = 0;
            let skippedCount = 0;

            for (let i = 0; i < rawData.length; i++) {
              const row = rawData[i];

              // Support both "Full Name" (single col) and "First Name" / "Last Name" (split cols)
              let firstName = getField(row, 'first name', 'firstname', 'first_name');
              let lastName = getField(row, 'last name', 'lastname', 'last_name', 'surname');
              const fullName = getField(row, 'full name', 'fullname', 'name', 'staff name');
              if (!firstName && fullName) {
                const parts = fullName.trim().split(' ');
                firstName = parts[0];
                lastName = parts.slice(1).join(' ') || parts[0];
              }

              const email = getField(row, 'email address', 'email', 'emailaddress', 'email_address', 'mail');
              
              // Skip rows that are missing required fields
              if (!firstName || !email) {
                console.warn(`[Bulk Import] Row ${i + 1} skipped:`, { firstName, lastName, email }, row);
                skippedCount++;
                continue;
              }

              // Map all Excel columns to Firestore fields
              const staffData = {
                staffId:                  getField(row, 'staff id', 'staffid', 'staff_id', 'id'),
                firstName,
                lastName,
                name:                     `${firstName} ${lastName}`.trim(),
                dob:                      getField(row, 'date of birth', 'dob', 'birth date'),
                gender:                   getField(row, 'gender', 'sex'),
                nationality:              getField(row, 'nationality'),
                maritalStatus:            getField(row, 'marital status', 'marital_status'),
                bloodGroup:               getField(row, 'blood group', 'bloodgroup', 'blood_group'),
                aadharNumber:             getField(row, 'aadhar number', 'aadhar', 'aadhaar number', 'aadhaar'),
                languagesKnown:           getField(row, 'languages known', 'languages', 'language'),
                mobileNumber:             getField(row, 'mobile number', 'mobile', 'phone', 'contact', 'phone number'),
                email,
                residentialAddress:       getField(row, 'residential address', 'address', 'residence'),
                emergencyContact:         getField(row, 'emergency contact details', 'emergency contact', 'emergency'),
                fatherName:               getField(row, 'father name/guardian name', 'father name', 'guardian name', 'father/guardian'),
                highestQualification:     getField(row, 'highest qualification', 'qualification'),
                degreeSpecialization:     getField(row, 'degree(s) and specialization', 'degree and specialization', 'degree', 'specialization'),
                universityName:           getField(row, 'university/college name', 'university', 'college', 'institution'),
                yearOfPassing:            getField(row, 'year of passing', 'year passing', 'passing year'),
                previousExperience:       getField(row, 'previous experience (years)', 'previous experience', 'experience years', 'experience'),
                previousOrganization:     getField(row, 'previous school/organization', 'previous school', 'previous organization', 'organization'),
                subjectSpecialization:    getField(row, 'subject specialization', 'subject', 'subjects'),
                gradesClassesHandled:     getField(row, 'grades/classes handled', 'grades', 'classes handled'),
                professionalCertifications: getField(row, 'certifications', 'professional certifications', 'certification'),
                govtIdNumber:             getField(row, 'government-issued id', 'government id', 'govt id', 'govt_id'),
                taxIdDetails:             getField(row, 'tax identification details (pan)', 'tax identification', 'tax id'),
                panNumber:                getField(row, 'pan number', 'pan', 'pan_number'),
                pfNumber:                 getField(row, 'pf number', 'pf', 'provident fund'),
                esicNumber:               getField(row, 'esic number', 'esic'),
                uanNumber:                getField(row, 'uan number', 'uan'),
                bankAccountNumber:        getField(row, 'bank account number', 'account number', 'bank account'),
                bankName:                 getField(row, 'bank name and branch', 'bank name', 'bank'),
                branchName:               getField(row, 'branch name', 'branch'),
                ifscCode:                 getField(row, 'ifsc code', 'ifsc'),
                role:                     getField(row, 'role', 'designation', 'position') || 'Staffs',
                staff_type:               getField(row, 'staff type', 'stafftype', 'type') || 'teaching',
                assignedClassId:          getField(row, 'assigned class id', 'class id', 'classid'),
                status: 'Active',
                createdAt: new Date().toISOString()
              };

              // Remove empty string values to keep Firestore docs clean
              Object.keys(staffData).forEach(k => { if (staffData[k] === '') delete staffData[k]; });

              await addSubDocument(schoolId, 'teachers', staffData);
              successCount++;
            }

            const skippedMsg = skippedCount > 0 ? ` (${skippedCount} row(s) skipped — missing required fields)` : '';
            toast.success(`Successfully imported ${successCount} staff member(s)!${skippedMsg}`, { id: loadingToastId });
            setUploadModalOpen(false);
            setUploadFile(null);
          } catch (innerErr) {
            console.error("Bulk import processing error:", innerErr);
            toast.error(`Import failed: ${innerErr.message || 'Check file format.'}`, { id: loadingToastId });
          } finally {
            setUploading(false);
          }
        };
        reader.onerror = () => {
          toast.error("Failed to read the file.", { id: loadingToastId });
          setUploading(false);
        };
        reader.readAsBinaryString(uploadFile);
      } catch (err) {
        console.error(err);
        toast.error("Failed to process file.", { id: loadingToastId });
        setUploading(false);
      }
      return;
    }

    try {
      const safeSchoolName = schoolName.replace(/[^a-z0-9]/gi, '_').trim();
      const staffName = selectedStaffForUpload.name || selectedStaffForUpload.firstName || 'Teacher';
      const safeStaffName = staffName.replace(/[^a-z0-9]/gi, '_').trim();
      const safeFileName = uploadFile.name.replace(/[^a-z0-9.]/gi, '_');

      // STRICT PATH: [SchoolName]/Teachers/[TeacherName]/[FileName]
      const storagePath = `${safeSchoolName}/Teachers/${safeStaffName}/${safeFileName}`;
      const fileRef = ref(storage, storagePath);

      await uploadBytes(fileRef, uploadFile);
      const downloadUrl = await getDownloadURL(fileRef);

      await updateSubDocument(schoolId, 'teachers', selectedStaffForUpload.id, {
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

  const handleSaveStaffEdit = async () => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!editStaffData.firstName?.trim()) errors.firstName = 'First name is required';
    if (!editStaffData.email?.trim()) errors.email = 'Email is required';
    else if (!emailRegex.test(editStaffData.email.trim())) errors.email = 'Invalid email format';
    if (editStaffData.mobileNumber?.trim() && !/^\d{10}$/.test(editStaffData.mobileNumber.trim())) {
      errors.mobileNumber = 'Mobile number must be 10 digits';
    }
    if (editStaffData.aadharNumber?.trim() && !/^\d{12}$/.test(editStaffData.aadharNumber.trim())) {
      errors.aadharNumber = 'Aadhaar number must be 12 digits';
    }
    // Check for duplicate email/staffId (excluding self)
    const isDupEmail = staff.some(s => s.id !== selectedStaffToView.id && s.email?.toLowerCase() === editStaffData.email?.trim().toLowerCase());
    if (isDupEmail) errors.email = 'Email already in use by another staff member';
    const isDupId = editStaffData.staffId?.trim() && staff.some(s => s.id !== selectedStaffToView.id && s.staffId?.toLowerCase() === editStaffData.staffId.trim().toLowerCase());
    if (isDupId) errors.staffId = 'Staff ID already in use';

    setEditStaffErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error('Please fix the highlighted errors.');
      return;
    }

    setSavingStaffEdit(true);
    try {
      // Upload any new document files first
      const docCategories = [
        'academicCertificates', 'markSheets', 'experienceCertificates',
        'relievingLetter', 'resume', 'referenceLetters', 'govtIdDocument', 'salarySlips'
      ];
      const docUpdates = {};
      const safeSchoolName = schoolName.replace(/[^a-z0-9]/gi, '_').trim();
      const staffName = ((editStaffData.firstName || '') + '_' + (editStaffData.lastName || '')).replace(/[^a-z0-9]/gi, '_').trim();

      for (const cat of docCategories) {
        const newFiles = editStaffDocFiles[cat] || [];
        if (newFiles.length > 0) {
          const existingDocs = selectedStaffToView[cat] || [];
          const uploadedDocs = [];
          for (const file of newFiles) {
            const safeFileName = file.name.replace(/[^a-z0-9.]/gi, '_');
            const storagePath = `${safeSchoolName}/Teachers/${staffName}/${cat}/${safeFileName}`;
            const fileRef = ref(storage, storagePath);
            await uploadBytes(fileRef, file);
            const url = await getDownloadURL(fileRef);
            uploadedDocs.push({ name: file.name, url });
          }
          docUpdates[cat] = [...existingDocs, ...uploadedDocs];
        }
      }
      const updateData = {
        ...docUpdates,
        staffId:          (editStaffData.staffId || '').trim(),
        employeeId:       (editStaffData.staffId || '').trim(),
        firstName:        (editStaffData.firstName || '').trim(),
        lastName:         (editStaffData.lastName || '').trim(),
        name:             `${(editStaffData.firstName || '').trim()} ${(editStaffData.lastName || '').trim()}`.trim(),
        dob:              (editStaffData.dob || '').trim(),
        gender:           editStaffData.gender || 'Male',
        nationality:      (editStaffData.nationality || '').trim(),
        maritalStatus:    editStaffData.maritalStatus || 'Single',
        bloodGroup:       (editStaffData.bloodGroup || '').trim(),
        aadharNumber:     (editStaffData.aadharNumber || '').trim(),
        languagesKnown:   (editStaffData.languagesKnown || '').trim(),
        mobileNumber:     (editStaffData.mobileNumber || '').trim(),
        email:            (editStaffData.email || '').trim(),
        residentialAddress: (editStaffData.residentialAddress || '').trim(),
        emergencyContact: (editStaffData.emergencyContact || '').trim(),
        fatherName:       (editStaffData.fatherName || '').trim(),
        highestQualification: (editStaffData.highestQualification || '').trim(),
        degreeSpecialization: (editStaffData.degreeSpecialization || '').trim(),
        universityName:   (editStaffData.universityName || '').trim(),
        yearOfPassing:    (editStaffData.yearOfPassing || '').trim(),
        previousExperience: (editStaffData.previousExperience || '').trim(),
        previousOrganization: (editStaffData.previousOrganization || '').trim(),
        subjectSpecialization: (editStaffData.subjectSpecialization || '').trim(),
        gradesClassesHandled: (editStaffData.gradesClassesHandled || '').trim(),
        professionalCertifications: (editStaffData.professionalCertifications || '').trim(),
        role:             editStaffData.role || 'Staffs',
        staff_type:       editStaffData.staff_type || 'teaching',
        status:           editStaffData.status || 'Active',
        // Sensitive — only updated if present
        govtIdType:       (editStaffData.govtIdType || '').trim(),
        govtIdNumber:     (editStaffData.govtIdNumber || '').trim(),
        panNumber:        (editStaffData.panNumber || '').trim(),
        pfNumber:         (editStaffData.pfNumber || '').trim(),
        esicNumber:       (editStaffData.esicNumber || '').trim(),
        uanNumber:        (editStaffData.uanNumber || '').trim(),
        taxIdDetails:     (editStaffData.taxIdDetails || '').trim(),
        bankName:         (editStaffData.bankName || '').trim(),
        bankAccountNumber:(editStaffData.bankAccountNumber || '').trim(),
        branchName:       (editStaffData.branchName || '').trim(),
        ifscCode:         (editStaffData.ifscCode || '').trim(),
        lastUpdatedBy:    userProfile?.name || userProfile?.email || 'Admin',
        lastUpdatedAt:    new Date().toISOString(),
      };

      await updateSubDocument(schoolId, 'teachers', selectedStaffToView.id, updateData);
      const updated = { ...selectedStaffToView, ...updateData };
      setSelectedStaffToView(updated);
      setIsStaffEditMode(false);
      setEditStaffDocFiles({});
      toast.success('Staff details updated successfully.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save changes.');
    } finally {
      setSavingStaffEdit(false);
    }
  };

  const checkStaffUniqueness = (staffIdVal, emailVal, currentId = null) => {
    const isIdDuplicate = staff.some(
      s => s.id !== currentId && s.staffId && s.staffId.trim().toLowerCase() === staffIdVal.trim().toLowerCase()
    );
    const isEmailDuplicate = staff.some(
      s => s.id !== currentId && s.email && s.email.trim().toLowerCase() === emailVal.trim().toLowerCase()
    );
    return { isIdDuplicate, isEmailDuplicate };
  };

  const validateStaffForm = (isRegisterPage = false) => {
    const errors = {};
    if (!newStaff.staffId?.trim()) errors.staffId = "Staff ID is required";
    if (!newStaff.firstName?.trim()) errors.firstName = "First name is required";
    if (!newStaff.email?.trim()) {
      errors.email = "Email is required";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newStaff.email)) errors.email = "Invalid email format";
    }
    
    // Check duplicates
    if (newStaff.staffId && newStaff.email) {
      const { isIdDuplicate, isEmailDuplicate } = checkStaffUniqueness(newStaff.staffId, newStaff.email);
      if (isIdDuplicate) errors.staffId = "Staff ID must be unique";
      if (isEmailDuplicate) errors.email = "Email must be unique";
    }

    if (newStaff.mobileNumber && !/^\d{10}$/.test(newStaff.mobileNumber)) {
      errors.mobileNumber = "Mobile number must be a 10-digit number";
    }
    if (newStaff.emergencyContact && !/^\d{10}$/.test(newStaff.emergencyContact)) {
      errors.emergencyContact = "Emergency contact must be a 10-digit number";
    }
    if (newStaff.aadharNumber && !/^\d{12}$/.test(newStaff.aadharNumber)) {
      errors.aadharNumber = "Aadhaar number must be a 12-digit number";
    }
    if (newStaff.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(newStaff.panNumber.toUpperCase())) {
      errors.panNumber = "Invalid PAN format (e.g. ABCDE1234F)";
    }
    if (newStaff.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(newStaff.ifscCode.toUpperCase())) {
      errors.ifscCode = "Invalid IFSC Code format (e.g. SBIN0001234)";
    }
    if (newStaff.yearOfPassing) {
      const currentYear = new Date().getFullYear();
      if (Number(newStaff.yearOfPassing) > currentYear) {
        errors.yearOfPassing = "Year of passing cannot be in the future";
      }
    }
    if (newStaff.previousExperience && Number(newStaff.previousExperience) < 0) {
      errors.previousExperience = "Previous experience cannot be negative";
    }
    if (newStaff.bankAccountNumber && !/^\d+$/.test(newStaff.bankAccountNumber)) {
      errors.bankAccountNumber = "Bank account number must contain only digits";
    }

    if (isRegisterPage) {
      if (!newStaff.username?.trim()) errors.username = "Username is required";
      if (!newStaff.password) {
        errors.password = "Password is required";
      } else {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(newStaff.password)) {
          errors.password = "Password must be at least 8 characters and include uppercase, lowercase, number, and special character";
        }
      }
    }

    setAddStaffErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const uploadStaffFile = async (file, path) => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const uploadAllDocuments = async (staffIdOrEmail) => {
    const urls = {};
    const baseFolder = `schools/${schoolId}/teachers/${staffIdOrEmail}`;
    
    // Photo
    if (addStaffFiles.photo) {
      urls.photoUrl = await uploadStaffFile(addStaffFiles.photo, `${baseFolder}/photo_${addStaffFiles.photo.name}`);
    }

    const docKeys = [
      'academicCertificates', 'markSheets', 'experienceCertificates', 
      'relievingLetter', 'resume', 'referenceLetters', 'govtIdDocument', 'salarySlips'
    ];

    for (const key of docKeys) {
      const files = addStaffFiles[key] || [];
      if (files.length > 0) {
        const uploadedUrls = [];
        for (const f of files) {
          const url = await uploadStaffFile(f, `${baseFolder}/${key}/${f.name}`);
          uploadedUrls.push({ name: f.name, url });
        }
        urls[key] = uploadedUrls;
      }
    }
    return urls;
  };

  const logStaffAudit = async (staffId, staffName, actionPerformed, modifiedFields = []) => {
    if (!schoolId) return;
    try {
      await addSubDocument(schoolId, 'staff_audit_logs', {
        staffId,
        staffName,
        userName: userProfile?.name || userProfile?.email || 'Unknown User',
        userRole: userProfile?.role || 'Staff',
        timestamp: new Date().toISOString(),
        actionPerformed,
        modifiedFields
      });
    } catch (e) {
      console.error("Failed to write staff audit log:", e);
    }
  };

  const handleAddStaff = async () => {
    // Trim spaces
    const trimmed = {};
    Object.keys(newStaff).forEach(k => {
      if (typeof newStaff[k] === 'string') {
        trimmed[k] = newStaff[k].trim();
      } else {
        trimmed[k] = newStaff[k];
      }
    });
    newStaff.staffId = trimmed.staffId;
    newStaff.firstName = trimmed.firstName;
    newStaff.lastName = trimmed.lastName;
    newStaff.email = trimmed.email;
    newStaff.mobileNumber = trimmed.mobileNumber;
    newStaff.aadharNumber = trimmed.aadharNumber;
    newStaff.panNumber = trimmed.panNumber;
    newStaff.ifscCode = trimmed.ifscCode;
    newStaff.bankAccountNumber = trimmed.bankAccountNumber;

    if (!validateStaffForm(false)) {
      toast.error("Please resolve the validation errors first.");
      return;
    }

    setAddingStaff(true);
    const progressToastId = toast.loading("Uploading documents & saving staff member...");
    try {
      // 1. Upload files
      const uploadedUrls = await uploadAllDocuments(newStaff.staffId);
      
      // 2. Add to database
      const staffDoc = {
        ...newStaff,
        ...uploadedUrls,
        name: `${newStaff.firstName} ${newStaff.lastName || ''}`.trim(),
        employeeId: newStaff.staffId,
        createdAt: new Date().toISOString()
      };

      await addSubDocument(schoolId, 'teachers', staffDoc);

      // 3. Log audit event
      await logStaffAudit(newStaff.staffId, `${newStaff.firstName} ${newStaff.lastName}`, "Created", [
        { field: 'firstName', newValue: newStaff.firstName },
        { field: 'lastName', newValue: newStaff.lastName },
        { field: 'email', newValue: newStaff.email },
        { field: 'staffId', newValue: newStaff.staffId }
      ]);

      toast.success("Staff member added successfully!", { id: progressToastId });
      setAddStaffModalOpen(false);
      setNewStaff(initialStaffFormState);
      setAddStaffFiles({
        photo: null,
        academicCertificates: [],
        markSheets: [],
        experienceCertificates: [],
        relievingLetter: [],
        resume: [],
        referenceLetters: [],
        govtIdDocument: [],
        salarySlips: []
      });
      setAddStaffErrors({});
      setAddStaffActiveTab('Personal');
    } catch (error) {
      console.error("Error adding staff:", error);
      toast.error("Failed to add staff member.", { id: progressToastId });
    } finally {
      setAddingStaff(false);
    }
  };

  const getClassName = (classId) => {
    if (!classId) return 'Unassigned';
    const cls = classes.find(c => c.id === classId);
    return cls ? `${cls.name} - ${cls.section}` : 'Unknown Class';
  };

  const exportToExcel = () => {
    const exportData = staff.map(member => ({
      'Name': member.name || `${member.firstName} ${member.lastName}`,
      'Email': member.email,
      'Role': member.role || 'Staffs',
      'Assigned Class': getClassName(member.assignedClassId),
      'Subject Classes': (member.subjectClassIds || []).map(getClassName).join(', ')
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Staff");
    XLSX.writeFile(workbook, "Staff_Directory.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add School Name Header
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(schoolName, 14, 22);
    
    doc.setFontSize(14);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("Staff Directory", 14, 30);
    
    const tableColumn = ["Name", "Email", "Role", "Class Tr. Of", "Subject Tr. Of"];
    const tableRows = [];

    staff.forEach(member => {
      const rowData = [
        member.name || `${member.firstName} ${member.lastName}`,
        member.email || 'N/A',
        (member.role || 'Staffs').toUpperCase(),
        getClassName(member.assignedClassId),
        (member.subjectClassIds || []).map(getClassName).join(', ')
      ];
      tableRows.push(rowData);
    });

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 5 },
      headStyles: { fillColor: [59, 130, 246] }, // Primary Blue
    });

    doc.save("Staff_Directory.pdf");
  };

  const filteredStaff = staff.filter(member => {
    const name = member.name || `${member.firstName} ${member.lastName}`;
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           (member.email && member.email.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = roleFilter === 'all' || (member.role || 'Staffs') === roleFilter;
    const matchesStatus = statusFilter === 'all' || (member.status || 'Active') === statusFilter;
    
    if (!(matchesSearch && matchesRole && matchesStatus)) return false;

    if (staffTypeFilter === 'teaching') {
      return member.staff_type === 'teaching';
    } else if (staffTypeFilter === 'non-teaching') {
      return member.staff_type === 'non-teaching' || !member.staff_type;
    }
    return true;
  });

  // Metrics
  const totalStaff = staff.length;
  const activeStaff = staff.filter(s => (s.status || 'Active') === 'Active').length;
  const teachingRoles = ['Correspondent', 'Principal', 'Vice Principal', 'Subject Wise Head', 'Class Incharge', 'Staffs'];
  const teachingStaff = staff.filter(s => teachingRoles.includes(s.role || 'Staffs')).length;
  const nonTeachingStaff = totalStaff - teachingStaff;

  // Pagination Logic
  const totalPages = Math.ceil(filteredStaff.length / rowsPerPage) || 1;
  const paginatedStaff = filteredStaff.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, statusFilter, staffTypeFilter, rowsPerPage]);

  if (loading) {
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
          <h1 className="text-3xl font-bold text-slate-900">Staff Directory & Attachments</h1>
          <p className="text-slate-500 mt-1">Manage your teachers, upload documents, and assign classes.</p>
        </div>
        <div className="flex flex-wrap gap-3 mt-4 sm:mt-0">
          <button 
            onClick={() => exportToExcel()}
            className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl font-medium hover:bg-emerald-100 shadow-sm flex items-center gap-2 transition-colors border border-emerald-200"
          >
            <FileSpreadsheet size={18} /> Export Excel
          </button>
          <button 
            onClick={() => exportToPDF()}
            className="px-4 py-2 bg-rose-50 text-rose-700 rounded-xl font-medium hover:bg-rose-100 shadow-sm flex items-center gap-2 transition-colors border border-rose-200"
          >
            <FileText size={18} /> Export PDF
          </button>
          <button 
              onClick={() => {
                setAddStaffActiveTab('Personal');
                setAddStaffModalOpen(true);
              }}
              className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl font-medium hover:bg-indigo-100 shadow-sm flex items-center gap-2 transition-colors border border-indigo-200"
            >
              <UserPlus size={18} /> Add Staff
            </button>
          <button 
            onClick={() => {
              setUploadFile(null);
              setSelectedStaffForUpload(null);
              setUploadModalOpen(true);
            }}
            className="px-4 py-2 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 shadow-sm flex items-center gap-2 transition-colors"
          >
            <UploadCloud size={18} /> Bulk Import
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in-up">
        {/* Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 border-b border-slate-100 bg-slate-50/30">
          <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Users size={20} /></div>
            <div><p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Staff</p><p className="text-xl font-bold text-slate-900">{totalStaff}</p></div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle2 size={20} /></div>
            <div><p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active</p><p className="text-xl font-bold text-slate-900">{activeStaff}</p></div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><UserPlus size={20} /></div>
            <div><p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Teachers</p><p className="text-xl font-bold text-slate-900">{teachingStaff}</p></div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-pink-50 text-pink-600 rounded-xl"><UserPlus size={20} /></div>
            <div><p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Non-Teaching</p><p className="text-xl font-bold text-slate-900">{nonTeachingStaff}</p></div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap gap-4 items-center justify-between bg-white">
          <div className="relative flex-1 min-w-[250px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search staff by name or email..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select 
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Roles</option>
              <option value="Correspondent">Correspondent</option>
              <option value="Principal">Principal</option>
              <option value="Vice Principal">Vice Principal</option>
              <option value="Subject Wise Head">Subject Wise Head</option>
              <option value="Class Incharge">Class Incharge</option>
              <option value="Staffs">Staffs</option>
              <option value="Administrative Officer">Administrative Officer</option>
              <option value="Finance Department">Finance Department</option>
              <option value="Library">Library</option>
              <option value="Canteen">Canteen</option>
              <option value="Transport">Transport</option>
              <option value="Janitors">Janitors</option>
              <option value="Hostel">Hostel</option>
              <option value="Inventory">Inventory</option>
              <option value="Security">Security</option>
            </select>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>

            {/* Filter by Staff Type — inline in filter bar */}
            <div className="relative" ref={filterDropdownRef}>
              <button
                onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                className={`px-3 py-2.5 rounded-xl border shadow-sm transition-all flex items-center gap-2 text-sm font-medium relative
                  ${staffTypeFilter !== 'all'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                title="Filter Staff by Type"
              >
                <Filter size={16} />
                <span>{staffTypeFilter === 'all' ? 'Staff Type' : staffTypeFilter === 'teaching' ? 'Teaching' : 'Non-Teaching'}</span>
                {staffTypeFilter !== 'all' && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
                )}
              </button>

              {isFilterDropdownOpen && (
                <div className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 p-2 z-50 animate-fade-in-up">
                  <div className="flex flex-col space-y-1">
                    <button
                      onClick={() => { setStaffTypeFilter('all'); setIsFilterDropdownOpen(false); }}
                      className={`w-full px-3 py-2 text-left text-sm font-medium rounded-lg transition-colors flex items-center justify-between ${
                        staffTypeFilter === 'all' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>All Staff</span>
                      {staffTypeFilter === 'all' && <CheckCircle2 size={16} className="text-indigo-600" />}
                    </button>
                    <button
                      onClick={() => { setStaffTypeFilter('teaching'); setIsFilterDropdownOpen(false); }}
                      className={`w-full px-3 py-2 text-left text-sm font-medium rounded-lg transition-colors flex items-center justify-between ${
                        staffTypeFilter === 'teaching' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>Teaching Staff</span>
                      {staffTypeFilter === 'teaching' && <CheckCircle2 size={16} className="text-indigo-600" />}
                    </button>
                    <button
                      onClick={() => { setStaffTypeFilter('non-teaching'); setIsFilterDropdownOpen(false); }}
                      className={`w-full px-3 py-2 text-left text-sm font-medium rounded-lg transition-colors flex items-center justify-between ${
                        staffTypeFilter === 'non-teaching' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>Non-Teaching Staff</span>
                      {staffTypeFilter === 'non-teaching' && <CheckCircle2 size={16} className="text-indigo-600" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

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

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                <th className="p-4 pl-6">Staff Name</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Class Assignments</th>
                <th className="p-4">Attachment</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {paginatedStaff.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-slate-500">
                    <ShieldCheck size={48} className="mx-auto mb-4 text-slate-300" />
                    <p className="text-lg font-medium text-slate-900 mb-1">No staff members found</p>
                    <p>Generate a teacher invite link to start onboarding your faculty.</p>
                  </td>
                </tr>
              ) : (
                paginatedStaff.map((member) => {
                  const name = member.name || `${member.firstName} ${member.lastName}`;
                  const isAssigned = !!member.assignedClassId;

                  return (
                    <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 shrink-0 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                            {name.charAt(0)}
                          </div>
                          <div className="font-semibold text-slate-900 leading-snug">
                            {name}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Mail size={14} className="text-slate-400" />
                          {member.email}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                          {isAssigned && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded border border-primary-200/60 bg-primary-50/50 text-primary-700 text-[11px] font-semibold uppercase tracking-wide">
                              {getClassName(member.assignedClassId)} (Class)
                            </span>
                          )}
                          {member.subjectClassIds?.map(id => (
                            <span key={id} className="inline-flex items-center px-2 py-0.5 rounded border border-indigo-200/60 bg-indigo-50/50 text-indigo-700 text-[11px] font-semibold uppercase tracking-wide">
                              {getClassName(id)} (Subj)
                            </span>
                          ))}
                          {!isAssigned && (!member.subjectClassIds || member.subjectClassIds.length === 0) && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded border border-slate-200/60 bg-slate-50/50 text-slate-500 text-[11px] font-semibold uppercase tracking-wide">
                              Unassigned
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        {member.attachmentUrl ? (
                          <a href={member.attachmentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors tooltip-trigger" title={member.attachmentName}>
                            <ExternalLink size={12} /> View Doc
                          </a>
                        ) : (
                          <span className="text-slate-400 text-xs italic">No attachment</span>
                        )}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex justify-end gap-2">
                          {!member.userId && (
                            <button
                              onClick={() => {
                                const inviteUrl = `${window.location.origin}/register/teacher/${schoolId}?email=${encodeURIComponent(member.email || '')}&empId=${encodeURIComponent(member.staffId || member.employeeId || '')}`;
                                navigator.clipboard.writeText(inviteUrl);
                                toast.success("Registration link copied!");
                              }}
                              className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Copy Invite Link"
                            >
                              <LinkIcon size={18} />
                            </button>
                          )}
                          <button 
                            onClick={() => {
                              setSelectedStaffToView(member);
                              setAddStaffActiveTab('Personal Info');
                              setIsStaffEditMode(false);
                              setEditStaffData(null);
                              setEditStaffErrors({});
                              setEditStaffDocFiles({});
                              setViewStaffModalOpen(true);
                            }}
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                          <button 
                            onClick={() => openUploadModal(member)}
                            className="p-2 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="Upload Document"
                          >
                            <UploadCloud size={18} />
                          </button>
                           <button 
                             onClick={() => setConfirmDeleteState({ isOpen: true, id: member.id, name: member.name || `${member.firstName} ${member.lastName}` })}
                             className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                             title="Delete Staff Member"
                           >
                             <Trash size={18} />
                           </button>
                           <button 
                             onClick={() => openAssignModal(member)}
                             className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
                           >
                             {isAssigned ? 'Edit' : 'Assign'}
                           </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50 rounded-b-3xl">
            <span className="text-sm text-slate-500">
              Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, filteredStaff.length)} of {filteredStaff.length} entries
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

      {/* Assignment Modal */}
      {assignModalOpen && selectedStaff && (
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
                Manage assignments for <span className="font-bold text-slate-900">{selectedStaff.name || selectedStaff.firstName}</span>.
              </p>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Class Teacher Assignment (Optional)</label>
                  <select 
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option value="">-- None --</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name} - Section {c.section}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Subject Teacher Assignments</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-slate-200 rounded-xl bg-slate-50">
                    {classes.map(c => (
                      <label key={`subj-${c.id}`} className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded-lg cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={selectedSubjectClassIds.includes(c.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSubjectClassIds([...selectedSubjectClassIds, c.id]);
                            } else {
                              setSelectedSubjectClassIds(selectedSubjectClassIds.filter(id => id !== c.id));
                            }
                          }}
                          className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                        />
                        <span className="text-sm font-medium text-slate-700">{c.name} - Section {c.section}</span>
                      </label>
                    ))}
                    {classes.length === 0 && <span className="text-sm text-slate-500 italic p-2">No classes available.</span>}
                  </div>
                </div>

                {classes.length === 0 && (
                  <p className="text-xs text-amber-600 mt-2 bg-amber-50 p-3 rounded-lg border border-amber-200">
                    No classes have been created yet. Please create classes in Class Management first.
                  </p>
                )}
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setAssignModalOpen(false)}
                className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleAssign}
                disabled={saving || classes.length === 0}
                className="px-6 py-2.5 bg-primary-600 text-white font-bold hover:bg-primary-700 rounded-xl shadow-sm disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save Assignment'}
              </button>
            </div>
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
                {selectedStaffForUpload ? 'Upload Document' : 'Bulk Import Staff'}
              </h2>
              <button onClick={() => setUploadModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
              {selectedStaffForUpload ? (
                <p className="text-sm text-slate-600 mb-4">
                  Upload a document (e.g. Resume, ID) for <span className="font-bold text-slate-900">{selectedStaffForUpload.name || selectedStaffForUpload.firstName}</span>. 
                  <br/><span className="text-xs text-slate-400 mt-1 block">File will be securely stored in: {schoolName}/Teachers/...</span>
                </p>
              ) : (
                <div className="mb-4">
                  <p className="text-sm text-slate-600 mb-2">
                    Upload an Excel (.xlsx) or CSV file to bulk import staff.
                  </p>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-3 text-xs">
                    <p className="font-bold text-slate-700 mb-1">Required Columns:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {['Full Name', 'Email Address'].map(col => (
                        <span key={col} className="bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded-md">{col} *</span>
                      ))}
                    </div>
                    <p className="font-bold text-slate-700 mt-2 mb-1">Optional (all other columns supported):</p>
                    <div className="flex flex-wrap gap-1.5">
                      {['Staff ID', 'Mobile Number', 'Gender', 'Date of Birth', 'Blood Group', 'Role', 'Staff Type', 'Aadhar Number', 'PAN Number', 'PF Number', 'Bank Account Number'].map(col => (
                        <span key={col} className="bg-slate-200 text-slate-700 font-medium px-2 py-0.5 rounded-md">{col}</span>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const headers = ['Staff ID', 'Full Name', 'Date of Birth', 'Gender', 'Nationality', 'Marital Status', 'Blood Group', 'Aadhar Number', 'Languages Known', 'Mobile Number', 'Email Address', 'Residential Address', 'Emergency Contact Details', 'Father Name/Guardian Name', 'Highest Qualification', 'Degree(s) and Specialization', 'University/College Name', 'Year of Passing', 'Previous Experience (Years)', 'Previous School/Organization', 'Subject Specialization', 'Grades/Classes Handled', 'Certifications', 'Government-issued ID', 'Tax Identification Details (PAN)', 'PF Number', 'ESIC Number', 'UAN Number', 'Bank Account Number', 'Bank Name and Branch', 'IFSC Code', 'PAN Number'];
                      const sampleRow = ['STF001', 'John Doe', '1990-01-15', 'Male', 'Indian', 'Single', 'A+', '1234-5678-9012', 'English, Hindi', '9876543210', 'john.doe@school.com', '123 Main St, City', 'Jane Doe - 9876500000', 'Robert Doe', 'M.Sc Education', 'B.Ed, Mathematics', 'Delhi University', '2015', '5', 'ABC School', 'Mathematics', '9, 10, 11', 'B.Ed', 'Aadhaar', 'ABCDE1234F', 'PF123456', 'ESIC789', 'UAN456', '123456789012', 'State Bank, Main Branch', 'SBIN0001234', 'ABCDE1234F'];
                      const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, 'Staff Import');
                      XLSX.writeFile(wb, 'staff_import_template.xlsx');
                    }}
                    className="flex items-center gap-2 text-xs font-semibold text-primary-600 hover:text-primary-800 hover:underline"
                  >
                    <Download size={14} /> Download Full Template (32 columns)
                  </button>
                </div>
              )}

              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 bg-slate-50 relative overflow-hidden group hover:border-primary-400 hover:bg-primary-50 transition-all text-center">
                <input 
                  type="file" 
                  accept={selectedStaffForUpload ? "image/*, .pdf" : ".xlsx, .csv"}
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
                    <p className="text-xs text-slate-500 mt-1">{selectedStaffForUpload ? 'PDF, JPG, PNG up to 10MB' : 'Excel or CSV file'}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
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

      {/* Add Staff Modal */}
      {addStaffModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="text-indigo-600" />
                Add Staff Member
              </h2>
              <button onClick={() => setAddStaffModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Custom CSS to hide scrollbars cleanly */}
            <style dangerouslySetInnerHTML={{__html: `
              .hide-scrollbar::-webkit-scrollbar {
                display: none;
              }
              .hide-scrollbar {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
            `}} />

            {/* Tabbed Navigation */}
            <div className="flex border-b border-slate-200 overflow-x-auto bg-white shrink-0 hide-scrollbar scroll-smooth">
              <div className="flex w-full justify-start items-center">
                {['Personal', 'Educational', 'Professional', 'Government & Identity', 'Employment', 'Banking', 'Uploads'].map(tab => {
                  const isActive = addStaffActiveTab === tab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      ref={isActive ? activeTabRef : null}
                      onClick={() => setAddStaffActiveTab(tab)}
                      aria-selected={isActive}
                      role="tab"
                      className={`relative py-4 px-6 text-xs font-bold whitespace-nowrap transition-all duration-200 flex-shrink-0 focus:outline-none focus:text-indigo-600 focus:bg-indigo-50/20 ${
                        isActive
                          ? 'text-indigo-600 font-extrabold'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      {tab}
                      {isActive && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full animate-fade-in" />
                      )}
                    </button>
                  );
                })}
              </div>
              </div>
              
              <div className="pt-4 border-t border-slate-100">
                <CustomFieldsRenderer 
                  moduleKey="staff"
                  customData={newStaff.customData}
                  onChange={(fieldId, value) => {
                    setNewStaff(prev => ({
                      ...prev,
                      customData: {
                        ...(prev.customData || {}),
                        [fieldId]: value
                      }
                    }));
                  }}
                />
              </div>

            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-6">
              {/* Tab Content: Personal */}
              {addStaffActiveTab === 'Personal' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Staff ID *</label>
                      <input
                        type="text"
                        value={newStaff.staffId}
                        onChange={(e) => setNewStaff({ ...newStaff, staffId: e.target.value })}
                        placeholder="e.g. ST1001"
                        className={`w-full px-3 py-2 rounded-xl border bg-white focus:ring-2 focus:ring-primary-500 text-sm ${addStaffErrors.staffId ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'}`}
                      />
                      {addStaffErrors.staffId && <span className="text-red-500 text-xs mt-1 block">{addStaffErrors.staffId}</span>}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">First Name *</label>
                      <input
                        type="text"
                        value={newStaff.firstName}
                        onChange={(e) => setNewStaff({ ...newStaff, firstName: e.target.value })}
                        placeholder="e.g. John"
                        className={`w-full px-3 py-2 rounded-xl border bg-white focus:ring-2 focus:ring-primary-500 text-sm ${addStaffErrors.firstName ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'}`}
                      />
                      {addStaffErrors.firstName && <span className="text-red-500 text-xs mt-1 block">{addStaffErrors.firstName}</span>}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Last Name *</label>
                      <input
                        type="text"
                        value={newStaff.lastName}
                        onChange={(e) => setNewStaff({ ...newStaff, lastName: e.target.value })}
                        placeholder="e.g. Doe"
                        className={`w-full px-3 py-2 rounded-xl border bg-white focus:ring-2 focus:ring-primary-500 text-sm ${addStaffErrors.lastName ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'}`}
                      />
                      {addStaffErrors.lastName && <span className="text-red-500 text-xs mt-1 block">{addStaffErrors.lastName}</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email Address *</label>
                      <input
                        type="email"
                        value={newStaff.email}
                        onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                        placeholder="john.doe@example.com"
                        className={`w-full px-3 py-2 rounded-xl border bg-white focus:ring-2 focus:ring-primary-500 text-sm ${addStaffErrors.email ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'}`}
                      />
                      {addStaffErrors.email && <span className="text-red-500 text-xs mt-1 block">{addStaffErrors.email}</span>}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Mobile Number</label>
                      <input
                        type="text"
                        value={newStaff.mobileNumber}
                        onChange={(e) => setNewStaff({ ...newStaff, mobileNumber: e.target.value })}
                        placeholder="e.g. 9876543210"
                        className={`w-full px-3 py-2 rounded-xl border bg-white focus:ring-2 focus:ring-primary-500 text-sm ${addStaffErrors.mobileNumber ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'}`}
                      />
                      {addStaffErrors.mobileNumber && <span className="text-red-500 text-xs mt-1 block">{addStaffErrors.mobileNumber}</span>}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={newStaff.dob}
                        onChange={(e) => setNewStaff({ ...newStaff, dob: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Gender</label>
                      <select
                        value={newStaff.gender}
                        onChange={(e) => setNewStaff({ ...newStaff, gender: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500 text-sm"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nationality</label>
                      <input
                        type="text"
                        value={newStaff.nationality}
                        onChange={(e) => setNewStaff({ ...newStaff, nationality: e.target.value })}
                        placeholder="e.g. Indian"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Marital Status</label>
                      <select
                        value={newStaff.maritalStatus}
                        onChange={(e) => setNewStaff({ ...newStaff, maritalStatus: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500 text-sm"
                      >
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Divorced">Divorced</option>
                        <option value="Widowed">Widowed</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Blood Group</label>
                      <input
                        type="text"
                        value={newStaff.bloodGroup}
                        onChange={(e) => setNewStaff({ ...newStaff, bloodGroup: e.target.value })}
                        placeholder="e.g. O+, A-"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Father / Guardian Name</label>
                      <input
                        type="text"
                        value={newStaff.fatherGuardianName}
                        onChange={(e) => setNewStaff({ ...newStaff, fatherGuardianName: e.target.value })}
                        placeholder="Father or Guardian Name"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Emergency Contact Details</label>
                      <input
                        type="text"
                        value={newStaff.emergencyContact}
                        onChange={(e) => setNewStaff({ ...newStaff, emergencyContact: e.target.value })}
                        placeholder="Emergency Mobile No."
                        className={`w-full px-3 py-2 rounded-xl border bg-white focus:ring-2 focus:ring-primary-500 text-sm ${addStaffErrors.emergencyContact ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'}`}
                      />
                      {addStaffErrors.emergencyContact && <span className="text-red-500 text-xs mt-1 block">{addStaffErrors.emergencyContact}</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Role</label>
                      <select
                        value={newStaff.role}
                        onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500 text-sm"
                      >
                        <option value="Correspondent">Correspondent</option>
                        <option value="Principal">Principal</option>
                        <option value="Vice Principal">Vice Principal</option>
                        <option value="Subject Wise Head">Subject Wise Head</option>
                        <option value="Class Incharge">Class Incharge</option>
                        <option value="Staffs">Staffs</option>
                        <option value="Administrative Officer">Administrative Officer</option>
                        <option value="Finance Department">Finance Department</option>
                        <option value="Library">Library</option>
                        <option value="Canteen">Canteen</option>
                        <option value="Transport">Transport</option>
                        <option value="Janitors">Janitors</option>
                        <option value="Hostel">Hostel</option>
                        <option value="Inventory">Inventory</option>
                        <option value="Security">Security</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Assign Class (Optional)</label>
                      <select
                        value={newStaff.assignedClassId}
                        onChange={(e) => setNewStaff({ ...newStaff, assignedClassId: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500 text-sm"
                      >
                        <option value="">-- Unassigned --</option>
                        {classes.map(c => (
                          <option key={c.id} value={c.id}>{c.name} - Section {c.section}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Staff Type *</label>
                      <select
                        value={newStaff.staff_type}
                        onChange={(e) => setNewStaff({ ...newStaff, staff_type: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500 text-sm"
                      >
                        <option value="teaching">Teaching Staff</option>
                        <option value="non-teaching">Non-Teaching Staff</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Languages Known</label>
                      <input
                        type="text"
                        value={newStaff.languagesKnown}
                        onChange={(e) => setNewStaff({ ...newStaff, languagesKnown: e.target.value })}
                        placeholder="e.g. English, Hindi, Tamil (comma separated)"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Residential Address</label>
                      <textarea
                        rows={2}
                        value={newStaff.residentialAddress}
                        onChange={(e) => setNewStaff({ ...newStaff, residentialAddress: e.target.value })}
                        placeholder="Full Residential Address"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Content: Educational */}
              {addStaffActiveTab === 'Educational' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Highest Qualification</label>
                      <input
                        type="text"
                        value={newStaff.highestQualification}
                        onChange={(e) => setNewStaff({ ...newStaff, highestQualification: e.target.value })}
                        placeholder="e.g. Master of Arts"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Degree(s) and Specialization</label>
                      <input
                        type="text"
                        value={newStaff.degreeSpecialization}
                        onChange={(e) => setNewStaff({ ...newStaff, degreeSpecialization: e.target.value })}
                        placeholder="e.g. B.Ed in English Literature"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">University / College Name</label>
                      <input
                        type="text"
                        value={newStaff.universityName}
                        onChange={(e) => setNewStaff({ ...newStaff, universityName: e.target.value })}
                        placeholder="e.g. University of Delhi"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Year of Passing</label>
                      <input
                        type="number"
                        value={newStaff.yearOfPassing}
                        onChange={(e) => setNewStaff({ ...newStaff, yearOfPassing: e.target.value })}
                        placeholder="e.g. 2018"
                        className={`w-full px-3 py-2 rounded-xl border bg-white focus:ring-2 focus:ring-primary-500 text-sm ${addStaffErrors.yearOfPassing ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'}`}
                      />
                      {addStaffErrors.yearOfPassing && <span className="text-red-500 text-xs mt-1 block">{addStaffErrors.yearOfPassing}</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Content: Professional */}
              {addStaffActiveTab === 'Professional' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Previous Experience (Years)</label>
                      <input
                        type="number"
                        value={newStaff.previousExperience}
                        onChange={(e) => setNewStaff({ ...newStaff, previousExperience: e.target.value })}
                        placeholder="e.g. 3"
                        className={`w-full px-3 py-2 rounded-xl border bg-white focus:ring-2 focus:ring-primary-500 text-sm ${addStaffErrors.previousExperience ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'}`}
                      />
                      {addStaffErrors.previousExperience && <span className="text-red-500 text-xs mt-1 block">{addStaffErrors.previousExperience}</span>}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Previous School / Organization</label>
                      <input
                        type="text"
                        value={newStaff.previousOrganization}
                        onChange={(e) => setNewStaff({ ...newStaff, previousOrganization: e.target.value })}
                        placeholder="Previous School Name"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Subject Specialization</label>
                      <input
                        type="text"
                        value={newStaff.subjectSpecialization}
                        onChange={(e) => setNewStaff({ ...newStaff, subjectSpecialization: e.target.value })}
                        placeholder="e.g. English Literature, Physics"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Grades / Classes Handled</label>
                      <input
                        type="text"
                        value={newStaff.gradesClassesHandled}
                        onChange={(e) => setNewStaff({ ...newStaff, gradesClassesHandled: e.target.value })}
                        placeholder="e.g. Class 9, Class 10 (comma separated)"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Professional Certifications</label>
                      <input
                        type="text"
                        value={newStaff.professionalCertifications}
                        onChange={(e) => setNewStaff({ ...newStaff, professionalCertifications: e.target.value })}
                        placeholder="e.g. TEFL, CBSE In-Service Training"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Content: Government & Identity */}
              {addStaffActiveTab === 'Government & Identity' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Government-Issued ID Type</label>
                      <select
                        value={newStaff.govtIdType}
                        onChange={(e) => setNewStaff({ ...newStaff, govtIdType: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500 text-sm"
                      >
                        <option value="Aadhaar">Aadhaar Card</option>
                        <option value="PAN">PAN Card</option>
                        <option value="Passport">Passport</option>
                        <option value="VoterID">Voter ID Card</option>
                        <option value="DrivingLicense">Driving License</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Government-Issued ID Number</label>
                      <input
                        type="text"
                        value={newStaff.govtIdNumber}
                        onChange={(e) => setNewStaff({ ...newStaff, govtIdNumber: e.target.value })}
                        placeholder="ID Document Number"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Aadhaar Number (12 digits)</label>
                      <input
                        type="text"
                        value={newStaff.aadharNumber}
                        onChange={(e) => setNewStaff({ ...newStaff, aadharNumber: e.target.value })}
                        placeholder="e.g. 123456789012"
                        className={`w-full px-3 py-2 rounded-xl border bg-white focus:ring-2 focus:ring-primary-500 text-sm ${addStaffErrors.aadharNumber ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'}`}
                      />
                      {addStaffErrors.aadharNumber && <span className="text-red-500 text-xs mt-1 block">{addStaffErrors.aadharNumber}</span>}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">PAN Number</label>
                      <input
                        type="text"
                        value={newStaff.panNumber}
                        onChange={(e) => setNewStaff({ ...newStaff, panNumber: e.target.value })}
                        placeholder="e.g. ABCDE1234F"
                        className={`w-full px-3 py-2 rounded-xl border bg-white focus:ring-2 focus:ring-primary-500 text-sm ${addStaffErrors.panNumber ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'}`}
                      />
                      {addStaffErrors.panNumber && <span className="text-red-500 text-xs mt-1 block">{addStaffErrors.panNumber}</span>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Tax Identification Details (if different)</label>
                    <input
                      type="text"
                      value={newStaff.taxIdDetails}
                      onChange={(e) => setNewStaff({ ...newStaff, taxIdDetails: e.target.value })}
                      placeholder="Tax ID particulars"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Tab Content: Employment */}
              {addStaffActiveTab === 'Employment' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">PF Number</label>
                      <input
                        type="text"
                        value={newStaff.pfNumber}
                        onChange={(e) => setNewStaff({ ...newStaff, pfNumber: e.target.value })}
                        placeholder="Provident Fund Number"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">ESIC Number</label>
                      <input
                        type="text"
                        value={newStaff.esicNumber}
                        onChange={(e) => setNewStaff({ ...newStaff, esicNumber: e.target.value })}
                        placeholder="ESIC Registration Number"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">UAN Number</label>
                      <input
                        type="text"
                        value={newStaff.uanNumber}
                        onChange={(e) => setNewStaff({ ...newStaff, uanNumber: e.target.value })}
                        placeholder="Universal Account Number"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Content: Banking */}
              {addStaffActiveTab === 'Banking' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Bank Name</label>
                      <input
                        type="text"
                        value={newStaff.bankName}
                        onChange={(e) => setNewStaff({ ...newStaff, bankName: e.target.value })}
                        placeholder="e.g. State Bank of India"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Bank Account Number</label>
                      <input
                        type="text"
                        value={newStaff.bankAccountNumber}
                        onChange={(e) => setNewStaff({ ...newStaff, bankAccountNumber: e.target.value })}
                        placeholder="Digits only"
                        className={`w-full px-3 py-2 rounded-xl border bg-white focus:ring-2 focus:ring-primary-500 text-sm ${addStaffErrors.bankAccountNumber ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'}`}
                      />
                      {addStaffErrors.bankAccountNumber && <span className="text-red-500 text-xs mt-1 block">{addStaffErrors.bankAccountNumber}</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Branch Name</label>
                      <input
                        type="text"
                        value={newStaff.branchName}
                        onChange={(e) => setNewStaff({ ...newStaff, branchName: e.target.value })}
                        placeholder="e.g. Connaught Place Branch"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">IFSC Code</label>
                      <input
                        type="text"
                        value={newStaff.ifscCode}
                        onChange={(e) => setNewStaff({ ...newStaff, ifscCode: e.target.value })}
                        placeholder="e.g. SBIN0001234"
                        className={`w-full px-3 py-2 rounded-xl border bg-white focus:ring-2 focus:ring-primary-500 text-sm ${addStaffErrors.ifscCode ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'}`}
                      />
                      {addStaffErrors.ifscCode && <span className="text-red-500 text-xs mt-1 block">{addStaffErrors.ifscCode}</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Content: Uploads */}
              {addStaffActiveTab === 'Uploads' && (
                <div className="space-y-4 animate-fade-in">
                  {/* Photo upload */}
                  <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
                    <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">Photograph (JPG/PNG)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setAddStaffFiles(prev => ({ ...prev, photo: e.target.files[0] }))}
                      className="text-sm"
                    />
                    {addStaffFiles.photo && (
                      <div className="mt-2 flex items-center justify-between bg-white border border-slate-200 rounded-lg p-2 text-xs">
                        <span className="truncate text-slate-700 font-semibold">{addStaffFiles.photo.name}</span>
                        <button type="button" onClick={() => setAddStaffFiles(prev => ({ ...prev, photo: null }))} className="text-red-500 hover:text-red-700 font-bold px-2">Remove</button>
                      </div>
                    )}
                  </div>

                  {/* Multi files upload helper */}
                  {[
                    { key: 'academicCertificates', label: 'Academic Certificates (PDF/Images)' },
                    { key: 'markSheets', label: 'Mark Sheets (PDF/Images)' },
                    { key: 'experienceCertificates', label: 'Experience Certificates (PDF/Images)' },
                    { key: 'relievingLetter', label: 'Relieving Letter (PDF/Images)' },
                    { key: 'resume', label: 'Resume / CV (PDF/Images)' },
                    { key: 'referenceLetters', label: 'Reference Letters (PDF/Images)' },
                    { key: 'govtIdDocument', label: 'Government-issued ID Document (PDF/Images)' },
                    { key: 'salarySlips', label: 'Salary Slips (PDF/Images, Optional)' }
                  ].map(({ key, label }) => (
                    <div key={key} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
                      <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">{label}</label>
                      <input
                        type="file"
                        multiple
                        accept=".pdf, image/*"
                        onChange={(e) => {
                          setAddStaffFiles(prev => ({
                            ...prev,
                            [key]: [...(prev[key] || []), ...Array.from(e.target.files)]
                          }));
                        }}
                        className="text-sm"
                      />
                      {(addStaffFiles[key] || []).length > 0 && (
                        <div className="mt-2 space-y-1">
                          {(addStaffFiles[key] || []).map((file, idx) => (
                            <div key={`${key}_${idx}`} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-2 text-xs">
                              <span className="truncate text-slate-700 font-semibold">{file.name}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setAddStaffFiles(prev => {
                                    const list = [...prev[key]];
                                    list.splice(idx, 1);
                                    return { ...prev, [key]: list };
                                  });
                                }}
                                className="text-red-500 hover:text-red-700 font-bold px-2"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setAddStaffModalOpen(false)}
                className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddStaff}
                disabled={addingStaff}
                className="px-6 py-2.5 bg-primary-600 text-white font-bold hover:bg-primary-700 rounded-xl shadow-sm disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {addingStaff ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Adding...</span>
                  </>
                ) : (
                  'Add Staff Member'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Staff Details Modal */}
      {viewStaffModalOpen && selectedStaffToView && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Users className="text-indigo-600" />
                {isStaffEditMode ? 'Edit Staff Details' : 'Staff Details'}
              </h2>
              <button onClick={() => {
                if (isStaffEditMode) {
                  setIsStaffEditMode(false);
                  setEditStaffData(null);
                  setEditStaffErrors({});
                } else {
                  setViewStaffModalOpen(false);
                }
              }} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Tabbed details navigation */}
            <div className="flex border-b border-slate-150 overflow-x-auto bg-slate-50/50 shrink-0 custom-scrollbar">
              {['Personal Info', 'Education & Work', 'Identity & Banking', 'Documents'].map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setAddStaffActiveTab(tab)}
                  className={`px-5 py-3.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${
                    addStaffActiveTab === tab
                      ? 'border-indigo-600 text-indigo-700 bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-6">
              {isStaffEditMode && editStaffData ? (
                /* ── EDIT MODE (tab-driven) ── */
                <div className="animate-fade-in">
                  {/* Personal Info Tab */}
                  {addStaffActiveTab === 'Personal Info' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                          ['staffId','Staff ID'], ['firstName','First Name *'], ['lastName','Last Name'],
                          ['mobileNumber','Mobile Number'], ['email','Email Address *'], ['dob','Date of Birth'],
                          ['bloodGroup','Blood Group'], ['nationality','Nationality'], ['languagesKnown','Languages Known'],
                          ['emergencyContact','Emergency Contact'], ['fatherName','Father / Guardian Name']
                        ].map(([field, label]) => (
                          <div key={field}>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">{label}</label>
                            <input
                              type={field === 'dob' ? 'date' : field === 'email' ? 'email' : 'text'}
                              value={editStaffData[field] || ''}
                              onChange={e => setEditStaffData({...editStaffData, [field]: e.target.value})}
                              className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${editStaffErrors[field] ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white'}`}
                            />
                            {editStaffErrors[field] && <p className="text-red-500 text-xs mt-1">{editStaffErrors[field]}</p>}
                          </div>
                        ))}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Gender</label>
                          <select value={editStaffData.gender || 'Male'} onChange={e => setEditStaffData({...editStaffData, gender: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                            {['Male','Female','Other'].map(g => <option key={g}>{g}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Marital Status</label>
                          <select value={editStaffData.maritalStatus || 'Single'} onChange={e => setEditStaffData({...editStaffData, maritalStatus: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                            {['Single','Married','Divorced','Widowed'].map(s => <option key={s}>{s}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Status</label>
                          <select value={editStaffData.status || 'Active'} onChange={e => setEditStaffData({...editStaffData, status: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                            <option>Active</option><option>Inactive</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Staff Type</label>
                          <select value={editStaffData.staff_type || 'teaching'} onChange={e => setEditStaffData({...editStaffData, staff_type: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                            <option value="teaching">Teaching Staff</option>
                            <option value="non-teaching">Non-Teaching Staff</option>
                          </select>
                        </div>
                        <div className="sm:col-span-3">
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Residential Address</label>
                          <textarea rows={2} value={editStaffData.residentialAddress || ''} onChange={e => setEditStaffData({...editStaffData, residentialAddress: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Education & Work Tab */}
                  {addStaffActiveTab === 'Education & Work' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                          ['highestQualification','Highest Qualification'],
                          ['degreeSpecialization','Degree & Specialization'],
                          ['universityName','University / College'],
                          ['yearOfPassing','Year of Passing'],
                          ['previousExperience','Previous Experience (Years)'],
                          ['previousOrganization','Previous School / Organization'],
                          ['subjectSpecialization','Subject Specialization'],
                          ['gradesClassesHandled','Grades / Classes Handled'],
                          ['professionalCertifications','Professional Certifications']
                        ].map(([field, label]) => (
                          <div key={field}>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">{label}</label>
                            <input type="text" value={editStaffData[field] || ''} onChange={e => setEditStaffData({...editStaffData, [field]: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                          </div>
                        ))}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Role</label>
                          <select value={editStaffData.role || 'Staffs'} onChange={e => setEditStaffData({...editStaffData, role: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                            {['Correspondent','Principal','Vice Principal','Subject Wise Head','Class Incharge','Staffs','Administrative Officer','Finance Department','Library','Canteen','Transport','Janitors','Hostel','Inventory','Security'].map(r => <option key={r}>{r}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Staff Type</label>
                          <select value={editStaffData.staff_type || 'teaching'} onChange={e => setEditStaffData({...editStaffData, staff_type: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                            <option value="teaching">Teaching Staff</option>
                            <option value="non-teaching">Non-Teaching Staff</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Identity & Banking Tab */}
                  {addStaffActiveTab === 'Identity & Banking' && (
                    <div className="space-y-4">
                      {(userProfile?.role?.toLowerCase() === 'admin' || userProfile?.role?.toLowerCase() === 'superadmin') ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {[
                            ['govtIdType','Govt ID Type'], ['govtIdNumber','Govt ID Number'],
                            ['aadharNumber','Aadhaar Number'], ['panNumber','PAN Number'],
                            ['pfNumber','PF Number'], ['esicNumber','ESIC Number'],
                            ['uanNumber','UAN Number'], ['taxIdDetails','Tax ID Details'],
                            ['bankName','Bank Name & Branch'], ['bankAccountNumber','Account Number'],
                            ['branchName','Branch Name'], ['ifscCode','IFSC Code']
                          ].map(([field, label]) => (
                            <div key={field}>
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">{label}</label>
                              <input type="text" value={editStaffData[field] || ''} onChange={e => setEditStaffData({...editStaffData, [field]: e.target.value})} className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${editStaffErrors[field] ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white'}`} />
                              {editStaffErrors[field] && <p className="text-red-500 text-xs mt-1">{editStaffErrors[field]}</p>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-700 text-sm font-medium flex items-center gap-2">
                          <ShieldCheck size={18} /> You don't have permission to view or edit sensitive identity & banking details.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Documents Tab — upload new + show existing */}
                  {addStaffActiveTab === 'Documents' && (
                    <div className="space-y-4 animate-fade-in">
                      {[
                        { key: 'academicCertificates', label: 'Academic Certificates' },
                        { key: 'markSheets', label: 'Mark Sheets' },
                        { key: 'experienceCertificates', label: 'Experience Certificates' },
                        { key: 'relievingLetter', label: 'Relieving Letter' },
                        { key: 'resume', label: 'Resume / CV' },
                        { key: 'referenceLetters', label: 'Reference Letters' },
                        { key: 'govtIdDocument', label: 'Government ID Document' },
                        { key: 'salarySlips', label: 'Salary Slips' }
                      ].map(({ key, label }) => {
                        const existingFiles = selectedStaffToView[key] || [];
                        const newFiles = editStaffDocFiles[key] || [];
                        return (
                          <div key={key} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                            <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">{label}</label>

                            {/* Existing uploaded files */}
                            {existingFiles.length > 0 && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                                {existingFiles.map((file, idx) => (
                                  <a
                                    key={idx}
                                    href={file.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg hover:bg-indigo-50 transition-colors text-xs font-semibold text-indigo-600"
                                  >
                                    <ExternalLink size={12} />
                                    <span className="truncate">{file.name}</span>
                                  </a>
                                ))}
                              </div>
                            )}

                            {/* New files staged for upload */}
                            {newFiles.length > 0 && (
                              <div className="space-y-1 mb-3">
                                {newFiles.map((file, idx) => (
                                  <div key={idx} className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-xs">
                                    <span className="truncate text-emerald-700 font-semibold">+ {file.name}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditStaffDocFiles(prev => {
                                          const list = [...(prev[key] || [])];
                                          list.splice(idx, 1);
                                          return { ...prev, [key]: list };
                                        });
                                      }}
                                      className="text-red-500 hover:text-red-700 font-bold px-2 ml-2 shrink-0"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* File picker */}
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-primary-600 hover:text-primary-800">
                              <UploadCloud size={14} />
                              <span>Add file(s)</span>
                              <input
                                type="file"
                                multiple
                                accept=".pdf,image/*"
                                className="hidden"
                                onChange={e => {
                                  const selected = Array.from(e.target.files);
                                  setEditStaffDocFiles(prev => ({
                                    ...prev,
                                    [key]: [...(prev[key] || []), ...selected]
                                  }));
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* ── VIEW MODE ── */
                <>
              {addStaffActiveTab === 'Personal Info' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
                    {selectedStaffToView.photoUrl ? (
                      <img src={selectedStaffToView.photoUrl} alt="Staff Photograph" className="w-16 h-16 rounded-full object-cover border border-slate-200" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-2xl">
                        {(selectedStaffToView.name || `${selectedStaffToView.firstName} ${selectedStaffToView.lastName}`).charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">
                        {selectedStaffToView.name || `${selectedStaffToView.firstName} ${selectedStaffToView.lastName}`}
                      </h3>
                      <p className="text-sm font-medium text-indigo-600 capitalize">{selectedStaffToView.role || 'Staffs'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Staff ID</label>
                      <p className="text-slate-900 font-semibold">{selectedStaffToView.staffId || '—'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Email Address</label>
                      <p className="text-slate-900 font-semibold">{selectedStaffToView.email || '—'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Mobile Number</label>
                      <p className="text-slate-900 font-semibold">{selectedStaffToView.mobileNumber || '—'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Date of Birth</label>
                      <p className="text-slate-900 font-semibold">{selectedStaffToView.dob || '—'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Gender</label>
                      <p className="text-slate-900 font-semibold">{selectedStaffToView.gender || '—'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nationality</label>
                      <p className="text-slate-900 font-semibold">{selectedStaffToView.nationality || '—'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Marital Status</label>
                      <p className="text-slate-900 font-semibold">{selectedStaffToView.maritalStatus || '—'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Blood Group</label>
                      <p className="text-slate-900 font-semibold">{selectedStaffToView.bloodGroup || '—'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Emergency Contact</label>
                      <p className="text-slate-900 font-semibold">{selectedStaffToView.emergencyContact || '—'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Father / Guardian Name</label>
                      <p className="text-slate-900 font-semibold">{selectedStaffToView.fatherGuardianName || '—'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Languages Known</label>
                      <p className="text-slate-900 font-semibold">{selectedStaffToView.languagesKnown || '—'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Joined Date</label>
                      <p className="text-slate-900 font-semibold">
                        {selectedStaffToView.createdAt ? new Date(selectedStaffToView.createdAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Staff Type</label>
                      <p className="text-slate-900 font-semibold capitalize">
                        {selectedStaffToView.staff_type || 'teaching'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Residential Address</label>
                    <p className="text-slate-900 font-semibold whitespace-pre-line">{selectedStaffToView.residentialAddress || '—'}</p>
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-100">
                    <CustomFieldsRenderer 
                      moduleKey="staff"
                      customData={selectedStaffToView.customData || {}}
                      readOnly={true}
                    />
                  </div>
                </div>
              )}

              {addStaffActiveTab === 'Education & Work' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Academic Qualifications</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Highest Qualification</label>
                        <p className="text-slate-900 font-semibold">{selectedStaffToView.highestQualification || '—'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Degree & Specialization</label>
                        <p className="text-slate-900 font-semibold">{selectedStaffToView.degreeSpecialization || '—'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">University / College</label>
                        <p className="text-slate-900 font-semibold">{selectedStaffToView.universityName || '—'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Year of Passing</label>
                        <p className="text-slate-900 font-semibold">{selectedStaffToView.yearOfPassing || '—'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Professional Experience</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Previous Experience (Years)</label>
                        <p className="text-slate-900 font-semibold">{selectedStaffToView.previousExperience || '0'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Previous Organization</label>
                        <p className="text-slate-900 font-semibold">{selectedStaffToView.previousOrganization || '—'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Subject Specialization</label>
                        <p className="text-slate-900 font-semibold">{selectedStaffToView.subjectSpecialization || '—'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Grades/Classes Handled</label>
                        <p className="text-slate-900 font-semibold">{selectedStaffToView.gradesClassesHandled || '—'}</p>
                      </div>
                      <div className="col-span-1 sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Professional Certifications</label>
                        <p className="text-slate-900 font-semibold">{selectedStaffToView.professionalCertifications || '—'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {addStaffActiveTab === 'Identity & Banking' && (
                <div className="space-y-6 animate-fade-in">
                  {/* Authorized check */}
                  {(userProfile?.role?.toLowerCase() === 'admin' || userProfile?.role?.toLowerCase() === 'superadmin') ? (
                    <>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Government Identity & Payroll</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Government ID Type</label>
                            <p className="text-slate-900 font-semibold">{selectedStaffToView.govtIdType || '—'}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Government ID Number</label>
                            <p className="text-slate-900 font-semibold">{selectedStaffToView.govtIdNumber || '—'}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Aadhaar Number</label>
                            <p className="text-slate-900 font-semibold">{selectedStaffToView.aadharNumber || '—'}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">PAN Number</label>
                            <p className="text-slate-900 font-semibold">{selectedStaffToView.panNumber || '—'}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">PF Number</label>
                            <p className="text-slate-900 font-semibold">{selectedStaffToView.pfNumber || '—'}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">ESIC Number</label>
                            <p className="text-slate-900 font-semibold">{selectedStaffToView.esicNumber || '—'}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">UAN Number</label>
                            <p className="text-slate-900 font-semibold">{selectedStaffToView.uanNumber || '—'}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tax Identification Details</label>
                            <p className="text-slate-900 font-semibold">{selectedStaffToView.taxIdDetails || '—'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Banking Details</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Bank Name</label>
                            <p className="text-slate-900 font-semibold">{selectedStaffToView.bankName || '—'}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Bank Account Number</label>
                            <p className="text-slate-900 font-semibold">{selectedStaffToView.bankAccountNumber || '—'}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Branch Name</label>
                            <p className="text-slate-900 font-semibold">{selectedStaffToView.branchName || '—'}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">IFSC Code</label>
                            <p className="text-slate-900 font-semibold">{selectedStaffToView.ifscCode || '—'}</p>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-700 text-sm font-medium flex items-center gap-2">
                      <ShieldCheck /> Government, salary, and banking details are restricted to authorized administrators.
                    </div>
                  )}
                </div>
              )}

              {addStaffActiveTab === 'Documents' && (
                <div className="space-y-4 animate-fade-in">
                  {[
                    { key: 'academicCertificates', label: 'Academic Certificates' },
                    { key: 'markSheets', label: 'Mark Sheets' },
                    { key: 'experienceCertificates', label: 'Experience Certificates' },
                    { key: 'relievingLetter', label: 'Relieving Letter' },
                    { key: 'resume', label: 'Resume / CV' },
                    { key: 'referenceLetters', label: 'Reference Letters' },
                    { key: 'govtIdDocument', label: 'Government ID Document' },
                    { key: 'salarySlips', label: 'Salary Slips' }
                  ].map(({ key, label }) => {
                    const files = selectedStaffToView[key] || [];
                    return (
                      <div key={key} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                        <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">{label}</label>
                        {files.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {files.map((file, idx) => (
                              <a
                                key={idx}
                                href={file.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-xs font-semibold text-indigo-600"
                              >
                                <ExternalLink size={14} />
                                <span className="truncate">{file.name}</span>
                              </a>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No documents uploaded</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              </>
              )}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              {isStaffEditMode ? (
                <>
                  <button
                    onClick={() => { setIsStaffEditMode(false); setEditStaffData(null); setEditStaffErrors({}); setEditStaffDocFiles({}); }}
                    className="px-6 py-2.5 bg-slate-200 text-slate-700 font-bold hover:bg-slate-300 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveStaffEdit}
                    disabled={savingStaffEdit}
                    className="px-6 py-2.5 bg-primary-600 text-white font-bold hover:bg-primary-700 rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                  >
                    {savingStaffEdit ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /><span>Saving...</span></> : 'Save Changes'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setEditStaffData({ ...selectedStaffToView });
                      setEditStaffErrors({});
                      setEditStaffDocFiles({});
                      setAddStaffActiveTab('Personal Info');
                      setIsStaffEditMode(true);
                    }}
                    className="px-6 py-2.5 bg-primary-600 text-white font-bold hover:bg-primary-700 rounded-xl transition-colors shadow-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => { setViewStaffModalOpen(false); setIsStaffEditMode(false); setEditStaffData(null); setEditStaffDocFiles({}); }}
                    className="px-6 py-2.5 bg-slate-200 text-slate-700 font-bold hover:bg-slate-300 rounded-xl transition-colors"
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmDeleteState.isOpen}
        title="Delete Staff Member"
        message={`Are you sure you want to delete the staff member "${confirmDeleteState.name}"? This action cannot be undone.`}
        onConfirm={() => handleDeleteStaff(confirmDeleteState.id)}
        onCancel={() => setConfirmDeleteState({ isOpen: false, id: null, name: '' })}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}
