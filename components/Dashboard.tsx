import React, { useState, useEffect } from 'react';
import { ShiftData, ShiftType, User, DailyOccupancy } from '../types';
import { CheckCircle2, Clock, AlertCircle, ArrowRight, Sunrise, Sun, Moon, CalendarCheck, TrendingUp, Info, BarChart3 } from 'lucide-react';
import { getSmartTaskSuggestion } from '../services/geminiService';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface DashboardProps {
  currentShift: ShiftData;
  startNewShift: (type: ShiftType, assignee?: User) => void;
  openChecklist: () => void;
  users: User[];
  currentUser: User | null;
  availableShifts: string[];
  occupancyData: DailyOccupancy[];
}

export const Dashboard: React.FC<DashboardProps> = ({ currentShift, openChecklist, occupancyData }) => {
  const [suggestion, setSuggestion] = useState<string>("Loading smart suggestion...");
  
  const completedTasks = currentShift.tasks.filter(t => t.isCompleted).length;
  const totalTasks = currentShift.tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Determine status
  let status = "Not Started";
  let statusColor = "bg-gray-100 text-gray-600";
  if (progress === 100 && totalTasks > 0) {
      status = "Completed";
      statusColor = "bg-green-100 text-green-700";
  } else if (progress > 0) {
      status = "In Progress";
      statusColor = "bg-blue-100 text-blue-700";
  }

  useEffect(() => {
     getSmartTaskSuggestion("Sunny, 29°C", currentShift.type).then(setSuggestion);
  }, [currentShift.type]);

  const getShiftIcon = (type: string) => {
      const lower = type.toLowerCase();
      if (lower.includes('morning')) return <Sunrise size={24} className="text-orange-500" />;
      if (lower.includes('afternoon')) return <Sun size={24} className="text-yellow-500" />;
      if (lower.includes('night')) return <Moon size={24} className="text-indigo-500" />;
      return <Clock size={24} className="text-gray-500" />;
  };

  // Prepare Forecast Data
  const getNext7DaysData = () => {
    const today = new Date();
    const next7Days = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const dayData = occupancyData.find(o => o.date === dateStr);
        next7Days.push({
            name: d.toLocaleDateString('en-GB', { weekday: 'short' }),
            dayNum: d.getDate(),
            shortDate: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
            value: dayData ? dayData.percentage : 0,
            notes: dayData?.notes
        });
    }
    return next7Days;
  };

  const forecastData = getNext7DaysData();
  const averageOccupancy = Math.round(forecastData.reduce((acc, curr) => acc + curr.value, 0) / 7);

  // Helper for color coding occupancy cards
  const getOccupancyColor = (value: number) => {
    if (value >= 90) return { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', stroke: 'text-rose-500', label: 'Critical' };
    if (value >= 80) return { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100', stroke: 'text-orange-500', label: 'High' };
    if (value >= 60) return { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-100', stroke: 'text-teal-500', label: 'Moderate' };
    return { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-100', stroke: 'text-gray-400', label: 'Low' };
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-8">
        
      {/* Hero Section - Today's Assigned Shift */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative group">
          <div className="absolute top-0 left-0 w-2 h-full bg-nova-teal group-hover:w-3 transition-all duration-300"></div>
          <div className="p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                      <div className="flex items-center gap-3 mb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Today's Assigned Shift</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColor}`}>{status}</span>
                      </div>
                      <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                         {getShiftIcon(currentShift.type)}
                         {currentShift.type} Shift
                      </h2>
                      <p className="text-gray-500 mt-2 flex items-center gap-2">
                          <CalendarCheck size={16} />
                          {currentShift.date} 
                          <span className="text-gray-300">|</span>
                          <span className="text-nova-teal font-medium">{currentShift.agentName}</span>
                      </p>
                  </div>

                  <div className="flex flex-col items-end gap-4">
                      <div className="text-right">
                          <span className="text-4xl font-bold text-nova-teal">{progress}%</span>
                          <p className="text-xs text-gray-400 font-medium uppercase">Checklist Complete</p>
                      </div>
                      <button 
                        onClick={openChecklist}
                        className="bg-nova-teal text-white px-8 py-3 rounded-xl font-bold text-lg shadow-lg shadow-teal-200 hover:bg-teal-700 transition-all flex items-center gap-2 group/btn"
                      >
                        {progress > 0 ? "Continue Checklist" : "Open Checklist"}
                        <ArrowRight size={20} className="group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                  </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-8 w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-nova-teal h-2 rounded-full transition-all duration-1000 ease-out relative" 
                    style={{ width: `${progress}%` }}
                  >
                      <div className="absolute top-0 right-0 bottom-0 w-10 bg-gradient-to-r from-transparent to-white/30"></div>
                  </div>
              </div>
          </div>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Quick Stats */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center space-y-2 hover:shadow-md transition-shadow">
              <div className="p-4 bg-green-50 text-green-600 rounded-full mb-2">
                  <CheckCircle2 size={28} />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">{completedTasks}/{totalTasks}</h3>
              <p className="text-sm text-gray-500">Tasks Completed</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center space-y-2 hover:shadow-md transition-shadow">
              <div className="p-4 bg-orange-50 text-orange-600 rounded-full mb-2">
                  <AlertCircle size={28} />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">{totalTasks - completedTasks}</h3>
              <p className="text-sm text-gray-500">Pending Actions</p>
          </div>

          {/* AI Insight */}
           <div className="bg-gradient-to-br from-nova-teal to-teal-800 p-6 rounded-xl shadow-lg text-white relative overflow-hidden flex flex-col justify-center min-h-[160px] group">
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                         <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-medium backdrop-blur-sm">AI Agent Tip</span>
                    </div>
                    <p className="text-teal-50 text-lg font-medium leading-relaxed group-hover:text-white transition-colors">
                        "{suggestion}"
                    </p>
                </div>
                {/* Decorative circles */}
                <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
            </div>
      </div>

      {/* Occupancy Forecast Chart Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                  <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      <TrendingUp size={24} className="text-nova-teal" /> 
                      Occupancy Forecast
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">7-day projection of resort occupancy levels.</p>
              </div>
              <div className="flex items-center gap-2 bg-nova-sand/30 px-4 py-2 rounded-xl text-nova-dark text-sm font-bold border border-nova-sand">
                  <BarChart3 size={16} className="text-nova-teal" /> 
                  Weekly Avg: <span className="text-nova-teal text-lg">{averageOccupancy}%</span>
              </div>
          </div>
          
          {/* Main Chart */}
          <div className="h-72 w-full mb-8 relative">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                    <defs>
                        <linearGradient id="colorOccupancy" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#008B8B" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#008B8B" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        height={50}
                        tick={({ x, y, payload, index }) => {
                             const data = forecastData[index];
                             if (!data) return null;
                             return (
                                <g transform={`translate(${x},${y})`}>
                                    <text x={0} y={0} dy={16} textAnchor="middle" fill="#374151" fontSize={12} fontWeight="700">
                                        {data.name}
                                    </text>
                                    <text x={0} y={0} dy={34} textAnchor="middle" fill="#9ca3af" fontSize={11} fontWeight="500">
                                        {data.dayNum}
                                    </text>
                                </g>
                             );
                        }}
                    />
                    <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        fontSize={11} 
                        tick={{fill: '#9ca3af'}} 
                        domain={[0, 100]} 
                        ticks={[0, 25, 50, 75, 100]}
                    />
                    <Tooltip 
                        contentStyle={{ 
                            borderRadius: '12px', 
                            border: 'none', 
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                            padding: '12px',
                            backgroundColor: 'rgba(255, 255, 255, 0.95)'
                        }}
                        cursor={{ stroke: '#008B8B', strokeWidth: 1, strokeDasharray: '4 4' }}
                        formatter={(value: number) => [<span className="font-bold text-gray-800 text-lg">{value}%</span>, <span className="text-xs text-gray-500 uppercase">Occupancy</span>]}
                        labelFormatter={(label, payload) => {
                            if (payload && payload.length > 0) {
                                return payload[0].payload.shortDate;
                            }
                            return label;
                        }}
                    />
                    <ReferenceLine y={averageOccupancy} stroke="#FF7F50" strokeDasharray="3 3" label={{ position: 'insideTopRight', value: 'Avg', fill: '#FF7F50', fontSize: 10, fontWeight: 'bold' }} />
                    <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#008B8B" 
                        strokeWidth={4}
                        fillOpacity={1} 
                        fill="url(#colorOccupancy)" 
                        activeDot={{ r: 6, strokeWidth: 4, stroke: '#fff', fill: '#008B8B', cursor: 'pointer' }}
                    />
                </AreaChart>
            </ResponsiveContainer>
          </div>
          
          {/* Detailed Daily Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {forecastData.map((day, idx) => {
                  const styles = getOccupancyColor(day.value);
                  // Using viewBox 0 0 100 100 for better scaling logic
                  const radius = 42;
                  const circumference = 2 * Math.PI * radius;
                  const offset = circumference - (day.value / 100) * circumference;

                  return (
                    <div key={idx} className={`relative p-3 rounded-2xl border ${styles.bg} ${styles.border} flex flex-col items-center justify-between group transition-all duration-300 hover:shadow-md hover:-translate-y-1`}>
                        <div className="text-center w-full z-10">
                           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{day.name}</p>
                           <p className="text-xs font-medium text-gray-500">{day.shortDate}</p>
                        </div>
                        
                        <div className="my-3 relative flex items-center justify-center">
                            {/* SVG Circular Progress */}
                            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                                {/* Track Circle (Full 100%) */}
                                <circle
                                    className="text-gray-200"
                                    strokeWidth="10"
                                    stroke="currentColor"
                                    fill="transparent"
                                    r={radius}
                                    cx="50"
                                    cy="50"
                                />
                                {/* Value Circle */}
                                <circle
                                    className={`${styles.stroke} transition-all duration-1000 ease-out`}
                                    strokeWidth="10"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={offset}
                                    strokeLinecap="round"
                                    stroke="currentColor"
                                    fill="transparent"
                                    r={radius}
                                    cx="50"
                                    cy="50"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className={`text-xl font-bold ${styles.text}`}>
                                    {day.value}<span className="text-xs align-top">%</span>
                                </span>
                            </div>
                        </div>

                        <div className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-white/60 ${styles.text}`}>
                            {styles.label}
                        </div>
                        
                        {/* Tooltip hint if notes exist */}
                        {day.notes && (
                             <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-nova-teal animate-pulse" title={day.notes}></div>
                        )}
                    </div>
                  );
              })}
          </div>
      </div>
    </div>
  );
};