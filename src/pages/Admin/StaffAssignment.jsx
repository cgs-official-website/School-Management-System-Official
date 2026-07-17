import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSubCollection, updateSubDocument, addSubDocument, subscribeToSubCollection } from '../../firebase/firestore';
import { getDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase/config';
import { LuSearch as Search, LuShieldCheck as ShieldCheck, LuMail as Mail, LuUsers as Users, LuCircleCheck as CheckCircle2, LuX as X, LuCloudUpload as UploadCloud, LuFileText as FileText, LuExternalLink as ExternalLink, LuDownload as Download, LuFileSpreadsheet as FileSpreadsheet, LuUserPlus as UserPlus, LuEye as Eye } from 'react-icons/lu';
import { TableSkeleton } from '../../components/Skeleton';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

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

  // Add Staff Modal State
  const [addStaffModalOpen, setAddStaffModalOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'teacher',
    assignedClassId: '',
    subjectClassIds: []
  });
  const [addingStaff, setAddingStaff] = useState(false);

  // View Modal State
  const [viewStaffModalOpen, setViewStaffModalOpen] = useState(false);
  const [selectedStaffToView, setSelectedStaffToView] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');

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
      setClasses(data);
    });

    return () => {
      if (teachersUnsub) teachersUnsub();
      if (classesUnsub) classesUnsub();
    };
  }, [schoolId]);

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
            if (row['First Name'] && row['Last Name'] && row['Email']) {
              await addSubDocument(schoolId, 'teachers', {
                firstName: row['First Name'],
                lastName: row['Last Name'],
                name: `${row['First Name']} ${row['Last Name']}`,
                email: row['Email'],
                role: row['Role'] || 'teacher',
                assignedClassId: row['Assigned Class ID'] || '',
                subjectClassIds: [],
                status: 'Active',
                createdAt: new Date().toISOString()
              });
              successCount++;
            }
          }
          toast.success(`Successfully imported ${successCount} staff members!`);
          setUploadModalOpen(false);
          setUploadFile(null);
          // Refresh handled by listener
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

  const handleAddStaff = async () => {
    if (!newStaff.firstName || !newStaff.lastName || !newStaff.email) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setAddingStaff(true);
    try {
      await addSubDocument(schoolId, 'teachers', {
        firstName: newStaff.firstName,
        lastName: newStaff.lastName,
        name: `${newStaff.firstName} ${newStaff.lastName}`,
        email: newStaff.email,
        role: newStaff.role,
        assignedClassId: newStaff.assignedClassId,
        subjectClassIds: newStaff.subjectClassIds,
        status: 'Active',
        createdAt: new Date().toISOString()
      });
      toast.success("Staff member added successfully!");
      setAddStaffModalOpen(false);
      setNewStaff({ firstName: '', lastName: '', email: '', role: 'teacher', assignedClassId: '', subjectClassIds: [] });
    } catch (error) {
      console.error("Error adding staff:", error);
      toast.error("Failed to add staff member.");
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
      'Role': member.role || 'Teacher',
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
        (member.role || 'Teacher').toUpperCase(),
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
    return name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           (member.email && member.email.toLowerCase().includes(searchQuery.toLowerCase()));
  });

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
            onClick={() => setAddStaffModalOpen(true)}
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

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap gap-4 items-center justify-between bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search staff by name or email..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            />
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <Users size={18} />
            <span>Total Staff: {staff.length}</span>
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
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-slate-500">
                    <ShieldCheck size={48} className="mx-auto mb-4 text-slate-300" />
                    <p className="text-lg font-medium text-slate-900 mb-1">No staff members found</p>
                    <p>Generate a teacher invite link to start onboarding your faculty.</p>
                  </td>
                </tr>
              ) : (
                filteredStaff.map((member) => {
                  const name = member.name || `${member.firstName} ${member.lastName}`;
                  const isAssigned = !!member.assignedClassId;

                  return (
                    <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                            {name.charAt(0)}
                          </div>
                          <div className="font-semibold text-slate-900">
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
                        <div className="flex flex-col gap-1">
                          {isAssigned && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-primary-50 text-primary-700 border border-primary-200 w-fit">
                              {getClassName(member.assignedClassId)} (Class Tr.)
                            </span>
                          )}
                          {member.subjectClassIds?.map(id => (
                            <span key={id} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 w-fit">
                              {getClassName(id)} (Subj Tr.)
                            </span>
                          ))}
                          {!isAssigned && (!member.subjectClassIds || member.subjectClassIds.length === 0) && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200 w-fit">
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
                          <button 
                            onClick={() => {
                              setSelectedStaffToView(member);
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
                            onClick={() => openAssignModal(member)}
                            className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                          >
                            {isAssigned ? 'Change Class' : 'Assign'}
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
                <p className="text-sm text-slate-600 mb-4">
                  Upload an Excel or CSV file to bulk import staff. Ensure it has columns: First Name, Last Name, Email.
                </p>
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
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="text-indigo-600" />
                Add Staff Member
              </h2>
              <button onClick={() => setAddStaffModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">First Name *</label>
                  <input 
                    type="text" 
                    value={newStaff.firstName}
                    onChange={(e) => setNewStaff({...newStaff, firstName: e.target.value})}
                    placeholder="e.g. John"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Last Name *</label>
                  <input 
                    type="text" 
                    value={newStaff.lastName}
                    onChange={(e) => setNewStaff({...newStaff, lastName: e.target.value})}
                    placeholder="e.g. Doe"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address *</label>
                <input 
                  type="email" 
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({...newStaff, email: e.target.value})}
                  placeholder="john.doe@example.com"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Role</label>
                  <select 
                    value={newStaff.role}
                    onChange={(e) => setNewStaff({...newStaff, role: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option value="teacher">Teacher</option>
                    <option value="librarian">Librarian</option>
                    <option value="accountant">Accountant</option>
                    <option value="warden">Warden</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Class Teacher For</label>
                  <select 
                    value={newStaff.assignedClassId}
                    onChange={(e) => setNewStaff({...newStaff, assignedClassId: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option value="">-- None --</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name} - Section {c.section}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Subject Teacher For</label>
                  <div className="w-full p-3 rounded-xl border border-slate-200 bg-white flex flex-col sm:grid sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                    {classes.map(c => (
                      <label key={`add-subj-${c.id}`} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                        <input 
                          type="checkbox" 
                          checked={newStaff.subjectClassIds.includes(c.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewStaff({...newStaff, subjectClassIds: [...newStaff.subjectClassIds, c.id]});
                            } else {
                              setNewStaff({...newStaff, subjectClassIds: newStaff.subjectClassIds.filter(id => id !== c.id)});
                            }
                          }}
                          className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                        />
                        <span className="text-sm font-medium text-slate-700 truncate">{c.name} - Section {c.section}</span>
                      </label>
                    ))}
                    {classes.length === 0 && <span className="text-sm text-slate-500 italic p-1">No classes available</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
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
                {addingStaff ? 'Adding...' : 'Add Staff Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Staff Details Modal */}
      {viewStaffModalOpen && selectedStaffToView && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Users className="text-indigo-600" />
                Staff Details
              </h2>
              <button onClick={() => setViewStaffModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-2xl">
                  {(selectedStaffToView.name || `${selectedStaffToView.firstName} ${selectedStaffToView.lastName}`).charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {selectedStaffToView.name || `${selectedStaffToView.firstName} ${selectedStaffToView.lastName}`}
                  </h3>
                  <p className="text-sm font-medium text-indigo-600 capitalize">{selectedStaffToView.role || 'Teacher'}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Email Address</label>
                  <p className="text-slate-900 font-medium">{selectedStaffToView.email || 'N/A'}</p>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Class Teacher Of</label>
                  <p className="text-slate-900 font-medium">
                    {selectedStaffToView.assignedClassId 
                      ? getClassName(selectedStaffToView.assignedClassId) 
                      : <span className="text-slate-500 italic">Unassigned</span>}
                  </p>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Subject Teacher Of</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedStaffToView.subjectClassIds?.length > 0 ? (
                      selectedStaffToView.subjectClassIds.map(id => (
                        <span key={id} className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-md border border-indigo-100">
                          {getClassName(id)}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500 italic">No subject classes</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status</label>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {selectedStaffToView.status || 'Active'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Joined Date</label>
                  <p className="text-slate-900 font-medium">
                    {selectedStaffToView.createdAt 
                      ? new Date(selectedStaffToView.createdAt).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setViewStaffModalOpen(false)}
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
