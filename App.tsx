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
import { Menu, Search, Bell, LogOut } from 'lucide-react';
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
                const dbTmpls = INITIAL_TASK_TEMPLATES.map(t => ({
                    id: t.id,
                    label: t.label,
                    category: t.category,
                    shift_type: t.shiftType
                }));
                await supabase.from('task_templates').insert(dbTmpls);
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
                    loggedBy: d.logged_by
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
                 // PGRST116 is "The result contains 0 rows"
                 // Seed default settings
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
             // Find assignment for today
             const userAssignment = rosterAssignments.find(a => a.userId === currentUser.id && a.date === todayYMD);
             // Default to Morning if no assignment found, otherwise use assigned shift
             const targetShiftType = userAssignment ? userAssignment.shiftType : 'Morning';
             
             // Get Occupancy
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
                 // Determine if we need to reset tasks (if type changed or no tasks exist)
                 const typeChanged = prev.type !== targetShiftType;
                 const hasTasks = prev.tasks.length > 0;
                 
                 return {
                     ...prev,
                     type: targetShiftType,
                     agentName: currentUser.name,
                     occupancy: todayOcc,
                     // If type changed or no tasks, use new tasks. Otherwise keep existing progress
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

    // --- USER MANAGEMENT (Supabase) ---
    const addUser = async (user: Omit<User, 'id'>) => {
        const newUser = { ...user, id: `u-${Date.now()}` };
        const { error } = await supabase.from('users').insert([newUser]);
        
        if (!error) {
            setUsers([...users, newUser]);
        } else {
            alert('Failed to add user to database.');
            console.error(error);
        }
    };
    
    const editUser = async (user: User) => {
        const { error } = await supabase.from('users').update(user).eq('id', user.id);
        
        if (!error) {
            setUsers(users.map(u => u.id === user.id ? user : u));
        } else {
            alert('Failed to update user.');
            console.error(error);
        }
    };
    
    const deleteUser = async (id: string) => {
        const { error } = await supabase.from('users').delete().eq('id', id);
        
        if (!error) {
            setUsers(users.filter(u => u.id !== id));
        } else {
             alert('Failed to delete user.');
             console.error(error);
        }
    };

    // --- ROSTER MANAGEMENT (Supabase) ---
    const handleSaveRoster = async (newAssignments: ShiftAssignment[]) => {
        // Map to DB format (camelCase -> snake_case)
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
        } else {
            alert('Failed to save roster.');
            console.error(error);
        }
    };

    // --- OCCUPANCY MANAGEMENT (Supabase) ---
    const handleUpdateOccupancy = async (newData: DailyOccupancy[]) => {
        const { error } = await supabase.from('occupancy').upsert(newData);
        
        if (!error) {
            setOccupancyData(newData);
        } else {
            alert('Failed to save occupancy data.');
            console.error(error);
        }
    };

    // --- CHECKLIST TEMPLATES (Supabase) ---
    const handleAddTemplate = async (tmpl: Omit<TaskTemplate, 'id'>) => {
        const newTmpl = { ...tmpl, id: `t-${Date.now()}` };
        const dbTmpl = {
            id: newTmpl.id,
            label: newTmpl.label,
            category: newTmpl.category,
            shift_type: newTmpl.shiftType
        };

        const { error } = await supabase.from('task_templates').insert([dbTmpl]);
        
        if (!error) {
            setTemplates([...templates, newTmpl]);
        } else {
            alert('Failed to add template.');
            console.error(error);
        }
    };

    const handleDeleteTemplate = async (id: string) => {
        const { error } = await supabase.from('task_templates').delete().eq('id', id);
        
        if (!error) {
            setTemplates(templates.filter(t => t.id !== id));
        } else {
            alert('Failed to delete template.');
            console.error(error);
        }
    };

    // --- GUEST REQUESTS (Supabase) ---
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
                loggedBy: data.logged_by
            }, ...guestRequests]);
        }
    };

    const handleUpdateRequest = async (id: string, updates: Partial<GuestRequest>) => {
        const dbUpdates: any = {};
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.priority) dbUpdates.priority = updates.priority;
        if (updates.roomNumber) dbUpdates.room_number = updates.roomNumber;
        if (updates.guestName) dbUpdates.guest_name = updates.guestName;
        if (updates.description) dbUpdates.description = updates.description;
        if (updates.category) dbUpdates.category = updates.category;
        dbUpdates.updated_at = new Date().toISOString();

        const { data } = await supabase.from('guest_requests').update(dbUpdates).eq('id', id).select().single();
        if (data) {
            setGuestRequests(prev => prev.map(r => r.id === id ? { ...r, ...updates, updatedAt: data.updated_at } : r));
        }
    };

    // --- SETTINGS MANAGEMENT (Supabase) ---
    const handleSaveSettings = async (newConfig: AppConfig) => {
        const { error } = await supabase.from('settings').upsert({
            id: 'global',
            app_name: newConfig.appName,
            logo_url: newConfig.logoUrl,
            support_message: newConfig.supportMessage
        });

        if (!error) {
            setAppConfig(newConfig);
        } else {
            alert('Failed to save settings.');
            console.error(error);
        }
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
        <div className="flex bg-gray-50 min-h-screen font-sans text-gray-900">
             <Sidebar currentView={currentView} setCurrentView={setCurrentView} userRole={currentUser.role} appConfig={appConfig} />
             
             <div className="flex-1 md:ml-64 transition-all duration-300">
                 {/* Top Header */}
                 <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-20">
                     <div className="md:hidden">
                         <Menu />
                     </div>
                     <div className="flex items-center gap-4 ml-auto">
                         <button className="p-2 text-gray-400 hover:text-nova-teal transition-colors relative">
                             <Bell size={20} />
                             {guestRequests.filter(r => r.status === 'Pending').length > 0 && (
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                             )}
                         </button>
                         <div className="h-8 w-px bg-gray-100 mx-2"></div>
                         <div className="flex items-center gap-3">
                             <div className="text-right hidden sm:block">
                                 <p className="text-sm font-bold text-gray-800">{currentUser.name}</p>
                                 <p className="text-xs text-gray-500">{currentUser.role}</p>
                             </div>
                             <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${currentUser.color}`}>
                                 {currentUser.initials}
                             </div>
                             <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors ml-2" title="Logout">
                                 <LogOut size={20} />
                             </button>
                         </div>
                     </div>
                 </div>

                 <div className="p-6">
                     {renderContent()}
                 </div>
             </div>
        </div>
    );
};