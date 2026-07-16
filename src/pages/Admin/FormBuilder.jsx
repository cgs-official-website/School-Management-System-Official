import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { LuPlus as Plus, LuTrash2 as Trash2, LuSave as Save, LuSettings as Settings, LuMoveUp as MoveUp, LuMoveDown as MoveDown } from 'react-icons/lu';
import toast from 'react-hot-toast';

export default function FormBuilder() {
  const { userProfile } = useAuth();
  const schoolId = userProfile?.schoolId;

  const [activeModule, setActiveModule] = useState('student_admission');
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const modules = [
    { id: 'student_admission', name: 'Student Admission' },
    { id: 'environment_setup', name: 'Environment Setup' },
  ];

  const fieldTypes = [
    { value: 'text', label: 'Text Input' },
    { value: 'number', label: 'Number Input' },
    { value: 'email', label: 'Email Input' },
    { value: 'date', label: 'Date Picker' },
    { value: 'select', label: 'Dropdown (Select)' },
    { value: 'checkbox', label: 'Checkbox' },
  ];

  useEffect(() => {
    if (schoolId && activeModule) {
      loadSchema();
    }
  }, [schoolId, activeModule]);

  const loadSchema = async () => {
    setLoading(true);
    try {
      const schemaRef = doc(db, `schools/${schoolId}/formSchemas`, activeModule);
      const schemaSnap = await getDoc(schemaRef);
      if (schemaSnap.exists()) {
        setFields(schemaSnap.data().fields || []);
      } else {
        setFields([]);
      }
    } catch (error) {
      console.error("Error loading schema:", error);
      toast.error("Failed to load form schema.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSchema = async () => {
    setSaving(true);
    try {
      const schemaRef = doc(db, `schools/${schoolId}/formSchemas`, activeModule);
      await setDoc(schemaRef, {
        fields,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      toast.success("Form schema saved successfully!");
    } catch (error) {
      console.error("Error saving schema:", error);
      toast.error("Failed to save form schema.");
    } finally {
      setSaving(false);
    }
  };

  const addField = () => {
    const newField = {
      id: `field_${Date.now()}`,
      label: 'New Field',
      type: 'text',
      required: false,
      options: '' // Comma separated for MVP
    };
    setFields([...fields, newField]);
  };

  const removeField = (id) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const updateField = (id, key, value) => {
    setFields(fields.map(f => {
      if (f.id === id) {
        return { ...f, [key]: value };
      }
      return f;
    }));
  };

  const moveField = (index, direction) => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === fields.length - 1)
    ) return;

    const newFields = [...fields];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap
    [newFields[index], newFields[swapIndex]] = [newFields[swapIndex], newFields[index]];
    setFields(newFields);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Settings className="text-primary-600" />
            Form Builder
          </h1>
          <p className="text-slate-500 mt-1">Customize fields for different modules across the system.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={activeModule}
            onChange={(e) => setActiveModule(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white shadow-sm flex-1 md:w-64"
          >
            {modules.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <button 
            onClick={handleSaveSchema}
            disabled={saving}
            className="px-6 py-2.5 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 shadow-sm disabled:opacity-50 transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <Save size={18} /> {saving ? 'Saving...' : 'Save Schema'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800">Custom Fields</h2>
          <button 
            onClick={addField}
            className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-medium hover:bg-indigo-100 transition-colors flex items-center gap-2 text-sm"
          >
            <Plus size={16} /> Add Field
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center p-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
            </div>
          ) : fields.length === 0 ? (
            <div className="text-center p-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-2xl">
              <p>No custom fields defined for this module yet.</p>
              <button 
                onClick={addField}
                className="mt-4 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
              >
                Add Your First Field
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="p-4 border border-slate-200 rounded-2xl bg-white hover:border-primary-200 transition-colors flex gap-4">
                  
                  {/* Sorting controls */}
                  <div className="flex flex-col justify-center gap-1 shrink-0 text-slate-400">
                    <button 
                      onClick={() => moveField(index, 'up')} 
                      disabled={index === 0}
                      className="p-1 hover:text-primary-600 hover:bg-primary-50 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <MoveUp size={16} />
                    </button>
                    <button 
                      onClick={() => moveField(index, 'down')}
                      disabled={index === fields.length - 1}
                      className="p-1 hover:text-primary-600 hover:bg-primary-50 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <MoveDown size={16} />
                    </button>
                  </div>

                  <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                    
                    <div className="md:col-span-4">
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Field Label</label>
                      <input 
                        type="text" 
                        value={field.label}
                        onChange={(e) => updateField(field.id, 'label', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500 text-sm"
                        placeholder="e.g. Blood Group"
                      />
                    </div>
                    
                    <div className="md:col-span-3">
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Field Type</label>
                      <select 
                        value={field.type}
                        onChange={(e) => updateField(field.id, 'type', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500 text-sm bg-white"
                      >
                        {fieldTypes.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-4">
                      {field.type === 'select' && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Options (comma separated)</label>
                          <input 
                            type="text" 
                            value={field.options}
                            onChange={(e) => updateField(field.id, 'options', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500 text-sm"
                            placeholder="e.g. A+, O+, B-"
                          />
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-1 flex items-center justify-end md:justify-center pt-6">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          checked={field.required}
                          onChange={(e) => updateField(field.id, 'required', e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-700">Required</span>
                      </label>
                    </div>

                  </div>

                  <div className="shrink-0 pt-6">
                    <button 
                      onClick={() => removeField(field.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove Field"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
