import React, { useState } from 'react';
import { ShiftData, Task, TaskCategory } from '../types';
import { Check, Circle, Edit3, MessageSquare, Save, Sparkles } from 'lucide-react';
import { generateHandoverSummary } from '../services/geminiService';

interface ChecklistProps {
  shift: ShiftData;
  onToggleTask: (taskId: string) => void;
  onUpdateNotes: (notes: string) => void;
  onEndShift: () => void;
}

export const Checklist: React.FC<ChecklistProps> = ({ shift, onToggleTask, onUpdateNotes, onEndShift }) => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);

  // Group tasks by category
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
      {/* Checklist Column */}
      <div className="lg:col-span-2 flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <div>
                <h2 className="text-lg font-bold text-gray-800">{shift.type} Shift Checklist</h2>
                <p className="text-xs text-gray-500">{shift.date} • {shift.agentName}</p>
            </div>
            <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-nova-teal/10 text-nova-teal text-xs font-bold rounded-full">
                    {Math.round((shift.tasks.filter(t => t.isCompleted).length / shift.tasks.length) * 100)}% Complete
                </span>
            </div>
        </div>
        
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
            {categories.map((category) => (
                <div key={category} className="space-y-3">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                        {category}
                        <span className="h-px bg-gray-200 flex-1"></span>
                    </h3>
                    <div className="space-y-2">
                        {groupedTasks[category].map((task) => (
                            <div 
                                key={task.id} 
                                onClick={() => onToggleTask(task.id)}
                                className={`group flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                                    task.isCompleted 
                                    ? 'bg-teal-50 border-teal-100' 
                                    : 'bg-white border-gray-100 hover:border-gray-300 hover:shadow-sm'
                                }`}
                            >
                                <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                                    task.isCompleted ? 'bg-nova-teal text-white' : 'bg-gray-100 text-gray-300 group-hover:bg-gray-200'
                                }`}>
                                    {task.isCompleted ? <Check size={14} /> : <Circle size={14} className="opacity-0" />}
                                </div>
                                <span className={`text-sm flex-1 ${task.isCompleted ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
                                    {task.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* Notes & Actions Column */}
      <div className="flex flex-col gap-6">
        {/* Notes */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex-1 flex flex-col">
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Edit3 size={16} /> Shift Notes & Observations
            </h3>
            <textarea
                className="flex-1 w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-nova-teal/50 resize-none"
                placeholder="Log guest complaints, maintenance issues, or important handover info..."
                value={shift.notes}
                onChange={(e) => onUpdateNotes(e.target.value)}
            ></textarea>
        </div>

        {/* AI Handover Panel */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex-1 flex flex-col relative overflow-hidden">
             {generatedReport ? (
                 <div className="flex flex-col h-full">
                     <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                            <Sparkles size={16} className="text-purple-500" /> AI Handover Summary
                        </h3>
                        <button onClick={() => setGeneratedReport(null)} className="text-xs text-gray-500 hover:text-gray-800 underline">Reset</button>
                     </div>
                     <div className="flex-1 overflow-y-auto bg-purple-50 p-3 rounded-lg text-xs leading-relaxed text-gray-700 whitespace-pre-wrap font-medium">
                         {generatedReport}
                     </div>
                     <button className="mt-3 w-full bg-nova-teal text-white py-2 rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors">
                        Copy & End Shift
                     </button>
                 </div>
             ) : (
                 <div className="flex flex-col h-full items-center justify-center text-center space-y-4">
                     <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                        <Sparkles size={24} />
                     </div>
                     <div>
                         <h3 className="text-sm font-bold text-gray-800">Generate Handover</h3>
                         <p className="text-xs text-gray-500 mt-1 px-4">Use AI to summarize completed tasks, pending items, and notes into a professional report.</p>
                     </div>
                     <button 
                        onClick={handleGenerateReport}
                        disabled={isGeneratingReport}
                        className="w-full bg-gray-900 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                        {isGeneratingReport ? 'Generating...' : 'Create Summary'}
                     </button>
                 </div>
             )}
        </div>
      </div>
    </div>
  );
};