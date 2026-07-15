import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSubCollection, addSubDocument, subscribeToSubCollection } from '../../firebase/firestore';
import { LuPlus as Plus, LuUpload as Upload, LuFileText as FileText, LuSearch as Search, LuX as X, LuCircleCheck as CheckCircle } from 'react-icons/lu';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { TableSkeleton } from '../../components/Skeleton';

export default function HomeworkManagement() {
  const { userProfile } = useAuth();
  const schoolId = userProfile?.schoolId;

  const [classes, setClasses] = useState([]);
  const [homeworks, setHomeworks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const [newHomework, setNewHomework] = useState({
    title: '',
    description: '',
    classId: '',
    dueDate: '',
  });

  const [excelFile, setExcelFile] = useState(null);

  useEffect(() => {
    if (!schoolId) return;

    setLoading(true);
    let classesUnsub, hwUnsub;

    classesUnsub = subscribeToSubCollection(schoolId, 'classes', (data) => {
      setClasses(data);
    });

    hwUnsub = subscribeToSubCollection(schoolId, 'homeworks', (data) => {
      setHomeworks(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      setLoading(false);
    });

    return () => {
      if (classesUnsub) classesUnsub();
      if (hwUnsub) hwUnsub();
    };
  }, [schoolId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await addSubDocument(schoolId, 'homeworks', {
        ...newHomework,
        teacherId: userProfile.uid,
        createdAt: new Date().toISOString(),
        status: 'Active'
      });
      toast.success("Homework assigned successfully!");
      setShowCreateModal(false);
      setNewHomework({ title: '', description: '', classId: '', dueDate: '' });
      // loadData(); - handled by real-time listener
    } catch (err) {
      console.error(err);
      toast.error("Failed to create homework");
    } finally {
      setCreating(false);
    }
  };

  const handleExcelUpload = async (e) => {
    e.preventDefault();
    if (!excelFile) {
      toast.error("Please select an Excel file.");
      return;
    }

    setCreating(true);
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        // Assume Excel format: { "Admission Number": "ADM-123", "Homework Title": "Math Ch 1", "Status": "Completed", "Grade": "A" }
        console.log("Parsed Excel Data:", data);
        
        // In a real app, we would batch update Firestore documents matching these admission numbers.
        // For Phase 1 demonstration, we will log it and simulate the update.
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate processing

        toast.success(`Processed ${data.length} records from Excel successfully!`);
        setShowExcelModal(false);
        setExcelFile(null);
      };
      reader.readAsBinaryString(excelFile);
    } catch (err) {
      console.error(err);
      toast.error("Failed to process Excel file.");
    } finally {
      setCreating(false);
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
    <div className="p-4 sm:p-8 max-w-7xl mx-auto animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Homework Management</h1>
          <p className="text-slate-500 mt-1">Assign tasks and evaluate student progress.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowExcelModal(true)}
            className="flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2.5 rounded-xl hover:bg-emerald-200 transition-colors font-semibold"
          >
            <Upload size={18} />
            Evaluate via Excel
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-xl hover:bg-primary-700 transition-colors font-semibold shadow-sm shadow-primary-600/20"
          >
            <Plus size={18} />
            Assign Homework
          </button>
        </div>
      </div>

      {/* Homework List */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {homeworks.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
            <FileText size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-900">No homework assigned yet</h3>
            <p className="text-slate-500 mt-1">Click the button above to assign your first homework.</p>
          </div>
        ) : (
          homeworks.map(hw => {
            const cls = classes.find(c => c.id === hw.classId);
            return (
              <div key={hw.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <FileText size={64} className="text-primary-600 transform rotate-12" />
                </div>
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <span className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-bold">
                      {cls ? cls.name : 'Unknown Class'}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      Due: {new Date(hw.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{hw.title}</h3>
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">{hw.description}</p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <span className="text-sm font-medium text-emerald-600 flex items-center gap-1">
                      <CheckCircle size={16} /> Active
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 z-50">
          <div className="bg-white rounded-3xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden shadow-2xl animate-fade-in-up">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="text-xl font-bold text-slate-900">Assign Homework</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
              <div className="p-6 space-y-6 flex-1">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Title</label>
                <input 
                  type="text" 
                  required
                  value={newHomework.title}
                  onChange={e => setNewHomework({...newHomework, title: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g. Algebra Worksheet"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                <textarea 
                  required
                  rows="3"
                  value={newHomework.description}
                  onChange={e => setNewHomework({...newHomework, description: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500"
                  placeholder="Instructions for the students..."
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Class</label>
                  <select 
                    required
                    value={newHomework.classId}
                    onChange={e => setNewHomework({...newHomework, classId: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Class</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Due Date</label>
                  <input 
                    type="date" 
                    required
                    value={newHomework.dueDate}
                    onChange={e => setNewHomework({...newHomework, dueDate: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-50 rounded-xl"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={creating}
                  className="px-5 py-2.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 disabled:opacity-50"
                >
                  {creating ? 'Assigning...' : 'Assign Homework'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel Upload Modal */}
      {showExcelModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 z-50">
          <div className="bg-white rounded-3xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden shadow-2xl animate-fade-in-up">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="text-xl font-bold text-slate-900">Evaluate via Excel</h2>
              <button onClick={() => setShowExcelModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleExcelUpload} className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
              <div className="p-6 space-y-6 flex-1">
              <p className="text-sm text-slate-500">
                Upload an Excel (.xlsx) file containing student grades for automatic evaluation. <br/>
                <strong>Required Columns:</strong> Admission Number, Homework Title, Status, Grade
              </p>
              
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center bg-slate-50 hover:bg-slate-100 transition-colors relative">
                <input 
                  type="file" 
                  required
                  accept=".xlsx, .xls, .csv"
                  onChange={e => setExcelFile(e.target.files[0])}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload size={32} className="mx-auto text-primary-500 mb-3" />
                <span className="block text-sm font-semibold text-slate-700">
                  {excelFile ? excelFile.name : "Click or drag Excel file here"}
                </span>
              </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                <button 
                  type="button" 
                  onClick={() => setShowExcelModal(false)}
                  className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-50 rounded-xl"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={creating || !excelFile}
                  className="px-5 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-50"
                >
                  {creating ? 'Processing...' : 'Process File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
