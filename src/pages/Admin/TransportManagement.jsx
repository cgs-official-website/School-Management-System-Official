import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSubCollection, createTransportRoute, getTransportRoutes, assignStudentToRoute, subscribeToSubCollection, subscribeToTransportRoutes, updateSubDocument, deleteSubDocument } from '../../firebase/firestore';
import { doc, writeBatch, arrayRemove } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { LuBus as Bus, LuPlus as Plus, LuX as X, LuUsers as Users, LuPhone as Phone, LuNavigation as Navigation, LuTriangleAlert as AlertTriangle, LuCircleCheck as CheckCircle2 } from 'react-icons/lu';
import { Edit, Trash2, Eye, MoreVertical } from 'lucide-react';
import ConfirmModal from '../../components/ConfirmModal';
import toast from 'react-hot-toast';

export default function TransportManagement() {
  const { userProfile } = useAuth();
  const schoolId = userProfile?.schoolId;

  const [routes, setRoutes] = useState([]);
  const [students, setStudents] = useState([]); // All students to populate assign list
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [activeRouteId, setActiveRouteId] = useState(null); // For assignment
  const [selectedRouteToView, setSelectedRouteToView] = useState(null);
  const [confirmDeleteState, setConfirmDeleteState] = useState({ isOpen: false, id: null, name: '' });

  // Forms state
  const [creating, setCreating] = useState(false);
  const [newRoute, setNewRoute] = useState({
    name: '',
    vehicleNumber: '',
    driverName: '',
    driverPhone: '',
    capacity: ''
  });
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (!schoolId) return;

    setLoading(true);
    let routesUnsub, studentsUnsub;

    routesUnsub = subscribeToTransportRoutes(schoolId, (routesData) => {
      setRoutes(routesData);
      setLoading(false);
    });

    studentsUnsub = subscribeToSubCollection(schoolId, 'students', (studentsData) => {
      setStudents(studentsData);
    });

    return () => {
      if (routesUnsub) routesUnsub();
      if (studentsUnsub) studentsUnsub();
    };
  }, [schoolId]);

  const handleCreateRoute = async (e) => {
    e.preventDefault();
    if (!newRoute.name || !newRoute.capacity) return;
    setCreating(true);

    try {
      if (newRoute.id) {
        await updateSubDocument(schoolId, 'transportRoutes', newRoute.id, {
          ...newRoute,
          capacity: Number(newRoute.capacity)
        });
        toast.success("Route updated successfully!");
      } else {
        await createTransportRoute(schoolId, {
          ...newRoute,
          capacity: Number(newRoute.capacity)
        });
        toast.success("Route created successfully!");
      }
      
      setShowCreateModal(false);
      setNewRoute({ name: '', vehicleNumber: '', driverName: '', driverPhone: '', capacity: '' });
    } catch (error) {
      console.error("Error saving route:", error);
      toast.error("Failed to save route.");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteRoute = async () => {
    if (!confirmDeleteState.id) return;
    try {
      await deleteSubDocument(schoolId, 'transportRoutes', confirmDeleteState.id);
      toast.success("Route deleted successfully");
      setConfirmDeleteState({ isOpen: false, id: null, name: '' });
    } catch (error) {
      console.error("Error deleting route:", error);
      toast.error("Failed to delete route");
    }
  };

  const handleAssignStudent = async (e) => {
    e.preventDefault();
    if (!activeRouteId || !selectedStudentId) return;
    
    // Capacity Check
    const route = routes.find(r => r.id === activeRouteId);
    if (!route) return;
    
    if (route.assignedStudents?.length >= route.capacity) {
      toast.error("Cannot assign student. This bus has reached its maximum capacity!");
      return;
    }

    setAssigning(true);
    try {
      await assignStudentToRoute(schoolId, activeRouteId, selectedStudentId);
      // Refresh handled by listener
      
      setShowAssignModal(false);
      setSelectedStudentId('');
    } catch (error) {
      console.error("Error assigning student:", error);
      toast.error("Failed to assign student.");
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassignStudent = async (routeId, studentId) => {
    if (!schoolId || !routeId || !studentId) return;
    try {
      const batch = writeBatch(db);
      
      const routeRef = doc(db, `schools/${schoolId}/transportRoutes`, routeId);
      batch.update(routeRef, {
        assignedStudents: arrayRemove(studentId)
      });

      // Try updating student, but if they are deleted, it doesn't matter much (will just silently fail or we ignore)
      const studentRef = doc(db, `schools/${schoolId}/students`, studentId);
      batch.update(studentRef, {
        transportRouteId: null
      });

      await batch.commit();
      
      // Update selected route view state to reflect changes immediately
      setSelectedRouteToView(prev => ({
        ...prev,
        assignedStudents: prev.assignedStudents.filter(id => id !== studentId)
      }));
      
      toast.success("Student unassigned successfully");
    } catch (error) {
      console.error("Error unassigning student:", error);
      toast.error("Failed to unassign student");
    }
  };

  // Helper to open assign modal with context
  const openAssignModal = (routeId) => {
    setActiveRouteId(routeId);
    setShowAssignModal(true);
  };

  // Get unassigned students for the dropdown
  const unassignedStudents = students.filter(s => !s.transportRouteId);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto pb-24">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Transport Management</h1>
          <p className="text-slate-500 mt-1">Manage bus routes, drivers, and student assignments.</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 shadow-sm flex items-center gap-2 transition-colors"
        >
          <Plus size={18} /> Add New Route
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {routes.length === 0 ? (
          <div className="col-span-full bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500">
            <Bus size={64} className="mx-auto mb-4 text-slate-300" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Routes Found</h3>
            <p>Create your first transport route to begin assigning students.</p>
          </div>
        ) : (
          routes.map(route => {
            const currentCount = route.assignedStudents?.length || 0;
            const isFull = currentCount >= route.capacity;
            const percentage = Math.round((currentCount / route.capacity) * 100) || 0;

            return (
              <div key={route.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-lg text-slate-900 leading-tight pr-4 truncate">{route.name}</h3>
                    <div className="flex items-center gap-1 shrink-0">
                      <button 
                        onClick={() => { setSelectedRouteToView(route); setShowViewModal(true); }}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye size={18} />
                      </button>
                      <button 
                        onClick={() => { setNewRoute(route); setShowCreateModal(true); }}
                        className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Edit Route"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => setConfirmDeleteState({ isOpen: true, id: route.id, name: route.name })}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Route"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-200/50 text-slate-700 rounded-lg text-xs font-mono font-bold tracking-wide">
                    {route.vehicleNumber}
                  </div>
                </div>

                <div className="p-6 flex-1 space-y-4">
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <Users size={16} className="text-slate-500" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-semibold text-slate-900 truncate">{route.driverName || 'No Driver Assigned'}</p>
                      <p className="text-xs truncate flex items-center gap-1"><Phone size={10}/> {route.driverPhone || 'N/A'}</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Capacity</span>
                      <span className={`font-bold text-sm ${isFull ? 'text-red-600' : 'text-slate-900'}`}>
                        {currentCount} / {route.capacity}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${isFull ? 'bg-red-500' : percentage > 80 ? 'bg-amber-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 mt-auto">
                  <button 
                    onClick={() => openAssignModal(route.id)}
                    disabled={isFull}
                    className="w-full py-2.5 bg-white text-slate-700 hover:text-primary-700 hover:bg-primary-50 border border-slate-200 hover:border-primary-200 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isFull ? <><AlertTriangle size={16}/> Bus Full</> : <><Plus size={16}/> Assign Student</>}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Route Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Navigation className="text-primary-600" /> {newRoute.id ? 'Edit Route' : 'New Route'}
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateRoute} className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
              <div className="p-6 space-y-6 flex-1">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Route Name</label>
                  <input 
                    type="text" required
                    value={newRoute.name}
                    onChange={(e) => setNewRoute({...newRoute, name: e.target.value})}
                    placeholder="e.g. North City Loop"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Vehicle No.</label>
                    <input 
                      type="text" required
                      value={newRoute.vehicleNumber}
                      onChange={(e) => setNewRoute({...newRoute, vehicleNumber: e.target.value})}
                      placeholder="e.g. BUS-12"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Capacity</label>
                    <input 
                      type="number" min="1" required
                      value={newRoute.capacity}
                      onChange={(e) => setNewRoute({...newRoute, capacity: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Driver Name</label>
                    <input 
                      type="text" required
                      value={newRoute.driverName}
                      onChange={(e) => setNewRoute({...newRoute, driverName: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Driver Phone</label>
                    <input 
                      type="tel" required
                      value={newRoute.driverPhone}
                      onChange={(e) => setNewRoute({...newRoute, driverPhone: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={creating}
                  className="px-6 py-2.5 bg-primary-600 text-white font-bold hover:bg-primary-700 rounded-xl shadow-sm transition-colors"
                >
                  {creating ? 'Saving...' : (newRoute.id ? 'Save Changes' : 'Create Route')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Student Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Users className="text-primary-600" /> Assign Student
              </h2>
              <button onClick={() => setShowAssignModal(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAssignStudent} className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
              <div className="p-6 space-y-6 flex-1">
                <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Select Student</label>
                  <select 
                    required
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white appearance-none pr-10 cursor-pointer"
                    style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg fill="none" viewBox="0 0 24 24" stroke="%2364748B" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.2em' }}
                  >
                    <option value="">Choose an unassigned student...</option>
                    {unassignedStudents.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.firstName} {s.lastName} (ID: {s.admissionNumber})
                      </option>
                    ))}
                  </select>
                  {unassignedStudents.length === 0 && (
                    <p className="text-amber-600 text-sm mt-2 flex items-center gap-1">
                      <AlertTriangle size={14}/> All students are currently assigned to routes.
                    </p>
                  )}
                </div>
              </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={assigning || unassignedStudents.length === 0}
                  className="px-6 py-2.5 bg-primary-600 text-white font-bold hover:bg-primary-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
                >
                  {assigning ? 'Assigning...' : 'Assign to Route'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Route Modal */}
      {showViewModal && selectedRouteToView && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Bus className="text-indigo-600" />
                Route Details
              </h2>
              <button onClick={() => setShowViewModal(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Route Name</label>
                <p className="text-slate-900 font-semibold">{selectedRouteToView.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Vehicle No.</label>
                  <p className="text-slate-900 font-mono font-semibold">{selectedRouteToView.vehicleNumber}</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Capacity</label>
                  <p className="text-slate-900 font-semibold">
                    {selectedRouteToView.assignedStudents?.length || 0} / {selectedRouteToView.capacity}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Driver Name</label>
                  <p className="text-slate-900 font-semibold">{selectedRouteToView.driverName || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Driver Phone</label>
                  <p className="text-slate-900 font-semibold">{selectedRouteToView.driverPhone || 'N/A'}</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Assigned Students</label>
                {selectedRouteToView.assignedStudents?.length > 0 ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                    <ul className="divide-y divide-slate-100 max-h-48 overflow-y-auto custom-scrollbar">
                      {selectedRouteToView.assignedStudents.map((s, idx) => {
                        const sId = typeof s === 'object' ? (s.id || s.studentId) : String(s);
                        const studentData = students.find(st => String(st.id) === String(sId));
                        
                        let displayName = sId;
                        if (studentData) {
                          const fullName = `${studentData.firstName || ''} ${studentData.lastName || ''}`.trim();
                          displayName = fullName || studentData.name || 'Unnamed Student';
                        } else {
                          displayName = `Student ID: ${sId}`;
                        }

                        return (
                          <li key={idx} className="p-3 text-sm text-slate-700 flex justify-between items-center hover:bg-slate-100 transition-colors">
                            <span className="font-medium">{displayName}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-slate-400 font-mono">{studentData?.admissionNumber || 'N/A'}</span>
                              <button 
                                onClick={() => handleUnassignStudent(selectedRouteToView.id, sId)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Unassign Student"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic p-3 bg-slate-50 rounded-xl border border-slate-200">No students assigned to this route yet.</p>
                )}
              </div>
            </div>
            
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button onClick={() => setShowViewModal(false)} className="px-6 py-2 bg-slate-200 text-slate-700 font-bold hover:bg-slate-300 rounded-xl transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={confirmDeleteState.isOpen}
        onClose={() => setConfirmDeleteState({ isOpen: false, id: null, name: '' })}
        onConfirm={handleDeleteRoute}
        title="Delete Route"
        message={`Are you sure you want to delete the route "${confirmDeleteState.name}"? This will unassign all students currently on this route. This action cannot be undone.`}
        confirmText="Delete Route"
      />
    </div>
  );
}
