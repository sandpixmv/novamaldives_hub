import React, { useState, useRef } from 'react';
import { GuestRequest, RequestStatus, RequestPriority, User as AppUser } from '../types';
import { Search, Plus, Clock, CheckCircle2, AlertTriangle, User, BedDouble, Wrench, Utensils, Car, Sparkles, X, Calendar, FileDown, MessageSquare, RotateCcw, Droplets, Coffee, Scissors, Info } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface GuestRequestsProps {
  requests: GuestRequest[];
  onRequestAdd: (request: Omit<GuestRequest, 'id' | 'createdAt' | 'updatedAt' | 'loggedBy'>) => void;
  onRequestUpdate: (id: string, updates: Partial<GuestRequest>) => void;
  logoUrl?: string;
  currentUser: AppUser;
}

const CATEGORIES = [
  'Housekeeping', 
  'Engineering', 
  'Aquaholics', 
  'F&B Service', 
  'F&B Production', 
  'Eskape Spa', 
  'Front Office', 
  'Others'
];

// Helper to get local date string in YYYY-MM-DD format
const getLocalToday = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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

export const GuestRequests: React.FC<GuestRequestsProps> = ({ requests, onRequestAdd, onRequestUpdate, logoUrl, currentUser }) => {
  const [filterStatus, setFilterStatus] = useState<RequestStatus | 'All'>('All');
  const [selectedDate, setSelectedDate] = useState<string>(getLocalToday());
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);
  
  // Status Update Interaction State
  const [updatingRequest, setUpdatingRequest] = useState<{ id: string, nextStatus: RequestStatus } | null>(null);
  const [statusRemarks, setStatusRemarks] = useState('');

  // Form State
  const [newRoom, setNewRoom] = useState('');
  const [newGuest, setNewGuest] = useState('');
  const [newCategory, setNewCategory] = useState(CATEGORIES[0]);
  const [newPriority, setNewPriority] = useState<RequestPriority>('Medium');
  const [newDesc, setNewDesc] = useState('');

  // Filtering
  const filteredRequests = requests.filter(req => {
      // Ensure we have a date part to compare
      const reqDate = req.createdAt ? req.createdAt.split('T')[0] : '';
      const matchesDate = !selectedDate || reqDate === selectedDate;
      const matchesStatus = filterStatus === 'All' || req.status === filterStatus;
      const matchesSearch = 
        req.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
        req.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (req.loggedBy && req.loggedBy.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return matchesDate && matchesStatus && matchesSearch;
  });

  // Stats (based on filtered view)
  const pendingCount = filteredRequests.filter(r => r.status === 'Pending').length;
  const inProgressCount = filteredRequests.filter(r => r.status === 'In Progress').length;
  const highPriorityCount = filteredRequests.filter(r => r.priority === 'High' && r.status !== 'Completed').length;

  const getCategoryIcon = (cat: string) => {
      switch(cat) {
          case 'Housekeeping': return <BedDouble size={16} />;
          case 'Engineering': return <Wrench size={16} />;
          case 'Aquaholics': return <Droplets size={16} />;
          case 'F&B Service': return <Utensils size={16} />;
          case 'F&B Production': return <Coffee size={16} />;
          case 'Eskape Spa': return <Scissors size={16} />;
          case 'Front Office': return <User size={16} />;
          default: return <Info size={16} />;
      }
  };

  const getPriorityColor = (p: RequestPriority) => {
      switch(p) {
          case 'High': return 'bg-red-50 text-red-600 border-red-100';
          case 'Medium': return 'bg-orange-50 text-orange-600 border-orange-100';
          case 'Low': return 'bg-green-50 text-green-600 border-green-100';
      }
  };

  const getStatusColor = (s: RequestStatus) => {
      switch(s) {
          case 'Completed': return 'bg-green-100 text-green-700';
          case 'In Progress': return 'bg-blue-100 text-blue-700';
          case 'Cancelled': return 'bg-gray-100 text-gray-500';
          default: return 'bg-yellow-100 text-yellow-700';
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newRoom || !newGuest || !newDesc) return;

      onRequestAdd({
          roomNumber: newRoom,
          guestName: newGuest,
          category: newCategory,
          priority: newPriority,
          description: newDesc,
          status: 'Pending'
      });

      // Reset & Close
      setNewRoom('');
      setNewGuest('');
      setNewDesc('');
      setNewPriority('Medium');
      setIsModalOpen(false);
  };

  const handleConfirmStatusUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatingRequest) return;

    onRequestUpdate(updatingRequest.id, { 
      status: updatingRequest.nextStatus,
      remarks: statusRemarks,
      updatedBy: currentUser.name
    });

    setUpdatingRequest(null);
    setStatusRemarks('');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    
    // Header
    doc.setFillColor(0, 139, 139); // Nova Teal
    doc.rect(0, 0, 297, 24, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');

    let titleX = 14;
    
    if (logoUrl) {
        try {
            const isDataUri = logoUrl.startsWith('data:image/');
            const format = isDataUri ? logoUrl.split(';')[0].split('/')[1].toUpperCase() : 'PNG';
            doc.addImage(logoUrl, format, 10, 2, 20, 20);
            titleX = 35;
        } catch (e) {
            console.warn("Could not add logo to PDF:", e);
        }
    }

    doc.text("NOVA MALDIVES", titleX, 16);
    
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(14);
    doc.text("HUB TRAFFIC SHEET", 14, 35);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'normal');
    
    // Use the dd-mmm-yyyy formatter here
    const formattedReportDate = selectedDate ? formatToResortDate(selectedDate) : 'All Dates';
    const currentTime = new Date();
    const formattedTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    const formattedGenDate = `${formatToResortDate(currentTime)}, ${formattedTime}`;

    doc.text(`Date: ${formattedReportDate}`, 14, 42);
    doc.text(`Generated: ${formattedGenDate}`, 14, 47);

    // Summary Box
    doc.setDrawColor(200);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 52, 269, 14, 2, 2, 'FD');
    doc.setFontSize(10);
    doc.setTextColor(50);
    doc.text(`Total: ${filteredRequests.length} | Pending: ${pendingCount} | In Progress: ${inProgressCount} | Completed: ${filteredRequests.filter(r => r.status === 'Completed').length}`, 18, 61);

    // Table
    const tableBody = filteredRequests.map(req => [
      req.roomNumber,
      req.guestName,
      req.category,
      req.status,
      req.description,
      req.loggedBy,
      new Date(req.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: true}),
      req.remarks || '-',
      req.updatedBy || '-',
      req.updatedAt ? new Date(req.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: true}) : '-'
    ]);

    autoTable(doc, {
      startY: 75,
      head: [['Room', 'Guest', 'Category', 'Status', 'Description', 'Logged By', 'Log Time', 'Remarks', 'Updated By', 'Update Time']],
      body: tableBody,
      headStyles: { 
          fillColor: [0, 139, 139],
          fontSize: 8,
          fontStyle: 'bold'
      },
      alternateRowStyles: { fillColor: [240, 248, 248] },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: { 
        4: { cellWidth: 40 },
        7: { cellWidth: 40 }
      }
    });

    window.open(doc.output('bloburl'), '_blank');
  };

  const sortedRequests = [...filteredRequests].sort((a, b) => {
      const priorityOrder = { High: 3, Medium: 2, Low: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto md:h-[calc(100vh-140px)] h-auto flex flex-col">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Clock className="text-nova-teal" /> Guest Requests
          </h2>
          <p className="text-gray-500">Track and manage guest requests for the selected day.</p>
        </div>
        <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full md:w-auto bg-nova-teal text-white px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-teal-700 transition-all flex items-center justify-center gap-2"
        >
            <Plus size={20} /> New Request
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                  <p className="text-sm text-gray-500 font-medium mb-1">Pending Actions</p>
                  <h3 className="text-2xl font-bold text-gray-800">{pendingCount}</h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-600">
                  <Clock size={20} />
              </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                  <p className="text-sm text-gray-500 font-medium mb-1">In Progress</p>
                  <h3 className="text-2xl font-bold text-gray-800">{inProgressCount}</h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <Wrench size={20} />
              </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                  <p className="text-sm text-gray-500 font-medium mb-1">High Priority</p>
                  <h3 className="text-2xl font-bold text-red-600">{highPriorityCount}</h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600 animate-pulse">
                  <AlertTriangle size={20} />
              </div>
          </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-1 md:overflow-hidden h-auto">
          <div className="p-4 border-b border-gray-100 flex flex-col gap-4 bg-gray-50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                       <div 
                        className="flex items-center bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm w-full md:w-auto cursor-pointer hover:border-nova-teal group transition-colors"
                        onClick={() => dateInputRef.current?.showPicker()}
                       >
                           <Calendar size={16} className="text-gray-400 mr-2 flex-shrink-0 group-hover:text-nova-teal" />
                           <input 
                              ref={dateInputRef}
                              type="date" 
                              className="text-sm outline-none text-gray-900 bg-transparent w-full cursor-pointer font-medium"
                              value={selectedDate}
                              onChange={(e) => setSelectedDate(e.target.value)}
                           />
                           {selectedDate && (
                             <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDate('');
                                }}
                                className="ml-2 text-gray-400 hover:text-red-500 transition-colors p-1"
                                title="Clear date filter"
                             >
                               <RotateCcw size={14} />
                             </button>
                           )}
                       </div>
                       <button 
                          onClick={handleExportPDF}
                          disabled={filteredRequests.length === 0}
                          className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 hover:text-nova-teal hover:border-nova-teal transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto shadow-sm"
                          title="Generate Hub Traffic Sheet PDF"
                       >
                           <FileDown size={18} /> Export Report
                       </button>
                  </div>
                  
                  <div className="relative w-full md:w-64">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                       <input 
                         type="text" 
                         placeholder="Search room, guest..." 
                         className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-nova-teal w-full text-gray-900 bg-white shadow-sm"
                         value={searchTerm}
                         onChange={(e) => setSearchTerm(e.target.value)}
                       />
                  </div>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {(['All', 'Pending', 'In Progress', 'Completed'] as const).map(status => (
                      <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${
                            filterStatus === status 
                            ? 'bg-nova-teal text-white border-nova-teal shadow-sm' 
                            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 shadow-sm'
                        }`}
                      >
                          {status}
                      </button>
                  ))}
              </div>
          </div>

          <div className="md:flex-1 md:overflow-y-auto p-4 space-y-3">
              {sortedRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 md:h-full text-gray-400">
                      <Clock size={48} className="mb-2 opacity-20" />
                      <p>No requests found matching your criteria.</p>
                      <p className="text-xs text-gray-400 mt-1">Try changing the date or filters.</p>
                  </div>
              ) : (
                  sortedRequests.map(req => (
                      <div key={req.id} className="bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                          <div className={`absolute top-0 left-0 right-0 h-1.5 md:h-full md:w-1.5 md:right-auto md:bottom-0 ${req.priority === 'High' ? 'bg-red-500' : req.priority === 'Medium' ? 'bg-orange-400' : 'bg-green-400'}`}></div>
                          
                          <div className="p-4 pt-5 md:pt-4 md:pl-6 flex flex-col md:flex-row gap-4 items-start md:items-center">
                            <div className="flex-1 min-w-0 w-full">
                                <div className="flex items-center gap-3 mb-1 flex-wrap">
                                    <span className="font-bold text-lg text-gray-800">Rm {req.roomNumber}</span>
                                    <span className="text-gray-400 text-sm flex items-center gap-1">
                                        <User size={12} /> {req.guestName}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${getPriorityColor(req.priority)}`}>
                                        {req.priority}
                                    </span>
                                </div>
                                <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2 text-sm text-gray-600 mb-1">
                                    <span className="flex items-center gap-1 font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded w-fit">
                                        {getCategoryIcon(req.category)} {req.category}
                                    </span>
                                    <span className="hidden md:inline text-gray-300">•</span>
                                    <span className="break-words font-medium">{req.description}</span>
                                </div>
                                
                                {req.remarks && (
                                    <div className="text-xs text-teal-600 italic bg-teal-50/50 px-2 py-1 rounded border border-teal-100 flex items-start gap-1.5 mb-1 max-w-xl">
                                        <MessageSquare size={12} className="mt-0.5 flex-shrink-0" />
                                        <span>Remarks: {req.remarks}</span>
                                    </div>
                                )}

                                <div className="flex items-center gap-3 text-[10px] md:text-xs text-gray-400 mt-1 flex-wrap">
                                    <span>Logged: {new Date(req.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: true})} by <span className="text-gray-600 font-medium">{req.loggedBy}</span></span>
                                    {req.updatedBy && (
                                        <span className="text-teal-600 font-medium">Updated: {new Date(req.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: true})} by {req.updatedBy}</span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 self-end md:self-center w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-gray-50 pt-3 md:pt-0 mt-2 md:mt-0">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(req.status)}`}>
                                    {req.status}
                                </span>
                                
                                <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-100">
                                    {req.status === 'Pending' && (
                                        <button 
                                            onClick={() => setUpdatingRequest({ id: req.id, nextStatus: 'In Progress' })}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" 
                                            title="Start"
                                        >
                                            <Wrench size={18} />
                                        </button>
                                    )}
                                    {req.status !== 'Completed' && req.status !== 'Cancelled' && (
                                        <button 
                                            onClick={() => setUpdatingRequest({ id: req.id, nextStatus: 'Completed' })}
                                            className="p-2 text-green-600 hover:bg-green-50 rounded-md transition-colors" 
                                            title="Complete"
                                        >
                                            <CheckCircle2 size={18} />
                                        </button>
                                    )}
                                    {req.status !== 'Completed' && req.status !== 'Cancelled' && (
                                        <button 
                                            onClick={() => setUpdatingRequest({ id: req.id, nextStatus: 'Cancelled' })}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors" 
                                            title="Cancel"
                                        >
                                            <X size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>
                          </div>
                      </div>
                  ))
              )}
          </div>
      </div>

      {/* Status Update Remarks Modal */}
      {updatingRequest && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-down">
                  <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <h3 className="text-lg font-bold text-gray-800">Change Status: {updatingRequest.nextStatus}</h3>
                      <button onClick={() => setUpdatingRequest(null)} className="text-gray-400 hover:text-gray-600">
                          <X size={20} />
                      </button>
                  </div>
                  <form onSubmit={handleConfirmStatusUpdate} className="p-6 space-y-4">
                      <p className="text-sm text-gray-500">Adding remarks is recommended for status changes.</p>
                      <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Remarks / Action Taken</label>
                          <textarea 
                              autoFocus
                              rows={3}
                              placeholder="e.g. Assigned to Housekeeping attendant Ahmed..."
                              className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-nova-teal resize-none text-sm text-gray-900 bg-white"
                              value={statusRemarks}
                              onChange={(e) => setStatusRemarks(e.target.value)}
                          />
                      </div>
                      <div className="flex gap-3">
                          <button 
                              type="button" 
                              onClick={() => setUpdatingRequest(null)}
                              className="flex-1 py-2.5 text-gray-500 hover:bg-gray-100 rounded-xl font-medium"
                          >
                              Cancel
                          </button>
                          <button 
                              type="submit" 
                              className="flex-1 py-2.5 bg-nova-teal text-white rounded-xl font-bold shadow-lg hover:bg-teal-700 transition-all"
                          >
                              Update Status
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Add Modal */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-slide-down my-auto">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <h3 className="text-lg font-bold text-gray-800">Log New Guest Request</h3>
                      <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                          <X size={20} />
                      </button>
                  </div>
                  <form onSubmit={handleSubmit} className="p-6 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Room Number</label>
                              <input 
                                  type="text" 
                                  required
                                  placeholder="e.g. 101"
                                  className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:border-nova-teal text-gray-900 bg-white"
                                  value={newRoom}
                                  onChange={(e) => setNewRoom(e.target.value)}
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Guest Name</label>
                              <input 
                                  type="text" 
                                  required
                                  placeholder="e.g. Mr. Smith"
                                  className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:border-nova-teal text-gray-900 bg-white"
                                  value={newGuest}
                                  onChange={(e) => setNewGuest(e.target.value)}
                              />
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                              <select 
                                  className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:border-nova-teal bg-white text-gray-900"
                                  value={newCategory}
                                  onChange={(e) => setNewCategory(e.target.value)}
                              >
                                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Priority</label>
                              <select 
                                  className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:border-nova-teal bg-white text-gray-900"
                                  value={newPriority}
                                  onChange={(e) => setNewPriority(e.target.value as RequestPriority)}
                              >
                                  <option value="Low">Low</option>
                                  <option value="Medium">Medium</option>
                                  <option value="High">High</option>
                              </select>
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
                          <textarea 
                              required
                              rows={3}
                              placeholder="Describe the request details..."
                              className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:border-nova-teal resize-none text-gray-900 bg-white"
                              value={newDesc}
                              onChange={(e) => setNewDesc(e.target.value)}
                          />
                      </div>

                      <div className="pt-2 flex justify-end gap-3">
                          <button 
                              type="button" 
                              onClick={() => setIsModalOpen(false)}
                              className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm font-medium"
                          >
                              Cancel
                          </button>
                          <button 
                              type="submit" 
                              className="px-6 py-2 bg-nova-teal text-white rounded-lg text-sm font-bold shadow-lg hover:bg-teal-700 transition-all"
                          >
                              Log Request
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};