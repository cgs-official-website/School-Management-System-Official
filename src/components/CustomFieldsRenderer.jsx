import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';

export default function CustomFieldsRenderer({ moduleKey, customData, onChange, readOnly = false }) {
  const { userProfile } = useAuth();
  const schoolId = userProfile?.schoolId;
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (schoolId && moduleKey) {
      loadSchema();
    }
  }, [schoolId, moduleKey]);

  const loadSchema = async () => {
    try {
      const schemaRef = doc(db, `schools/${schoolId}/formSchemas`, moduleKey);
      const schemaSnap = await getDoc(schemaRef);
      if (schemaSnap.exists()) {
        setFields(schemaSnap.data().fields || []);
      } else {
        setFields([]);
      }
    } catch (error) {
      console.error(`Error loading custom fields for ${moduleKey}:`, error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-4">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  if (fields.length === 0) return null;

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2 border-b border-slate-100 pb-2">Custom Fields</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map(field => {
          const value = customData?.[field.id] || '';
          
          return (
            <div key={field.id}>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                {field.label} {field.required && !readOnly && <span className="text-red-500">*</span>}
              </label>
              
              {readOnly ? (
                <p className="text-slate-900 font-medium">
                  {field.type === 'checkbox' ? (value ? 'Yes' : 'No') : (value || 'N/A')}
                </p>
              ) : (
                <>
                  {field.type === 'text' && (
                    <input 
                      type="text" 
                      required={field.required}
                      value={value}
                      onChange={(e) => onChange(field.id, e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                    />
                  )}
                  
                  {field.type === 'number' && (
                    <input 
                      type="number" 
                      required={field.required}
                      value={value}
                      onChange={(e) => onChange(field.id, e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                    />
                  )}
                  
                  {field.type === 'email' && (
                    <input 
                      type="email" 
                      required={field.required}
                      value={value}
                      onChange={(e) => onChange(field.id, e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                    />
                  )}
                  
                  {field.type === 'date' && (
                    <input 
                      type="date" 
                      required={field.required}
                      value={value}
                      onChange={(e) => onChange(field.id, e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                    />
                  )}
                  
                  {field.type === 'select' && (
                    <select 
                      required={field.required}
                      value={value}
                      onChange={(e) => onChange(field.id, e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                    >
                      <option value="">Select...</option>
                      {(field.options || '').split(',').map((opt, idx) => (
                        <option key={idx} value={opt.trim()}>{opt.trim()}</option>
                      ))}
                    </select>
                  )}
                  
                  {field.type === 'checkbox' && (
                    <div className="flex items-center gap-2 mt-2">
                      <input 
                        type="checkbox" 
                        required={field.required}
                        checked={value === true || value === 'true'}
                        onChange={(e) => onChange(field.id, e.target.checked)}
                        className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                      />
                      <span className="text-sm text-slate-700">Yes</span>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
