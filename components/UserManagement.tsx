import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Plus, Trash2, Search, Shield, User as UserIcon, Edit2, Lock, Briefcase } from 'lucide-react';

interface UserManagementProps {
  users: User[];
  onAddUser: (user: Omit<User, 'id'>) => void;
  onEditUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ users, onAddUser, onEditUser, onDeleteUser }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // User Form State
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('GSA');
  const [newPassword, setNewPassword] = useState('');

  const handleEditClick = (user: User) => {
      setEditingUser(user);
      setNewName(user.name);
      setNewUsername(user.username);
      setNewRole(user.role);
      setNewPassword(user.password || '');
      setIsAdding(true);
  };

  const handleAddNewClick = () => {
      setEditingUser(null);
      setNewName('');
      setNewUsername('');
      setNewRole('GSA');
      setNewPassword('');
      setIsAdding(true);
  };

  const handleCloseForm = () => {
      setIsAdding(false);
      setEditingUser(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newUsername || !newPassword) return;

    // Generate initials (re-generate even if editing to keep it synced with name)
    const initials = newName
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    if (editingUser) {
        // Update existing user
        onEditUser({
            ...editingUser,
            name: newName,
            username: newUsername,
            role: newRole,
            password: newPassword,
            initials: initials // Update initials in case name changed
        });
    } else {
        // Create new user
        // Assign random color style
        const colors = [
        'bg-blue-100 text-blue-600',
        'bg-green-100 text-green-600',
        'bg-yellow-100 text-yellow-600',
        'bg-pink-100 text-pink-600',
        'bg-indigo-100 text-indigo-600',
        'bg-teal-100 text-teal-600'
        ];
        const color = colors[Math.floor(Math.random() * colors.length)];

        onAddUser({
            name: newName,
            username: newUsername,
            role: newRole,
            initials,
            color,
            password: newPassword
        });
    }

    handleCloseForm();
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Team Management</h2>
          <p className="text-gray-500">Manage user access, passwords, and roles.</p>
        </div>
        <button 
          onClick={handleAddNewClick}
          className="bg-nova-teal text-white px-4 py-2 rounded-lg font-medium shadow-lg hover:bg-teal-700 transition-all flex items-center gap-2"
        >
          <Plus size={20} />
          Add Team Member
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 animate-slide-down">
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-bold ${editingUser ? 'text-blue-600' : 'text-gray-800'}`}>
                {editingUser ? 'Edit User Details' : 'Add New User'}
            </h3>
            {editingUser && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">Editing Mode</span>}
          </div>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Full Name</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className={`w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:border-nova-teal ${editingUser ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
                placeholder="e.g. John Doe"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Username</label>
              <input
                type="text"
                required
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className={`w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:border-nova-teal ${editingUser ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
                placeholder="e.g. John.D"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className={`w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:border-nova-teal bg-white ${editingUser ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
              >
                <option value="GSA">GSA</option>
                <option value="Senior GSA">Senior GSA</option>
                <option value="Asst. FOM">Asst. FOM</option>
                <option value="Front Office Manager">Front Office Manager</option>
                <option value="Management">Management</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                  Password <Lock size={10} />
              </label>
              <input
                type="text" 
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:border-nova-teal font-mono text-sm ${editingUser ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
                placeholder="Set user password"
              />
            </div>

            <div className="md:col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
              <button 
                type="button"
                onClick={handleCloseForm}
                className="px-4 py-2 text-gray-500 hover:text-gray-700 font-medium"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-6 py-2 bg-nova-teal text-white rounded-lg font-medium hover:bg-teal-700 shadow-lg shadow-teal-100"
              >
                {editingUser ? 'Save Changes' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-4 bg-gray-50">
           <Search size={20} className="text-gray-400" />
           <input 
             type="text" 
             placeholder="Search team members..." 
             className="bg-transparent border-none outline-none text-sm w-full"
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
           />
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-6 py-3 font-medium">User</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium">Username</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 group transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${user.color}`}>
                        {user.initials}
                      </div>
                      <span className="font-medium text-gray-800">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                      user.role === 'Front Office Manager' 
                        ? 'bg-purple-50 text-purple-700 border-purple-100'
                        : user.role === 'Asst. FOM' 
                        ? 'bg-blue-50 text-blue-700 border-blue-100'
                        : user.role === 'Management'
                        ? 'bg-gray-800 text-white border-gray-900'
                        : 'bg-gray-50 text-gray-600 border-gray-100'
                    }`}>
                      {user.role === 'Front Office Manager' && <Shield size={12} />}
                      {user.role === 'Management' && <Briefcase size={12} />}
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-sm font-mono">
                    @{user.username}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                        <button 
                            onClick={() => handleEditClick(user)}
                            className="p-2 text-gray-400 hover:text-nova-teal hover:bg-teal-50 rounded-lg transition-colors"
                            title="Edit User"
                        >
                            <Edit2 size={18} />
                        </button>
                        <button 
                            onClick={() => onDeleteUser(user.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove User"
                            disabled={user.role === 'Front Office Manager'} 
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No users found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};