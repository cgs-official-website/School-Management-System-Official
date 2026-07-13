import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSubCollection, createTransportRoute, getTransportRoutes, assignStudentToRoute } from '../../firebase/firestore';
import { LuBus as Bus, LuPlus as Plus, LuX as X, LuUsers as Users, LuPhone as Phone, LuNavigation as Navigation, LuTriangleAlert as AlertTriangle, LuCircleCheck as CheckCircle2 } from 'react-icons/lu';
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
  const [activeRouteId, setActiveRouteId] = useState(null); // For assignment

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
    if (schoolId) {
      fetchData();
    }
  }, [schoolId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [routesData, studentsData] = await Promise.all([
        getTransportRoutes(schoolId),
        getSubCollection(schoolId, 'students')
      ]);
      setRoutes(routesData);
      setStudents(studentsData);
    } catch (error) {
      console.error("Error fetching transport data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoute = async (e) => {
    e.preventDefault();
    if (!newRoute.name || !newRoute.capacity) return;
    setCreating(true);

    try {
      await createTransportRoute(schoolId, {
        ...newRoute,
        capacity: Number(newRoute.capacity)
      });
      // Refresh
      const routesData = await getTransportRoutes(schoolId);
      setRoutes(routesData);
      
      setShowCreateModal(false);
      setNewRoute({ name: '', vehicleNumber: '', driverName: '', driverPhone: '', capacity: '' });
    } catch (error) {
      console.error("Error creating route:", error);
      toast.error("Failed to create route.");
    } finally {
      setCreating(false);
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
      // Refresh to update capacities
      const [routesData, studentsData] = await Promise.all([
        getTransportRoutes(schoolId),
        getSubCollection(schoolId, 'students')
      ]);
      setRoutes(routesData);
      setStudents(studentsData);
      
      setShowAssignModal(false);
      setSelectedStudentId('');
    } catch (error) {
      console.error("Error assigning student:", error);
      toast.error("Failed to assign student.");
    } finally {
      setAssigning(false);
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
                    <h3 className="font-bold text-lg text-slate-900 leading-tight">{route.name}</h3>
                    <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                      <Bus size={20} className="text-primary-500" />
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
                <Navigation className="text-primary-600" /> New Route
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
                  {creating ? 'Creating...' : 'Create Route'}
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
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
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
    </div>
  );
}
