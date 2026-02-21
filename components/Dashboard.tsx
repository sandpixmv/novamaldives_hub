import React, { useState, useEffect } from 'react';
import { ShiftData, ShiftType, User, DailyOccupancy, GuestRequest } from '../types';
import { CheckCircle2, Clock, AlertCircle, ArrowRight, Sun, CalendarCheck, BarChart3, BellRing, RefreshCw, Wifi } from 'lucide-react';
import { getSmartTaskSuggestion } from '../services/geminiService';

interface DashboardProps {
  currentShift: ShiftData;
  startNewShift: (type: ShiftType, assignee?: User) => void;
  openChecklist: () => void;
  users: User[];
  currentUser: User | null;
  availableShifts: string[];
  occupancyData: DailyOccupancy[];
  guestRequests: GuestRequest[];
  onShiftTypeChange?: (type: string) => void;
  onOpenView?: (view: string) => void;
  isSyncing?: boolean;
  lastUpdated?: Date;
  onRefresh?: () => void;
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

export const Dashboard: React.FC<DashboardProps> = ({ 
  currentShift, 
  openChecklist, 
  occupancyData, 
  availableShifts, 
  guestRequests, 
  onShiftTypeChange, 
  onOpenView,
  isSyncing = false,
  lastUpdated = new Date(),
  onRefresh
}) => {
  const [suggestion, setSuggestion] = useState<string>("Loading smart suggestion...");
  
  const completedTasks = currentShift.tasks.filter(t => t.isCompleted).length;
  const totalTasks = currentShift.tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Guest Request Stats for Today
  const today = new Date().toISOString().split('T')[0];
  const todayRequests = guestRequests.filter(r => r.createdAt.startsWith(today) && r.status !== 'Cancelled');
  
  const pendingRequests = todayRequests.filter(r => r.status === 'Pending' || r.status === 'In Progress');
  const completedRequests = todayRequests.filter(r => r.status === 'Completed');
  
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const overdueCount = todayRequests.filter(r => 
    r.status !== 'Completed' && 
    new Date(r.createdAt) < tenMinutesAgo
  ).length;

  useEffect(() => {
     getSmartTaskSuggestion("Sunny, 29°C", currentShift.type).then(setSuggestion);
  }, [currentShift.type]);

  const getPriorityColor = (p: string) => {
    switch(p) {
        case 'High': return 'text-red-600 bg-red-50 border-red-100';
        case 'Medium': return 'text-orange-600 bg-orange-50 border-orange-100';
        default: return 'text-green-600 bg-green-50 border-green-100';
    }
  };

  const getStatusColor = (s: string) => {
    switch(s) {
        case 'Completed': return 'bg-green-100 text-green-700';
        case 'In Progress': return 'bg-blue-100 text-blue-700';
        case 'Cancelled': return 'bg-gray-100 text-gray-500';
        default: return 'bg-yellow-100 text-yellow-700';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-8">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">The HUB Dashboard</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-gray-500 flex items-center gap-2 text-sm">
              <CalendarCheck size={16} className="text-nova-teal" />
              {formatToResortDate(new Date())}
            </p>
            <div className="h-1 w-1 rounded-full bg-gray-300"></div>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-green-500'}`}></div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                {isSyncing ? 'Syncing...' : 'Live Sync Active'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block mr-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Last Updated</p>
            <p className="text-xs font-medium text-gray-600">{lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
          </div>
          <button 
            onClick={onRefresh}
            disabled={isSyncing}
            className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-nova-teal hover:border-nova-teal transition-all shadow-sm disabled:opacity-50"
            title="Manual Refresh"
          >
            <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
          </button>
          <div className="bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="p-2 bg-nova-sand/50 rounded-lg">
              <Sun size={20} className="text-nova-accent" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase">Weather</p>
              <p className="text-sm font-bold text-gray-800">Sunny, 29°C</p>
            </div>
          </div>
        </div>
      </div>

      {/* Guest Request Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
          <p className="text-xs font-bold text-gray-400 uppercase mb-1">Total Today</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-bold text-gray-800">{todayRequests.length}</h3>
            <div className="p-2 bg-gray-50 rounded-lg text-gray-400">
              <BellRing size={20} />
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
          <p className="text-xs font-bold text-yellow-500 uppercase mb-1">Pending & In-Progress</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-bold text-gray-800">{pendingRequests.length}</h3>
            <div className="p-2 bg-yellow-50 rounded-lg text-yellow-500">
              <Clock size={20} />
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
          <p className="text-xs font-bold text-green-500 uppercase mb-1">Completed</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-bold text-gray-800">{completedRequests.length}</h3>
            <div className="p-2 bg-green-50 rounded-lg text-green-500">
              <CheckCircle2 size={20} />
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm hover:shadow-md transition-all bg-red-50/30">
          <p className="text-xs font-bold text-red-500 uppercase mb-1">Overdue (&gt;10m)</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-bold text-red-600">{overdueCount}</h3>
            <div className="p-2 bg-red-100 rounded-lg text-red-600 animate-pulse">
              <AlertCircle size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Guest Requests Detailed List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <BellRing size={20} className="text-nova-teal" /> 
                  Active Guest Requests
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Real-time traffic monitoring</p>
              </div>
              <button 
                onClick={() => onOpenView?.('guest-requests')}
                className="text-xs font-bold text-nova-teal hover:bg-teal-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
              >
                Manage All <ArrowRight size={14} />
              </button>
            </div>
            
            <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
              {pendingRequests.length > 0 ? pendingRequests.slice(0, 10).map(req => (
                <div key={req.id} className="p-4 rounded-xl border border-gray-100 hover:border-nova-teal/30 hover:shadow-sm transition-all bg-white group">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-bold text-gray-900">Room {req.roomNumber}</span>
                        <span className="text-gray-400 text-xs truncate max-w-[120px] md:max-w-none">{req.guestName}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getPriorityColor(req.priority)}`}>
                          {req.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-1 font-medium">{req.description}</p>
                    </div>
                    <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-2 md:pt-0">
                      <div className="text-right">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Log Time</p>
                        <p className="text-xs font-medium text-gray-600">{new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(req.status)}`}>
                        {req.status}
                      </span>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <BellRing size={48} className="opacity-10 mb-3" />
                  <p className="font-medium">No requests logged today yet.</p>
                  <p className="text-xs">New requests will appear here in real-time.</p>
                </div>
              )}
              {pendingRequests.length > 10 && (
                <button 
                  onClick={() => onOpenView?.('guest-requests')}
                  className="w-full py-3 text-sm font-bold text-gray-400 hover:text-nova-teal transition-colors border-t border-gray-50"
                >
                  + {pendingRequests.length - 10} more active requests. View all.
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Shift Progress & AI */}
        <div className="space-y-6">
          
          {/* Shift Progress Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <CalendarCheck size={64} />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Current Shift Progress</p>
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-nova-teal/10 text-nova-teal rounded-xl">
                    <Clock size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 truncate max-w-[150px]">{currentShift.type.split(' ')[0]} Shift</h4>
                    <p className="text-xs text-gray-500">{currentShift.agentName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-nova-teal">{progress}%</span>
                </div>
              </div>

              <div className="w-full bg-gray-100 rounded-full h-2 mb-6 overflow-hidden">
                <div 
                  className="bg-nova-teal h-full rounded-full transition-all duration-1000 ease-out" 
                  style={{ width: `${progress}%` }}
                />
              </div>

              <button 
                onClick={openChecklist}
                className="w-full bg-nova-teal text-white py-3 rounded-xl font-bold shadow-lg shadow-teal-100 hover:bg-teal-700 transition-all flex items-center justify-center gap-2 group/btn"
              >
                {progress > 0 ? "Continue Checklist" : "Start Checklist"}
                <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* AI Handover Insight */}
          <div className="bg-gradient-to-br from-nova-teal to-teal-800 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden group min-h-[180px] flex flex-col justify-between">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <BarChart3 size={16} />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest opacity-80">AI Handover Tip</span>
              </div>
              <p className="text-teal-50 text-sm font-medium leading-relaxed italic">
                "{suggestion}"
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-white/10 relative z-10">
              <p className="text-[10px] uppercase font-bold tracking-widest opacity-60">Based on current resort activity</p>
            </div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full group-hover:scale-110 transition-transform duration-1000"></div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Tasks Done</p>
              <p className="text-xl font-bold text-gray-800">{completedTasks}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Remaining</p>
              <p className="text-xl font-bold text-gray-800">{totalTasks - completedTasks}</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
