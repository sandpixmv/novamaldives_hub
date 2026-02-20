import React, { useState, useEffect } from 'react';
import { BarChart3, FileDown, Calendar, Download, FileSpreadsheet, Loader2, AlertCircle } from 'lucide-react';
import { GuestRequest, AppConfig } from '../types';
import { supabase } from '../services/supabaseClient';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface ReportsProps {
  appConfig: AppConfig;
}

export const Reports: React.FC<ReportsProps> = ({ appConfig }) => {
  const [reportType, setReportType] = useState<'daily' | 'monthly' | 'custom'>('monthly');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [customStartDate, setCustomStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<GuestRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const fetchReportData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let start: string;
      let end: string;

      if (reportType === 'daily') {
        start = `${selectedDate}T00:00:00.000Z`;
        end = `${selectedDate}T23:59:59.999Z`;
      } else if (reportType === 'monthly') {
        start = new Date(selectedYear, selectedMonth, 1).toISOString();
        end = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59).toISOString();
      } else {
        start = `${customStartDate}T00:00:00.000Z`;
        end = `${customEndDate}T23:59:59.999Z`;
      }

      const { data, error } = await supabase
        .from('guest_requests')
        .select('*')
        .gte('created_at', start)
        .lte('created_at', end)
        .neq('status', 'Cancelled')
        .order('created_at', { ascending: true });

      if (error) throw error;

      setReportData(data.map(r => ({
        id: r.id,
        roomNumber: r.room_number || '',
        guestName: r.guest_name || '',
        category: r.category || 'Other',
        description: r.description || '',
        status: r.status || 'Pending',
        priority: r.priority || 'Medium',
        createdAt: r.created_at || new Date().toISOString(),
        updatedAt: r.updated_at || new Date().toISOString(),
        assignedTo: r.assigned_to,
        loggedBy: r.logged_by || 'Unknown',
        remarks: r.remarks,
        updatedBy: r.updated_by
      })));
    } catch (err: any) {
      console.error('Error fetching report data:', err);
      setError('Failed to load report data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [reportType, selectedDate, selectedMonth, selectedYear, customStartDate, customEndDate]);

  const getReportTitle = () => {
    if (reportType === 'daily') return `Daily Guest Request Report - ${selectedDate}`;
    if (reportType === 'monthly') return `Monthly Guest Request Report - ${months[selectedMonth]} ${selectedYear}`;
    return `Custom Guest Request Report - ${customStartDate} to ${customEndDate}`;
  };

  const handleExportPDF = () => {
    if (reportData.length === 0) return;

    const doc = new jsPDF('l', 'mm', 'a4');
    const title = getReportTitle();
    
    // Header
    doc.setFillColor(0, 139, 139); // Nova Teal
    doc.rect(0, 0, 297, 24, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(appConfig.appName.toUpperCase(), 14, 16);
    
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(14);
    doc.text(title, 14, 35);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 42);

    const tableBody = reportData.map(req => [
      new Date(req.createdAt).toLocaleDateString(),
      req.roomNumber,
      req.guestName,
      req.category,
      req.status,
      req.priority,
      req.description,
      req.loggedBy
    ]);

    autoTable(doc, {
      startY: 50,
      head: [['Date', 'Room', 'Guest', 'Category', 'Status', 'Priority', 'Description', 'Logged By']],
      body: tableBody,
      headStyles: { fillColor: [0, 139, 139] },
      styles: { fontSize: 8 },
      columnStyles: {
        6: { cellWidth: 60 }
      }
    });

    doc.save(`${title.replace(/ /g, '_')}.pdf`);
  };

  const handleExportExcel = () => {
    if (reportData.length === 0) return;

    const exportData = reportData.map(req => ({
      'Date': new Date(req.createdAt).toLocaleDateString(),
      'Time': new Date(req.createdAt).toLocaleTimeString(),
      'Room Number': req.roomNumber,
      'Guest Name': req.guestName,
      'Category': req.category,
      'Status': req.status,
      'Priority': req.priority,
      'Description': req.description,
      'Logged By': req.loggedBy,
      'Updated By': req.updatedBy || '-',
      'Last Updated': req.updatedAt ? new Date(req.updatedAt).toLocaleString() : '-',
      'Remarks': req.remarks || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Guest Requests');
    
    // Auto-size columns
    const colWidths = Object.keys(exportData[0]).map(key => ({
      wch: Math.max(key.length, ...exportData.map(row => (row as any)[key]?.toString().length || 0)) + 2
    }));
    ws['!cols'] = colWidths;

    const title = getReportTitle();
    XLSX.writeFile(wb, `${title.replace(/ /g, '_')}.xlsx`);
  };

  const stats = {
    total: reportData.length,
    completed: reportData.filter(r => r.status === 'Completed').length,
    pending: reportData.filter(r => r.status === 'Pending').length,
    inProgress: reportData.filter(r => r.status === 'In Progress').length,
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <BarChart3 className="text-nova-teal" /> Reports & Analytics
          </h2>
          <p className="text-gray-500">Generate and export guest request performance reports.</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
          {(['daily', 'monthly', 'custom'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setReportType(type)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                reportType === type 
                ? 'bg-nova-teal text-white shadow-sm' 
                : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-end">
          {reportType === 'daily' && (
            <div className="flex-1 space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase">Select Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="date"
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-nova-teal bg-white text-gray-900"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {reportType === 'monthly' && (
            <>
              <div className="flex-1 space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Select Month</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <select
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-nova-teal bg-white text-gray-900"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  >
                    {months.map((month, index) => (
                      <option key={month} value={index}>{month}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Select Year</label>
                <select
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-nova-teal bg-white text-gray-900"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                >
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {reportType === 'custom' && (
            <>
              <div className="flex-1 space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Start Date</label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-nova-teal bg-white text-gray-900"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">End Date</label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-nova-teal bg-white text-gray-900"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleExportPDF}
              disabled={isLoading || reportData.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-nova-teal text-white rounded-lg font-bold hover:bg-teal-700 transition-all disabled:opacity-50 shadow-sm"
            >
              <FileDown size={18} /> PDF
            </button>
            <button
              onClick={handleExportExcel}
              disabled={isLoading || reportData.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-sm"
            >
              <FileSpreadsheet size={18} /> Excel
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl p-12 flex flex-col items-center justify-center border border-gray-100 shadow-sm">
          <Loader2 className="text-nova-teal animate-spin mb-4" size={40} />
          <p className="text-gray-500 font-medium">Generating report data...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-100 rounded-xl p-6 flex items-center gap-3 text-red-600">
          <AlertCircle size={24} />
          <p>{error}</p>
        </div>
      ) : reportData.length === 0 ? (
        <div className="bg-white rounded-xl p-12 flex flex-col items-center justify-center border border-gray-100 shadow-sm">
          <BarChart3 className="text-gray-200 mb-4" size={64} />
          <p className="text-gray-500 font-medium">No data found for the selected period.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Total Requests</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-xs font-bold text-green-500 uppercase mb-1">Completed</p>
              <p className="text-2xl font-bold text-gray-800">{stats.completed}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-xs font-bold text-yellow-500 uppercase mb-1">Pending</p>
              <p className="text-2xl font-bold text-gray-800">{stats.pending}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-xs font-bold text-blue-500 uppercase mb-1">In Progress</p>
              <p className="text-2xl font-bold text-gray-800">{stats.inProgress}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-700">Request Details</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold tracking-wider">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Room</th>
                    <th className="px-4 py-3">Guest</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reportData.slice(0, 50).map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">{new Date(req.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 font-bold">Rm {req.roomNumber}</td>
                      <td className="px-4 py-3">{req.guestName}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-[10px] font-medium">{req.category}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          req.status === 'Completed' ? 'bg-green-100 text-green-700' :
                          req.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                          req.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate">{req.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {reportData.length > 50 && (
                <div className="p-4 text-center border-t border-gray-100 text-gray-400 text-xs italic">
                  Showing first 50 records. Export to see full report.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
