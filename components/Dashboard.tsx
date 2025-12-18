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
    <div className="space-y-4 md:space-y-6 animate-fade-in max-w-5xl mx-auto pb-8 px-2 md:px-0">
        
      {/* Hero Section - Today's Assigned Shift */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative group">
          <div className="absolute top-0 left-0 w-2 h-full bg-nova-teal group-hover:w-3 transition-all duration-300"></div>
          <div className="p-5 md:p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-400">Today's Assigned Shift</span>
                          <span className={`px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-bold ${statusColor}`}>{status}</span>
                      </div>
                      <h2 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2 md:gap-3">
                         {getShiftIcon(currentShift.type)}
                         {currentShift.type} Shift
                      </h2>
                      <p className="text-sm md:text-gray-500 mt-2 flex items-center gap-2 flex-wrap">
                          <CalendarCheck size={16} className="flex-shrink-0" />
                          <span className="whitespace-nowrap">{currentShift.date}</span>
                          <span className="text-gray-300 hidden sm:inline">|</span>
                          <span className="text-nova-teal font-medium truncate">{currentShift.agentName}</span>
                      </p>
                  </div>

                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-end gap-4 border-t md:border-t-0 pt-4 md:pt-0">
                      <div className="text-left md:text-right">
                          <span className="text-3xl md:text-4xl font-bold text-nova-teal">{progress}%</span>
                          <p className="text-[10px] text-gray-400 font-medium uppercase">Complete</p>
                      </div>
                      <button 
                        onClick={openChecklist}
                        className="bg-nova-teal text-white px-4 md:px-8 py-2 md:py-3 rounded-xl font-bold text-sm md:text-lg shadow-lg shadow-teal-200 hover:bg-teal-700 transition-all flex items-center gap-2 group/btn"
                      >
                        <span className="hidden sm:inline">{progress > 0 ? "Continue" : "Start"} Checklist</span>
                        <span className="sm:hidden">Checklist</span>
                        <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                  </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-6 md:mt-8 w-full bg-gray-100 rounded-full h-1.5 md:h-2 overflow-hidden">
                  <div 
                    className="bg-nova-teal h-full rounded-full transition-all duration-1000 ease-out relative" 
                    style={{ width: `${progress}%` }}
                  >
                      <div className="absolute top-0 right-0 bottom-0 w-10 bg-gradient-to-r from-transparent to-white/30"></div>
                  </div>
              </div>
          </div>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          
          {/* Quick Stats */}
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 flex flex-row md:flex-col justify-between md:justify-center items-center text-center gap-3 hover:shadow-md transition-shadow">
              <div className="p-3 md:p-4 bg-green-50 text-green-600 rounded-full">
                  <CheckCircle2 size={24} className="md:w-7 md:h-7" />
              </div>
              <div className="text-right md:text-center">
                  <h3 className="text-xl md:text-2xl font-bold text-gray-800">{completedTasks}/{totalTasks}</h3>
                  <p className="text-xs md:text-sm text-gray-500">Tasks Done</p>
              </div>
          </div>

          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 flex flex-row md:flex-col justify-between md:justify-center items-center text-center gap-3 hover:shadow-md transition-shadow">
              <div className="p-3 md:p-4 bg-orange-50 text-orange-600 rounded-full">
                  <AlertCircle size={24} className="md:w-7 md:h-7" />
              </div>
              <div className="text-right md:text-center">
                  <h3 className="text-xl md:text-2xl font-bold text-gray-800">{totalTasks - completedTasks}</h3>
                  <p className="text-xs md:text-sm text-gray-500">Pending Actions</p>
              </div>
          </div>

          {/* AI Insight */}
           <div className="bg-gradient-to-br from-nova-teal to-teal-800 p-5 md:p-6 rounded-xl shadow-lg text-white relative overflow-hidden flex flex-col justify-center min-h-[140px] md:min-h-[160px] group sm:col-span-2 md:col-span-1">
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2 md:mb-3">
                         <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] md:text-xs font-medium backdrop-blur-sm">AI Agent Tip</span>
                    </div>
                    <p className="text-teal-50 text-base md:text-lg font-medium leading-relaxed group-hover:text-white transition-colors">
                        "{suggestion}"
                    </p>
                </div>
                {/* Decorative circles */}
                <div className="absolute -bottom-6 -right-6 w-20 h-20 md:w-24 md:h-24 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
            </div>
      </div>

      {/* Occupancy Forecast Chart Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8">
              <div>
                  <h3 className="text-lg md:text-xl font-bold text-gray-800 flex items-center gap-2">
                      <TrendingUp size={20} className="text-nova-teal md:w-6 md:h-6" /> 
                      Occupancy Forecast
                  </h3>
                  <p className="text-xs md:text-sm text-gray-500 mt-1">7-day resort projection.</p>
              </div>
              <div className="flex items-center gap-2 bg-nova-sand/30 px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-nova-dark text-xs md:text-sm font-bold border border-nova-sand w-fit">
                  <BarChart3 size={14} className="text-nova-teal md:w-4 md:h-4" /> 
                  Weekly Avg: <span className="text-nova-teal text-base md:text-lg">{averageOccupancy}%</span>
              </div>
          </div>
          
          {/* Main Chart */}
          <div className="h-48 md:h-72 w-full mb-6 md:mb-8 relative">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <AreaChart data={forecastData} margin={{ top: 10, right: 0, left: -35, bottom: 0 }}>
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
                        height={40}
                        tick={({ x, y, payload, index }) => {
                             const data = forecastData[index];
                             if (!data) return null;
                             return (
                                <g transform={`translate(${x},${y})`}>
                                    <text x={0} y={0} dy={12} textAnchor="middle" fill="#374151" fontSize={10} fontWeight="700">
                                        {data.name}
                                    </text>
                                    <text x={0} y={0} dy={26} textAnchor="middle" fill="#9ca3af" fontSize={9} fontWeight="500">
                                        {data.dayNum}
                                    </text>
                                </g>
                             );
                        }}
                    />
                    <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        fontSize={10} 
                        tick={{fill: '#9ca3af'}} 
                        domain={[0, 100]} 
                        ticks={[0, 50, 100]}
                    />
                    <Tooltip 
                        contentStyle={{ 
                            borderRadius: '12px', 
                            border: 'none', 
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                            padding: '8px',
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            fontSize: '12px'
                        }}
                        cursor={{ stroke: '#008B8B', strokeWidth: 1, strokeDasharray: '4 4' }}
                        formatter={(value: number) => [<span className="font-bold text-gray-800">{value}%</span>, <span className="text-[10px] text-gray-500 uppercase">Occupancy</span>]}
                        labelFormatter={(label, payload) => {
                            if (payload && payload.length > 0) {
                                return payload[0].payload.shortDate;
                            }
                            return label;
                        }}
                    />
                    <ReferenceLine y={averageOccupancy} stroke="#FF7F50" strokeDasharray="3 3" label={{ position: 'insideTopRight', value: 'Avg', fill: '#FF7F50', fontSize: 8, fontWeight: 'bold' }} />
                    <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#008B8B" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorOccupancy)" 
                        activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff', fill: '#008B8B' }}
                    />
                </AreaChart>
            </ResponsiveContainer>
          </div>
          
          {/* Detailed Daily Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 md:gap-3">
              {forecastData.map((day, idx) => {
                  const styles = getOccupancyColor(day.value);
                  const radius = 40;
                  const circumference = 2 * Math.PI * radius;
                  const offset = circumference - (day.value / 100) * circumference;

                  return (
                    <div key={idx} className={`relative p-2 md:p-3 rounded-xl md:rounded-2xl border ${styles.bg} ${styles.border} flex flex-col items-center justify-between group transition-all duration-300 hover:shadow-md hover:-translate-y-0.5`}>
                        <div className="text-center w-full z-10">
                           <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{day.name}</p>
                           <p className="text-[10px] md:text-xs font-medium text-gray-500">{day.shortDate}</p>
                        </div>
                        
                        <div className="my-2 md:my-3 relative flex items-center justify-center">
                            {/* SVG Circular Progress */}
                            <svg className="w-16 h-16 md:w-20 md:h-20 transform -rotate-90" viewBox="0 0 100 100">
                                {/* Track Circle */}
                                <circle
                                    className="text-gray-200/50"
                                    strokeWidth="8"
                                    stroke="currentColor"
                                    fill="transparent"
                                    r={radius}
                                    cx="50"
                                    cy="50"
                                />
                                {/* Value Circle */}
                                <circle
                                    className={`${styles.stroke} transition-all duration-1000 ease-out`}
                                    strokeWidth="8"
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
                                <span className={`text-sm md:text-base font-bold ${styles.text}`}>
                                    {day.value}<span className="text-[10px] align-top">%</span>
                                </span>
                            </div>
                        </div>

                        <div className={`px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-[8px] md:text-[10px] font-bold uppercase tracking-wide bg-white/60 ${styles.text}`}>
                            {styles.label}
                        </div>
                        
                        {/* Indicator if notes exist */}
                        {day.notes && (
                             <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-nova-teal" title={day.notes}></div>
                        )}
                    </div>
                  );
              })}
          </div>
      </div>
    </div>
  );
};