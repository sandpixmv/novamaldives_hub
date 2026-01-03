import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Task, UserRole, AppConfig } from '../types';
import { Clock, CheckCircle2, Eye, X, Search, FileText, ClipboardList, Loader2, Unlock, FileDown, Download, RotateCcw } from 'lucide-react';
import { getOperationalDate } from '../App';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface CompletedShiftRecord {
  id: string;
  shift_type: string;
  agent_name: string;
  date: string;
  tasks_json: string;
  notes: string;
  submitted_at: string;
  status?: 'draft' | 'submitted';
}

interface ChecklistHistoryProps {
  userRole?: UserRole;
  onReopenShift?: (date: string, shiftType: string) => Promise<void>;
  appConfig: AppConfig;
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

export const ChecklistHistory: React.FC<ChecklistHistoryProps> = ({ userRole, onReopenShift, appConfig }) => {
  const [history, setHistory] = useState<CompletedShiftRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<CompletedShiftRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterShift, setFilterShift] = useState('All');

  const isManager = userRole === 'Front Office Manager' || userRole === 'Asst. FOM';
  const opDate = getOperationalDate();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('completed_shifts')
        .select('*')
        .order('date', { ascending: false })
        .order('submitted_at', { ascending: false });

      if (!error && data) setHistory(data);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
    setLoading(false);
  };

  const handleReopen = async (record: CompletedShiftRecord) => {
      if (onReopenShift) {
          setActionLoading(true);
          try {
            await onReopenShift(record.date, record.shift_type);
            setSelectedRecord(null);
            await fetchHistory(); 
          } catch (err) {
            console.error("Failed to reopen:", err);
          } finally {
            setActionLoading(false);
          }
      }
  };

  const filteredHistory = history.filter(h => {
    const matchesSearch = (h.agent_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (h.date || '').includes(searchTerm);
    const matchesShift = filterShift === 'All' || (h.shift_type || '').includes(filterShift);
    return matchesSearch && matchesShift;
  });

  const getParsedTasks = (json: string): Task[] => {
    try {
      return JSON.parse(json || '[]');
    } catch (e) {
      return [];
    }
  };

  const handleExportAllPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    
    // Header Styling
    doc.setFillColor(0, 139, 139); // Nova Teal
    doc.rect(0, 0, 297, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');

    let titleX = 14;
    if (appConfig.logoUrl) {
        try {
            const isDataUri = appConfig.logoUrl.startsWith('data:image/');
            let format = 'PNG';
            if (isDataUri) {
                const mimeType = appConfig.logoUrl.split(';')[0];
                if (mimeType) {
                    const extracted = mimeType.split('/')[1];
                    if (extracted) format = extracted.toUpperCase();
                }
            }
            doc.addImage(appConfig.logoUrl, format, 10, 2, 20, 20);
            titleX = 35;
        } catch (e) { console.warn("Logo export error:", e); }
    }
    doc.text((appConfig.appName || 'NOVA MALDIVES').toUpperCase(), titleX, 16);

    doc.setTextColor(60, 60, 60);
    doc.setFontSize(14);
    doc.text("CHECKLIST AUDIT LOG", 14, 35);
    
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'normal');

    const currentTime = new Date();
    const formattedGenDate = `${formatToResortDate(currentTime)}, ${currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    
    doc.text(`Generated: ${formattedGenDate}`, 14, 40);
    doc.text(`Records: ${filteredHistory.length}`, 14, 45);

    const tableBody = filteredHistory.map(h => [
        formatToResortDate(h.date) || '',
        (h.shift_type || '').split(' ')[0] || 'Unknown',
        h.agent_name || 'System',
        h.status?.toUpperCase() || 'SUBMITTED',
        `${getParsedTasks(h.tasks_json).filter(t => t.isCompleted).length} / ${getParsedTasks(h.tasks_json).length}`,
        h.notes || 'No notes'
    ]);

    autoTable(doc, {
        startY: 55,
        head: [['Date', 'Shift', 'Agent', 'Status', 'Completion', 'Handover Notes']],
        body: tableBody,
        headStyles: { fillColor: [0, 139, 139] },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: { 5: { cellWidth: 80 } }
    });

    window.open(doc.output('bloburl'), '_blank');
  };

  const handleExportShiftPDF = (record: CompletedShiftRecord) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const tasks = getParsedTasks(record.tasks_json);
    
    // Header
    doc.setFillColor(0, 139, 139);
    doc.rect(0, 0, 210, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    
    let titleX = 14;
    if (appConfig.logoUrl) {
        try {
            const isDataUri = appConfig.logoUrl.startsWith('data:image/');
            let format = 'PNG';
            if (isDataUri) {
                const mimeType = appConfig.logoUrl.split(';')[0];
                if (mimeType) {
                    const extracted = mimeType.split('/')[1];
                    if (extracted) format = extracted.toUpperCase();
                }
            }
            doc.addImage(appConfig.logoUrl, format, 10, 2, 20, 20);
            titleX = 35;
        } catch (e) { console.warn("Logo export error:", e); }
    }
    doc.text((appConfig.appName || 'NOVA MALDIVES').toUpperCase(), titleX, 16);

    doc.setTextColor(60, 60, 60);
    doc.setFontSize(14);
    doc.text("SHIFT HANDOVER REPORT", 14, 35);

    doc.setTextColor(60, 60, 60);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Shift Details: ${record.shift_type || ''}`, 14, 45);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    
    const operationalDateFormatted = formatToResortDate(record.date);
    const submissionFormatted = record.submitted_at 
        ? `${formatToResortDate(record.submitted_at)}, ${new Date(record.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`
        : 'N/A';

    doc.text(`Operational Date: ${operationalDateFormatted}`, 14, 50);
    doc.text(`Agent In Charge: ${record.agent_name || ''}`, 14, 55);
    doc.text(`Submission: ${submissionFormatted}`, 14, 60);
    doc.text(`Report Status: ${(record.status || 'submitted').toUpperCase()}`, 14, 65);

    // Summary Statistics
    const completed = tasks.filter(t => t.isCompleted).length;
    doc.setFillColor(240, 248, 248);
    doc.roundedRect(140, 42, 56, 25, 3, 3, 'F');
    doc.setTextColor(0, 139, 139);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${tasks.length > 0 ? Math.round((completed/tasks.length)*100) : 0}%`, 148, 52);
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text("Completion Rate", 148, 57);
    doc.setFont('helvetica', 'bold');
    doc.text(`Status: ${(record.status || 'submitted').toUpperCase()}`, 148, 62);

    // Notes Section
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'bold');
    doc.text("Shift Notes & Observations:", 14, 78);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(80);
    const splitNotes = doc.splitTextToSize(record.notes || "No operational notes recorded for this shift.", 182);
    doc.text(splitNotes, 14, 85);

    // Task Table - Category column removed
    const tableBody = tasks.map(t => [
        t.label || '',
        t.isCompleted ? '[ X ] DONE' : '[   ] PENDING'
    ]);

    autoTable(doc, {
        startY: 98 + (splitNotes.length * 5),
        head: [['Task Description', 'Status']],
        body: tableBody,
        headStyles: { 
            fillColor: [0, 139, 139],
            fontSize: 8
        },
        styles: { fontSize: 8 },
        columnStyles: { 1: { cellWidth: 40 } }
    });

    window.open(doc.output('bloburl'), '_blank');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto h-[calc(100vh-140px)] flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ClipboardList className="text-nova-teal" /> Checklist History
          </h2>
          <p className="text-gray-500">View and audit previously submitted GSA shift checklists.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full md:auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Search agent or date..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-nova-teal w-full md:w-64"
                />
            </div>
            <button 
                onClick={handleExportAllPDF}
                disabled={filteredHistory.length === 0}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50 hover:text-nova-teal transition-all disabled:opacity-50 shadow-sm"
            >
                <FileDown size={18} /> Export Log
            </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
             <Loader2 size={40} className="animate-spin mb-2" />
             <p>Loading history...</p>
          </div>
        ) : (
          <div className="overflow-auto flex-1">
            <table className="w-full text-left">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase sticky top-0 z-10">
                    <tr>
                        <th className="px-6 py-4 font-medium text-center w-32">Date</th>
                        <th className="px-6 py-4 font-medium">Shift</th>
                        <th className="px-6 py-4 font-medium">Agent</th>
                        <th className="px-6 py-4 font-medium">Completion</th>
                        <th className="px-6 py-4 font-medium">Status</th>
                        <th className="px-6 py-4 font-medium text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {filteredHistory.map((record) => {
                        const tasks = getParsedTasks(record.tasks_json);
                        const completed = tasks.filter(t => t.isCompleted).length;
                        const percent = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
                        
                        return (
                            <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 text-gray-600 font-bold text-center">{formatToResortDate(record.date)}</td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-nova-teal border border-teal-100">
                                        <Clock size={12} /> {(record.shift_type || '').split(' ')[0] || 'Unknown'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-gray-800 font-medium">{record.agent_name || 'System'}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-nova-teal" style={{ width: `${percent}%` }}></div>
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-400">{percent}%</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                        record.status === 'draft' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                                    }`}>
                                        {record.status === 'draft' ? 'Draft' : 'Submitted'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button 
                                            onClick={() => handleExportShiftPDF(record)}
                                            className="p-1.5 text-gray-400 hover:text-nova-teal hover:bg-teal-50 rounded-lg transition-all"
                                            title="View PDF Report"
                                        >
                                            <Download size={18} />
                                        </button>
                                        <button 
                                            onClick={() => setSelectedRecord(record)} 
                                            className="px-3 py-1.5 bg-gray-50 hover:bg-nova-teal hover:text-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 transition-all flex items-center gap-1"
                                        >
                                            <Eye size={14} /> Details
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                    {filteredHistory.length === 0 && (
                        <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">No records found.</td></tr>
                    )}
                </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-down">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-nova-teal/10 rounded-xl flex items-center justify-center text-nova-teal">
                              <ClipboardList size={28} />
                          </div>
                          <div>
                              <h3 className="text-xl font-bold text-gray-800">{selectedRecord.shift_type || 'Unknown'} Shift Record</h3>
                              <p className="text-sm text-gray-500">{formatToResortDate(selectedRecord.date)}</p>
                          </div>
                      </div>
                      <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleExportShiftPDF(selectedRecord)}
                            className="flex items-center gap-2 px-3 py-2 bg-nova-teal text-white rounded-lg text-sm font-bold shadow-md hover:bg-teal-700 transition-all"
                          >
                              <Download size={18} /> PDF Report
                          </button>
                          <button onClick={() => setSelectedRecord(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"><X size={24} /></button>
                      </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="md:col-span-2 space-y-6">
                              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                                  <div className="flex items-center justify-between mb-6">
                                      <h4 className="font-bold text-gray-700 flex items-center gap-2">
                                          <FileText size={18} className="text-nova-teal" /> 
                                          Checklist Activities
                                      </h4>
                                  </div>
                                  <div className="space-y-2">
                                      {getParsedTasks(selectedRecord.tasks_json).map((task) => (
                                          <div key={task.id} className={`flex items-start gap-3 p-3 rounded-lg border ${task.isCompleted ? 'bg-teal-50/30 border-teal-100' : 'bg-gray-50/50 border-gray-100'}`}>
                                              {task.isCompleted ? (
                                                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white flex-shrink-0 mt-0.5 shadow-sm">
                                                      <CheckCircle2 size={14} />
                                                  </div>
                                              ) : (
                                                  <div className="w-5 h-5 rounded-full border-2 border-gray-200 flex-shrink-0 mt-0.5"></div>
                                              )}
                                              <div>
                                                  <p className={`text-sm font-medium ${task.isCompleted ? 'text-gray-700' : 'text-gray-400'}`}>
                                                      {task.label || ''}
                                                  </p>
                                                  <span className="text-[10px] text-gray-400 uppercase font-bold">{task.category || ''}</span>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          </div>

                          <div className="space-y-6">
                              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Last Updated By</h4>
                                  <div className="flex items-center gap-4">
                                      <div className="w-12 h-12 bg-nova-teal text-white rounded-full flex items-center justify-center font-bold text-lg shadow-inner">
                                          {(selectedRecord.agent_name || '??').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                      </div>
                                      <div>
                                          <p className="text-sm font-bold text-gray-800">{selectedRecord.agent_name || 'Unknown Agent'}</p>
                                          <p className="text-xs text-gray-500">Guest Service Agent</p>
                                      </div>
                                  </div>
                                  <div className="mt-4 pt-4 border-t border-gray-50 space-y-3">
                                      <div className="flex items-center justify-between">
                                          <span className="text-[10px] text-gray-400 font-bold uppercase">Submission Time</span>
                                          <span className="text-xs text-gray-700 font-medium">
                                              {selectedRecord.submitted_at 
                                                ? `${formatToResortDate(selectedRecord.submitted_at)}, ${new Date(selectedRecord.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}` 
                                                : '-'}
                                          </span>
                                      </div>
                                  </div>
                              </div>

                              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Shift Handover Notes</h4>
                                  <p className="text-sm text-gray-600 leading-relaxed italic border-l-4 border-nova-teal/20 pl-4 py-1">
                                      {selectedRecord.notes ? `"${selectedRecord.notes}"` : 'No notes recorded.'}
                                  </p>
                              </div>

                              {isManager && selectedRecord.status !== 'draft' && selectedRecord.date === opDate && (
                                <div className="bg-amber-50 p-5 rounded-xl border border-amber-200 shadow-sm">
                                    <button 
                                        onClick={() => handleReopen(selectedRecord)}
                                        disabled={actionLoading}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 text-white rounded-lg font-bold hover:bg-amber-600 disabled:opacity-50 transition-all shadow-md active:scale-95"
                                    >
                                        {actionLoading ? <Loader2 className="animate-spin" size={18} /> : <Unlock size={18} />} 
                                        Unlock for Editing
                                    </button>
                                </div>
                              )}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};