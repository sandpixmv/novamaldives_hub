import React from 'react';
import { LayoutDashboard, CheckSquare, History, Settings, LifeBuoy, BarChart3, Users, Briefcase, ListChecks, TrendingUp, BellRing } from 'lucide-react';
import { UserRole, AppConfig } from '../types';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  userRole?: UserRole;
  appConfig: AppConfig;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, userRole, appConfig }) => {
  let navItems = [];

  if (userRole === 'Management') {
      navItems = [
          { id: 'guest-requests', label: 'Guest Requests', icon: <BellRing size={20} /> }
      ];
  } else {
      navItems = [
        { id: 'dashboard', label: 'My Dashboard', icon: <LayoutDashboard size={20} /> },
        { id: 'checklist', label: 'Current Shift', icon: <CheckSquare size={20} /> },
        { id: 'guest-requests', label: 'Guest Requests', icon: <BellRing size={20} /> },
      ];
      
      const isManager = userRole === 'Front Office Manager' || userRole === 'Asst. FOM';

      // Shift Management and Analytics for Managers only
      if (isManager) {
          navItems.push({ id: 'shift-management', label: 'Shift Management', icon: <Briefcase size={20} /> });
          navItems.push({ id: 'occupancy', label: 'Occupancy Planner', icon: <TrendingUp size={20} /> });
          navItems.push({ id: 'checklist-management', label: 'Checklist Manager', icon: <ListChecks size={20} /> });
          navItems.push({ id: 'admin', label: 'Admin Overview', icon: <BarChart3 size={20} /> });
      }

      // Shift History is visible to all roles (Managers, Senior GSA, GSA)
      navItems.push({ id: 'history', label: 'Shift History', icon: <History size={20} /> });

      // Only show Team Management for FOM
      if (userRole === 'Front Office Manager') {
          navItems.push({ id: 'users', label: 'Team Management', icon: <Users size={20} /> });
      }

      // Settings for Managers only
      if (isManager) {
          navItems.push({ id: 'settings', label: 'Settings', icon: <Settings size={20} /> });
      }
  }

  return (
    <div className="w-64 bg-white h-screen border-r border-gray-200 flex flex-col fixed left-0 top-0 z-10 hidden md:flex">
      <div className="h-16 flex items-center px-6 border-b border-gray-100">
        <div className="flex items-center gap-2 text-nova-teal font-bold text-xl overflow-hidden">
           {appConfig.logoUrl ? (
             <img src={appConfig.logoUrl} alt="Logo" className="h-8 w-8 object-contain" />
           ) : (
             <LifeBuoy className="text-nova-accent flex-shrink-0" />
           )}
           <span className="truncate">{appConfig.appName}</span>
        </div>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        <div className="mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">Menu</p>
            <ul className="space-y-1">
            {navItems.map((item) => (
                <li key={item.id}>
                <button
                    onClick={() => setCurrentView(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200 ${
                    currentView === item.id
                        ? 'bg-nova-teal text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-nova-teal'
                    }`}
                >
                    {item.icon}
                    <span className="font-medium text-sm">{item.label}</span>
                </button>
                </li>
            ))}
            </ul>
        </div>
      </div>

      <div className="p-4 border-t border-gray-100">
        <div className="bg-nova-sand/30 p-3 rounded-lg">
            <h4 className="text-xs font-semibold text-nova-dark mb-1">Support</h4>
            <p className="text-[10px] text-gray-500 leading-relaxed">
                {appConfig.supportMessage || "Contact FOM for system issues."}
            </p>
        </div>
      </div>
    </div>
  );
};