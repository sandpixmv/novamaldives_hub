import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Checklist } from './components/Checklist';
import { Login } from './components/Login';
import { UserManagement } from './components/UserManagement';
import { ChecklistManagement } from './components/ChecklistManagement';
import { OccupancyManagement } from './components/OccupancyManagement';
import { Settings } from './components/Settings';
import { ChecklistHistory } from './components/ChecklistHistory';
import { GuestRequests } from './components/GuestRequests';
import { Reports } from './components/Reports';
import { ShiftData, ShiftType, TaskCategory, Task, User, ShiftAssignment, AppConfig, TaskTemplate, DailyOccupancy, GuestRequest } from './types';
import { Menu, LogOut, Bell, AlertCircle, X } from 'lucide-react';
import { supabase } from './services/supabaseClient';

// --- Utils ---
export const getOperationalDate = () => {
  const now = new Date();
  const operationalDate = new Date(now);
  
  // Refresh at 08:00 AM daily.
  if (now.getHours() < 8) {
    operationalDate.setDate(now.getDate() - 1);
  }
  
  const year = operationalDate.getFullYear();
  const month = String(operationalDate.getMonth() + 1).padStart(2, '0');
  const day = String(operationalDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const SHIFT_DEFINITIONS = [
  { name: 'Morning', range: '07:00 - 16:00' },
  { name: 'Afternoon', range: '14:00 - 23:00' },
  { name: 'Night', range: '23:00 - 07:00' }
];

const INITIAL_USERS: User[] = [
  { id: 'u1', username: 'Ahmed.Ihsaan', name: 'Ahmed Ihsaan', role: 'Front Office Manager', initials: 'AI', color: 'bg-purple-100 text-purple-600', password: 'password123', isActive: true },
];

export const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [currentView, setCurrentView] = useState('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [users, setUsers] = useState<User[]>(INITIAL_USERS);
    const [appConfig, setAppConfig] = useState<AppConfig>({
        appName: 'The HUB | Nova Maldives',
        logoUrl: '',
        supportMessage: 'Contact IT for support.'
    });

    const [shiftTypes, setShiftTypes] = useState<string[]>(SHIFT_DEFINITIONS.map(s => `${s.name} Shift (${s.range})`));
    const [templates, setTemplates] = useState<TaskTemplate[]>([]);
    const [occupancyData, setOccupancyData] = useState<DailyOccupancy[]>([]);
    const [guestRequests, setGuestRequests] = useState<GuestRequest[]>([]);
    const [submittedShiftsToday, setSubmittedShiftsToday] = useState<string[]>([]);
    const [categories, setCategories] = useState<TaskCategory[]>([]);
    const [overdueRequests, setOverdueRequests] = useState<GuestRequest[]>([]);
    const [notifiedRequestIds, setNotifiedRequestIds] = useState<Set<string>>(new Set());

    const [currentShift, setCurrentShift] = useState<ShiftData>({
        id: 's1',
        type: 'Morning Shift (07:00 - 16:00)',
        date: getOperationalDate(),
        tasks: [],
        status: 'draft',
        agentName: '',
        occupancy: 75,
        notes: ''
    });

    const handleLogin = (user: User) => setCurrentUser(user);
    const handleLogout = () => { setCurrentUser(null); setCurrentView('dashboard'); };

    const fetchAllData = async () => {
        try {
            const opDate = getOperationalDate();
            
            const { data: userData, error: userError } = await supabase.from('users').select('*');
            if (userError) console.error("Error fetching users:", userError);
            
            if (userData) {
              const dbUsers: User[] = userData.map(u => ({
                id: u.id,
                username: u.username,
                name: u.name,
                role: u.role,
                initials: u.initials,
                color: u.color,
                password: u.password,
                isActive: u.is_active !== undefined ? u.is_active : true
              }));

              // Merge initial users with DB users, preferring DB users if usernames clash
              setUsers(prev => {
                const merged = [...dbUsers];
                INITIAL_USERS.forEach(initUser => {
                  if (!merged.find(u => u.username.toLowerCase() === initUser.username.toLowerCase())) {
                    merged.push(initUser);
                  }
                });
                return merged;
              });
            }

            const { data: tmplData } = await supabase.from('task_templates').select('*');
            if (tmplData) {
              const mappedTemplates = tmplData.map((t: any) => ({
                  id: t.id, label: t.label, category: t.category, shiftType: t.shift_type
              }));
              setTemplates(mappedTemplates);
            }

            const { data: occData } = await supabase.from('occupancy').select('*');
            if (occData) setOccupancyData(occData);

            const { data: subData } = await supabase.from('completed_shifts').select('shift_type').eq('date', opDate).eq('status', 'submitted');
            if (subData) setSubmittedShiftsToday(subData.map((s: any) => s.shift_type));

            const { data: grData } = await supabase.from('guest_requests').select('*').order('created_at', { ascending: false });
            if (grData) setGuestRequests(grData.map(r => ({
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

            const { data: catData } = await supabase.from('task_categories').select('name').order('name');
            if (catData?.length) {
                setCategories(catData.map(c => c.name));
            } else {
                setCategories(['Arrivals', 'Departures', 'Operations', 'Cashiering', 'Concierge']);
            }

            const { data: settingsData } = await supabase.from('settings').select('*').eq('id', 'global').maybeSingle();
            if (settingsData) setAppConfig({
                appName: settingsData.app_name || 'The HUB | Nova Maldives',
                logoUrl: settingsData.logo_url || '',
                supportMessage: settingsData.support_message || ''
            });
        } catch (err) {
            console.error("Error fetching data:", err);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    // Check for overdue guest requests (not completed within 10 minutes)
    useEffect(() => {
        if (!currentUser) return;

        const checkOverdue = () => {
            const now = new Date();
            const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

            const newOverdue = guestRequests.filter(req => {
                if (req.status === 'Completed' || req.status === 'Cancelled') return false;
                const createdAt = new Date(req.createdAt);
                return createdAt < tenMinutesAgo && !notifiedRequestIds.has(req.id);
            });

            if (newOverdue.length > 0) {
                setOverdueRequests(prev => {
                    // Only add if not already in overdue list
                    const existingIds = new Set(prev.map(r => r.id));
                    const uniqueNew = newOverdue.filter(r => !existingIds.has(r.id));
                    return [...prev, ...uniqueNew];
                });
            }
        };

        const interval = setInterval(checkOverdue, 30000); // Check every 30 seconds
        checkOverdue(); // Initial check

        return () => clearInterval(interval);
    }, [guestRequests, notifiedRequestIds, currentUser]);

    const dismissNotification = (id: string) => {
        setOverdueRequests(prev => prev.filter(r => r.id !== id));
        setNotifiedRequestIds(prev => new Set(prev).add(id));
    };

    const initTasksForShift = (type: string, user: User, latestTemplates?: TaskTemplate[]): ShiftData => {
        const opDate = getOperationalDate();
        const todayOcc = occupancyData.find(d => d.date === opDate)?.percentage || 75;
        
        // Ensure we handle both short names (Morning) and long names (Morning Shift...)
        const baseType = (type || '').split(' ')[0].toUpperCase(); 
        const activeTemplates = latestTemplates || templates;

        const shiftTasks = activeTemplates
           .filter(t => {
               const target = (t.shiftType || '').toUpperCase();
               return target === 'ALL' || 
                      target === baseType || 
                      target === type.toUpperCase() ||
                      type.toUpperCase().includes(target);
           })
           .map(t => ({
               id: `t-${Date.now()}-${t.id}`,
               label: t.label,
               category: t.category,
               isCompleted: false
           }));

        return {
            id: `s-${Date.now()}`,
            type: type || 'Morning Shift (07:00 - 16:00)',
            date: opDate,
            tasks: shiftTasks,
            status: 'draft',
            agentName: user.name,
            occupancy: todayOcc,
            notes: ''
        };
    };

    // Auto-select shift on load or template refresh
    useEffect(() => {
        if (currentUser && templates.length > 0 && currentShift.tasks.length === 0) {
            const hour = new Date().getHours();
            let targetType = SHIFT_DEFINITIONS[0];
            
            if (hour >= 23 || hour < 8) {
                targetType = SHIFT_DEFINITIONS[2]; // Night
            } else if (hour >= 14 && hour < 23) {
                targetType = SHIFT_DEFINITIONS[1]; // Afternoon
            } else {
                targetType = SHIFT_DEFINITIONS[0]; // Morning
            }

            const fullTypeName = `${targetType.name} Shift (${targetType.range})`;
            handleShiftTypeChange(fullTypeName, templates);
        }
    }, [currentUser?.id, templates]);

    const handleShiftTypeChange = async (type: string, latestTemplates?: TaskTemplate[]) => {
        if (!currentUser) return;
        const opDate = getOperationalDate();
        
        // Always generate a fresh set based on current templates
        let newShift = initTasksForShift(type, currentUser, latestTemplates);
        
        try {
            const { data: record } = await supabase
                .from('completed_shifts')
                .select('tasks_json, notes, agent_name, status, date')
                .eq('date', opDate)
                .eq('shift_type', type)
                .maybeSingle();
            
            if (record) {
                const savedTasks: Task[] = JSON.parse(record.tasks_json || '[]');
                
                // If there are saved tasks, use them. Otherwise, keep the template-initialized tasks.
                if (savedTasks.length > 0) {
                    newShift.tasks = savedTasks;
                }
                
                newShift.notes = record.notes || '';
                newShift.agentName = record.agent_name || newShift.agentName;
                newShift.status = record.status === 'submitted' ? 'submitted' : 'draft';
                newShift.date = record.date;
            }
        } catch (err) {
            console.error("Error fetching shift details:", err);
        }
        
        setCurrentShift(newShift);
    };

    const handleReopenShift = async (date: string, shiftType: string) => {
        if (!currentUser) return;
        const isManager = currentUser.role === 'Front Office Manager' || currentUser.role === 'Asst. FOM';
        if (!isManager) {
            alert("Unauthorized. Manager access required.");
            return;
        }

        if (!window.confirm(`Unlock ${shiftType} on ${date}?`)) return;

        try {
            const { error } = await supabase.from('completed_shifts').update({ status: 'draft' }).eq('date', date).eq('shift_type', shiftType);
            if (error) throw error;
            setSubmittedShiftsToday(prev => prev.filter(t => t !== shiftType));
            if (currentShift.type === shiftType && currentShift.date === date) {
                setCurrentShift(prev => ({ ...prev, status: 'draft' }));
            }
        } catch (err) {
            alert("Failed to reopen shift.");
        }
    };

    const saveShift = async (isFinal: boolean) => {
      if (!currentUser) return;
      const status = isFinal ? 'submitted' : 'draft';
      
      const payload = {
        shift_type: currentShift.type,
        agent_name: currentUser.name,
        date: currentShift.date,
        tasks_json: JSON.stringify(currentShift.tasks),
        notes: currentShift.notes,
        submitted_at: new Date().toISOString(),
        status: status
      };

      try {
        const { error } = await supabase.from('completed_shifts').upsert([payload], { onConflict: 'date,shift_type' });
        if (error) throw error;

        if (isFinal) {
            setSubmittedShiftsToday(prev => [...prev, currentShift.type]);
            setCurrentShift(prev => ({ ...prev, status: 'submitted' }));
            setCurrentView('dashboard');
        } else {
            setCurrentShift(prev => ({ ...prev, status: 'draft' }));
            alert("Progress saved.");
        }
      } catch (error: any) {
          alert("Error saving: " + error.message);
      }
    };

    const handleAddGuestRequest = async (request: Omit<GuestRequest, 'id' | 'createdAt' | 'updatedAt' | 'loggedBy'>) => {
        if (!currentUser) return;
        
        try {
            const newRequest = {
                room_number: request.roomNumber,
                guest_name: request.guestName,
                category: request.category,
                description: request.description,
                status: request.status,
                priority: request.priority,
                logged_by: currentUser.name,
            };

            const { data, error } = await supabase.from('guest_requests').insert([newRequest]).select();
            
            if (error) throw error;
            if (data) fetchAllData();
        } catch (err: any) {
            alert("Error adding request: " + err.message);
        }
    };

    const handleUpdateGuestRequest = async (id: string, updates: Partial<GuestRequest>) => {
        try {
            const dbUpdates: any = {};
            if (updates.status) dbUpdates.status = updates.status;
            if (updates.remarks) dbUpdates.remarks = updates.remarks;
            if (updates.updatedBy) dbUpdates.updated_by = updates.updatedBy;
            if (updates.assignedTo) dbUpdates.assigned_to = updates.assignedTo;

            const { error } = await supabase.from('guest_requests').update(dbUpdates).eq('id', id);
            
            if (error) throw error;
            fetchAllData();
        } catch (err: any) {
            alert("Error updating request: " + err.message);
        }
    };

    const handleAddCategory = async (name: string) => {
        try {
            const { error } = await supabase.from('task_categories').insert([{ name }]);
            if (error) throw error;
            setCategories(prev => [...prev, name].sort());
        } catch (err: any) {
            alert("Error adding category: " + err.message);
        }
    };

    const handleDeleteCategory = async (name: string) => {
        if (!window.confirm(`Are you sure you want to delete category "${name}"? Existing tasks in this category will remain but the category will be removed from future selection.`)) return;
        try {
            const { error } = await supabase.from('task_categories').delete().eq('name', name);
            if (error) throw error;
            setCategories(prev => prev.filter(c => c !== name));
        } catch (err: any) {
            alert("Error deleting category: " + err.message);
        }
    };

    const toggleTask = (taskId: string) => {
        if (currentShift.status === 'submitted') return;
        setCurrentShift(prev => ({
            ...prev,
            tasks: prev.tasks.map(t => t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t)
        }));
    };

    return (
        currentUser ? (
        <div className="flex bg-gray-50 min-h-screen font-sans text-gray-900 relative overflow-x-hidden">
             {isSidebarOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>}
             <Sidebar currentView={currentView} setCurrentView={(view) => { setCurrentView(view); setIsSidebarOpen(false); }} userRole={currentUser.role} appConfig={appConfig} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
             <div className="flex-1 md:ml-64 transition-all duration-300 w-full">
                 <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-20">
                     <button className="md:hidden p-2 text-gray-600 hover:text-nova-teal" onClick={() => setIsSidebarOpen(true)}> <Menu size={24} /> </button>
                     <div className="flex items-center gap-4 ml-auto">
                         <div className="flex items-center gap-3">
                             <div className="text-right hidden lg:block">
                                 <p className="text-sm font-bold text-gray-800">{currentUser.name}</p>
                                 <p className="text-xs text-gray-500">{currentUser.role}</p>
                             </div>
                             <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-white ${currentUser.color}`}> {currentUser.initials} </div>
                             <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500" title="Logout"> <LogOut size={20} /> </button>
                         </div>
                     </div>
                 </div>
                 <div className="p-4 md:p-6 relative"> 
                    {/* Overdue Notifications Popup */}
                    {overdueRequests.length > 0 && (
                        <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 max-w-sm w-full animate-slide-up">
                            {overdueRequests.map(req => (
                                <div key={req.id} className="bg-white border-l-4 border-red-500 rounded-lg shadow-2xl p-4 flex items-start gap-3 relative overflow-hidden group border border-gray-100">
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => dismissNotification(req.id)} className="text-gray-400 hover:text-gray-600 p-1">
                                            <X size={16} />
                                        </button>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500 flex-shrink-0 animate-pulse">
                                        <Bell size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-red-600 text-[10px] flex items-center gap-1 uppercase tracking-wider">
                                                <AlertCircle size={12} /> Overdue
                                            </span>
                                            <span className="text-[10px] text-gray-400 font-medium">
                                                {Math.floor((new Date().getTime() - new Date(req.createdAt).getTime()) / 60000)}m ago
                                            </span>
                                        </div>
                                        <p className="text-sm font-bold text-gray-800 truncate">Room {req.roomNumber}</p>
                                        <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{req.description}</p>
                                        <div className="mt-3 flex gap-2">
                                            <button 
                                                onClick={() => {
                                                    setCurrentView('guest-requests');
                                                    dismissNotification(req.id);
                                                }}
                                                className="text-[10px] font-bold uppercase tracking-wider bg-red-500 text-white px-3 py-1.5 rounded hover:bg-red-600 transition-colors shadow-sm"
                                            >
                                                View
                                            </button>
                                            <button 
                                                onClick={() => dismissNotification(req.id)}
                                                className="text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-gray-600 px-2 py-1.5"
                                            >
                                                Dismiss
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {(() => {
                        switch(currentView) {
                            case 'dashboard': return <Dashboard currentShift={currentShift} startNewShift={()=>{}} openChecklist={() => setCurrentView('checklist')} users={users} currentUser={currentUser} availableShifts={shiftTypes} occupancyData={occupancyData} guestRequests={guestRequests} onShiftTypeChange={(t) => handleShiftTypeChange(t)} onOpenView={(view) => setCurrentView(view)} />;
                            case 'checklist': return <Checklist shift={currentShift} availableShiftTypes={shiftTypes} submittedShiftsToday={submittedShiftsToday} userRole={currentUser.role} onToggleTask={toggleTask} onUpdateNotes={(n) => setCurrentShift(prev => ({...prev, notes: n}))} onShiftTypeChange={(t) => handleShiftTypeChange(t)} onSubmitShift={() => saveShift(true)} onSaveDraft={() => saveShift(false)} onReopenShift={() => handleReopenShift(currentShift.date, currentShift.type)} />;
                            case 'checklist-history': return <ChecklistHistory userRole={currentUser.role} onReopenShift={handleReopenShift} appConfig={appConfig} />;
                            case 'guest-requests': return <GuestRequests requests={guestRequests} onRequestAdd={handleAddGuestRequest} onRequestUpdate={handleUpdateGuestRequest} logoUrl={appConfig.logoUrl} currentUser={currentUser} />;
                            case 'reports': return <Reports appConfig={appConfig} />;
                            case 'users': return <UserManagement users={users} onAddUser={async (u) => { 
                                try {
                                    const dbUser = { 
                                        username: u.username, 
                                        name: u.name, 
                                        role: u.role, 
                                        initials: u.initials, 
                                        color: u.color, 
                                        password: u.password, 
                                        is_active: u.isActive 
                                    };
                                    const { data, error } = await supabase.from('users').insert([dbUser]).select(); 
                                    if (error) throw error;
                                    if (data) {
                                        setUsers(prev => [...prev, { 
                                            id: data[0].id,
                                            username: data[0].username,
                                            name: data[0].name,
                                            role: data[0].role,
                                            initials: data[0].initials,
                                            color: data[0].color,
                                            password: data[0].password,
                                            isActive: data[0].is_active 
                                        } as User]); 
                                    }
                                } catch (err: any) {
                                    alert("Error creating user: " + err.message);
                                    throw err;
                                }
                            }} onEditUser={async (u) => { 
                                try {
                                    const dbUser = { 
                                      username: u.username, 
                                      name: u.name, 
                                      role: u.role, 
                                      initials: u.initials, 
                                      color: u.color, 
                                      password: u.password, 
                                      is_active: u.isActive 
                                    };
                                    const { error } = await supabase.from('users').update(dbUser).eq('id', u.id); 
                                    if (error) throw error;
                                    setUsers(prev => prev.map(usr => usr.id === u.id ? u : usr)); 
                                } catch (err: any) {
                                    alert("Error updating user: " + err.message);
                                    throw err;
                                }
                            }} onDeleteUser={async (id) => { 
                                try {
                                    const { error } = await supabase.from('users').delete().eq('id', id); 
                                    if (error) throw error;
                                    setUsers(prev => prev.filter(u => u.id !== id)); 
                                } catch (err: any) {
                                    alert("Error deleting user: " + err.message);
                                }
                            }} />;
                            case 'occupancy': return <OccupancyManagement occupancyData={occupancyData} onUpdateOccupancy={async (d) => { await supabase.from('occupancy').upsert(d); setOccupancyData(d); }} />;
                            case 'checklist-management': return <ChecklistManagement templates={templates} availableShifts={shiftTypes} availableCategories={categories} onAddTemplate={async (t) => { const {data} = await supabase.from('task_templates').insert([{label: t.label, category: t.category, shift_type: t.shiftType}]).select(); if(data) setTemplates(prev => [...prev, {id: data[0].id, label: data[0].label, category: data[0].category, shiftType: data[0].shift_type}]); }} onDeleteTemplate={async (id) => { await supabase.from('task_templates').delete().eq('id', id); setTemplates(prev => prev.filter(t => t.id !== id)); }} onAddShift={()=>{}} onDeleteShift={()=>{}} onAddCategory={handleAddCategory} onDeleteCategory={handleDeleteCategory} />;
                            case 'settings': return <Settings userRole={currentUser.role} config={appConfig} onSave={async (c) => { await supabase.from('settings').upsert({id: 'global', app_name: c.appName, logo_url: c.logoUrl, support_message: c.supportMessage}); setAppConfig(c); }} />;
                            default: return <Dashboard currentShift={currentShift} startNewShift={()=>{}} openChecklist={() => setCurrentView('checklist')} users={users} currentUser={currentUser} availableShifts={shiftTypes} occupancyData={occupancyData} guestRequests={guestRequests} onShiftTypeChange={(t) => handleShiftTypeChange(t)} onOpenView={(view) => setCurrentView(view)} />;
                        }
                    })()}
                 </div>
             </div>
        </div>
        ) : (
          <Login users={users} onLogin={handleLogin} appConfig={appConfig} />
        )
    );
};