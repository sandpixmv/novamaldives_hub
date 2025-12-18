import React, { useState, useRef } from 'react';
import { DailyOccupancy } from '../types';
import { Calendar, Save, TrendingUp, ChevronLeft, ChevronRight, Info, FileUp, Download } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface OccupancyManagementProps {
  occupancyData: DailyOccupancy[];
  onUpdateOccupancy: (data: DailyOccupancy[]) => void;
}

export const OccupancyManagement: React.FC<OccupancyManagementProps> = ({ occupancyData, onUpdateOccupancy }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Create a local editable copy of the data for the current view to handle inputs before saving
  const [localData, setLocalData] = useState<DailyOccupancy[]>(occupancyData);

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
  const startDateStr = weekDays[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const endDateStr = weekDays[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

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

  const getOccupancyForDate = (dateStr: string) => {
      return localData.find(d => d.date === dateStr) || { date: dateStr, percentage: 65, notes: '' };
  };

  const handleInputChange = (dateStr: string, field: keyof DailyOccupancy, value: any) => {
      setHasUnsavedChanges(true);
      setLocalData(prev => {
          const existingIndex = prev.findIndex(d => d.date === dateStr);
          if (existingIndex >= 0) {
              const newData = [...prev];
              newData[existingIndex] = { ...newData[existingIndex], [field]: value };
              return newData;
          } else {
              // Create new entry if not exists (using defaults for other fields)
              return [...prev, { 
                  date: dateStr, 
                  percentage: field === 'percentage' ? value : 65,
                  notes: field === 'notes' ? value : '',
                  [field]: value 
              }];
          }
      });
  };

  const handleSave = () => {
      onUpdateOccupancy(localData);
      setHasUnsavedChanges(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          const text = event.target?.result as string;
          if (!text) return;

          try {
              const lines = text.split(/\r?\n/);
              const newDataMap = new Map<string, DailyOccupancy>();
              let processedCount = 0;

              lines.forEach((line, index) => {
                  const trimmedLine = line.trim();
                  if (!trimmedLine) return;
                  
                  // Expect CSV: YYYY-MM-DD,Percentage,Notes
                  const parts = trimmedLine.split(',');
                  
                  // Check date format YYYY-MM-DD
                  const dateStr = parts[0].trim();
                  // Skip header or invalid lines
                  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return;

                  const percentage = parseInt(parts[1]?.trim() || '0');
                  // Handle notes that might contain commas by re-joining
                  const notes = parts.slice(2).join(',').trim().replace(/^"|"$/g, '');

                  if (!isNaN(percentage)) {
                      newDataMap.set(dateStr, {
                          date: dateStr,
                          percentage: Math.min(100, Math.max(0, percentage)),
                          notes: notes
                      });
                      processedCount++;
                  }
              });

              if (newDataMap.size > 0) {
                  setLocalData(prev => {
                      const updated = [...prev];
                      newDataMap.forEach((val) => {
                          const idx = updated.findIndex(u => u.date === val.date);
                          if (idx >= 0) {
                              updated[idx] = { ...updated[idx], percentage: val.percentage, notes: val.notes || updated[idx].notes };
                          } else {
                              updated.push(val);
                          }
                      });
                      return updated;
                  });
                  setHasUnsavedChanges(true);
                  
                  // If uploaded data contains current view range, stay there, otherwise jump to first uploaded date
                  const firstDate = newDataMap.keys().next().value;
                  if (firstDate) {
                      setCurrentDate(new Date(firstDate));
                  }
                  
                  alert(`Successfully processed ${processedCount} records from file.`);
              } else {
                  alert("No valid data found. Please ensure CSV format: YYYY-MM-DD, Percentage, Notes");
              }
          } catch (err) {
              console.error("Error parsing CSV:", err);
              alert("Error parsing file. Please check the format.");
          }
          
          // Reset input
          if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
      const template = "Date,Percentage,Notes\n2024-01-01,85,New Year Arrivals\n2024-01-02,90,High Occupancy";
      const blob = new Blob([template], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'occupancy_template.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  // Prepare chart data for the selected week
  const chartData = weekDays.map(day => {
      const dateStr = day.toISOString().split('T')[0];
      const dayData = getOccupancyForDate(dateStr);
      return {
          name: day.toLocaleDateString('en-GB', { weekday: 'short' }),
          date: dateStr,
          value: dayData.percentage
      };
  });

  const averageOccupancy = Math.round(chartData.reduce((acc, curr) => acc + curr.value, 0) / 7);

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto h-[calc(100vh-140px)] flex flex-col relative">
       
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <TrendingUp className="text-nova-teal" /> Occupancy Planner
          </h2>
          <p className="text-gray-500">Manage daily occupancy forecasts and operational notes.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
             <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                 <button onClick={handlePrevWeek} className="p-1 hover:bg-gray-100 rounded text-gray-600"><ChevronLeft size={20} /></button>
                 <div className="px-4 py-1 text-sm font-bold text-gray-800 flex items-center gap-2">
                     <Calendar size={14} className="text-nova-teal" />
                     {startDateStr} - {endDateStr}
                 </div>
                 <button onClick={handleNextWeek} className="p-1 hover:bg-gray-100 rounded text-gray-600"><ChevronRight size={20} /></button>
             </div>
             
             {/* Hidden File Input */}
             <input 
                 type="file" 
                 ref={fileInputRef} 
                 className="hidden" 
                 accept=".csv,.txt"
                 onChange={handleFileUpload}
             />

             <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                <button 
                    onClick={handleDownloadTemplate}
                    className="px-3 py-1.5 text-gray-600 hover:text-nova-teal text-xs font-medium flex items-center gap-1 border-r border-gray-300 pr-2 mr-1"
                    title="Download CSV Template"
                >
                    <Download size={14} /> Template
                </button>
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 text-gray-700 hover:text-nova-teal text-sm font-bold flex items-center gap-2"
                >
                    <FileUp size={16} /> Upload Data
                </button>
             </div>

             <button 
                onClick={handleSave}
                disabled={!hasUnsavedChanges}
                className={`px-4 py-2 rounded-lg text-sm font-bold shadow-md flex items-center gap-2 transition-all ${
                    hasUnsavedChanges 
                    ? 'bg-nova-teal text-white hover:bg-teal-700' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
             >
                 <Save size={16} /> Save Changes
             </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
          {/* Chart Section */}
          <div className="lg:col-span-3 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-64 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-700">Weekly Trend</h3>
                  <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full text-blue-700 text-xs font-bold">
                      <Info size={14} /> Average: {averageOccupancy}%
                  </div>
              </div>
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#008B8B" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#008B8B" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} tick={{fill: '#6b7280'}} />
                        <YAxis axisLine={false} tickLine={false} fontSize={12} tick={{fill: '#6b7280'}} unit="%" domain={[0, 100]} />
                        <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            cursor={{ stroke: '#008B8B', strokeWidth: 1 }}
                        />
                        <Area type="monotone" dataKey="value" stroke="#008B8B" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
              </div>
          </div>

          {/* Daily Inputs Grid */}
          <div className="lg:col-span-3 overflow-y-auto pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                  {weekDays.map((day) => {
                      const dateStr = day.toISOString().split('T')[0];
                      const data = getOccupancyForDate(dateStr);
                      const isToday = new Date().toDateString() === day.toDateString();
                      
                      let bgClass = "bg-white";
                      if (data.percentage >= 90) bgClass = "bg-red-50 border-red-100";
                      else if (data.percentage >= 70) bgClass = "bg-green-50 border-green-100";

                      return (
                          <div key={dateStr} className={`p-4 rounded-xl border shadow-sm flex flex-col gap-3 transition-colors ${isToday ? 'ring-2 ring-nova-teal ring-offset-2' : ''} ${bgClass} border-gray-200`}>
                              <div className="flex justify-between items-center">
                                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                      {day.toLocaleDateString('en-GB', { weekday: 'short' })}
                                  </span>
                                  <span className={`text-xs font-medium ${isToday ? 'text-nova-teal' : 'text-gray-400'}`}>
                                      {day.getDate()}
                                  </span>
                              </div>
                              
                              <div className="relative">
                                  <div className="flex items-end gap-1">
                                      <input 
                                          type="number" 
                                          min="0" 
                                          max="100"
                                          value={data.percentage}
                                          onChange={(e) => handleInputChange(dateStr, 'percentage', parseInt(e.target.value) || 0)}
                                          className="text-3xl font-bold bg-transparent border-b border-gray-300 focus:border-nova-teal focus:outline-none w-20 text-gray-800"
                                      />
                                      <span className="text-gray-500 font-medium mb-1">%</span>
                                  </div>
                              </div>

                              <div>
                                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Notes</label>
                                  <textarea 
                                      rows={2}
                                      value={data.notes || ''}
                                      onChange={(e) => handleInputChange(dateStr, 'notes', e.target.value)}
                                      className="w-full text-xs p-2 rounded bg-white/50 border border-gray-200 focus:border-nova-teal focus:outline-none resize-none"
                                      placeholder="e.g. Arrivals..."
                                  />
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      </div>
    </div>
  );
};