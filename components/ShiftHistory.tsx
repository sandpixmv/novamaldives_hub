import React, { useState, useEffect } from 'react';
import { ShiftData, Task } from '../types';
import { Calendar, Clock, CheckCircle2, XCircle, Eye, X, Search, FileText } from 'lucide-react';

export const ShiftHistory: React.FC = () => {
    const [history, setHistory] = useState<ShiftData[]>([]);
    const [selectedShift, setSelectedShift] = useState<ShiftData | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        // Generate mock data for last 15 days
        const data: ShiftData[] = [];
        const shifts = ['Morning', 'Afternoon', 'Night'];
        // Updated FOM to Ahmed Ihsaan
        const agents = ['Ahmed Ihsaan', 'Michael Chen', 'Ahmed R.', 'Fatima L.', 'John D.'];
        const categories = ['Front Desk Operations', 'Lobby & Ambiance', 'Back Office', 'Guest Relations'];
        
        const today = new Date();
        
        for (let i = 0; i < 15; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateStr = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
            
            shifts.forEach((shiftType, index) => {
                // Skip future shifts if today
                if (i === 0 && index > 1) return; 

                const isCompleted = Math.random() > 0.1; // Most are completed
                const taskCount = 12; // Fewer items for mock
                const tasks: Task[] = Array.from({ length: taskCount }).map((_, tIndex) => ({
                    id: `h-${i}-${index}-${tIndex}`,
                    label: `Standard Task ${tIndex + 1}: ${['Verify Logbook', 'Check Cash Balance', 'Guest Call Follow-up', 'Arrivals Report Generation', 'Lobby Cleanliness Check'][tIndex % 5]}`,
                    category: categories[tIndex % categories.length],
                    isCompleted: isCompleted ? (Math.random() > 0.1) : (Math.random() > 0.6),
                    notes: ''
                }));

                data.push({
                    id: `hist-${i}-${index}`,
                    type: shiftType,
                    date: dateStr,
                    tasks: tasks,
                    status: isCompleted ? 'completed' : 'active',
                    agentName: agents[Math.floor(Math.random() * agents.length)],
                    occupancy: 60 + Math.floor(Math.random() * 35),
                    notes: Math.random() > 0.7 ? "Routine shift. No major incidents reported." : "Guest requested room move in 105. Handled."
                });
            });
        }
        setHistory(data);
    }, []);

    const filteredHistory = history.filter(h => 
        h.agentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.date.includes(searchTerm) ||
        h.type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fade-in max-w-6xl mx-auto h-[calc(100vh-140px)] flex flex-col">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Calendar className="text-nova-teal" /> Shift History
                    </h2>
                    <p className="text-gray-500">Archive of checklists and operational reports for the last 15 days.</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search date, agent, or shift..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-nova-teal w-full md:w-64"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 overflow-hidden flex flex-col">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 font-medium">Date</th>
                                <th className="px-6 py-4 font-medium">Shift</th>
                                <th className="px-6 py-4 font-medium">Agent</th>
                                <th className="px-6 py-4 font-medium text-center">Occupancy</th>
                                <th className="px-6 py-4 font-medium">Completion</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredHistory.map((shift) => {
                                const completedCount = shift.tasks.filter(t => t.isCompleted).length;
                                const percentage = Math.round((completedCount / shift.tasks.length) * 100);
                                return (
                                    <tr key={shift.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-6 py-4 text-gray-600 font-medium">{shift.date}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                                                shift.type === 'Morning' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                                shift.type === 'Afternoon' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                                                'bg-indigo-50 text-indigo-600 border-indigo-100'
                                            }`}>
                                                <Clock size={12} />
                                                {shift.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
                                                {shift.agentName.charAt(0)}
                                            </div>
                                            <span className="text-gray-800">{shift.agentName}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center text-gray-600">{shift.occupancy}%</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 w-24 bg-gray-100 rounded-full h-1.5">
                                                    <div className={`h-1.5 rounded-full ${percentage === 100 ? 'bg-green-500' : 'bg-nova-teal'}`} style={{width: `${percentage}%`}}></div>
                                                </div>
                                                <span className="text-xs font-medium text-gray-500">{percentage}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => setSelectedShift(shift)}
                                                className="text-nova-teal hover:text-teal-700 font-medium text-sm flex items-center gap-1 justify-end opacity-80 hover:opacity-100"
                                            >
                                                <Eye size={16} /> View
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Detail View */}
            {selectedShift && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-down">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    {selectedShift.type} Shift Record
                                    {selectedShift.status === 'completed' && <CheckCircle2 size={18} className="text-green-500" />}
                                </h3>
                                <p className="text-sm text-gray-500">{selectedShift.date} • {selectedShift.agentName}</p>
                            </div>
                            <button onClick={() => setSelectedShift(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Tasks List */}
                                <div className="md:col-span-2 space-y-6">
                                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                        <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                                            <FileText size={18} /> Checklist Details
                                        </h4>
                                        <div className="space-y-1">
                                            {selectedShift.tasks.map((task) => (
                                                <div key={task.id} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg">
                                                    {task.isCompleted ? (
                                                        <CheckCircle2 size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                                                    ) : (
                                                        <XCircle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
                                                    )}
                                                    <div>
                                                        <p className={`text-sm ${task.isCompleted ? 'text-gray-700' : 'text-gray-400'}`}>{task.label}</p>
                                                        <span className="text-[10px] text-gray-400 uppercase tracking-wide bg-gray-100 px-1.5 rounded">{task.category}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Sidebar Info */}
                                <div className="space-y-6">
                                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Shift Summary</h4>
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-sm text-gray-500">Occupancy</p>
                                                <p className="text-xl font-bold text-gray-800">{selectedShift.occupancy}%</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Tasks Completed</p>
                                                <p className="text-xl font-bold text-gray-800">
                                                    {selectedShift.tasks.filter(t => t.isCompleted).length} / {selectedShift.tasks.length}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Performance</p>
                                                <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
                                                    <div 
                                                        className="bg-nova-teal h-2 rounded-full" 
                                                        style={{width: `${Math.round((selectedShift.tasks.filter(t => t.isCompleted).length / selectedShift.tasks.length) * 100)}%`}}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Agent Notes</h4>
                                        <p className="text-sm text-gray-600 italic leading-relaxed">
                                            "{selectedShift.notes || 'No notes provided for this shift.'}"
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};