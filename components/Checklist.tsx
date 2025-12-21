import React, { useState } from 'react';
import { ShiftData, Task, TaskCategory, ShiftType, UserRole } from '../types';
import { Check, Circle, Edit3, Save, Sparkles, Send, AlertCircle, CheckCircle, CheckSquare, Unlock, Clock, FileEdit, Lock, ChevronDown } from 'lucide-react';
import { generateHandoverSummary } from '../services/geminiService';

interface ChecklistProps {
  shift: ShiftData;
  availableShiftTypes: ShiftType[];
  submittedShiftsToday: string[];
  userRole: UserRole;
  onToggleTask: (taskId: string) => void;
  onUpdateNotes: (notes: string) => void;
  onShiftTypeChange: (type: ShiftType) => void;
  onSubmitShift: () => void;
  onSaveDraft: () => void;
  onReopenShift: () => void;
}

// Helper to format date to dd-mmm-yyyy
const formatToResortDate = (dateInput: Date | string) => {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return dateInput.toString();

  const day = String(date.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${day}-${month}-${year}`;
};

export const Checklist: React.FC<ChecklistProps> = ({ 
  shift, 
  availableShiftTypes, 
  submittedShiftsToday,
  userRole,
  onToggleTask, 
  onUpdateNotes, 
  onShiftTypeChange,
  onSubmitShift,
  onSaveDraft,
  onReopenShift
}) => {
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);

  const isCurrentShiftSubmitted = shift.status === 'submitted';
  const hasLocalProgress = shift.notes?.trim() || shift.tasks.some(t => t.isCompleted);
  
  // A shift is editable if it's NOT submitted
  const isEditable = !isCurrentShiftSubmitted;
  
  // Determine if it's a draft (either saved as one or explicitly set via reopen)
  const isDraftMode = shift.status === 'draft';
  
  // Dropdown is now ALWAYS enabled as per user request
  const isSwitchingLocked = false; 

  const canReopen = userRole === 'Front Office Manager' || userRole === 'Asst. FOM';

  const groupedTasks = shift.tasks.reduce((acc, task) => {
    if (!acc[task.category]) acc[task.category] = [];
    acc[task.category].push(task);
    return acc;
  }, {} as Record<TaskCategory, Task[]>);

  const categories = Object.keys(groupedTasks) as TaskCategory[];

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    const report = await generateHandoverSummary(shift);
    setGeneratedReport(report);
    setIsGeneratingReport(false);
  };

  const completionPercent = shift.tasks.length > 0 ? Math.round((shift.tasks.filter(t => t.isCompleted).length / shift.tasks.length) * 100) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)] animate-fade-in">
      <div className="lg:col-span-2 flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50">
            <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-lg font-bold text-gray-800">Shift Check List</h2>
                  <div className="flex items-center gap-2">
                      {isCurrentShiftSubmitted ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full border border-green-200 uppercase">
                          <CheckCircle size={10} /> Submitted
                        </span>
                      ) : (
                        <span className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full border uppercase ${
                          isDraftMode 
                            ? 'bg-amber-100 text-amber-700 border-amber-200 shadow-sm' 
                            : 'bg-nova-sand text-nova-dark border-orange-200'
                        }`}>
                          <Clock size={10} /> {isDraftMode ? 'Draft (Unlocked)' : (hasLocalProgress ? 'In Progress' : 'Open')}
                        </span>
                      )}
                      
                      {isCurrentShiftSubmitted && canReopen && (
                        <button 
                            onClick={onReopenShift} 
                            className="flex items-center gap-1 px-3 py-1 bg-amber-500 text-white text-[10px] font-bold rounded-full hover:bg-amber-600 uppercase transition-all shadow-md active:scale-95"
                            title="Unlock this shift for editing"
                        >
                          <Unlock size={10} /> Reopen Shift
                        </button>
                      )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative group/select">
                    <select 
                      value={shift.type}
                      onChange={(e) => onShiftTypeChange(e.target.value)}
                      className="text-xs font-bold text-nova-teal bg-white border border-gray-200 rounded px-2 py-1 pr-8 focus:outline-none focus:ring-2 focus:ring-nova-teal/20 transition-all appearance-none cursor-pointer hover:border-nova-teal/50"
                    >
                      {availableShiftTypes.map(type => (
                        <option key={type} value={type}>
                          {type} {submittedShiftsToday.includes(type) ? '✓' : ''}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-nova-teal/50">
                        <ChevronDown size={14} />
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 font-medium">Op Date: {formatToResortDate(shift.date)}</span>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Completion</p>
                  <p className="text-sm font-bold text-gray-700">{completionPercent}%</p>
                </div>
                <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-nova-teal transition-all duration-500" style={{ width: `${completionPercent}%` }}></div>
                </div>
            </div>
        </div>
        
        <div className="overflow-y-auto p-6 space-y-6 flex-1 bg-white">
            {categories.length > 0 ? categories.map((category) => (
                <div key={category} className="space-y-3">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        {category}
                        <span className="h-px bg-gray-100 flex-1"></span>
                    </h3>
                    <div className="space-y-2">
                        {groupedTasks[category].map((task) => (
                            <div 
                                key={task.id} 
                                onClick={() => isEditable && onToggleTask(task.id)}
                                className={`group flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${
                                    !isEditable ? 'cursor-default opacity-80' : 'cursor-pointer hover:border-nova-teal/30 hover:shadow-sm active:scale-[0.99]'
                                } ${task.isCompleted ? 'bg-teal-50/50 border-teal-100' : 'bg-white border-gray-100'}`}
                            >
                                <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                                    task.isCompleted ? 'bg-nova-teal text-white' : 'bg-gray-50 text-gray-300'
                                }`}>
                                    {task.isCompleted && <Check size={14} />}
                                </div>
                                <span className={`text-sm flex-1 ${task.isCompleted ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                                    {task.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-300 py-12">
                 <CheckSquare size={40} className="opacity-20 mb-2" />
                 <p className="text-sm">No tasks assigned to this shift.</p>
              </div>
            )}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex-1 flex flex-col">
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Edit3 size={16} className="text-nova-teal" /> Operations Log
            </h3>
            <textarea
                className="flex-1 w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-nova-teal/20 focus:bg-white transition-all resize-none disabled:opacity-70 disabled:grayscale-[0.5]"
                placeholder="Important observations, handover details..."
                value={shift.notes}
                onChange={(e) => onUpdateNotes(e.target.value)}
                disabled={!isEditable}
            ></textarea>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex-1 flex flex-col items-center justify-center text-center">
             {generatedReport ? (
                 <div className="flex flex-col h-full w-full">
                     <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <Sparkles size={14} className="text-purple-500" /> Handover Preview
                        </h3>
                        <button onClick={() => setGeneratedReport(null)} className="text-[10px] text-gray-400 hover:text-gray-800">Clear</button>
                     </div>
                     <div className="flex-1 overflow-y-auto bg-purple-50 p-3 rounded-lg text-[11px] leading-relaxed text-gray-600 text-left whitespace-pre-wrap border border-purple-100">
                         {generatedReport}
                     </div>
                     {isEditable && (
                        <div className="mt-4 flex flex-col gap-2">
                            <button onClick={onSaveDraft} className="w-full bg-white border border-gray-200 text-gray-600 py-2.5 rounded-xl text-xs font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
                                <FileEdit size={16} /> Save Progress
                            </button>
                            <button onClick={onSubmitShift} className="w-full bg-nova-teal text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-teal-100 hover:bg-teal-700 transition-all flex items-center justify-center gap-2">
                                <Send size={18} /> Final Submit
                            </button>
                        </div>
                     )}
                 </div>
             ) : (
                 <div className="space-y-4 w-full">
                     <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 mx-auto">
                        <Sparkles size={24} />
                     </div>
                     <div>
                         <h3 className="text-sm font-bold text-gray-800">Ready for Handover?</h3>
                         <p className="text-xs text-gray-400 mt-1 px-4">Generate an AI-powered summary for the next team.</p>
                     </div>
                     <button 
                        onClick={handleGenerateReport}
                        disabled={isGeneratingReport || !isEditable}
                        className="w-full bg-gray-900 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                     >
                        {isGeneratingReport ? 'Analysing...' : 'Draft Summary'}
                     </button>
                     
                     {isEditable && (
                       <div className="flex flex-col gap-2">
                          <button onClick={onSaveDraft} className="w-full py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
                             <FileEdit size={16} /> Save Progress
                          </button>
                          <button onClick={onSubmitShift} className="w-full py-2.5 bg-nova-teal text-white rounded-xl text-sm font-bold shadow-md hover:bg-teal-700 transition-all flex items-center justify-center gap-2">
                             <Send size={18} /> Final Submit
                          </button>
                       </div>
                     )}
                 </div>
             )}
        </div>
      </div>
    </div>
  );
};