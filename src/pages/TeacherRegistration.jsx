import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { registerUser } from '../firebase/auth';
import { addSubDocument, getSubCollection } from '../firebase/firestore';
import { db, storage } from '../firebase/config';
import { getDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { LuUser as UserIcon, LuLock as LockIcon, LuMail as MailIcon, LuBuilding2, LuX as X, LuCloudUpload as UploadCloud, LuFileText as FileText, LuExternalLink as ExternalLink } from 'react-icons/lu';
import Captcha from '../components/Captcha';
import toast from 'react-hot-toast';

export default function TeacherRegistration() {
  const { schoolId } = useParams();
  const navigate = useNavigate();

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

    // Account Credentials
    username: '',
    password: '',

    // Documents (stored as URLs after upload)
    photoUrl: '',
    academicCertificates: [],
    markSheets: [],
    experienceCertificates: [],
    relievingLetter: [],
    resume: [],
    referenceLetters: [],
    govtIdDocument: [],
    salarySlips: []
  };

  const [newStaff, setNewStaff] = useState(initialStaffFormState);
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

  const [existingTeachers, setExistingTeachers] = useState([]);
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [captchaValid, setCaptchaValid] = useState(false);
  
  const captchaRef = useRef(null);
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

  React.useEffect(() => {
    const fetchSchoolAndTeachers = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'schools', schoolId));
        if (docSnap.exists()) {
          setSchool(docSnap.data());
        }
        const q = await getSubCollection(schoolId, 'teachers');
        setExistingTeachers(q || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSchoolAndTeachers();
  }, [schoolId]);

  const checkStaffUniqueness = (staffIdVal, emailVal) => {
    const isIdDuplicate = existingTeachers.some(
      s => s.staffId && s.staffId.trim().toLowerCase() === staffIdVal.trim().toLowerCase()
    );
    const isEmailDuplicate = existingTeachers.some(
      s => s.email && s.email.trim().toLowerCase() === emailVal.trim().toLowerCase()
    );
    return { isIdDuplicate, isEmailDuplicate };
  };

  const validateStaffForm = () => {
    const errors = {};
    if (!newStaff.staffId?.trim()) errors.staffId = "Staff ID is required";
    if (!newStaff.firstName?.trim()) errors.firstName = "First name is required";
    if (!newStaff.lastName?.trim()) errors.lastName = "Last name is required";
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

    if (!newStaff.username?.trim()) errors.username = "Username is required";
    if (!newStaff.password) {
      errors.password = "Password is required";
    } else {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(newStaff.password)) {
        errors.password = "Password must be at least 8 characters and include uppercase, lowercase, number, and special character";
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
        userName: staffName,
        userRole: 'Teacher (Self Registered)',
        timestamp: new Date().toISOString(),
        actionPerformed,
        modifiedFields
      });
    } catch (e) {
      console.error("Failed to write staff audit log:", e);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    // Trim inputs
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
    newStaff.username = trimmed.username;

    if (!validateStaffForm()) {
      toast.error("Please resolve the validation errors across tabs.");
      return;
    }

    if (!captchaValid) {
      toast.error("Please complete the verification code correctly.");
      return;
    }

    setIsRegistering(true);
    const progressToastId = toast.loading("Registering account & uploading files...");
    try {
      // 1. Create auth user
      const user = await registerUser(newStaff.email, newStaff.password, 'teacher', {
        name: `${newStaff.firstName} ${newStaff.lastName}`,
        schoolId: schoolId
      });

      // 2. Upload documents
      const uploadedUrls = await uploadAllDocuments(newStaff.staffId);

      // 3. Save profile to Firestore
      const staffDoc = {
        ...newStaff,
        ...uploadedUrls,
        userId: user.uid,
        name: `${newStaff.firstName} ${newStaff.lastName}`,
        createdAt: new Date().toISOString()
      };
      // Remove raw password
      delete staffDoc.password;

      await addSubDocument(schoolId, 'teachers', staffDoc);

      // 4. Log audit event
      await logStaffAudit(newStaff.staffId, `${newStaff.firstName} ${newStaff.lastName}`, "Created (Self Registered)", [
        { field: 'firstName', newValue: newStaff.firstName },
        { field: 'lastName', newValue: newStaff.lastName },
        { field: 'email', newValue: newStaff.email },
        { field: 'staffId', newValue: newStaff.staffId }
      ]);

      toast.success("Account registered successfully!", { id: progressToastId });
      navigate('/teacher');
    } catch (err) {
      console.error(err);
      toast.error("Registration failed. Please try again.", { id: progressToastId });
      if (captchaRef.current) captchaRef.current.regenerate();
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-primary-500 selection:text-white flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row border border-slate-100 min-h-[85vh]">
        
        {/* Left Gradient Panel */}
        <div className="w-full md:w-1/3 p-4 hidden md:flex flex-col relative overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500 via-indigo-600 to-cyan-400 rounded-2xl m-4 z-0">
             <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-white/20 blur-[60px] rounded-full mix-blend-screen animate-pulse pointer-events-none"></div>
             <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-300/30 blur-[80px] rounded-full mix-blend-screen animate-[pulse_4s_ease-in-out_infinite_reverse] pointer-events-none"></div>
          </div>
          
          <div className="relative z-10 flex flex-col h-full justify-between p-8 text-white">
            <Link to="/" className="inline-flex items-center gap-2 group focus:outline-none focus:ring-2 focus:ring-white/50 rounded-lg w-max">
              <img src="/logo.png" alt="Zuna Logo" className="w-auto h-10 object-contain drop-shadow-sm filter brightness-0 invert" />
            </Link>

            <div className="mt-auto">
              <p className="text-xs font-bold uppercase tracking-wider text-white/80 mb-2">Staff Registration</p>
              <h1 className="text-2xl font-bold leading-tight">
                Complete your details to set up your teacher workspace.
              </h1>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="w-full md:w-2/3 flex flex-col bg-white overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 flex-1">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent mb-4"></div>
              <p className="text-slate-500 font-medium">Loading form...</p>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="flex flex-col h-full">
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
                {school && (
                  <div className="flex items-center gap-3">
                    {school.branding?.logoUrl ? (
                      <img src={school.branding.logoUrl} alt="School Logo" className="h-10 w-auto object-contain" />
                    ) : (
                      <div className="h-10 w-10 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600">
                        <LuBuilding2 size={20} />
                      </div>
                    )}
                    <div>
                      <h2 className="text-base font-bold text-slate-900 leading-tight truncate max-w-xs">{school.schoolName || school.name}</h2>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Teacher Account Registration</p>
                    </div>
                  </div>
                )}
                <div className="md:hidden">
                  <Link to="/">
                    <img src="/logo.png" alt="Zuna Logo" className="w-auto h-8 object-contain" />
                  </Link>
                </div>
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

              {/* Tabs list */}
              <div className="flex border-b border-slate-200 overflow-x-auto bg-white shrink-0 hide-scrollbar scroll-smooth">
                <div className="flex w-full justify-start items-center">
                  {['Personal', 'Educational', 'Professional', 'Government & Identity', 'Employment', 'Banking', 'Uploads', 'Credentials'].map(tab => {
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

              {/* Tab views */}
              <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-6 max-h-[60vh]">
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

                {addStaffActiveTab === 'Credentials' && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Username / Portal Email *</label>
                        <input
                          type="text"
                          value={newStaff.username}
                          onChange={(e) => setNewStaff({ ...newStaff, username: e.target.value })}
                          placeholder="e.g. john_teacher"
                          className={`w-full px-3 py-2 rounded-xl border bg-white focus:ring-2 focus:ring-primary-500 text-sm ${addStaffErrors.username ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'}`}
                        />
                        {addStaffErrors.username && <span className="text-red-500 text-xs mt-1 block">{addStaffErrors.username}</span>}
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Portal Access Password *</label>
                        <input
                          type="password"
                          value={newStaff.password}
                          onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                          placeholder="At least 8 chars"
                          className={`w-full px-3 py-2 rounded-xl border bg-white focus:ring-2 focus:ring-primary-500 text-sm ${addStaffErrors.password ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'}`}
                        />
                        {addStaffErrors.password && <span className="text-red-500 text-xs mt-1 block">{addStaffErrors.password}</span>}
                      </div>
                    </div>
                    
                    <div className="pt-2">
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <Captcha ref={captchaRef} onChange={setCaptchaValid} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0">
                <p className="text-xs text-slate-400 font-semibold">* Required fields across all sections</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isRegistering}
                    className="px-6 py-2.5 bg-primary-600 text-white font-bold hover:bg-primary-700 rounded-xl shadow-sm disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    {isRegistering ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Registering...</span>
                      </>
                    ) : (
                      'Register Profile'
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
