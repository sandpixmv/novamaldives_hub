import React, { useState, useEffect, useRef } from 'react';
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
import { RepeaterGuests } from './components/RepeaterGuests';
import { Reports } from './components/Reports';
import { UserProfile } from './components/UserProfile';
import { ShiftData, ShiftType, TaskCategory, Task, User, ShiftAssignment, AppConfig, TaskTemplate, DailyOccupancy, GuestRequest, RepeaterGuest, UserRightsConfig, UserRightKey } from './types';
import { Menu, LogOut, Bell, AlertCircle, X, RefreshCw } from 'lucide-react';
import { supabase } from './services/supabaseClient';
import { fetchUserRightsConfig, saveUserRightsConfig, hasUserRight, getInitialRightsConfig } from './services/permissions';

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
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        try {
            const saved = localStorage.getItem('hub_current_user');
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            console.error("Error reading currentUser from localStorage", e);
            return null;
        }
    });
    const [currentView, setCurrentView] = useState('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [users, setUsers] = useState<User[]>(INITIAL_USERS);
    const [appConfig, setAppConfig] = useState<AppConfig>({
        appName: 'The HUB | Nova Maldives',
        logoUrl: '',
        loginBgUrl: '',
        loginFont: 'Righteous',
        supportMessage: 'Contact IT for support.'
    });

    const [shiftTypes, setShiftTypes] = useState<string[]>(SHIFT_DEFINITIONS.map(s => `${s.name} Shift (${s.range})`));
    const [templates, setTemplates] = useState<TaskTemplate[]>([]);
    const [occupancyData, setOccupancyData] = useState<DailyOccupancy[]>([]);
    const [guestRequests, setGuestRequests] = useState<GuestRequest[]>([]);
    const [repeaterGuests, setRepeaterGuests] = useState<RepeaterGuest[]>([]);
    const [submittedShiftsToday, setSubmittedShiftsToday] = useState<string[]>([]);
    const [categories, setCategories] = useState<TaskCategory[]>([]);
    const [overdueRequests, setOverdueRequests] = useState<GuestRequest[]>([]);
    const [notifiedRequestIds, setNotifiedRequestIds] = useState<Set<string>>(new Set());
    const [rightsConfig, setRightsConfig] = useState<UserRightsConfig>(getInitialRightsConfig);

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

    const handleLogin = (user: User) => {
        setCurrentUser(user);
        try {
            localStorage.setItem('hub_current_user', JSON.stringify(user));
        } catch (e) {
            console.error("Error saving currentUser to localStorage", e);
        }
    };
    const handleLogout = () => {
        setCurrentUser(null);
        setCurrentView('dashboard');
        try {
            localStorage.removeItem('hub_current_user');
        } catch (e) {
            console.error("Error removing currentUser from localStorage", e);
        }
    };

    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [isSyncing, setIsSyncing] = useState(false);
    const [isLiveSyncEnabled, setIsLiveSyncEnabled] = useState<boolean>(() => {
        try {
            const saved = localStorage.getItem('hub_live_sync_mode');
            return saved !== 'false'; // Default to true (Live Sync Enabled)
        } catch {
            return true;
        }
    });

    const toggleLiveSync = () => {
        setIsLiveSyncEnabled(prev => {
            const next = !prev;
            try {
                localStorage.setItem('hub_live_sync_mode', String(next));
            } catch (e) {
                console.error("Failed to save live sync preference:", e);
            }
            if (next) {
                fetchAllData(true);
            }
            return next;
        });
    };

    const fetchAllData = async (silent = false) => {
        if (!silent) setIsSyncing(true);
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
                if (JSON.stringify(prev) === JSON.stringify(merged)) return prev;
                return merged;
              });
            }

            const { data: tmplData } = await supabase.from('task_templates').select('*');
            if (tmplData) {
              const mappedTemplates = tmplData.map((t: any) => ({
                  id: t.id, label: t.label, category: t.category, shiftType: t.shift_type
              }));
              setTemplates(prev => {
                if (JSON.stringify(prev) === JSON.stringify(mappedTemplates)) return prev;
                return mappedTemplates;
              });
            }

            const { data: occData } = await supabase.from('occupancy').select('*');
            if (occData) {
              setOccupancyData(prev => {
                if (JSON.stringify(prev) === JSON.stringify(occData)) return prev;
                return occData;
              });
            }

            const { data: subData } = await supabase.from('completed_shifts').select('shift_type').eq('date', opDate).eq('status', 'submitted');
            if (subData) {
              const mappedSub = subData.map((s: any) => s.shift_type);
              setSubmittedShiftsToday(prev => {
                if (JSON.stringify(prev) === JSON.stringify(mappedSub)) return prev;
                return mappedSub;
              });
            }

            const { data: grData } = await supabase.from('guest_requests').select('*').order('created_at', { ascending: false });
            if (grData) {
              const mappedGr = grData.map(r => ({
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
              }));
              setGuestRequests(prev => {
                if (JSON.stringify(prev) === JSON.stringify(mappedGr)) return prev;
                return mappedGr;
              });
            }

            const { data: rgData } = await supabase.from('repeater_guests').select('*').order('created_at', { ascending: false });
            if (rgData) {
              const mappedRg = rgData.map(r => ({
                id: r.id,
                guestNames: Array.isArray(r.guest_names) ? r.guest_names : [r.guest_name || 'Unknown'],
                roomNumber: r.room_number,
                roomMove: r.room_move,
                visitCount: r.visit_count,
                lastVisitDate: r.last_visit_date,
                preferences: r.preferences,
                arrivalDate: r.arrival_date,
                departureDate: r.departure_date,
                status: r.status,
                notes: r.notes,
                createdAt: r.created_at,
                updatedAt: r.updated_at
              }));
              setRepeaterGuests(prev => {
                if (JSON.stringify(prev) === JSON.stringify(mappedRg)) return prev;
                return mappedRg;
              });
            }

            const { data: catData } = await supabase.from('task_categories').select('name').order('name');
            if (catData?.length) {
                const mappedCats = catData.map(c => c.name);
                setCategories(prev => {
                    if (JSON.stringify(prev) === JSON.stringify(mappedCats)) return prev;
                    return mappedCats;
                });
            } else {
                setCategories(prev => {
                    const defaultCats = ['Arrivals', 'Departures', 'Operations', 'Cashiering', 'Concierge'];
                    if (JSON.stringify(prev) === JSON.stringify(defaultCats)) return prev;
                    return defaultCats;
                });
            }

            const { data: settingsData } = await supabase.from('settings').select('*').eq('id', 'global').maybeSingle();
            if (settingsData) {
              const newConfig = {
                appName: settingsData.app_name || 'The HUB | Nova Maldives',
                logoUrl: settingsData.logo_url || '',
                loginBgUrl: settingsData.login_bg_url || '',
                loginFont: (settingsData.login_font as any) || 'Righteous',
                supportMessage: settingsData.support_message || ''
              };
              setAppConfig(prev => {
                if (JSON.stringify(prev) === JSON.stringify(newConfig)) return prev;
                return newConfig;
              });
            }

            const fetchedRights = await fetchUserRightsConfig();
            setRightsConfig(prev => {
              if (JSON.stringify(prev) === JSON.stringify(fetchedRights)) return prev;
              return fetchedRights;
            });
            
            setLastUpdated(new Date());
        } catch (err) {
            console.error("Error fetching data:", err);
        } finally {
            if (!silent) setIsSyncing(false);
        }
    };

    const handleSaveRightsConfig = async (newConfig: UserRightsConfig) => {
        setRightsConfig(newConfig);
        const success = await saveUserRightsConfig(newConfig);
        return success;
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    // Live Sync Mode: Real-time subscriptions & gentle background sync
    useEffect(() => {
        if (!isLiveSyncEnabled) return;

        // Set up real-time postgres changes subscription across operational tables
        const channel = supabase
            .channel('hub_live_sync_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'guest_requests' }, () => {
                fetchAllData(true);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'repeater_guests' }, () => {
                fetchAllData(true);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'completed_shifts' }, () => {
                fetchAllData(true);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'occupancy' }, () => {
                fetchAllData(true);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => {
                fetchAllData(true);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
                fetchAllData(true);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'task_templates' }, () => {
                fetchAllData(true);
            })
            .subscribe();

        // Background sync every 20s as reliable fallback for connection drops
        const pollInterval = setInterval(() => {
            fetchAllData(true);
        }, 20000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(pollInterval);
        };
    }, [isLiveSyncEnabled]);

    const guestRequestsRef = useRef(guestRequests);
    const notifiedRequestIdsRef = useRef(notifiedRequestIds);

    useEffect(() => {
        guestRequestsRef.current = guestRequests;
    }, [guestRequests]);

    useEffect(() => {
        notifiedRequestIdsRef.current = notifiedRequestIds;
    }, [notifiedRequestIds]);

    // Check for overdue guest requests (not completed within 10 minutes)
    useEffect(() => {
        if (!currentUser) return;

        const checkOverdue = () => {
            const now = new Date();
            const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

            const currentRequests = guestRequestsRef.current;
            const currentNotified = notifiedRequestIdsRef.current;

            const newOverdue = currentRequests.filter(req => {
                if (req.status === 'Completed' || req.status === 'Cancelled') return false;
                const createdAt = new Date(req.createdAt);
                return createdAt < tenMinutesAgo && !currentNotified.has(req.id);
            });

            if (newOverdue.length > 0) {
                setOverdueRequests(prev => {
                    // Only add if not already in overdue list
                    const existingIds = new Set(prev.map(r => r.id));
                    const uniqueNew = newOverdue.filter(r => !existingIds.has(r.id));
                    if (uniqueNew.length === 0) return prev;
                    return [...prev, ...uniqueNew];
                });
            }
        };

        const interval = setInterval(checkOverdue, 30000); // Check every 30 seconds
        checkOverdue(); // Initial check

        return () => clearInterval(interval);
    }, [currentUser]);

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
        const canReopen = hasUserRight(currentUser, 'action_reopen_shift', rightsConfig);
        if (!canReopen) {
            alert("Unauthorized. Rights to unlock and reopen shifts required. Contact FOM / Admin.");
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

    const handleAddRepeaterGuest = async (guest: Omit<RepeaterGuest, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
        try {
            const dbGuest = {
                guest_names: guest.guestNames,
                guest_name: guest.guestNames[0], // For backward compatibility
                room_number: guest.roomNumber,
                room_move: guest.roomMove,
                visit_count: guest.visitCount,
                last_visit_date: guest.lastVisitDate,
                arrival_date: guest.arrivalDate,
                departure_date: guest.departureDate,
                preferences: guest.preferences,
                notes: guest.notes
            };

            const { data, error } = await supabase.from('repeater_guests').insert(dbGuest).select().single();
            if (error) throw error;

            if (data) {
                const newGuest: RepeaterGuest = {
                    id: data.id,
                    guestNames: data.guest_names,
                    roomNumber: data.room_number,
                    roomMove: data.room_move,
                    visitCount: data.visit_count,
                    lastVisitDate: data.last_visit_date,
                    arrivalDate: data.arrival_date,
                    departureDate: data.departure_date,
                    status: data.status,
                    preferences: data.preferences,
                    notes: data.notes,
                    createdAt: data.created_at,
                    updatedAt: data.updated_at
                };
                setRepeaterGuests(prev => [...prev, newGuest]);
            }
        } catch (err: any) {
            alert("Error adding repeater guest: " + err.message);
        }
    };

    const handleUpdateRepeaterGuest = async (id: string, updates: Partial<RepeaterGuest>) => {
        try {
            const dbUpdates: any = {};
            if (updates.guestNames) {
                dbUpdates.guest_names = updates.guestNames;
                dbUpdates.guest_name = updates.guestNames[0];
            }
            if (updates.roomNumber !== undefined) dbUpdates.room_number = updates.roomNumber;
            if (updates.roomMove !== undefined) dbUpdates.room_move = updates.roomMove;
            if (updates.visitCount !== undefined) dbUpdates.visit_count = updates.visitCount;
            if (updates.lastVisitDate !== undefined) dbUpdates.last_visit_date = updates.lastVisitDate;
            if (updates.arrivalDate) dbUpdates.arrival_date = updates.arrivalDate;
            if (updates.departureDate) dbUpdates.departure_date = updates.departureDate;
            if (updates.preferences !== undefined) dbUpdates.preferences = updates.preferences;
            if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
            
            dbUpdates.updated_at = new Date().toISOString();

            const { error } = await supabase.from('repeater_guests').update(dbUpdates).eq('id', id);
            if (error) throw error;

            setRepeaterGuests(prev => prev.map(g => g.id === id ? { ...g, ...updates, updatedAt: dbUpdates.updated_at } : g));
        } catch (err: any) {
            alert("Error updating repeater guest: " + err.message);
        }
    };

    const handleDeleteRepeaterGuest = async (id: string) => {
        try {
            const { error } = await supabase.from('repeater_guests').delete().eq('id', id);
            if (error) throw error;
            setRepeaterGuests(prev => prev.filter(g => g.id !== id));
        } catch (err: any) {
            alert("Error deleting repeater guest: " + err.message);
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
             <Sidebar 
                currentView={currentView} 
                setCurrentView={(view) => { setCurrentView(view); setIsSidebarOpen(false); }} 
                userRole={currentUser.role} 
                currentUser={currentUser}
                rightsConfig={rightsConfig}
                appConfig={appConfig} 
                isOpen={isSidebarOpen} 
                onClose={() => setIsSidebarOpen(false)} 
             />
             <div className="flex-1 md:ml-64 transition-all duration-300 w-full">
                 <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-20">
                     <button className="md:hidden p-2 text-gray-600 hover:text-nova-teal" onClick={() => setIsSidebarOpen(true)}> <Menu size={24} /> </button>
                     <div className="flex items-center gap-4 ml-auto">
                         <div className="flex items-center gap-3">
                             <button 
                                onClick={() => fetchAllData(false)} 
                                disabled={isSyncing}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-600 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 hover:text-nova-teal hover:border-nova-teal active:bg-gray-200 transition-all duration-200 disabled:opacity-50"
                                title="Refresh/Sync Data"
                             >
                                 <RefreshCw size={14} className={`${isSyncing ? 'animate-spin' : ''}`} />
                                 <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync'}</span>
                             </button>
                             <button 
                                onClick={() => setCurrentView('profile')}
                                className="flex items-center gap-3 hover:bg-gray-50 p-1 rounded-xl transition-colors text-left"
                             >
                                 <div className="text-right hidden lg:block">
                                     <p className="text-sm font-bold text-gray-800">{currentUser.name}</p>
                                     <p className="text-xs text-gray-500">{currentUser.role}</p>
                                 </div>
                                 <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-white ${currentUser.color}`}> {currentUser.initials} </div>
                             </button>
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
                        // Dynamic rights-based view protection
                        const VIEW_RIGHT_MAP: Record<string, UserRightKey> = {
                            'dashboard': 'view_dashboard',
                            'guest-requests': 'view_guest_requests',
                            'repeater-guests': 'view_repeater_guests',
                            'checklist': 'view_checklist',
                            'checklist-history': 'view_checklist_history',
                            'reports': 'view_reports',
                            'occupancy': 'view_occupancy',
                            'checklist-management': 'view_checklist_management',
                            'users': 'view_user_management',
                            'settings': 'view_settings',
                        };

                        const requiredRight = VIEW_RIGHT_MAP[currentView];
                        if (requiredRight && !hasUserRight(currentUser, requiredRight, rightsConfig)) {
                            return (
                                <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400 max-w-md mx-auto text-center p-6 animate-fade-in">
                                    <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mb-4 border border-amber-200 shadow-sm">
                                        <AlertCircle size={32} />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800">Access Restricted</h3>
                                    <p className="text-sm text-gray-500 mt-2">
                                        You do not currently have rights to access this module. Please contact your Front Office Manager or Administrator to request access.
                                    </p>
                                    <button 
                                        onClick={() => setCurrentView('dashboard')}
                                        className="mt-6 px-6 py-2.5 bg-nova-teal text-white rounded-xl font-bold shadow-lg shadow-teal-100 hover:bg-teal-700 transition-all text-sm"
                                    >
                                        Return to Dashboard
                                    </button>
                                </div>
                            );
                        }

                        switch(currentView) {
                            case 'dashboard': return <Dashboard currentShift={currentShift} startNewShift={()=>{}} openChecklist={() => setCurrentView('checklist')} users={users} currentUser={currentUser} availableShifts={shiftTypes} occupancyData={occupancyData} guestRequests={guestRequests} onShiftTypeChange={(t) => handleShiftTypeChange(t)} onOpenView={(view) => setCurrentView(view)} isSyncing={isSyncing} lastUpdated={lastUpdated} onRefresh={fetchAllData} />;
                            case 'repeater-guests': return (
                                <RepeaterGuests 
                                    guests={repeaterGuests} 
                                    onAddGuest={handleAddRepeaterGuest} 
                                    onUpdateGuest={handleUpdateRepeaterGuest} 
                                    onDeleteGuest={handleDeleteRepeaterGuest} 
                                    currentUser={currentUser} 
                                    logoUrl={appConfig.logoUrl}
                                    canManageRepeaters={hasUserRight(currentUser, 'action_manage_repeater', rightsConfig)}
                                    canDeleteRepeaters={hasUserRight(currentUser, 'action_delete_repeater', rightsConfig)}
                                />
                            );
                            case 'checklist': return (
                                <Checklist 
                                    shift={currentShift} 
                                    availableShiftTypes={shiftTypes} 
                                    submittedShiftsToday={submittedShiftsToday} 
                                    userRole={currentUser.role} 
                                    canReopen={hasUserRight(currentUser, 'action_reopen_shift', rightsConfig)}
                                    canSubmit={hasUserRight(currentUser, 'action_submit_shift', rightsConfig)}
                                    onToggleTask={toggleTask} 
                                    onUpdateNotes={(n) => setCurrentShift(prev => ({...prev, notes: n}))} 
                                    onShiftTypeChange={(t) => handleShiftTypeChange(t)} 
                                    onSubmitShift={() => saveShift(true)} 
                                    onSaveDraft={() => saveShift(false)} 
                                    onReopenShift={() => handleReopenShift(currentShift.date, currentShift.type)} 
                                />
                            );
                            case 'checklist-history': return (
                                <ChecklistHistory 
                                    userRole={currentUser.role} 
                                    canReopenShift={hasUserRight(currentUser, 'action_reopen_shift', rightsConfig)}
                                    onReopenShift={handleReopenShift} 
                                    appConfig={appConfig} 
                                />
                            );
                            case 'guest-requests': return (
                                <GuestRequests 
                                    requests={guestRequests} 
                                    onRequestAdd={handleAddGuestRequest} 
                                    onRequestUpdate={handleUpdateGuestRequest} 
                                    logoUrl={appConfig.logoUrl} 
                                    currentUser={currentUser}
                                    canManageRequests={hasUserRight(currentUser, 'action_manage_requests', rightsConfig)}
                                    canExportData={hasUserRight(currentUser, 'action_export_data', rightsConfig)}
                                />
                            );
                            case 'reports': return <Reports appConfig={appConfig} />;
                            case 'users': return (
                                <UserManagement 
                                    users={users} 
                                    currentUser={currentUser}
                                    rightsConfig={rightsConfig}
                                    onSaveRightsConfig={handleSaveRightsConfig}
                                    onAddUser={async (u) => { 
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
                                    }} 
                                    onEditUser={async (u) => { 
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
                                    }} 
                                    onDeleteUser={async (id) => { 
                                        try {
                                            const { error } = await supabase.from('users').delete().eq('id', id); 
                                            if (error) throw error;
                                            setUsers(prev => prev.filter(u => u.id !== id)); 
                                        } catch (err: any) {
                                            alert("Error deleting user: " + err.message);
                                        }
                                    }} 
                                />
                            );
                            case 'occupancy': return <OccupancyManagement occupancyData={occupancyData} onUpdateOccupancy={async (d) => { await supabase.from('occupancy').upsert(d); setOccupancyData(d); }} />;
                            case 'checklist-management': return <ChecklistManagement templates={templates} availableShifts={shiftTypes} availableCategories={categories} onAddTemplate={async (t) => { const {data} = await supabase.from('task_templates').insert([{label: t.label, category: t.category, shift_type: t.shiftType}]).select(); if(data) setTemplates(prev => [...prev, {id: data[0].id, label: data[0].label, category: data[0].category, shiftType: data[0].shift_type}]); }} onDeleteTemplate={async (id) => { await supabase.from('task_templates').delete().eq('id', id); setTemplates(prev => prev.filter(t => t.id !== id)); }} onAddShift={()=>{}} onDeleteShift={()=>{}} onAddCategory={handleAddCategory} onDeleteCategory={handleDeleteCategory} />;
                            case 'settings': return <Settings userRole={currentUser.role} canEditSettings={hasUserRight(currentUser, 'action_manage_settings', rightsConfig)} config={appConfig} onSave={async (c) => { await supabase.from('settings').upsert({id: 'global', app_name: c.appName, logo_url: c.logoUrl, login_bg_url: c.loginBgUrl, login_font: c.loginFont, support_message: c.supportMessage}); setAppConfig(c); }} />;
                            case 'profile': return <UserProfile user={currentUser} rightsConfig={rightsConfig} onUpdateUser={(u) => { 
                                setCurrentUser(u); 
                                try {
                                    localStorage.setItem('hub_current_user', JSON.stringify(u));
                                } catch (e) {
                                    console.error("Error saving updated currentUser to localStorage", e);
                                }
                                setUsers(prev => prev.map(usr => usr.id === u.id ? u : usr)); 
                            }} />;
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