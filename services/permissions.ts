import { User, UserRole, UserRightKey, UserRightDefinition, UserRightsConfig } from '../types';
import { supabase } from './supabaseClient';

export const USER_RIGHTS_DEFINITIONS: UserRightDefinition[] = [
  // Module Access
  {
    key: 'view_dashboard',
    label: 'My Dashboard',
    description: 'Access the operational dashboard, metrics, quick actions, and status summaries.',
    category: 'Module Access'
  },
  {
    key: 'view_guest_requests',
    label: 'Guest Requests Module',
    description: 'View and track incoming guest requests and department assignments.',
    category: 'Module Access'
  },
  {
    key: 'view_repeater_guests',
    label: 'Repeater Guests Module',
    description: 'View repeater guest history, room moves, stay counts, and preferences.',
    category: 'Module Access'
  },
  {
    key: 'view_checklist',
    label: 'Shift Checklist Module',
    description: 'Access active shift checklists and checklist tasks during duty.',
    category: 'Module Access'
  },
  {
    key: 'view_checklist_history',
    label: 'Checklist History Module',
    description: 'Review past completed shift logs and handover records.',
    category: 'Module Access'
  },
  {
    key: 'view_reports',
    label: 'Reports & Analytics Module',
    description: 'Access operational reports, statistics, and handover analysis.',
    category: 'Module Access'
  },
  {
    key: 'view_occupancy',
    label: 'Occupancy Planner Module',
    description: 'Access the daily room occupancy planner and forecasting.',
    category: 'Module Access'
  },
  {
    key: 'view_checklist_management',
    label: 'Checklist Manager Module',
    description: 'Access shift task templates, categories, and checklist configuration.',
    category: 'Module Access'
  },
  {
    key: 'view_user_management',
    label: 'Team & Rights Management',
    description: 'Access the user directory, accounts, and user rights configuration.',
    category: 'Module Access'
  },
  {
    key: 'view_settings',
    label: 'System Settings Module',
    description: 'Access resort branding, logo, login styling, and system settings.',
    category: 'Module Access'
  },

  // Shift Operations
  {
    key: 'action_submit_shift',
    label: 'Submit / Handover Shift',
    description: 'Finalize and submit the shift checklist at the end of duty.',
    category: 'Shift Operations'
  },
  {
    key: 'action_reopen_shift',
    label: 'Unlock & Reopen Shifts',
    description: 'Reopen locked or previously submitted shifts for amendments.',
    category: 'Shift Operations'
  },
  {
    key: 'action_manage_tasks',
    label: 'Manage Checklist Templates',
    description: 'Create, modify, and delete task templates and task categories.',
    category: 'Shift Operations'
  },
  {
    key: 'action_edit_occupancy',
    label: 'Update Occupancy Rates',
    description: 'Edit daily room occupancy percentages and seasonal markers.',
    category: 'Shift Operations'
  },

  // Guest Services
  {
    key: 'action_manage_requests',
    label: 'Create & Update Guest Requests',
    description: 'Log new guest service requests and update status or remarks.',
    category: 'Guest Services'
  },
  {
    key: 'action_delete_requests',
    label: 'Delete Guest Requests',
    description: 'Permanently remove guest request records from the system.',
    category: 'Guest Services'
  },
  {
    key: 'action_manage_repeater',
    label: 'Create & Edit Repeater Guests',
    description: 'Create repeater profiles, log visits, room moves, and guest preferences.',
    category: 'Guest Services'
  },
  {
    key: 'action_delete_repeater',
    label: 'Delete Repeater Guests',
    description: 'Permanently delete repeater guest profiles from the property database.',
    category: 'Guest Services'
  },

  // Administration & Security
  {
    key: 'action_manage_rights',
    label: 'Manage User Rights & Accounts',
    description: 'Assign user permissions, manage team members, reset passwords, and toggle accounts.',
    category: 'Administration'
  },
  {
    key: 'action_manage_settings',
    label: 'Update Resort System Settings',
    description: 'Change app name, logo, login background, font, and support message.',
    category: 'Administration'
  },
  {
    key: 'action_export_data',
    label: 'Export PDF & Data Reports',
    description: 'Generate and download official PDF and Excel reports.',
    category: 'Administration'
  }
];

export const ALL_RIGHT_KEYS: UserRightKey[] = USER_RIGHTS_DEFINITIONS.map(r => r.key);

// Standard recommended role permissions for Front Office team
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, UserRightKey[]> = {
  'Front Office Manager': [...ALL_RIGHT_KEYS],
  'Admin': [...ALL_RIGHT_KEYS],
  'Asst. FOM': [
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
  ],
  'Senior GSA': [
    'view_dashboard',
    'view_guest_requests',
    'view_repeater_guests',
    'view_checklist',
    'view_checklist_history',
    'view_reports',
    'action_submit_shift',
    'action_manage_requests',
    'action_manage_repeater',
    'action_export_data'
  ],
  'GSA': [
    'view_dashboard',
    'view_guest_requests',
    'view_repeater_guests',
    'view_checklist',
    'view_checklist_history',
    'view_reports',
    'action_submit_shift',
    'action_manage_requests',
    'action_export_data'
  ],
  'Management': [
    'view_dashboard',
    'view_guest_requests',
    'view_repeater_guests',
    'view_checklist_history',
    'view_reports',
    'view_occupancy',
    'action_export_data'
  ]
};

const LOCAL_STORAGE_KEY = 'hub_user_rights_config';

export const getInitialRightsConfig = (): UserRightsConfig => {
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.rolePermissions && parsed.userOverrides) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading rights config from cache:', err);
  }

  return {
    rolePermissions: { ...DEFAULT_ROLE_PERMISSIONS },
    userOverrides: {}
  };
};

/**
 * Checks if a user has a specific operational right or view permission.
 */
export const hasUserRight = (
  user: User | null | undefined,
  rightKey: UserRightKey,
  config?: UserRightsConfig | null
): boolean => {
  if (!user) return false;
  if (user.isActive === false) return false;

  // Front Office Manager & Admin always have master access
  if (user.role === 'Front Office Manager' || user.role === 'Admin') {
    return true;
  }

  const effectiveConfig = config || getInitialRightsConfig();

  // Check if there is an explicit user override
  const override = effectiveConfig.userOverrides?.[user.id] || effectiveConfig.userOverrides?.[user.username];
  if (override && override.useCustom) {
    return override.grantedRights.includes(rightKey);
  }

  // Fallback to role-based permission
  const roleRights = effectiveConfig.rolePermissions?.[user.role] || DEFAULT_ROLE_PERMISSIONS[user.role] || [];
  return roleRights.includes(rightKey);
};

/**
 * Retrieves the effective list of rights for a user.
 */
export const getUserEffectiveRights = (
  user: User,
  config?: UserRightsConfig | null
): UserRightKey[] => {
  if (user.role === 'Front Office Manager' || user.role === 'Admin') {
    return [...ALL_RIGHT_KEYS];
  }

  const effectiveConfig = config || getInitialRightsConfig();
  const override = effectiveConfig.userOverrides?.[user.id] || effectiveConfig.userOverrides?.[user.username];

  if (override && override.useCustom) {
    return override.grantedRights;
  }

  return effectiveConfig.rolePermissions?.[user.role] || DEFAULT_ROLE_PERMISSIONS[user.role] || [];
};

/**
 * Loads user rights configuration from Supabase 'settings' table (row id: 'user_rights'),
 * falling back to localStorage and default role permissions.
 */
export const fetchUserRightsConfig = async (): Promise<UserRightsConfig> => {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('support_message')
      .eq('id', 'user_rights')
      .maybeSingle();

    if (error) {
      console.warn('Could not fetch user_rights from settings:', error.message);
      return getInitialRightsConfig();
    }

    if (data?.support_message) {
      try {
        const parsed = JSON.parse(data.support_message);
        if (parsed.rolePermissions) {
          // Merge with any missing roles/keys
          const mergedRoles: Record<UserRole, UserRightKey[]> = {
            ...DEFAULT_ROLE_PERMISSIONS,
            ...parsed.rolePermissions
          };

          const fullConfig: UserRightsConfig = {
            rolePermissions: mergedRoles,
            userOverrides: parsed.userOverrides || {}
          };

          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(fullConfig));
          return fullConfig;
        }
      } catch (e) {
        console.error('Failed to parse user_rights JSON:', e);
      }
    }
  } catch (err) {
    console.error('Error in fetchUserRightsConfig:', err);
  }

  return getInitialRightsConfig();
};

/**
 * Saves user rights configuration to Supabase 'settings' table (row id: 'user_rights')
 * and updates localStorage.
 */
export const saveUserRightsConfig = async (config: UserRightsConfig): Promise<boolean> => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));

    const payload = {
      id: 'user_rights',
      support_message: JSON.stringify(config),
      app_name: 'Nova Maldives | Front Office Rights',
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('settings')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.error('Failed to persist user rights in Supabase:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error saving user rights:', err);
    return false;
  }
};
