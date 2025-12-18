import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { Checklist } from './components/Checklist';
import { Login } from './components/Login';
import { UserManagement } from './components/UserManagement';
import { ShiftManagement } from './components/ShiftManagement';
import { ChecklistManagement } from './components/ChecklistManagement';
import { OccupancyManagement } from './components/OccupancyManagement';
import { Settings } from './components/Settings';
import { ShiftHistory } from './components/ShiftHistory';
import { GuestRequests } from './components/GuestRequests';
import { ShiftData, ShiftType, TaskCategory, Task, User, ShiftAssignment, AppConfig, TaskTemplate, DailyOccupancy, GuestRequest } from './types';
import { Menu, Search, Bell, LogOut, X } from 'lucide-react';
import { supabase } from './services/supabaseClient';

// --- Default Data (Fallbacks & Seeds) ---
const INITIAL_USERS: User[] = [
  { id: 'u1', username: 'Ahmed.Ihsaan', name: 'Ahmed Ihsaan', role: 'Front Office Manager', initials: 'AI', color: 'bg-purple-100 text-purple-600', password: 'password123' },
  { id: 'u2', username: 'Michael.Chen', name: 'Michael Chen', role: 'Asst. FOM', initials: 'MC', color: 'bg-blue-100 text-blue-600', password: 'password123' },
  { id: 'u3', username: 'Ahmed.R', name: 'Ahmed R.', role: 'Senior GSA', initials: 'AR', color: 'bg-teal-100 text-teal-600', password: 'password123' },
];

const DEFAULT_SHIFTS = ['Morning', 'Afternoon', 'Night'];

const DEFAULT_CATEGORIES = [
  'Front Desk Operations',
  'Lobby & Ambiance',
  'Guest Relations',
  'Back Office & Reports',
  'Health & Safety'
];

const INITIAL_TASK_TEMPLATES: TaskTemplate[] = [
    { id: 'c1', label: 'Read Logbook & Handover', category: 'Front Desk Operations', shiftType: 'ALL' },
    { id: 'c2', label: 'Check Float/Cash', category: 'Front Desk Operations', shiftType: 'ALL' },
    { id: 'c3', label: 'Lobby Cleanliness Check', category: 'Lobby & Ambiance', shiftType: 'ALL' },
    { id: 'm1', label: 'Print Arrivals Report', category: 'Back Office & Reports', shiftType: 'Morning' },
    { id: 'm2', label: 'Check VIP Amenities Setup', category: 'Guest Relations', shiftType: 'Morning' },
    { id: 'm3', label: 'Morning Briefing', category: 'Front Desk Operations', shiftType: 'Morning' },
    { id: 'n1', label: 'Run Night Audit', category: 'Back Office & Reports', shiftType: 'Night' },
];

const getTodayStr = () => new Date().toISOString().split('T')[0];

const INITIAL_ROSTER_ASSIGNMENTS: ShiftAssignment[] = [
    { id: 'r1', date: getTodayStr(), shiftType: 'Morning', userId: 'u1' }
];

// Generate mock occupancy for current week
const generateInitialOccupancy = (): DailyOccupancy[] => {
    const today = new Date();
    const data: DailyOccupancy[] = [];
    for (let i = -7; i < 14; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        data.push({
            date: d.toISOString().split('T')[0],
            percentage: 60 + Math.floor(Math.random() * 30),
            notes: i === 0 ? 'Full House expected' : ''
        });
    }
    return data;
};

export const App: React.FC = () => {
    // App State
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [currentView, setCurrentView] = useState('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [users, setUsers] = useState<User[]>(INITIAL_USERS);
    const [appConfig, setAppConfig] = useState<AppConfig>({
        appName: 'Nova Maldives | Front Office',
        logoUrl: '',
        supportMessage: 'Contact IT for support.'
    });

    // Operational Data State
    const [shiftTypes, setShiftTypes] = useState<string[]>(DEFAULT_SHIFTS);
    const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
    const [templates, setTemplates] = useState<TaskTemplate[]>(INITIAL_TASK_TEMPLATES);
    const [rosterAssignments, setRosterAssignments] = useState<ShiftAssignment[]>(INITIAL_ROSTER_ASSIGNMENTS);
    const [occupancyData, setOccupancyData] = useState<DailyOccupancy[]>(generateInitialOccupancy());
    const [guestRequests, setGuestRequests] = useState<GuestRequest[]>([]);

    // Current Shift State
    const [currentShift, setCurrentShift] = useState<ShiftData>({
        id: 's1',
        type: 'Morning',
        date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
        tasks: [],
        status: 'active',
        agentName: '',
        occupancy: 75,
        notes: ''
    });

    // --- SUPABASE DATA FETCHING & SEEDING ---
    useEffect(() => {
        const fetchAllData = async () => {
            // 1. Fetch Users
            const { data: userData, error: userError } = await supabase.from('users').select('*');
            
            if (userError) {
                console.warn("Supabase Users Error (using local defaults):", userError.message);
                // Keep INITIAL_USERS as fallback
            } else if (userData && userData.length > 0) {
                setUsers(userData);
            } else {
                // Table exists but is empty. Seed default users.
                console.log("Seeding empty database with default users...");
                const { error: seedError } = await supabase.from('users').insert(INITIAL_USERS);
                if (!seedError) {
                    setUsers(INITIAL_USERS);
                } else {
                    console.error("Failed to seed users:", seedError);
                }
            }

            // 2. Fetch Templates
            const { data: tmplData } = await supabase.from('task_templates').select('*');
            if (tmplData && tmplData.length > 0) {
                const mappedTmpl = tmplData.map((t: any) => ({
                    id: t.id,
                    label: t.label,
                    category: t.category,
                    shiftType: t.shift_type
                }));
                setTemplates(mappedTmpl);
            } else if (tmplData && tmplData.length === 0) {
                // Seed templates if empty
                const dbTmplls = INITIAL_TASK_TEMPLATES.map(t => ({
                    id: t.id,
                    label: t.label,
                    category: t.category,
                    shift_type: t.shiftType
                }));
                await supabase.from('task_templates').insert(dbTmplls);
            }

            // 3. Fetch Roster
            const { data: rosterData } = await supabase.from('roster_assignments').select('*');
            if (rosterData && rosterData.length > 0) {
                const mappedRoster = rosterData.map((r: any) => ({
                    id: r.id,
                    date: r.date,
                    shiftType: r.shift_type,
                    userId: r.user_id
                }));
                setRosterAssignments(mappedRoster);
            }

            // 4. Fetch Occupancy
            const { data: occData } = await supabase.from('occupancy').select('*');
            if (occData && occData.length > 0) {
                setOccupancyData(occData);
            }

            // 5. Fetch Guest Requests
            const { data: reqData } = await supabase
                .from('guest_requests')
                .select('*')
                .order('created_at', { ascending: false });

            if (reqData) {
                const mappedRequests: GuestRequest[] = reqData.map((d: any) => ({
                    id: d.id,
                    roomNumber: d.room_number,
                    guestName: d.guest_name,
                    category: d.category,
                    description: d.description,
                    status: d.status,
                    priority: d.priority,
                    createdAt: d.created_at,
                    updatedAt: d.updated_at,
                    loggedBy: d.logged_by,
                    remarks: d.remarks,
                    updatedBy: d.updated_by
                }));
                setGuestRequests(mappedRequests);
            }

            // 6. Fetch Settings
            const { data: settingsData, error: settingsError } = await supabase.from('settings').select('*').eq('id', 'global').single();
            if (settingsData) {
                setAppConfig({
                    appName: settingsData.app_name,
                    logoUrl: settingsData.logo_url || '',
                    supportMessage: settingsData.support_message || ''
                });
            } else if (settingsError && settingsError.code === 'PGRST116') {
                 const defaultConfig = {
                     id: 'global',
                     app_name: 'Nova Maldives | Front Office',
                     logo_url: '',
                     support_message: 'Contact IT for support.'
                 };
                 await supabase.from('settings').insert([defaultConfig]);
            }
        };

        fetchAllData();
    }, []);

    // Initialize shift tasks when user logs in
    useEffect(() => {
        if (currentUser) {
             const todayYMD = getTodayStr();
             const userAssignment = rosterAssignments.find(a => a.userId === currentUser.id && a.date === todayYMD);
             const targetShiftType = userAssignment ? userAssignment.shiftType : 'Morning';
             
             const todayOcc = occupancyData.find(d => d.date === todayYMD)?.percentage || 75;

             const shiftTasks = templates
                .filter(t => t.shiftType === 'ALL' || t.shiftType === targetShiftType)
                .map(t => ({
                    id: `t-${Date.now()}-${t.id}`,
                    label: t.label,
                    category: t.category,
                    isCompleted: false
                }));
             
             setCurrentShift(prev => {
                 const typeChanged = prev.type !== targetShiftType;
                 const hasTasks = prev.tasks.length > 0;
                 
                 return {
                     ...prev,
                     type: targetShiftType,
                     agentName: currentUser.name,
                     occupancy: todayOcc,
                     tasks: (hasTasks && !typeChanged) ? prev.tasks : shiftTasks
                 };
             });
        }
    }, [currentUser?.id, templates, rosterAssignments, occupancyData]);

    const handleLogin = (user: User) => {
        setCurrentUser(user);
        if (user.role === 'Management') {
            setCurrentView('guest-requests');
        } else {
            setCurrentView('dashboard');
        }
    };

    const handleLogout = () => {
        setCurrentUser(null);
        setCurrentView('dashboard');
        setIsSidebarOpen(false);
    };

    const startNewShift = (type: ShiftType, assignee?: User) => {
        const todayYMD = getTodayStr();
        const todayOcc = occupancyData.find(d => d.date === todayYMD)?.percentage || 75;

        const newTasks = templates
            .filter(t => t.shiftType === 'ALL' || t.shiftType === type)
            .map(t => ({
                id: `t-${Date.now()}-${t.id}`,
                label: t.label,
                category: t.category,
                isCompleted: false
            }));

        setCurrentShift({
            id: `s-${Date.now()}`,
            type: type,
            date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
            tasks: newTasks,
            status: 'active',
            agentName: assignee ? assignee.name : (currentUser?.name || ''),
            occupancy: todayOcc,
            notes: ''
        });
    };

    const toggleTask = (taskId: string) => {
        setCurrentShift(prev => ({
            ...prev,
            tasks: prev.tasks.map(t => t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t)
        }));
    };

    const updateNotes = (notes: string) => {
        setCurrentShift(prev => ({ ...prev, notes }));
    };

    // --- USER MANAGEMENT ---
    const addUser = async (user: Omit<User, 'id'>) => {
        const newUser = { ...user, id: `u-${Date.now()}` };
        const { error } = await supabase.from('users').insert([newUser]);
        if (!error) setUsers([...users, newUser]);
    };
    
    const editUser = async (user: User) => {
        const { error } = await supabase.from('users').update(user).eq('id', user.id);
        if (!error) setUsers(users.map(u => u.id === user.id ? user : u));
    };
    
    const deleteUser = async (id: string) => {
        const { error } = await supabase.from('users').delete().eq('id', id);
        if (!error) setUsers(users.filter(u => u.id !== id));
    };

    // --- ROSTER MANAGEMENT ---
    const handleSaveRoster = async (newAssignments: ShiftAssignment[]) => {
        const dbAssignments = newAssignments.map(a => ({
            id: a.id,
            date: a.date,
            shift_type: a.shiftType,
            user_id: a.userId
        }));
        const { error } = await supabase.from('roster_assignments').upsert(dbAssignments);
        if (!error) {
            setRosterAssignments(newAssignments);
            alert('Roster saved successfully.');
        }
    };

    // --- OCCUPANCY MANAGEMENT ---
    const handleUpdateOccupancy = async (newData: DailyOccupancy[]) => {
        const { error } = await supabase.from('occupancy').upsert(newData);
        if (!error) setOccupancyData(newData);
    };

    // --- CHECKLIST TEMPLATES ---
    const handleAddTemplate = async (tmpl: Omit<TaskTemplate, 'id'>) => {
        const newTmpl = { ...tmpl, id: `t-${Date.now()}` };
        const dbTmpl = {
            id: newTmpl.id,
            label: newTmpl.label,
            category: newTmpl.category,
            shift_type: newTmpl.shiftType
        };
        const { error } = await supabase.from('task_templates').insert([dbTmpl]);
        if (!error) setTemplates([...templates, newTmpl]);
    };

    const handleDeleteTemplate = async (id: string) => {
        const { error } = await supabase.from('task_templates').delete().eq('id', id);
        if (!error) setTemplates(templates.filter(t => t.id !== id));
    };

    // --- GUEST REQUESTS ---
    const handleAddRequest = async (request: Omit<GuestRequest, 'id' | 'createdAt' | 'updatedAt' | 'loggedBy'>) => {
        const user = currentUser?.name || 'Unknown Agent';
        const payload = {
            room_number: request.roomNumber,
            guest_name: request.guestName,
            category: request.category,
            description: request.description,
            status: request.status,
            priority: request.priority,
            logged_by: user
        };
        const { data, error } = await supabase.from('guest_requests').insert([payload]).select().single();
        if (error) {
            console.error("Error adding request:", error.message);
            alert("Failed to add request. Please try again.");
            return;
        }
        if (data) {
            setGuestRequests([{
                id: data.id,
                roomNumber: data.room_number,
                guestName: data.guest_name,
                category: data.category,
                description: data.description,
                status: data.status,
                priority: data.priority,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
                loggedBy: data.logged_by,
                remarks: data.remarks,
                updatedBy: data.updated_by
            }, ...guestRequests]);
        }
    };

    const handleUpdateRequest = async (id: string, updates: Partial<GuestRequest>) => {
        const dbUpdates: any = {};
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.priority) dbUpdates.priority = updates.priority;
        // Ensure we send values to Supabase if they exist, even if columns might be missing (Supabase will error out but we handle it)
        if (updates.remarks !== undefined) dbUpdates.remarks = updates.remarks;
        if (updates.updatedBy !== undefined) dbUpdates.updated_by = updates.updatedBy;
        dbUpdates.updated_at = new Date().toISOString();
        
        const { data, error } = await supabase.from('guest_requests').update(dbUpdates).eq('id', id).select().single();
        
        if (error) {
            console.error("Error updating request:", error.message);
            // If the columns updated_by or remarks don't exist, we might get an error. 
            // We should still update local state for the parts that did work or provide feedback.
            alert(`Failed to update request: ${error.message}`);
            return;
        }
        
        if (data) {
          setGuestRequests(prev => prev.map(r => r.id === id ? { 
            ...r, 
            ...updates, 
            updatedAt: data.updated_at,
            remarks: data.remarks,
            updatedBy: data.updated_by
          } : r));
        } else {
            // Fallback: If data is null but no error, update local state optimistically
            setGuestRequests(prev => prev.map(r => r.id === id ? { 
                ...r, 
                ...updates, 
                updatedAt: dbUpdates.updated_at
            } : r));
        }
    };

    // --- SETTINGS MANAGEMENT ---
    const handleSaveSettings = async (newConfig: AppConfig) => {
        const { error } = await supabase.from('settings').upsert({
            id: 'global',
            app_name: newConfig.appName,
            logo_url: newConfig.logoUrl,
            support_message: newConfig.supportMessage
        });
        if (!error) setAppConfig(newConfig);
    };

    if (!currentUser) {
        return <Login users={users} onLogin={handleLogin} appConfig={appConfig} />;
    }

    const renderContent = () => {
        switch(currentView) {
            case 'dashboard':
                return <Dashboard 
                    currentShift={currentShift} 
                    startNewShift={startNewShift} 
                    openChecklist={() => setCurrentView('checklist')} 
                    users={users}
                    currentUser={currentUser}
                    availableShifts={shiftTypes}
                    occupancyData={occupancyData}
                />;
            case 'checklist':
                return <Checklist 
                    shift={currentShift} 
                    onToggleTask={toggleTask}
                    onUpdateNotes={updateNotes}
                    onEndShift={() => alert('Shift Ended')}
                />;
            case 'guest-requests':
                return <GuestRequests 
                    requests={guestRequests}
                    onRequestAdd={handleAddRequest}
                    onRequestUpdate={handleUpdateRequest}
                    logoUrl={appConfig.logoUrl}
                    currentUser={currentUser}
                />;
            case 'shift-management':
                return <ShiftManagement 
                    users={users}
                    currentShift={currentShift}
                    onAssignShift={() => {}}
                    initialAssignments={rosterAssignments}
                    onSaveRoster={handleSaveRoster}
                    availableShifts={shiftTypes}
                />;
            case 'occupancy':
                return <OccupancyManagement 
                    occupancyData={occupancyData}
                    onUpdateOccupancy={handleUpdateOccupancy}
                />;
            case 'checklist-management':
                 return <ChecklistManagement 
                    templates={templates}
                    availableShifts={shiftTypes}
                    availableCategories={categories}
                    onAddTemplate={handleAddTemplate}
                    onDeleteTemplate={handleDeleteTemplate}
                    onAddShift={(s) => setShiftTypes([...shiftTypes, s])}
                    onDeleteShift={(s) => setShiftTypes(shiftTypes.filter(st => st !== s))}
                    onAddCategory={(c) => setCategories([...categories, c])}
                    onDeleteCategory={(c) => setCategories(categories.filter(cat => cat !== c))}
                 />;
            case 'users':
                return <UserManagement 
                    users={users}
                    onAddUser={addUser}
                    onEditUser={editUser}
                    onDeleteUser={deleteUser}
                />;
             case 'admin':
                return <AdminDashboard />;
             case 'history':
                return <ShiftHistory />;
             case 'settings':
                return <Settings userRole={currentUser.role} config={appConfig} onSave={handleSaveSettings} />;
            default:
                return <Dashboard 
                    currentShift={currentShift} 
                    startNewShift={startNewShift} 
                    openChecklist={() => setCurrentView('checklist')}
                    users={users}
                    currentUser={currentUser}
                    availableShifts={shiftTypes}
                    occupancyData={occupancyData}
                />;
        }
    };

    return (
        <div className="flex bg-gray-50 min-h-screen font-sans text-gray-900 relative overflow-x-hidden">
             {/* Mobile Backdrop */}
             {isSidebarOpen && (
                 <div 
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden animate-fade-in"
                    onClick={() => setIsSidebarOpen(false)}
                 ></div>
             )}

             <Sidebar 
                currentView={currentView} 
                setCurrentView={(view) => {
                    setCurrentView(view);
                    setIsSidebarOpen(false);
                }} 
                userRole={currentUser.role} 
                appConfig={appConfig}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
             />
             
             <div className="flex-1 md:ml-64 transition-all duration-300 w-full">
                 {/* Top Header */}
                 <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-20">
                     <button 
                        className="md:hidden p-2 text-gray-600 hover:text-nova-teal transition-colors"
                        onClick={() => setIsSidebarOpen(true)}
                     >
                         <Menu size={24} />
                     </button>
                     
                     <div className="flex items-center gap-4 ml-auto">
                         <button className="p-2 text-gray-400 hover:text-nova-teal transition-colors relative">
                             <Bell size={20} />
                             {guestRequests.filter(r => r.status === 'Pending').length > 0 && (
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                             )}
                         </button>
                         <div className="h-8 w-px bg-gray-100 mx-1 md:mx-2"></div>
                         <div className="flex items-center gap-2 md:gap-3">
                             <div className="text-right hidden lg:block">
                                 <p className="text-sm font-bold text-gray-800">{currentUser.name}</p>
                                 <p className="text-xs text-gray-500">{currentUser.role}</p>
                             </div>
                             <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm text-xs md:text-sm ${currentUser.color}`}>
                                 {currentUser.initials}
                             </div>
                             <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Logout">
                                 <LogOut size={20} />
                             </button>
                         </div>
                     </div>
                 </div>

                 <div className="p-4 md:p-6">
                     {renderContent()}
                 </div>
             </div>
        </div>
    );
};
