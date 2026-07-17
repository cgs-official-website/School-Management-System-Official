import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, Search, Filter, Edit, Trash2, Download, Settings, UploadCloud, Printer, FileText } from 'lucide-react';
import { LuBriefcase, LuCircleDollarSign } from 'react-icons/lu';
import ConfirmModal from '../../components/ConfirmModal';
import { useAuth } from '../../context/AuthContext';
import { subscribeToSubCollection, addSubDocument, updateSubDocument, deleteSubDocument } from '../../firebase/firestore';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase/config';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function HRPayrollManagement() {
  const { userProfile } = useAuth();
  const schoolId = userProfile?.schoolId;

  const [payrolls, setPayrolls] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [schoolDetails, setSchoolDetails] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPayslipModal, setShowPayslipModal] = useState(null); // stores payroll object
  const [confirmModalState, setConfirmModalState] = useState({ isOpen: false, idToDelete: null });
  const [formData, setFormData] = useState({ teacherId: '', name: '', role: '', baseSalary: 0, deductions: 0, status: 'Pending', pfCalculated: 0, esiCalculated: 0 });
  const [searchTerm, setSearchTerm] = useState('');

  const [signatureFile, setSignatureFile] = useState(null);
  const [uploadingSig, setUploadingSig] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    
    const fetchSchoolDetails = async () => {
      try {
        const snap = await getDoc(doc(db, 'schools', schoolId));
        if (snap.exists()) {
          setSchoolDetails(snap.data());
        }
      } catch (err) {
        console.error("Failed to fetch school details", err);
      }
    };
    fetchSchoolDetails();

    const unsubTeachers = subscribeToSubCollection(schoolId, 'teachers', (data) => {
      setTeachers(data);
    });

    const unsubPayroll = subscribeToSubCollection(schoolId, 'payroll', (data) => {
      setPayrolls(data);
      setLoading(false);
    });

    return () => {
      unsubTeachers();
      unsubPayroll();
    };
  }, [schoolId]);

  const calculateDeductions = (salary) => {
    const pfCeiling = 15000;
    const pfApplicable = Math.min(salary, pfCeiling);
    const pf = Math.round(pfApplicable * 0.12);

    const esiCeiling = 21000;
    const esi = salary <= esiCeiling ? Math.round(salary * 0.0075) : 0;

    return { pf, esi, total: pf + esi };
  };

  const handleTeacherSelect = (teacherId) => {
    const selected = teachers.find(t => t.id === teacherId);
    if (selected) {
      const name = selected.name || `${selected.firstName || ''} ${selected.lastName || ''}`.trim();
      const role = selected.role || 'Staff'; 
      
      const previousPayroll = payrolls.filter(p => p.teacherId === teacherId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
      const defaultSalary = previousPayroll ? previousPayroll.baseSalary : (selected.baseSalary || 0);
      const { pf, esi, total } = calculateDeductions(defaultSalary);

      setFormData(prev => ({ 
        ...prev, 
        teacherId, 
        name, 
        role,
        baseSalary: defaultSalary,
        deductions: total,
        pfCalculated: pf,
        esiCalculated: esi
      }));
    } else {
      setFormData(prev => ({ ...prev, teacherId: '', name: '', role: '', baseSalary: 0, deductions: 0, pfCalculated: 0, esiCalculated: 0 }));
    }
  };

  const handleSalaryChange = (val) => {
    const salary = parseFloat(val) || 0;
    const { pf, esi, total } = calculateDeductions(salary);
    setFormData(prev => ({ 
      ...prev, 
      baseSalary: salary, 
      deductions: total,
      pfCalculated: pf,
      esiCalculated: esi
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.teacherId) {
      toast.error("Please select a staff member");
      return;
    }

    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    if (!formData.id) {
      const isDuplicate = payrolls.some(p => p.teacherId === formData.teacherId && p.month === currentMonth);
      if (isDuplicate) {
        toast.error(`Payroll for this staff member already exists for ${currentMonth}.`);
        return;
      }
    }

    try {
      if (formData.id) {
        await updateSubDocument(schoolId, 'payroll', formData.id, formData);
        toast.success("Payroll updated successfully");
      } else {
        await addSubDocument(schoolId, 'payroll', {
          ...formData,
          month: currentMonth,
          createdAt: new Date().toISOString()
        });
        toast.success("Payroll record added");
      }
      setShowModal(false);
      setFormData({ teacherId: '', name: '', role: '', baseSalary: 0, deductions: 0, status: 'Pending', pfCalculated: 0, esiCalculated: 0 });
    } catch (err) {
      console.error(err);
      toast.error("Failed to save payroll record");
    }
  };

  const handleDeleteClick = (id) => {
    setConfirmModalState({ isOpen: true, idToDelete: id });
  };

  const executeDelete = async () => {
    const id = confirmModalState.idToDelete;
    if (!id) return;
    try {
      await deleteSubDocument(schoolId, 'payroll', id);
      toast.success("Record deleted");
    } catch (err) {
      toast.error("Failed to delete record");
    }
    setConfirmModalState({ isOpen: false, idToDelete: null });
  };

  const handleUploadSignature = async () => {
    if (!signatureFile) return;
    setUploadingSig(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result;
        
        const schoolRef = doc(db, 'schools', schoolId);
        await updateDoc(schoolRef, {
          'hrConfig.authorizedSignature': base64String
        });
        
        setSchoolDetails(prev => ({
          ...prev,
          hrConfig: { ...(prev?.hrConfig || {}), authorizedSignature: base64String }
        }));
        
        toast.success("Signature uploaded successfully!");
        setSignatureFile(null);
        setUploadingSig(false);
      };
      reader.onerror = () => {
        toast.error("Failed to read file.");
        setUploadingSig(false);
      };
      reader.readAsDataURL(signatureFile);
    } catch (err) {
      console.error("Signature upload failed", err);
      toast.error("Failed to upload signature.");
      setUploadingSig(false);
    }
  };

  const handleRemoveSignature = async () => {
    try {
      const schoolRef = doc(db, 'schools', schoolId);
      await updateDoc(schoolRef, {
        'hrConfig.authorizedSignature': null
      });
      setSchoolDetails(prev => ({
        ...prev,
        hrConfig: { ...(prev?.hrConfig || {}), authorizedSignature: null }
      }));
      toast.success("Signature removed successfully!");
    } catch (err) {
      toast.error("Failed to remove signature.");
    }
  };

  const filteredPayrolls = payrolls.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.role.toLowerCase().includes(searchTerm.toLowerCase()));

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    if (!showPayslipModal) return;
    const payroll = showPayslipModal;
    const docPDF = new jsPDF();
    const netPay = (payroll.baseSalary || 0) - (payroll.deductions || 0);

    docPDF.setFontSize(22);
    docPDF.setTextColor(30, 58, 138); 
    docPDF.text("Payslip", 105, 20, { align: 'center' });
    
    docPDF.setFontSize(12);
    docPDF.setTextColor(100, 116, 139); 
    docPDF.text(`Month: ${payroll.month || 'N/A'}`, 105, 30, { align: 'center' });

    docPDF.setFontSize(11);
    docPDF.setTextColor(15, 23, 42); 
    docPDF.text(`Employee Name: ${payroll.name}`, 20, 50);
    docPDF.text(`Role/Position: ${payroll.role}`, 20, 60);
    docPDF.text(`Status: ${payroll.status}`, 20, 70);

    autoTable(docPDF, {
      startY: 85,
      head: [['Description', 'Amount (INR)']],
      body: [
        ['Base Salary', `Rs. ${(payroll.baseSalary || 0).toLocaleString()}`],
        ['PF Deduction', `- Rs. ${(payroll.pfCalculated || 0).toLocaleString()}`],
        ['ESI Deduction', `- Rs. ${(payroll.esiCalculated || 0).toLocaleString()}`],
        ['Other Deductions', `- Rs. ${((payroll.deductions || 0) - (payroll.pfCalculated || 0) - (payroll.esiCalculated || 0)).toLocaleString()}`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 6 },
    });

    const finalY = docPDF.lastAutoTable.finalY || 130;
    docPDF.setFontSize(14);
    docPDF.setTextColor(16, 185, 129); 
    docPDF.text(`Net Payable: Rs. ${netPay.toLocaleString()}`, 190, finalY + 15, { align: 'right' });

    if (schoolDetails?.hrConfig?.authorizedSignature) {
      try {
        docPDF.addImage(schoolDetails.hrConfig.authorizedSignature, 'PNG', 140, finalY + 25, 40, 15);
        docPDF.setFontSize(10);
        docPDF.setTextColor(100, 116, 139);
        docPDF.text("Authorized Signatory", 160, finalY + 45, { align: 'center' });
      } catch (e) {
        console.error("Could not add signature to PDF", e);
      }
    }

    docPDF.save(`Payslip_${payroll.month || 'Current'}_${payroll.name}.pdf`);
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto h-[calc(100vh-2rem)] flex flex-col print:p-0 print:h-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4 shrink-0 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">HR & Payroll</h1>
          <p className="text-slate-500 mt-1">Manage staff salaries, deductions, and payslips.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-all font-medium shadow-sm"
          >
            <Settings size={20} /> Settings
          </button>
          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl hover:bg-slate-50 transition-all font-medium shadow-sm">
            <Download size={20} /> Export Report
          </button>
          <button 
            onClick={() => { setFormData({ teacherId: '', name: '', role: '', baseSalary: 0, deductions: 0, status: 'Pending', pfCalculated: 0, esiCalculated: 0 }); setShowModal(true); }}
            className="flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-xl hover:bg-primary-700 transition-all font-medium shadow-sm"
          >
            <Plus size={20} /> Add Record
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 shrink-0 print:hidden">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <LuCircleDollarSign size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Payroll</p>
            <p className="text-2xl font-bold text-slate-900">
              ₹{payrolls.reduce((acc, curr) => acc + (curr.baseSalary - curr.deductions), 0).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <LuBriefcase size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Staff Count</p>
            <p className="text-2xl font-bold text-slate-900">{payrolls.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden print:hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between gap-4 shrink-0">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="Search by name or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-slate-50 focus:bg-white transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200">Staff Name</th>
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200">Role</th>
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200">Month</th>
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200">Base Salary</th>
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200">Deductions</th>
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200">Net Pay</th>
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200">Status</th>
                <th className="p-4 font-semibold text-slate-600 border-b border-slate-200 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayrolls.map((payroll) => {
                const netPay = payroll.baseSalary - payroll.deductions;
                return (
                  <tr key={payroll.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-bold text-slate-900">{payroll.name}</td>
                    <td className="p-4 text-slate-600 font-medium">{payroll.role}</td>
                    <td className="p-4 text-slate-600 font-medium">{payroll.month}</td>
                    <td className="p-4 text-slate-700">₹{payroll.baseSalary.toLocaleString()}</td>
                    <td className="p-4 text-red-600">-₹{payroll.deductions.toLocaleString()}</td>
                    <td className="p-4 font-bold text-emerald-600">₹{netPay.toLocaleString()}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                        payroll.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 
                        payroll.status === 'Payslip Released' ? 'bg-purple-100 text-purple-700' : 
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {payroll.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {payroll.status === 'Payslip Released' && (
                          <button 
                            onClick={() => setShowPayslipModal(payroll)}
                            className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Download Payslip"
                          >
                            <FileText size={18} />
                          </button>
                        )}
                        <button onClick={() => { setFormData(payroll); setShowModal(true); }} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                          <Edit size={18} />
                        </button>
                        <button onClick={() => handleDeleteClick(payroll.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredPayrolls.length === 0 && (
                <tr>
                  <td colSpan="8" className="p-12 text-center text-slate-500">
                    No payroll records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Payroll Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in-up">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="text-xl font-bold text-slate-900">{formData.id ? 'Edit' : 'Add'} Payroll Record</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:bg-slate-200 rounded-full p-2 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Staff Member</label>
                    <select
                      required
                      value={formData.teacherId}
                      onChange={e => handleTeacherSelect(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                      disabled={!!formData.id}
                    >
                      <option value="">Select Staff...</option>
                      {teachers.map(t => {
                        const displayName = t.name || `${t.firstName || ''} ${t.lastName || ''}`.trim();
                        return (
                          <option key={t.id} value={t.id}>{displayName || 'Unnamed Staff'}</option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Role / Position</label>
                    <input 
                      type="text" required
                      value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Base Salary (₹)</label>
                    <input 
                      type="number" required min="0"
                      value={formData.baseSalary} onChange={e => handleSalaryChange(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Total Deductions (₹)</label>
                    <input 
                      type="number" required min="0"
                      value={formData.deductions} onChange={e => setFormData({...formData, deductions: parseFloat(e.target.value) || 0})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Includes 12% PF (₹{formData.pfCalculated || 0}) and 0.75% ESI (₹{formData.esiCalculated || 0}). Edit if needed.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
                  <select 
                    value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option>Paid</option>
                    <option>Pending</option>
                    <option>Payslip Released</option>
                  </select>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-6 shadow-sm">
                  <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Payroll Summary</h4>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-600 font-medium text-sm">Base Salary</span>
                    <span className="text-slate-900 font-bold">₹{(formData.baseSalary || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-red-600 font-medium text-sm">Total Deductions</span>
                    <span className="text-red-600 font-bold">-₹{(formData.deductions || 0).toLocaleString()}</span>
                  </div>
                  <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                    <span className="text-emerald-700 font-bold text-sm">Net Balance (Payable)</span>
                    <span className="text-emerald-700 font-black text-xl">₹{((formData.baseSalary || 0) - (formData.deductions || 0)).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-primary-600 text-white font-bold hover:bg-primary-700 rounded-xl shadow-sm transition-colors">Save Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HR Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-slate-900">HR Settings</h2>
              <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:bg-slate-200 rounded-full p-2 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Authorized Signature</label>
              <p className="text-xs text-slate-500 mb-4">This signature will appear on all generated payslips.</p>
              
              {schoolDetails?.hrConfig?.authorizedSignature && (
                <div className="mb-4 p-4 border border-slate-200 rounded-xl bg-slate-50 flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Current Signature</p>
                    <img src={schoolDetails.hrConfig.authorizedSignature} alt="Authorized Signature" className="max-h-16 object-contain mix-blend-multiply" />
                  </div>
                  <button 
                    onClick={handleRemoveSignature}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove Signature"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-3">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={e => setSignatureFile(e.target.files[0])}
                  className="flex-1 text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer border border-slate-200 rounded-xl p-1.5"
                />
                <button 
                  onClick={handleUploadSignature}
                  disabled={!signatureFile || uploadingSig}
                  className="px-4 py-2.5 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {uploadingSig ? 'Uploading...' : <><UploadCloud size={18}/> Upload</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payslip Modal (Printable) */}
      {showPayslipModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 sm:p-8 print:p-0 print:bg-white print:static print:z-0">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:w-full">
            
            {/* Modal Controls - Hidden during print */}
            <div className="p-4 bg-slate-800 text-white flex justify-between items-center shrink-0 print:hidden rounded-t-xl">
              <h3 className="font-bold">Payslip Preview</h3>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleDownloadPDF}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-2 font-semibold transition-colors"
                >
                  <Download size={18} /> Download
                </button>
                <button 
                  onClick={handlePrint}
                  className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg flex items-center gap-2 font-semibold transition-colors"
                >
                  <Printer size={18} /> Print
                </button>
                <button onClick={() => setShowPayslipModal(null)} className="p-2 hover:bg-slate-700 rounded-lg transition-colors ml-2">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Printable Area */}
            <div className="flex-1 overflow-y-auto bg-slate-100 p-8 print:p-0 print:bg-white custom-scrollbar">
              <div className="bg-white border border-slate-200 p-10 print:border-none print:p-0 mx-auto max-w-3xl">
                
                {/* Header */}
                <div className="flex justify-between items-center border-b-2 border-slate-200 pb-6 mb-8">
                  <div className="flex items-center gap-4">
                    {schoolDetails?.logoUrl ? (
                      <img src={schoolDetails.logoUrl} alt="School Logo" className="h-16 w-16 object-contain" />
                    ) : (
                      <div className="h-16 w-16 bg-slate-100 rounded flex items-center justify-center font-bold text-slate-400">LOGO</div>
                    )}
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">{schoolDetails?.schoolName || 'School Name'}</h1>
                      <p className="text-slate-500 text-sm mt-1">{schoolDetails?.address || 'School Address Not Configured'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h2 className="text-3xl font-black text-slate-300 uppercase tracking-widest">Payslip</h2>
                    <p className="text-slate-600 font-semibold mt-1">{showPayslipModal.month}</p>
                  </div>
                </div>

                {/* Employee Details */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Employee Details</h3>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                      <p className="text-slate-500 text-sm mb-1">Name: <span className="text-slate-900 font-bold ml-1">{showPayslipModal.name}</span></p>
                      <p className="text-slate-500 text-sm">Role/Designation: <span className="text-slate-900 font-semibold ml-1">{showPayslipModal.role}</span></p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Payment Details</h3>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                      <p className="text-slate-500 text-sm mb-1">Status: <span className="text-emerald-600 font-bold ml-1">{showPayslipModal.status}</span></p>
                      <p className="text-slate-500 text-sm">Date: <span className="text-slate-900 font-semibold ml-1">{new Date().toLocaleDateString()}</span></p>
                    </div>
                  </div>
                </div>

                {/* Salary Breakdown Table */}
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Salary Breakdown</h3>
                <div className="border border-slate-200 rounded-lg overflow-hidden mb-8">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4 text-slate-600 font-bold w-1/2">Earnings</th>
                        <th className="py-3 px-4 text-slate-600 font-bold w-1/2 border-l border-slate-200">Deductions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-3 px-4 align-top">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-slate-700">Basic Salary</span>
                            <span className="font-semibold">₹{showPayslipModal.baseSalary.toLocaleString()}</span>
                          </div>
                          {/* Add other allowances here if needed */}
                        </td>
                        <td className="py-3 px-4 align-top border-l border-slate-200">
                          {showPayslipModal.pfCalculated > 0 && (
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-slate-700">Provident Fund (PF)</span>
                              <span className="font-semibold text-red-600">₹{showPayslipModal.pfCalculated.toLocaleString()}</span>
                            </div>
                          )}
                          {showPayslipModal.esiCalculated > 0 && (
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-slate-700">ESI</span>
                              <span className="font-semibold text-red-600">₹{showPayslipModal.esiCalculated.toLocaleString()}</span>
                            </div>
                          )}
                          {(showPayslipModal.deductions - (showPayslipModal.pfCalculated || 0) - (showPayslipModal.esiCalculated || 0)) > 0 && (
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-slate-700">Other Deductions</span>
                              <span className="font-semibold text-red-600">₹{(showPayslipModal.deductions - (showPayslipModal.pfCalculated || 0) - (showPayslipModal.esiCalculated || 0)).toLocaleString()}</span>
                            </div>
                          )}
                          {showPayslipModal.deductions === 0 && (
                            <div className="text-slate-400 text-sm italic">No deductions</div>
                          )}
                        </td>
                      </tr>
                      <tr className="bg-slate-50 border-t-2 border-slate-200">
                        <td className="py-3 px-4">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-900">Gross Earnings</span>
                            <span className="font-bold text-slate-900">₹{showPayslipModal.baseSalary.toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 border-l border-slate-200">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-900">Total Deductions</span>
                            <span className="font-bold text-red-600">₹{showPayslipModal.deductions.toLocaleString()}</span>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Net Pay & Signature */}
                <div className="flex justify-between items-end mt-12 border-t-2 border-slate-900 pt-6">
                  <div>
                    <h4 className="text-slate-500 font-semibold mb-1 uppercase tracking-widest text-sm">Net Pay</h4>
                    <p className="text-4xl font-black text-slate-900">₹{(showPayslipModal.baseSalary - showPayslipModal.deductions).toLocaleString()}</p>
                    <p className="text-slate-400 text-sm mt-2 italic">*This is a computer generated document.</p>
                  </div>
                  
                  <div className="text-center w-48">
                    {schoolDetails?.hrConfig?.authorizedSignature ? (
                      <div className="h-16 mb-2 flex items-end justify-center">
                        <img src={schoolDetails.hrConfig.authorizedSignature} alt="Authorized Signature" className="max-h-full object-contain mix-blend-multiply" />
                      </div>
                    ) : (
                      <div className="h-16 mb-2 border-b-2 border-dashed border-slate-300"></div>
                    )}
                    <p className="text-sm font-bold text-slate-800 border-t border-slate-200 pt-2">Authorized Signatory</p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState({ isOpen: false, idToDelete: null })}
        onConfirm={executeDelete}
        title="Delete Payroll Record"
        message="Are you sure you want to delete this payroll record? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
}
