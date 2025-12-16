import React, { useState } from 'react';
import { User, ShiftType, ShiftData, ShiftAssignment } from '../types';
import { Calendar, Clock, User as UserIcon, CheckCircle2, Briefcase, ChevronLeft, ChevronRight, Plus, Trash2, Save, LayoutGrid } from 'lucide-react';

interface ShiftManagementProps {
  users: User[];
  currentShift: ShiftData;
  onAssignShift: (type: ShiftType, assignee: User) => void;
  initialAssignments: ShiftAssignment[];
  onSaveRoster: (assignments: ShiftAssignment[]) => void;
  availableShifts: string[];
}

export const ShiftManagement: React.FC<ShiftManagementProps> = ({ users, currentShift, initialAssignments, onSaveRoster, availableShifts }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'roster'>('overview');
  
  // --- Roster State ---
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Initialize assignments from props, or use mock if empty
  const [assignments, setAssignments] = useState<ShiftAssignment[]>(() => {
    if (initialAssignments && initialAssignments.length > 0) return initialAssignments;
    return [{ id: '1', date: new Date().toISOString().split('T')[0], shiftType: availableShifts[0], userId: users[0]?.id || '' }];
  });

  // --- Roster Handlers ---
  const getWeekDays = (date: Date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
    start.setDate(diff);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        days.push(d);
    }
    return days;
  };

  const weekDays = getWeekDays(currentDate);

  const handlePrevWeek = () => {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() - 7);
      setCurrentDate(newDate);
  };

  const handleNextWeek = () => {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + 7);
      setCurrentDate(newDate);
  };

  const formatDateKey = (date: Date) => date.toISOString().split('T')[0];

  const handleAddAssignment = (dateStr: string, shiftType: string, userId: string) => {
    if (!userId) return;

    setAssignments(prev => [
        ...prev, 
        { id: Date.now().toString() + Math.random().toString(), date: dateStr, shiftType, userId }
    ]);
  };

  const handleRemoveAssignment = (assignmentId: string) => {
    setAssignments(prev => prev.filter(a => a.id !== assignmentId));
  };

  // Modified to return an array of assignments
  const getAssignmentsForSlot = (dateStr: string, shiftType: string) => {
      return assignments.filter(a => a.date === dateStr && a.shiftType === shiftType);
  };

  // Calculate stats for Overview
  const completedTasks = currentShift.tasks.filter(t => t.isCompleted).length;
  const totalTasks = currentShift.tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const getShiftColor = (type: string) => {
      const lower = type.toLowerCase();
      if (lower.includes('morning')) return 'bg-orange-400';
      if (lower.includes('afternoon')) return 'bg-yellow-400';
      if (lower.includes('night')) return 'bg-indigo-400';
      return 'bg-teal-400';
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto h-[calc(100vh-140px)] flex flex-col">
      
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Briefcase className="text-nova-teal" /> Shift Management
          </h2>
          <p className="text-gray-500">Manage team roster, assign shifts, and monitor real-time operations.</p>
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'overview' ? 'bg-white text-nova-teal shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <LayoutGrid size={16} /> Live Operations
            </button>
            <button 
                onClick={() => setActiveTab('roster')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'roster' ? 'bg-white text-nova-teal shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <Calendar size={16} /> Roster Planner
            </button>
        </div>
      </div>

      {/* --- TAB: OVERVIEW (Live Operations) --- */}
      {activeTab === 'overview' && (
        <div className="space-y-6 overflow-y-auto">
             {/* Current Active Context Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700 uppercase tracking-wide text-sm flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        Currently Active Shift
                    </h3>
                    <span className="text-xs font-mono bg-white border border-gray-200 px-2 py-1 rounded text-gray-500">ID: {currentShift.id}</span>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                            <Clock size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Shift Type</p>
                            <p className="text-lg font-bold text-gray-800">{currentShift.type}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center text-purple-600">
                            <UserIcon size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Assigned Agent</p>
                            <p className="text-lg font-bold text-gray-800">{currentShift.agentName}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center text-nova-teal">
                            <CheckCircle2 size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Progress</p>
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-gray-800">{progress}%</span>
                                <span className="text-xs text-gray-400">({completedTasks}/{totalTasks})</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 border-l pl-6 border-gray-100">
                        <div>
                            <p className="text-sm text-gray-500">Occupancy</p>
                            <p className="text-2xl font-bold text-gray-800">{currentShift.occupancy}%</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center justify-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <p className="text-gray-400 text-sm">Instant assignment is currently disabled. Use the Roster Planner to schedule shifts.</p>
            </div>
        </div>
      )}

      {/* --- TAB: ROSTER PLANNING --- */}
      {activeTab === 'roster' && (
        <div className="flex flex-col flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             {/* Roster Toolbar */}
             <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50">
                 <div className="flex items-center gap-4">
                     <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                         <button onClick={handlePrevWeek} className="p-1 hover:bg-gray-100 rounded text-gray-600"><ChevronLeft size={20} /></button>
                         <div className="px-4 py-1 text-sm font-bold text-gray-800 flex items-center gap-2">
                             <Calendar size={14} className="text-nova-teal" />
                             {weekDays[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - {weekDays[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                         </div>
                         <button onClick={handleNextWeek} className="p-1 hover:bg-gray-100 rounded text-gray-600"><ChevronRight size={20} /></button>
                     </div>
                     <button 
                        onClick={() => setCurrentDate(new Date())}
                        className="text-xs font-medium text-nova-teal hover:underline"
                     >
                        Jump to Today
                     </button>
                 </div>

                 <div className="flex items-center gap-3">
                     <button 
                        onClick={() => onSaveRoster(assignments)}
                        className="bg-nova-teal text-white px-3 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-teal-700 flex items-center gap-2"
                     >
                         <Save size={16} /> Save Roster
                     </button>
                 </div>
             </div>

             {/* Roster Grid */}
             <div className="flex-1 overflow-auto">
                 <table className="w-full border-collapse">
                     <thead>
                         <tr>
                             <th className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 p-4 min-w-[150px] text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                 Shift
                             </th>
                             {weekDays.map(day => (
                                 <th key={day.toISOString()} className={`sticky top-0 z-10 bg-gray-50 border-b border-gray-200 border-l p-4 min-w-[180px] text-left ${day.toDateString() === new Date().toDateString() ? 'bg-teal-50/50' : ''}`}>
                                     <div className={`text-xs font-bold uppercase tracking-wider ${day.toDateString() === new Date().toDateString() ? 'text-nova-teal' : 'text-gray-500'}`}>
                                         {day.toLocaleDateString('en-GB', { weekday: 'short' })}
                                     </div>
                                     <div className={`text-lg font-bold ${day.toDateString() === new Date().toDateString() ? 'text-nova-teal' : 'text-gray-800'}`}>
                                         {day.getDate()}
                                     </div>
                                 </th>
                             ))}
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                         {availableShifts.map(type => (
                             <tr key={type} className="group hover:bg-gray-50/50 transition-colors">
                                 <td className="p-4 border-r border-gray-100 bg-white font-medium text-sm text-gray-700 flex items-center gap-2 h-auto">
                                     <div className={`w-1 h-8 rounded-full ${getShiftColor(type)}`}></div>
                                     {type}
                                 </td>
                                 {weekDays.map(day => {
                                     const dateStr = formatDateKey(day);
                                     const slotAssignments = getAssignmentsForSlot(dateStr, type);
                                     const isPast = day < new Date(new Date().setHours(0,0,0,0));
                                     
                                     // Filter out users already assigned to THIS slot
                                     const assignedUserIds = slotAssignments.map(a => a.userId);
                                     const availableUsers = users.filter(u => !assignedUserIds.includes(u.id));

                                     return (
                                         <td key={`${dateStr}-${type}`} className="p-2 border-l border-gray-100 relative min-h-[120px] align-top">
                                             <div className="flex flex-col gap-2 h-full">
                                                 
                                                 {/* List of Assigned Users */}
                                                 {slotAssignments.map(assignment => {
                                                     const assignedUser = users.find(u => u.id === assignment.userId);
                                                     if (!assignedUser) return null;
                                                     
                                                     return (
                                                        <div key={assignment.id} className={`relative flex flex-col gap-1 p-2 rounded-lg border shadow-sm transition-all group/card ${
                                                            assignedUser.role === 'Front Office Manager' ? 'bg-purple-50 border-purple-100' :
                                                            assignedUser.role === 'Asst. FOM' ? 'bg-blue-50 border-blue-100' :
                                                            'bg-white border-gray-200'
                                                        }`}>
                                                            <div className="flex justify-between items-start">
                                                                <div className="flex items-center gap-1.5">
                                                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${assignedUser.color.split(' ')[0].replace('bg-', 'bg-') || 'bg-gray-400'}`}>
                                                                        {assignedUser.initials}
                                                                    </div>
                                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded text-white ${getShiftColor(type)}`}>{type.substring(0, 1)}</span>
                                                                </div>
                                                                {!isPast && (
                                                                    <button 
                                                                        onClick={() => handleRemoveAssignment(assignment.id)}
                                                                        className="text-gray-300 hover:text-red-500 opacity-0 group-hover/card:opacity-100 transition-opacity"
                                                                        title="Remove assignment"
                                                                    >
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <div className="mt-1">
                                                                <p className="font-bold text-xs text-gray-800 truncate">{assignedUser.name}</p>
                                                            </div>
                                                        </div>
                                                     );
                                                 })}

                                                 {/* Add Button */}
                                                 {!isPast && availableUsers.length > 0 && (
                                                     <div className="relative group/add min-h-[32px] border border-dashed border-gray-200 rounded-lg hover:border-nova-teal/50 hover:bg-teal-50/20 transition-all flex items-center justify-center">
                                                        <select 
                                                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                                                            onChange={(e) => {
                                                                handleAddAssignment(dateStr, type, e.target.value);
                                                                e.target.value = '';
                                                            }}
                                                            value=""
                                                        >
                                                            <option value="" disabled>+ Add GSA...</option>
                                                            {availableUsers.map(u => (
                                                                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                                            ))}
                                                        </select>
                                                        <div className="flex items-center gap-1 text-gray-400 group-hover/add:text-nova-teal transition-colors">
                                                            <Plus size={14} />
                                                        </div>
                                                     </div>
                                                 )}
                                                 
                                                 {slotAssignments.length === 0 && isPast && (
                                                     <div className="h-full min-h-[60px] bg-gray-50 rounded-lg flex items-center justify-center">
                                                         <span className="text-[10px] text-gray-300 italic">Empty</span>
                                                     </div>
                                                 )}
                                             </div>
                                         </td>
                                     );
                                 })}
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
        </div>
      )}

    </div>
  );
};