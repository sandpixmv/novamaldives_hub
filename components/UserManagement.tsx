import React, { useState } from 'react';
import { User, UserRole, UserRightKey, UserRightsConfig, UserRightDefinition } from '../types';
import { 
  Plus, 
  Trash2, 
  Search, 
  Shield, 
  User as UserIcon, 
  Edit2, 
  Lock, 
  Briefcase, 
  UserX, 
  UserCheck, 
  ToggleLeft, 
  ToggleRight, 
  Loader2, 
  Check, 
  Key, 
  ShieldCheck, 
  Sliders, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Info, 
  Eye, 
  Sparkles,
  Layers,
  Settings as SettingsIcon,
  Crown
} from 'lucide-react';
import { 
  USER_RIGHTS_DEFINITIONS, 
  DEFAULT_ROLE_PERMISSIONS, 
  ALL_RIGHT_KEYS, 
  hasUserRight, 
  getUserEffectiveRights 
} from '../services/permissions';

interface UserManagementProps {
  users: User[];
  currentUser: User;
  rightsConfig: UserRightsConfig;
  onAddUser: (user: Omit<User, 'id'>) => Promise<void> | void;
  onEditUser: (user: User) => Promise<void> | void;
  onDeleteUser: (id: string) => Promise<void> | void;
  onSaveRightsConfig: (newConfig: UserRightsConfig) => Promise<boolean | void>;
}

export const UserManagement: React.FC<UserManagementProps> = ({ 
  users, 
  currentUser,
  rightsConfig,
  onAddUser, 
  onEditUser, 
  onDeleteUser,
  onSaveRightsConfig
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'matrix' | 'audit'>('users');
  const [isAdding, setIsAdding] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('All');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Rights Management Modal State
  const [managingRightsUser, setManagingRightsUser] = useState<User | null>(null);
  const [useCustomRights, setUseCustomRights] = useState<boolean>(false);
  const [selectedRights, setSelectedRights] = useState<UserRightKey[]>([]);
  const [isSavingRights, setIsSavingRights] = useState<boolean>(false);
  const [rightsSaveSuccess, setRightsSaveSuccess] = useState<boolean>(false);

  // Role Matrix State (Local copy during editing)
  const [matrixConfig, setMatrixConfig] = useState<Record<UserRole, UserRightKey[]>>({
    ...DEFAULT_ROLE_PERMISSIONS,
    ...rightsConfig.rolePermissions
  });
  const [isSavingMatrix, setIsSavingMatrix] = useState<boolean>(false);
  const [matrixSaveSuccess, setMatrixSaveSuccess] = useState<boolean>(false);
  
  // User Form State
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('GSA');
  const [newPassword, setNewPassword] = useState('');
  const [isActive, setIsActive] = useState(true);

  const canManageRights = currentUser.role === 'Front Office Manager' || 
                          currentUser.role === 'Admin' || 
                          hasUserRight(currentUser, 'action_manage_rights', rightsConfig);

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setNewName(user.name);
    setNewUsername(user.username);
    setNewRole(user.role);
    setNewPassword(user.password || '');
    setIsActive(user.isActive !== false);
    setIsAdding(true);
  };

  const handleAddNewClick = () => {
    setEditingUser(null);
    setNewName('');
    setNewUsername('');
    setNewRole('GSA');
    setNewPassword('');
    setIsActive(true);
    setIsAdding(true);
  };

  const handleCloseForm = () => {
    setIsAdding(false);
    setEditingUser(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newUsername || !newPassword || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const initials = newName
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

      if (editingUser) {
        await onEditUser({
          ...editingUser,
          name: newName,
          username: newUsername,
          role: newRole,
          password: newPassword,
          initials: initials,
          isActive: isActive
        });
      } else {
        const colors = [
          'bg-blue-100 text-blue-600',
          'bg-green-100 text-green-600',
          'bg-yellow-100 text-yellow-600',
          'bg-pink-100 text-pink-600',
          'bg-indigo-100 text-indigo-600',
          'bg-teal-100 text-teal-600'
        ];
        const color = colors[Math.floor(Math.random() * colors.length)];

        await onAddUser({
          name: newName,
          username: newUsername,
          role: newRole,
          initials,
          color,
          password: newPassword,
          isActive: isActive
        });
      }

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        handleCloseForm();
      }, 1500);
    } catch (error) {
      console.error("Submit error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Manage Rights Modal for a User
  const handleOpenRightsModal = (user: User) => {
    setManagingRightsUser(user);
    const userOverride = rightsConfig.userOverrides?.[user.id] || rightsConfig.userOverrides?.[user.username];

    if (userOverride && userOverride.useCustom) {
      setUseCustomRights(true);
      setSelectedRights([...userOverride.grantedRights]);
    } else {
      setUseCustomRights(false);
      // Preload current role rights so user can easily customize if toggled
      const currentRoleRights = rightsConfig.rolePermissions?.[user.role] || DEFAULT_ROLE_PERMISSIONS[user.role] || [];
      setSelectedRights([...currentRoleRights]);
    }
    setRightsSaveSuccess(false);
  };

  const handleToggleRight = (key: UserRightKey) => {
    if (!useCustomRights) {
      setUseCustomRights(true);
    }
    setSelectedRights(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleApplyPreset = (preset: 'all' | 'role_default' | 'supervisor' | 'gsa' | 'readonly') => {
    if (!managingRightsUser) return;
    setUseCustomRights(true);

    switch (preset) {
      case 'all':
        setSelectedRights([...ALL_RIGHT_KEYS]);
        break;
      case 'role_default':
        const defaultForRole = rightsConfig.rolePermissions?.[managingRightsUser.role] || DEFAULT_ROLE_PERMISSIONS[managingRightsUser.role] || [];
        setSelectedRights([...defaultForRole]);
        break;
      case 'supervisor':
        setSelectedRights([
          'view_dashboard',
          'view_guest_requests',
          'view_repeater_guests',
          'view_checklist',
          'view_checklist_history',
          'view_reports',
          'view_occupancy',
          'view_checklist_management',
          'action_submit_shift',
          'action_reopen_shift',
          'action_manage_tasks',
          'action_edit_occupancy',
          'action_manage_requests',
          'action_manage_repeater',
          'action_export_data'
        ]);
        break;
      case 'gsa':
        setSelectedRights([
          'view_dashboard',
          'view_guest_requests',
          'view_repeater_guests',
          'view_checklist',
          'view_checklist_history',
          'view_reports',
          'action_submit_shift',
          'action_manage_requests',
          'action_export_data'
        ]);
        break;
      case 'readonly':
        setSelectedRights([
          'view_dashboard',
          'view_guest_requests',
          'view_repeater_guests',
          'view_checklist_history',
          'view_reports'
        ]);
        break;
    }
  };

  const handleSaveUserRights = async () => {
    if (!managingRightsUser) return;
    setIsSavingRights(true);

    try {
      const updatedOverrides = { ...rightsConfig.userOverrides };

      if (!useCustomRights) {
        // Remove custom override so it inherits role defaults
        delete updatedOverrides[managingRightsUser.id];
        delete updatedOverrides[managingRightsUser.username];
      } else {
        // Prevent removing manage rights from oneself if currently logged in
        let finalRights = [...selectedRights];
        if (managingRightsUser.id === currentUser.id && !finalRights.includes('action_manage_rights')) {
          finalRights.push('action_manage_rights');
        }

        updatedOverrides[managingRightsUser.id] = {
          useCustom: true,
          grantedRights: finalRights
        };
      }

      const newConfig: UserRightsConfig = {
        rolePermissions: { ...rightsConfig.rolePermissions },
        userOverrides: updatedOverrides
      };

      await onSaveRightsConfig(newConfig);
      setRightsSaveSuccess(true);
      setTimeout(() => {
        setRightsSaveSuccess(false);
        setManagingRightsUser(null);
      }, 1200);
    } catch (err) {
      console.error('Error saving user rights:', err);
      alert('Failed to save user rights.');
    } finally {
      setIsSavingRights(false);
    }
  };

  // Role Matrix Actions
  const handleToggleMatrixRight = (role: UserRole, key: UserRightKey) => {
    if (role === 'Front Office Manager' || role === 'Admin') {
      // FOM and Admin retain root access
      return;
    }

    setMatrixConfig(prev => {
      const currentList = prev[role] || [];
      const updatedList = currentList.includes(key)
        ? currentList.filter(k => k !== key)
        : [...currentList, key];

      return {
        ...prev,
        [role]: updatedList
      };
    });
  };

  const handleSaveMatrix = async () => {
    setIsSavingMatrix(true);
    try {
      const newConfig: UserRightsConfig = {
        rolePermissions: { ...matrixConfig },
        userOverrides: { ...rightsConfig.userOverrides }
      };

      await onSaveRightsConfig(newConfig);
      setMatrixSaveSuccess(true);
      setTimeout(() => setMatrixSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Error saving matrix:', err);
      alert('Failed to save role permissions matrix.');
    } finally {
      setIsSavingMatrix(false);
    }
  };

  const handleResetMatrixDefaults = () => {
    if (confirm('Reset role permissions matrix to standard resort defaults? This will update the role baseline for non-overridden users.')) {
      setMatrixConfig({ ...DEFAULT_ROLE_PERMISSIONS });
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'All' || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const categories: Array<'Module Access' | 'Shift Operations' | 'Guest Services' | 'Administration'> = [
    'Module Access',
    'Shift Operations',
    'Guest Services',
    'Administration'
  ];

  const availableRoles: UserRole[] = [
    'Front Office Manager',
    'Admin',
    'Asst. FOM',
    'Senior GSA',
    'GSA',
    'Management'
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-gray-800">Team & Rights Management</h2>
            <span className="bg-teal-50 text-nova-teal border border-teal-200 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
              <ShieldCheck size={14} /> Admin / FOM Access
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Manage user accounts, assign role permissions, and customize operational rights for front office staff.
          </p>
        </div>

        {canManageRights && (
          <div className="flex items-center gap-3">
            <button 
              onClick={handleAddNewClick}
              className="bg-nova-teal text-white px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-teal-100 hover:bg-teal-700 transition-all flex items-center gap-2 text-sm"
            >
              <Plus size={18} />
              Add Team Member
            </button>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-4 pt-2 rounded-t-2xl">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-3 font-bold text-sm border-b-2 transition-all ${
            activeTab === 'users'
              ? 'border-nova-teal text-nova-teal bg-teal-50/40 rounded-t-lg'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <UserIcon size={18} />
          Team Members & Rights ({users.length})
        </button>

        <button
          onClick={() => {
            setActiveTab('matrix');
            setMatrixConfig({ ...DEFAULT_ROLE_PERMISSIONS, ...rightsConfig.rolePermissions });
          }}
          className={`flex items-center gap-2 px-4 py-3 font-bold text-sm border-b-2 transition-all ${
            activeTab === 'matrix'
              ? 'border-nova-teal text-nova-teal bg-teal-50/40 rounded-t-lg'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Sliders size={18} />
          Role Permissions Matrix
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-3 font-bold text-sm border-b-2 transition-all ${
            activeTab === 'audit'
              ? 'border-nova-teal text-nova-teal bg-teal-50/40 rounded-t-lg'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Key size={18} />
          Rights & Security Audit
        </button>
      </div>

      {/* TAB 1: USERS LIST & RIGHTS */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Add / Edit User Form Modal/Card */}
          {isAdding && (
            <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 animate-slide-down">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <h3 className={`text-lg font-bold ${editingUser ? 'text-blue-600' : 'text-gray-800'}`}>
                    {editingUser ? 'Edit User Profile' : 'Add New Team Member'}
                  </h3>
                  {editingUser && <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-bold">Editing</span>}
                </div>
                <button onClick={handleCloseForm} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Full Name</label>
                    <input
                      type="text"
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-nova-teal text-gray-800 font-medium"
                      placeholder="e.g. Hassan Mohamed"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Username / Login ID</label>
                    <input
                      type="text"
                      required
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-nova-teal text-gray-800 font-medium font-mono text-sm"
                      placeholder="e.g. Hassan.M"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Assigned Role</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as UserRole)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-nova-teal bg-white text-gray-800 font-medium"
                    >
                      <option value="GSA">GSA (Front Desk Agent)</option>
                      <option value="Senior GSA">Senior GSA (Lead Agent)</option>
                      <option value="Asst. FOM">Asst. FOM (Assistant Manager)</option>
                      <option value="Front Office Manager">Front Office Manager (FOM)</option>
                      <option value="Admin">Admin (System Administrator)</option>
                      <option value="Management">Management (Executive / HOD)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                      Password <Lock size={12} className="text-gray-400" />
                    </label>
                    <input
                      type="text" 
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-nova-teal font-mono text-sm text-gray-800"
                      placeholder="Set account password"
                    />
                  </div>
                </div>

                <div className="md:col-span-2 flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <h4 className="text-sm font-bold text-gray-800">Account Access Status</h4>
                    <p className="text-xs text-gray-500">Disabled users are immediately blocked from logging in.</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                      isActive ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-red-50 text-red-600 hover:bg-red-100'
                    }`}
                  >
                    {isActive ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
                    {isActive ? 'Active User' : 'Account Disabled'}
                  </button>
                </div>

                <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button 
                    type="button"
                    onClick={handleCloseForm}
                    className="px-5 py-2.5 text-gray-500 hover:text-gray-700 font-medium"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting || showSuccess}
                    className={`px-6 py-2.5 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2 min-w-[140px] justify-center text-sm ${
                      showSuccess 
                        ? 'bg-green-500 text-white shadow-green-100' 
                        : 'bg-nova-teal text-white hover:bg-teal-700 shadow-teal-100 disabled:opacity-70'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Saving...
                      </>
                    ) : showSuccess ? (
                      <>
                        <Check size={18} />
                        Saved!
                      </>
                    ) : (
                      editingUser ? 'Save Profile' : 'Create Member'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search staff by name, username, or role..." 
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-nova-teal/20 focus:border-nova-teal text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Role:</span>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nova-teal/20 focus:border-nova-teal text-gray-700 font-medium"
              >
                <option value="All">All Roles</option>
                {availableRoles.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/80 text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 font-bold">Team Member</th>
                    <th className="px-6 py-4 font-bold">Role</th>
                    <th className="px-6 py-4 font-bold">Username</th>
                    <th className="px-6 py-4 font-bold">Assigned Rights Status</th>
                    <th className="px-6 py-4 font-bold">Status</th>
                    <th className="px-6 py-4 font-bold text-right">Actions & Rights</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map((user) => {
                    const isSuper = user.role === 'Front Office Manager' || user.role === 'Admin';
                    const override = rightsConfig.userOverrides?.[user.id] || rightsConfig.userOverrides?.[user.username];
                    const hasCustom = override && override.useCustom;
                    const effectiveRights = getUserEffectiveRights(user, rightsConfig);
                    const isSelf = user.id === currentUser.id;

                    return (
                      <tr 
                        key={user.id} 
                        className={`group transition-colors ${user.isActive === false ? 'bg-gray-50/60 grayscale-[0.3]' : 'hover:bg-gray-50/80'}`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${user.isActive === false ? 'bg-gray-200 text-gray-400' : user.color}`}>
                              {user.initials}
                            </div>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span className={`font-bold text-sm ${user.isActive === false ? 'text-gray-400' : 'text-gray-800'}`}>
                                  {user.name}
                                </span>
                                {isSelf && (
                                  <span className="text-[10px] bg-teal-50 text-nova-teal border border-teal-100 px-1.5 py-0.2 rounded font-bold">You</span>
                                )}
                              </div>
                              <span className="text-xs text-gray-400">{user.role}</span>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                            user.isActive === false ? 'bg-gray-100 text-gray-400 border-gray-200' :
                            user.role === 'Front Office Manager' 
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : user.role === 'Admin'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : user.role === 'Asst. FOM' 
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : user.role === 'Management'
                              ? 'bg-gray-800 text-white border-gray-900'
                              : user.role === 'Senior GSA'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-gray-50 text-gray-600 border-gray-200'
                          }`}>
                            {user.role === 'Front Office Manager' && <Shield size={12} />}
                            {user.role === 'Admin' && <Crown size={12} />}
                            {user.role === 'Management' && <Briefcase size={12} />}
                            {user.role}
                          </span>
                        </td>

                        <td className={`px-6 py-4 text-sm font-mono ${user.isActive === false ? 'text-gray-300' : 'text-gray-600 font-medium'}`}>
                          @{user.username}
                        </td>

                        <td className="px-6 py-4">
                          {isSuper ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100">
                              <ShieldCheck size={14} /> Full Master Rights ({ALL_RIGHT_KEYS.length})
                            </span>
                          ) : hasCustom ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                              <Sliders size={14} /> Custom Override ({effectiveRights.length} rights)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200">
                              <Layers size={14} /> Role Inherited ({effectiveRights.length} rights)
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          {user.isActive === false ? (
                            <span className="inline-flex items-center gap-1 text-red-500 text-xs font-bold bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                              <UserX size={12} /> Inactive
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-green-600 text-xs font-bold bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                              <UserCheck size={12} /> Active
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Manage Rights Button */}
                            {canManageRights && (
                              <button
                                onClick={() => handleOpenRightsModal(user)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg text-nova-teal bg-teal-50 border border-teal-200 hover:bg-nova-teal hover:text-white transition-all shadow-sm"
                                title="Assign and manage user permissions"
                              >
                                <Key size={14} />
                                <span>Rights</span>
                              </button>
                            )}

                            {/* Edit User Button */}
                            <button 
                              onClick={() => handleEditClick(user)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit User Profile"
                            >
                              <Edit2 size={16} />
                            </button>

                            {/* Delete User Button */}
                            {canManageRights && (
                              <button 
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete user ${user.name}? This action cannot be undone.`)) {
                                    onDeleteUser(user.id);
                                  }
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Remove User"
                                disabled={user.role === 'Front Office Manager' || user.role === 'Admin' || isSelf} 
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                        No team members found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ROLE PERMISSIONS MATRIX */}
      {activeTab === 'matrix' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Sliders className="text-nova-teal" size={20} />
                Property-Wide Role Permissions Matrix
              </h3>
              <p className="text-gray-500 text-xs mt-1">
                Configure baseline rights granted automatically to each role. Users without individual overrides inherit these defaults.
              </p>
            </div>

            {canManageRights && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleResetMatrixDefaults}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
                  title="Reset to resort recommended standards"
                >
                  <RotateCcw size={14} />
                  Reset Defaults
                </button>
                <button
                  onClick={handleSaveMatrix}
                  disabled={isSavingMatrix || matrixSaveSuccess}
                  className={`flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl text-white transition-all shadow-md ${
                    matrixSaveSuccess ? 'bg-green-500 shadow-green-100' : 'bg-nova-teal hover:bg-teal-700 shadow-teal-100'
                  }`}
                >
                  {isSavingMatrix ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Saving...
                    </>
                  ) : matrixSaveSuccess ? (
                    <>
                      <Check size={14} /> Matrix Saved!
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} /> Save Role Matrix
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-xs text-gray-600">
                    <th className="p-4 font-bold min-w-[280px]">Operational Right / Capability</th>
                    <th className="p-4 text-center font-bold text-purple-700 bg-purple-50/40">FOM (Full)</th>
                    <th className="p-4 text-center font-bold text-emerald-700 bg-emerald-50/40">Admin</th>
                    <th className="p-4 text-center font-bold text-blue-700">Asst. FOM</th>
                    <th className="p-4 text-center font-bold text-amber-700">Senior GSA</th>
                    <th className="p-4 text-center font-bold text-teal-700">GSA</th>
                    <th className="p-4 text-center font-bold text-gray-800">Management</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {categories.map(cat => {
                    const rightsInCat = USER_RIGHTS_DEFINITIONS.filter(r => r.category === cat);
                    return (
                      <React.Fragment key={cat}>
                        <tr className="bg-gray-100/70">
                          <td colSpan={7} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-600">
                            {cat}
                          </td>
                        </tr>
                        {rightsInCat.map(right => (
                          <tr key={right.key} className="hover:bg-gray-50/60 transition-colors">
                            <td className="p-4">
                              <div className="font-bold text-xs text-gray-800">{right.label}</div>
                              <div className="text-[11px] text-gray-400 mt-0.5">{right.description}</div>
                            </td>

                            {/* Front Office Manager (Fixed All) */}
                            <td className="p-4 text-center bg-purple-50/20">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-700">
                                <Check size={14} />
                              </span>
                            </td>

                            {/* Admin (Fixed All) */}
                            <td className="p-4 text-center bg-emerald-50/20">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700">
                                <Check size={14} />
                              </span>
                            </td>

                            {/* Asst. FOM */}
                            <td className="p-4 text-center">
                              <input 
                                type="checkbox"
                                checked={(matrixConfig['Asst. FOM'] || []).includes(right.key)}
                                onChange={() => handleToggleMatrixRight('Asst. FOM', right.key)}
                                disabled={!canManageRights}
                                className="w-4 h-4 text-nova-teal rounded border-gray-300 focus:ring-nova-teal cursor-pointer"
                              />
                            </td>

                            {/* Senior GSA */}
                            <td className="p-4 text-center">
                              <input 
                                type="checkbox"
                                checked={(matrixConfig['Senior GSA'] || []).includes(right.key)}
                                onChange={() => handleToggleMatrixRight('Senior GSA', right.key)}
                                disabled={!canManageRights}
                                className="w-4 h-4 text-nova-teal rounded border-gray-300 focus:ring-nova-teal cursor-pointer"
                              />
                            </td>

                            {/* GSA */}
                            <td className="p-4 text-center">
                              <input 
                                type="checkbox"
                                checked={(matrixConfig['GSA'] || []).includes(right.key)}
                                onChange={() => handleToggleMatrixRight('GSA', right.key)}
                                disabled={!canManageRights}
                                className="w-4 h-4 text-nova-teal rounded border-gray-300 focus:ring-nova-teal cursor-pointer"
                              />
                            </td>

                            {/* Management */}
                            <td className="p-4 text-center">
                              <input 
                                type="checkbox"
                                checked={(matrixConfig['Management'] || []).includes(right.key)}
                                onChange={() => handleToggleMatrixRight('Management', right.key)}
                                disabled={!canManageRights}
                                className="w-4 h-4 text-nova-teal rounded border-gray-300 focus:ring-nova-teal cursor-pointer"
                              />
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT & PRIVILEGES */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Total Users</span>
              <span className="text-3xl font-extrabold text-gray-800">{users.length}</span>
              <p className="text-xs text-gray-400 mt-1">{users.filter(u => u.isActive !== false).length} active accounts</p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <span className="text-xs font-bold text-purple-600 uppercase tracking-wider block mb-1">Administrative Rights</span>
              <span className="text-3xl font-extrabold text-purple-700">
                {users.filter(u => hasUserRight(u, 'action_manage_rights', rightsConfig)).length}
              </span>
              <p className="text-xs text-gray-400 mt-1">Can configure user rights & passwords</p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block mb-1">Shift Unlock Rights</span>
              <span className="text-3xl font-extrabold text-blue-700">
                {users.filter(u => hasUserRight(u, 'action_reopen_shift', rightsConfig)).length}
              </span>
              <p className="text-xs text-gray-400 mt-1">Can reopen submitted shift handovers</p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <span className="text-xs font-bold text-amber-600 uppercase tracking-wider block mb-1">Custom Overrides</span>
              <span className="text-3xl font-extrabold text-amber-700">
                {users.filter(u => rightsConfig.userOverrides?.[u.id]?.useCustom).length}
              </span>
              <p className="text-xs text-gray-400 mt-1">Users with individual custom rights</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <ShieldCheck className="text-nova-teal" size={20} />
              Key Security Roles Breakdown
            </h3>
            <div className="space-y-4">
              {availableRoles.map(role => {
                const roleUsers = users.filter(u => u.role === role);
                return (
                  <div key={role} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-gray-50/70 rounded-xl border border-gray-100 gap-2">
                    <div>
                      <span className="font-bold text-gray-800 text-sm">{role}</span>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {roleUsers.length} staff assigned ({roleUsers.map(u => u.name).join(', ') || 'No staff'})
                      </p>
                    </div>
                    <span className="text-xs font-mono bg-white px-3 py-1 rounded-lg border border-gray-200 text-gray-600 font-bold self-start md:self-auto">
                      {(rightsConfig.rolePermissions?.[role] || DEFAULT_ROLE_PERMISSIONS[role] || []).length} / {ALL_RIGHT_KEYS.length} default rights
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MANAGE USER RIGHTS MODAL */}
      {managingRightsUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-base shadow-sm ${managingRightsUser.color}`}>
                  {managingRightsUser.initials}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-gray-800">
                      Manage Rights: {managingRightsUser.name}
                    </h3>
                    <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                      {managingRightsUser.role}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">@{managingRightsUser.username}</p>
                </div>
              </div>
              <button 
                onClick={() => setManagingRightsUser(null)} 
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={22} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* FOM / Admin Super Notice */}
              {(managingRightsUser.role === 'Front Office Manager' || managingRightsUser.role === 'Admin') && (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl flex items-start gap-3">
                  <ShieldCheck className="text-purple-600 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wide">Master Privilege Account</h4>
                    <p className="text-xs text-purple-700 mt-1">
                      Front Office Manager and Admin accounts automatically hold all permissions and cannot be restricted, ensuring system continuity.
                    </p>
                  </div>
                </div>
              )}

              {/* Mode Selection: Inherited vs Custom */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">
                  Permissions Assignment Mode
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setUseCustomRights(false);
                      const defaultForRole = rightsConfig.rolePermissions?.[managingRightsUser.role] || DEFAULT_ROLE_PERMISSIONS[managingRightsUser.role] || [];
                      setSelectedRights([...defaultForRole]);
                    }}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                      !useCustomRights 
                        ? 'bg-teal-50/80 border-nova-teal shadow-sm text-teal-900' 
                        : 'bg-white border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <Layers className={!useCustomRights ? 'text-nova-teal' : 'text-gray-400'} size={20} />
                    <div>
                      <div className="font-bold text-sm">Inherit Role Defaults</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Uses standard permissions configured for <span className="font-bold">{managingRightsUser.role}</span>.
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUseCustomRights(true)}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                      useCustomRights 
                        ? 'bg-amber-50/80 border-amber-400 shadow-sm text-amber-900' 
                        : 'bg-white border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <Sliders className={useCustomRights ? 'text-amber-600' : 'text-gray-400'} size={20} />
                    <div>
                      <div className="font-bold text-sm">Custom Rights Override</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Assign tailored privileges specific to this team member.
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Presets Toolbar (When in Custom Mode) */}
              {useCustomRights && (
                <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-gray-100">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-2 flex items-center gap-1">
                    <Sparkles size={14} className="text-amber-500" /> Presets:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('all')}
                    className="px-2.5 py-1 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                  >
                    Grant All
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('role_default')}
                    className="px-2.5 py-1 text-xs font-bold bg-teal-50 hover:bg-teal-100 text-nova-teal rounded-lg transition-colors"
                  >
                    Match Role Default
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('supervisor')}
                    className="px-2.5 py-1 text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
                  >
                    Supervisor
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('gsa')}
                    className="px-2.5 py-1 text-xs font-bold bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors"
                  >
                    Standard GSA
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('readonly')}
                    className="px-2.5 py-1 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
                  >
                    Read Only
                  </button>
                </div>
              )}

              {/* Rights Checklist grouped by category */}
              <div className="space-y-6">
                {categories.map(cat => {
                  const items = USER_RIGHTS_DEFINITIONS.filter(d => d.category === cat);
                  return (
                    <div key={cat} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                          {cat === 'Module Access' && <Eye size={14} className="text-nova-teal" />}
                          {cat === 'Shift Operations' && <CheckCircle2 size={14} className="text-blue-500" />}
                          {cat === 'Guest Services' && <Briefcase size={14} className="text-amber-500" />}
                          {cat === 'Administration' && <Shield size={14} className="text-purple-500" />}
                          {cat}
                        </h4>
                        <span className="text-[11px] text-gray-400 font-medium">
                          {items.filter(i => selectedRights.includes(i.key)).length} of {items.length} enabled
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {items.map(def => {
                          const isChecked = selectedRights.includes(def.key);
                          const isSelfAdminRight = managingRightsUser.id === currentUser.id && def.key === 'action_manage_rights';

                          return (
                            <div
                              key={def.key}
                              onClick={() => {
                                if (isSelfAdminRight) return;
                                handleToggleRight(def.key);
                              }}
                              className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all select-none ${
                                isChecked
                                  ? 'bg-teal-50/40 border-nova-teal/40 hover:bg-teal-50'
                                  : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              } ${isSelfAdminRight ? 'opacity-80 cursor-not-allowed' : ''}`}
                            >
                              <div className="mt-0.5">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}} // Handled by container onClick
                                  disabled={isSelfAdminRight}
                                  className="w-4 h-4 text-nova-teal rounded border-gray-300 focus:ring-nova-teal"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className={`text-xs font-bold ${isChecked ? 'text-gray-900' : 'text-gray-600'}`}>
                                    {def.label}
                                  </span>
                                  {isSelfAdminRight && (
                                    <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.2 rounded font-bold">Locked</span>
                                  )}
                                </div>
                                <p className="text-[11px] text-gray-400 leading-snug mt-0.5">
                                  {def.description}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100 bg-gray-50/70 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                {useCustomRights ? (
                  <span className="text-amber-700 font-bold flex items-center gap-1">
                    <Sliders size={14} /> Custom override active ({selectedRights.length} rights)
                  </span>
                ) : (
                  <span className="text-nova-teal font-bold flex items-center gap-1">
                    <Layers size={14} /> Inheriting role defaults ({selectedRights.length} rights)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setManagingRightsUser(null)}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveUserRights}
                  disabled={isSavingRights || rightsSaveSuccess}
                  className={`px-6 py-2.5 text-sm font-bold rounded-xl text-white shadow-lg transition-all flex items-center gap-2 ${
                    rightsSaveSuccess 
                      ? 'bg-green-500 shadow-green-100' 
                      : 'bg-nova-teal hover:bg-teal-700 shadow-teal-100 disabled:opacity-70'
                  }`}
                >
                  {isSavingRights ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Saving...
                    </>
                  ) : rightsSaveSuccess ? (
                    <>
                      <Check size={16} /> Saved Successfully
                    </>
                  ) : (
                    <>
                      <Key size={16} /> Save Rights
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};