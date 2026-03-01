import React, { useState } from 'react';
import { RepeaterGuest, User as AppUser } from '../types';
import { Search, Plus, Edit2, Trash2, User, Home, Calendar, Star, MessageSquare, X, Save, Filter, Download, FileText, RotateCcw, Users, Trash } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface RepeaterGuestsProps {
  guests: RepeaterGuest[];
  onAddGuest: (guest: Omit<RepeaterGuest, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => Promise<void>;
  onUpdateGuest: (id: string, updates: Partial<RepeaterGuest>) => Promise<void>;
  onDeleteGuest: (id: string) => Promise<void>;
  currentUser: AppUser;
  logoUrl?: string;
}

// Helper to calculate status based on dates
const calculateStatus = (arrival: string, departure: string): RepeaterGuest['status'] => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  
  const arrDate = new Date(arrival);
  const depDate = new Date(departure);
  
  const arr = new Date(arrDate.getFullYear(), arrDate.getMonth(), arrDate.getDate()).getTime();
  const dep = new Date(depDate.getFullYear(), depDate.getMonth(), depDate.getDate()).getTime();

  if (today < arr) return 'Expected';
  if (today === dep) return 'Due-Out';
  if (today > dep) return 'Checked-Out';
  if (today >= arr && today < dep) return 'In-House';
  
  return 'Expected';
};

// Helper to format date to DD-MM-YYYY
const formatDate = (dateStr: string) => {
  if (!dateStr || dateStr === '-') return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

export const RepeaterGuests: React.FC<RepeaterGuestsProps> = ({ 
  guests, 
  onAddGuest, 
  onUpdateGuest, 
  onDeleteGuest,
  currentUser,
  logoUrl
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'In-House' | 'Expected' | 'Checked-Out'>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<RepeaterGuest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [guestNames, setGuestNames] = useState<string[]>(['']);
  const [roomNumber, setRoomNumber] = useState('');
  const [roomMove, setRoomMove] = useState('');
  const [visitCount, setVisitCount] = useState(1);
  const [lastVisitDate, setLastVisitDate] = useState('');
  const [arrivalDate, setArrivalDate] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [preferences, setPreferences] = useState('');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setGuestNames(['']);
    setRoomNumber('');
    setRoomMove('');
    setVisitCount(1);
    setLastVisitDate('');
    setArrivalDate('');
    setDepartureDate('');
    setPreferences('');
    setNotes('');
    setEditingGuest(null);
  };

  const handleAddSharer = () => {
    setGuestNames([...guestNames, '']);
  };

  const handleRemoveSharer = (index: number) => {
    if (guestNames.length > 1) {
      setGuestNames(guestNames.filter((_, i) => i !== index));
    }
  };

  const handleGuestNameChange = (index: number, value: string) => {
    const newNames = [...guestNames];
    newNames[index] = value;
    setGuestNames(newNames);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (guest: RepeaterGuest) => {
    setEditingGuest(guest);
    setGuestNames(guest.guestNames || []);
    setRoomNumber(guest.roomNumber);
    setRoomMove(guest.roomMove || '');
    setVisitCount(guest.visitCount);
    setLastVisitDate(guest.lastVisitDate || '');
    setArrivalDate(guest.arrivalDate);
    setDepartureDate(guest.departureDate);
    setPreferences(guest.preferences || '');
    setNotes(guest.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const guestData = {
        guestNames: guestNames.filter(name => name.trim() !== ''),
        roomNumber,
        roomMove,
        visitCount,
        lastVisitDate,
        arrivalDate,
        departureDate,
        preferences,
        notes
      };

      if (editingGuest) {
        await onUpdateGuest(editingGuest.id, guestData);
      } else {
        await onAddGuest(guestData);
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving guest:", error);
      alert("Failed to save guest details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredGuests = guests.map(g => ({
    ...g,
    status: calculateStatus(g.arrivalDate, g.departureDate)
  })).filter(g => {
    const namesString = g.guestNames.join(' ').toLowerCase();
    const matchesSearch = namesString.includes(searchTerm.toLowerCase()) || 
                         g.roomNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || g.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (s: string) => {
    switch(s) {
      case 'In-House': return 'bg-green-100 text-green-700 border-green-200';
      case 'Due-Out': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Expected': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Checked-Out': return 'bg-gray-100 text-gray-600 border-gray-200';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const exportInHousePDF = () => {
    const inHouse = guests.filter(g => calculateStatus(g.arrivalDate, g.departureDate) === 'In-House' || calculateStatus(g.arrivalDate, g.departureDate) === 'Due-Out');
    
    const doc = new jsPDF({ orientation: 'landscape' });
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(0, 128, 128); // Nova Teal
    doc.text('In-House Repeater Guests Report', 14, 22);

    if (logoUrl) {
      try {
        const isDataUri = logoUrl.startsWith('data:image/');
        const format = isDataUri ? logoUrl.split(';')[0].split('/')[1].toUpperCase() : 'PNG';
        doc.addImage(logoUrl, format, 250, 5, 35, 35);
      } catch (e) {
        console.warn("Could not add logo to PDF:", e);
      }
    }
    
    const now = new Date();
    const generatedDate = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${generatedDate}`, 14, 30);
    
    const tableData = inHouse.map(g => [
      g.roomNumber || 'TBA',
      g.roomMove || '-',
      g.guestNames.join('\n'),
      g.visitCount.toString(),
      formatDate(g.arrivalDate),
      formatDate(g.departureDate),
      formatDate(g.lastVisitDate),
      calculateStatus(g.arrivalDate, g.departureDate),
      g.preferences || '-'
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['Room', 'Room Move', 'Guest Names', 'Visits', 'Arrival', 'Departure', 'Last Visit', 'Status', 'Remarks']],
      body: tableData,
      headStyles: { fillColor: [0, 128, 128] },
      styles: { fontSize: 8 },
      columnStyles: {
        2: { cellWidth: 50 },
        8: { cellWidth: 50 }
      }
    });

    doc.save(`InHouse_Repeaters_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Star className="text-nova-accent" />
            Repeater Guest Management
          </h2>
          <p className="text-gray-500 text-sm">Track and maintain in-house repeater guest experiences</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={exportInHousePDF}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-sm"
          >
            <FileText size={20} className="text-nova-teal" />
            In-House PDF
          </button>
          <button 
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-nova-teal text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-teal-100 hover:bg-teal-700 transition-all"
          >
            <Plus size={20} />
            Add Repeater
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            placeholder="Search by name or room number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-nova-teal/20 focus:border-nova-teal transition-all text-sm"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter size={18} className="text-gray-400" />
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nova-teal/20 focus:border-nova-teal transition-all"
          >
            <option value="All">All Status</option>
            <option value="In-House">In-House</option>
            <option value="Due-Out">Due-Out</option>
            <option value="Expected">Expected</option>
            <option value="Checked-Out">Checked-Out</option>
          </select>
        </div>
      </div>

      {/* Guest Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Guest Details</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Room</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Room Move</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Visits</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Stay Period</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredGuests.length > 0 ? filteredGuests.map((guest) => (
                <tr key={guest.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-nova-sand/30 flex items-center justify-center text-nova-teal font-bold">
                        {guest.guestNames[0]?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{guest.guestNames[0]}</p>
                        {guest.guestNames.length > 1 && (
                          <p className="text-[10px] text-gray-500 flex items-center gap-1">
                            <Users size={10} /> +{guest.guestNames.length - 1} Sharer(s)
                          </p>
                        )}
                        {guest.preferences && (
                          <p className="text-[10px] text-nova-teal font-medium flex items-center gap-1">
                            <MessageSquare size={10} /> Has Preferences
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-gray-600 font-medium">
                      <Home size={14} className="text-gray-400" />
                      {guest.roomNumber || 'TBA'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600 font-medium">
                      {guest.roomMove || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-nova-sand text-nova-teal">
                      {guest.visitCount} Visits
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-gray-600 space-y-0.5">
                      <p className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                        {formatDate(guest.arrivalDate)}
                      </p>
                      <p className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                        {formatDate(guest.departureDate)}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(guest.status)}`}>
                      {guest.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleOpenEdit(guest)}
                        className="p-2 text-gray-400 hover:text-nova-teal hover:bg-teal-50 rounded-lg transition-all"
                        title="Edit Guest"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => {
                          if(confirm('Are you sure you want to delete this repeater record?')) {
                            onDeleteGuest(guest.id);
                          }
                        }}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete Guest"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-gray-400">
                    <div className="flex flex-col items-center">
                      <User size={48} className="opacity-10 mb-4" />
                      <p className="font-medium">No repeater guests found.</p>
                      <p className="text-xs">Try adjusting your search or add a new record.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="text-xl font-bold text-gray-800">
                  {editingGuest ? 'Edit Repeater Guest' : 'Add New Repeater Guest'}
                </h3>
                <p className="text-xs text-gray-500">Enter guest details and stay information</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Guest Names / Sharers */}
                <div className="space-y-3 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Guest Names (Primary & Sharers)</label>
                    <button 
                      type="button" 
                      onClick={handleAddSharer}
                      className="text-nova-teal text-xs font-bold flex items-center gap-1 hover:underline"
                    >
                      <Plus size={14} /> Add Sharer
                    </button>
                  </div>
                  <div className="space-y-2">
                    {guestNames.map((name, index) => (
                      <div key={index} className="relative flex items-center gap-2">
                        <div className="relative flex-1">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <input 
                            required={index === 0}
                            type="text"
                            value={name}
                            onChange={(e) => handleGuestNameChange(index, e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-nova-teal/20 focus:border-nova-teal outline-none transition-all text-sm"
                            placeholder={index === 0 ? "Primary Guest Name" : "Sharer Name"}
                          />
                        </div>
                        {index > 0 && (
                          <button 
                            type="button" 
                            onClick={() => handleRemoveSharer(index)}
                            className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash size={18} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Room Number */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Room Number</label>
                  <div className="relative">
                    <Home className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="text"
                      value={roomNumber}
                      onChange={(e) => setRoomNumber(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-nova-teal/20 focus:border-nova-teal outline-none transition-all text-sm"
                      placeholder="e.g. 101"
                    />
                  </div>
                </div>

                {/* Room Move */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Room Move</label>
                  <div className="relative">
                    <RotateCcw className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="text"
                      value={roomMove}
                      onChange={(e) => setRoomMove(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-nova-teal/20 focus:border-nova-teal outline-none transition-all text-sm"
                      placeholder="e.g. 205"
                    />
                  </div>
                </div>

                {/* Visit Count */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Number of Visits</label>
                  <div className="relative">
                    <Star className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      required
                      type="number"
                      min="1"
                      value={visitCount}
                      onChange={(e) => setVisitCount(parseInt(e.target.value))}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-nova-teal/20 focus:border-nova-teal outline-none transition-all text-sm"
                    />
                  </div>
                </div>

                {/* Last Visit Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Last Visit Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      required
                      type="date"
                      value={lastVisitDate}
                      onChange={(e) => setLastVisitDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-nova-teal/20 focus:border-nova-teal outline-none transition-all text-sm"
                    />
                  </div>
                </div>

                {/* Arrival Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Arrival Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      required
                      type="date"
                      value={arrivalDate}
                      onChange={(e) => setArrivalDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-nova-teal/20 focus:border-nova-teal outline-none transition-all text-sm"
                    />
                  </div>
                </div>

                {/* Departure Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Departure Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      required
                      type="date"
                      value={departureDate}
                      onChange={(e) => setDepartureDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-nova-teal/20 focus:border-nova-teal outline-none transition-all text-sm"
                    />
                  </div>
                </div>

                {/* Preferences */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Guest Preferences</label>
                  <textarea 
                    value={preferences}
                    onChange={(e) => setPreferences(e.target.value)}
                    rows={3}
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-nova-teal/20 focus:border-nova-teal outline-none transition-all text-sm"
                    placeholder="e.g. Prefers high floor, extra pillows, allergic to nuts..."
                  />
                </div>

                {/* Notes */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Internal Notes</label>
                  <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-nova-teal/20 focus:border-nova-teal outline-none transition-all text-sm"
                    placeholder="Internal FO notes..."
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 bg-nova-teal text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-teal-100 hover:bg-teal-700 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <Save size={18} />
                  )}
                  {editingGuest ? 'Update Guest' : 'Save Guest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
