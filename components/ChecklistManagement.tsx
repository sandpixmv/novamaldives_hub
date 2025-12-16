import React, { useState } from 'react';
import { TaskTemplate, ShiftType, TaskCategory } from '../types';
import { Plus, Trash2, ListChecks, Filter, CheckSquare, Save, X, Settings, Layers, Clock } from 'lucide-react';

interface ChecklistManagementProps {
  templates: TaskTemplate[];
  availableShifts: ShiftType[];
  availableCategories: TaskCategory[];
  onAddTemplate: (template: Omit<TaskTemplate, 'id'>) => void;
  onDeleteTemplate: (id: string) => void;
  onAddShift: (shift: string) => void;
  onDeleteShift: (shift: string) => void;
  onAddCategory: (category: string) => void;
  onDeleteCategory: (category: string) => void;
}

export const ChecklistManagement: React.FC<ChecklistManagementProps> = ({ 
    templates, 
    availableShifts,
    availableCategories,
    onAddTemplate, 
    onDeleteTemplate,
    onAddShift,
    onDeleteShift,
    onAddCategory,
    onDeleteCategory
}) => {
  const [activeTab, setActiveTab] = useState<'tasks' | 'config'>('tasks');
  const [filterShift, setFilterShift] = useState<ShiftType | 'ALL'>('ALL');
  const [isAdding, setIsAdding] = useState(false);

  // Task Form State
  const [newLabel, setNewLabel] = useState('');
  const [newCategory, setNewCategory] = useState<TaskCategory>(availableCategories[0] || '');
  const [newShiftType, setNewShiftType] = useState<ShiftType | 'ALL'>('ALL');

  // Config Form State
  const [newItemName, setNewItemName] = useState('');

  const filteredTemplates = templates.filter(t => 
    filterShift === 'ALL' ? true : t.shiftType === filterShift || t.shiftType === 'ALL'
  );

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;

    onAddTemplate({
      label: newLabel,
      category: newCategory,
      shiftType: newShiftType
    });

    setNewLabel('');
    setIsAdding(false);
  };

  const handleConfigSubmit = (type: 'shift' | 'category') => {
      if (!newItemName.trim()) return;
      if (type === 'shift') onAddShift(newItemName);
      else onAddCategory(newItemName);
      setNewItemName('');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto h-[calc(100vh-140px)] flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ListChecks className="text-nova-teal" /> Checklist Manager
          </h2>
          <p className="text-gray-500">Customize tasks, shift definitions, and operational categories.</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
                onClick={() => setActiveTab('tasks')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'tasks' ? 'bg-white text-nova-teal shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <ListChecks size={16} /> Manage Tasks
            </button>
            <button 
                onClick={() => setActiveTab('config')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'config' ? 'bg-white text-nova-teal shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <Settings size={16} /> Manage Definitions
            </button>
        </div>
      </div>

      {activeTab === 'tasks' && (
        <>
            <div className="flex justify-end">
                <button 
                    onClick={() => setIsAdding(true)}
                    className="bg-nova-teal text-white px-4 py-2 rounded-lg font-medium shadow-lg hover:bg-teal-700 transition-all flex items-center gap-2"
                >
                    <Plus size={20} />
                    Add New Task
                </button>
            </div>

            {isAdding && (
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 animate-slide-down">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800">Create New Task Template</h3>
                    <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                </div>
                
                <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-6">
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Task Description</label>
                        <input 
                            type="text" 
                            value={newLabel}
                            onChange={(e) => setNewLabel(e.target.value)}
                            placeholder="e.g. Verify petty cash balance"
                            className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-nova-teal text-sm"
                            autoFocus
                        />
                    </div>
                    <div className="md:col-span-3">
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Category</label>
                        <select 
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-nova-teal text-sm bg-white"
                        >
                            {availableCategories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Shift</label>
                        <select 
                            value={newShiftType}
                            onChange={(e) => setNewShiftType(e.target.value)}
                            className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-nova-teal text-sm bg-white"
                        >
                            <option value="ALL">All Shifts</option>
                            {availableShifts.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                    <div className="md:col-span-1">
                        <button type="submit" className="w-full p-2.5 bg-nova-teal text-white rounded-lg hover:bg-teal-700 flex justify-center items-center">
                            <Save size={18} />
                        </button>
                    </div>
                </form>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 flex flex-col overflow-hidden">
                {/* Filter Tabs */}
                <div className="border-b border-gray-100 flex overflow-x-auto">
                    <button 
                        onClick={() => setFilterShift('ALL')}
                        className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${filterShift === 'ALL' ? 'border-nova-teal text-nova-teal' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <Filter size={16} /> All Tasks
                    </button>
                    {availableShifts.map(shift => (
                        <button 
                            key={shift}
                            onClick={() => setFilterShift(shift)}
                            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${filterShift === shift ? 'border-nova-teal text-nova-teal' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            {filterShift === shift ? <CheckSquare size={14} /> : <div className="w-2 h-2 rounded-full bg-gray-300" />} {shift}
                        </button>
                    ))}
                </div>

                {/* Task List */}
                <div className="flex-1 overflow-y-auto">
                    {filteredTemplates.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                            <ListChecks size={48} className="mb-2 opacity-20" />
                            <p>No tasks found for this filter.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {filteredTemplates.map(template => (
                                <div key={template.id} className="p-4 hover:bg-gray-50 flex items-center justify-between group transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-lg ${
                                            template.shiftType === 'ALL' ? 'bg-gray-100 text-gray-500' : 'bg-teal-50 text-nova-teal'
                                        }`}>
                                            <CheckSquare size={18} />
                                        </div>
                                        <div>
                                            <p className="text-gray-800 font-medium">{template.label}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs text-gray-400 bg-white border border-gray-200 px-1.5 rounded">{template.category}</span>
                                                {template.shiftType === 'ALL' ? 
                                                    <span className="text-[10px] font-bold text-nova-teal uppercase tracking-wide">Every Shift</span> :
                                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{template.shiftType}</span>
                                                }
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => onDeleteTemplate(template.id)}
                                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                        title="Delete Template"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
      )}

      {activeTab === 'config' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full overflow-y-auto">
              
              {/* Shift Definitions */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full">
                  <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                      <h3 className="font-bold text-gray-800 flex items-center gap-2"><Clock size={18} className="text-gray-500"/> Shift Types</h3>
                  </div>
                  <div className="p-4 border-b border-gray-100">
                      <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="New shift name (e.g. Sunset)"
                            className="flex-1 p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-nova-teal"
                            value={newItemName} // Shared state, risky if user switches quickly but ok for MVP
                            onChange={(e) => setNewItemName(e.target.value)}
                          />
                          <button 
                            onClick={() => handleConfigSubmit('shift')}
                            className="bg-nova-teal text-white p-2 rounded-lg hover:bg-teal-700"
                          >
                              <Plus size={20} />
                          </button>
                      </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2">
                      {availableShifts.map(shift => (
                          <div key={shift} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg group">
                              <span className="text-gray-700 font-medium">{shift}</span>
                              <button 
                                onClick={() => onDeleteShift(shift)}
                                className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Delete Shift"
                              >
                                  <Trash2 size={16} />
                              </button>
                          </div>
                      ))}
                  </div>
              </div>

              {/* Category Definitions */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full">
                  <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                      <h3 className="font-bold text-gray-800 flex items-center gap-2"><Layers size={18} className="text-gray-500"/> Task Categories</h3>
                  </div>
                  <div className="p-4 border-b border-gray-100">
                      <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="New category name..."
                            className="flex-1 p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-nova-teal"
                            // Reuse state for simplicity in this snippet, ideally split
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                          />
                          <button 
                            onClick={() => handleConfigSubmit('category')}
                            className="bg-nova-teal text-white p-2 rounded-lg hover:bg-teal-700"
                          >
                              <Plus size={20} />
                          </button>
                      </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2">
                      {availableCategories.map(cat => (
                          <div key={cat} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg group">
                              <span className="text-gray-700 font-medium">{cat}</span>
                              <button 
                                onClick={() => onDeleteCategory(cat)}
                                className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Delete Category"
                              >
                                  <Trash2 size={16} />
                              </button>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
