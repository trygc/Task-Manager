import React, { useContext, useState, useEffect, useCallback } from 'react';
import { AppContext } from './Root';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { ALWAYS_AVAILABLE_FEATURES } from '../lib/navigation';
import {
  Users,
  Shield,
  ShieldCheck,
  Crown,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Check,
  X,
  UserCog,
  LayoutDashboard,
  ClipboardList,
  Link2,
  BarChart3,
  Eye,
  Award,
  FileText,
  Archive,
  Globe,
  UploadCloud,
  Settings,
  SlidersHorizontal,
  UserPlus,
  Trash2,
  Pencil,
  Clock,
  Download,
  Upload,
  Target,
  User,
} from 'lucide-react';

// The single owner — full control, cannot be changed by anyone
const OWNER_EMAIL = 'ahmedlalatoo2013@gmail.com';

const isOwnerEmail = (email: string) =>
  email.toLowerCase() === OWNER_EMAIL.toLowerCase();

interface FeatureDefinition {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  adminOnly?: boolean;
}

const ALL_FEATURES: FeatureDefinition[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Main overview dashboard' },
  { id: 'coverage', label: 'Coverage', icon: ClipboardList, description: 'Coverage workbook tracking and campaign queue' },
  { id: 'widgets', label: 'Widgets', icon: Link2, description: 'Custom link widgets for important URLs' },
  { id: 'tasks', label: 'All Tasks', icon: ClipboardList, description: 'View and manage all tasks', adminOnly: true },
  { id: 'campaigns', label: 'Campaigns', icon: Target, description: '6-phase campaign lifecycle management' },
  { id: 'analytics', label: 'Team Analytics', icon: BarChart3, description: 'Analytics and charts', adminOnly: true },
  { id: 'member-views', label: 'Member Views', icon: Eye, description: 'View individual member data', adminOnly: true },
  { id: 'successes', label: 'Updates', icon: Award, description: 'Success tracking feed' },
  { id: 'reports', label: 'Reports', icon: FileText, description: 'Generate detailed reports', adminOnly: true },
  { id: 'archive', label: 'Archive', icon: Archive, description: 'Access archived data', adminOnly: true },
  { id: 'settings', label: 'Settings', icon: Settings, description: 'Platform settings' },
  { id: 'configuration', label: 'Configuration', icon: SlidersHorizontal, description: 'System, campaign, team & feature flag configuration', adminOnly: true },
  { id: 'personal', label: 'My Dashboard', icon: User, description: 'Personal workspace overview' },
  { id: 'community-team', label: 'Community Team', icon: Globe, description: 'Community team management' },
];

const mergeRequiredFeatures = (featureIds: string[]) => Array.from(new Set([...featureIds, ...ALWAYS_AVAILABLE_FEATURES]));

const DEFAULT_ADMIN_FEATURES = mergeRequiredFeatures(ALL_FEATURES.map(f => f.id));
const DEFAULT_MEMBER_FEATURES = mergeRequiredFeatures(['personal', 'community-team', 'coverage', 'widgets', 'campaigns', 'successes', 'settings']);

export function UserManagement() {
  const ctx = useContext(AppContext);
  const userEmail = ctx?.userEmail || '';
  const isAdmin = ctx?.isAdmin || false;
  const setTeamMembers = ctx?.setTeamMembers;

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    email: string;
    action: 'role' | 'remove';
    newRole?: string;
  } | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Add User form state
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserTeamName, setNewUserTeamName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'member'>('member');
  const [addingUser, setAddingUser] = useState(false);

  // Edit name state
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [editTeamValue, setEditTeamValue] = useState('');

  const isOwner = isOwnerEmail(userEmail);

  // Determine if current user can manage a target user
  const canManage = (targetEmail: string) => {
    if (isOwnerEmail(targetEmail)) return false; // nobody can edit the owner
    if (isOwner) return true; // owner can edit everyone else
    return false; // non-owners can only view
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 5000);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b626472b/admin-config`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      if (response.ok) {
        const data = await response.json();
        const members = data.config?.teamMembers || [];
        const enriched = members.map((m: any) => ({
          ...m,
          teamName: m.teamName || '',
          features: m.features || (m.role === 'admin' ? DEFAULT_ADMIN_FEATURES : DEFAULT_MEMBER_FEATURES),
        }));
        setUsers(enriched);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      showError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin, fetchUsers]);

  const saveUsers = async (updatedUsers: any[]) => {
    try {
      const configRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b626472b/admin-config`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const configData = await configRes.json();
      const config = configData.config || { adminEmails: [], teamMembers: [] };

      config.adminEmails = updatedUsers.filter((u: any) => u.role === 'admin').map((u: any) => u.email);
      config.teamMembers = updatedUsers;

      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b626472b/admin-config`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ config }),
        }
      );

      if (setTeamMembers) setTeamMembers(updatedUsers);
    } catch (error) {
      console.error('Error saving users:', error);
      throw error;
    }
  };

  // ── Add User ──────────────────────────────────────────────
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;
    const email = newUserEmail.trim().toLowerCase();
    if (!email) return;

    // Check duplicate
    if (users.some(u => u.email.toLowerCase() === email)) {
      showError('A user with this email already exists.');
      return;
    }

    setAddingUser(true);
    try {
      const newUser = {
        email,
        name: newUserName.trim() || email,
        teamName: newUserTeamName.trim(),
        role: newUserRole,
        features: newUserRole === 'admin' ? DEFAULT_ADMIN_FEATURES : DEFAULT_MEMBER_FEATURES,
        addedAt: new Date().toISOString(),
      };
      const updatedUsers = [...users, newUser];
      await saveUsers(updatedUsers);
      setUsers(updatedUsers);
      setNewUserEmail('');
      setNewUserName('');
      setNewUserTeamName('');
      setNewUserRole('member');
      setShowAddUser(false);
      showSuccess(`User ${email} added as ${newUserRole}.`);
    } catch (err) {
      console.error('Error adding user:', err);
      showError('Failed to add user.');
    } finally {
      setAddingUser(false);
    }
  };

  // ── Remove User ───────────────────────────────────────────
  const handleRemoveUser = async (email: string) => {
    if (!canManage(email)) return;
    setSaving(email);
    try {
      const updatedUsers = users.filter(u => u.email.toLowerCase() !== email.toLowerCase());
      await saveUsers(updatedUsers);
      setUsers(updatedUsers);
      showSuccess(`User ${email} removed.`);
    } catch (err) {
      console.error('Error removing user:', err);
      showError('Failed to remove user.');
    } finally {
      setSaving(null);
      setConfirmAction(null);
    }
  };

  // ── Change Role ───────────────────────────────────────────
  const handleRoleChange = async (email: string, newRole: 'admin' | 'member') => {
    if (!canManage(email)) return;
    setSaving(email);
    try {
      const updatedUsers = users.map(u => {
        if (u.email.toLowerCase() === email.toLowerCase()) {
          const features = newRole === 'admin' ? DEFAULT_ADMIN_FEATURES : DEFAULT_MEMBER_FEATURES;
          return { ...u, role: newRole, features };
        }
        return u;
      });
      await saveUsers(updatedUsers);
      setUsers(updatedUsers);
      showSuccess(`Role updated to ${newRole} for ${email}`);
    } catch (err) {
      console.error('Error changing role:', err);
      showError('Failed to change role.');
    } finally {
      setSaving(null);
      setConfirmAction(null);
    }
  };

  // ── Toggle Feature ────────────────────────────────────────
  const handleToggleFeature = async (email: string, featureId: string) => {
    if (!canManage(email)) return;
    if (ALWAYS_AVAILABLE_FEATURES.includes(featureId as (typeof ALWAYS_AVAILABLE_FEATURES)[number])) return;
    setSaving(email);
    try {
      const updatedUsers = users.map(u => {
        if (u.email.toLowerCase() === email.toLowerCase()) {
          const currentFeatures = u.features || [];
          const hasFeature = currentFeatures.includes(featureId);
          const newFeatures = hasFeature
            ? currentFeatures.filter((f: string) => f !== featureId)
            : [...currentFeatures, featureId];
          return { ...u, features: mergeRequiredFeatures(newFeatures) };
        }
        return u;
      });
      await saveUsers(updatedUsers);
      setUsers(updatedUsers);
    } catch (err) {
      console.error('Error toggling feature:', err);
    } finally {
      setSaving(null);
    }
  };

  // ── Bulk Feature Preset ───────────────────────────────────
  const handleBulkFeatureSet = async (email: string, preset: 'all' | 'minimal' | 'admin-default' | 'member-default') => {
    if (!canManage(email)) return;
    setSaving(email);
    try {
      let features: string[];
      switch (preset) {
        case 'all': features = ALL_FEATURES.map(f => f.id); break;
        case 'minimal': features = ['personal', 'settings']; break;
        case 'admin-default': features = DEFAULT_ADMIN_FEATURES; break;
        case 'member-default': features = DEFAULT_MEMBER_FEATURES; break;
      }
      features = mergeRequiredFeatures(features);
      const updatedUsers = users.map(u => {
        if (u.email.toLowerCase() === email.toLowerCase()) {
          return { ...u, features };
        }
        return u;
      });
      await saveUsers(updatedUsers);
      setUsers(updatedUsers);
      showSuccess(`Feature preset applied for ${email}`);
    } catch (err) {
      console.error('Error setting features:', err);
    } finally {
      setSaving(null);
    }
  };

  // ── Edit Name ─────────────────────────────────────────────
  const handleSaveName = async (email: string) => {
    if (!canManage(email) || !editNameValue.trim()) return;
    setSaving(email);
    try {
      const updatedUsers = users.map(u => {
        if (u.email.toLowerCase() === email.toLowerCase()) {
          return { ...u, name: editNameValue.trim() };
        }
        return u;
      });
      await saveUsers(updatedUsers);
      setUsers(updatedUsers);
      setEditingName(null);
      showSuccess(`Name updated for ${email}`);
    } catch (err) {
      console.error('Error updating name:', err);
    } finally {
      setSaving(null);
    }
  };

  const handleSaveTeamName = async (email: string) => {
    if (!canManage(email)) return;
    setSaving(email);
    try {
      const updatedUsers = users.map(u => {
        if (u.email.toLowerCase() === email.toLowerCase()) {
          return { ...u, teamName: editTeamValue.trim() };
        }
        return u;
      });
      await saveUsers(updatedUsers);
      setUsers(updatedUsers);
      setEditingTeam(null);
      showSuccess(`Team updated for ${email}`);
    } catch (err) {
      console.error('Error updating team name:', err);
    } finally {
      setSaving(null);
    }
  };

  const filteredUsers = users.filter(
    u =>
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.teamName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-8">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-zinc-400 dark:text-zinc-600" />
          </div>
          <h2 className="text-xl font-black text-zinc-800 dark:text-zinc-100 mb-1">Access Denied</h2>
          <p className="text-sm text-zinc-500">Only administrators can manage users.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 md:px-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-black text-zinc-800 dark:text-zinc-100 mb-2 tracking-tight">
            User Management
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium">
            {isOwner
              ? 'Full control — manage roles, features, add or remove users'
              : 'View team members and their access levels'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isOwner && (
            <button
              onClick={() => setShowAddUser(!showAddUser)}
              className="flex items-center gap-2 px-5 py-3 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              Add User
            </button>
          )}
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-3 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-2xl font-bold hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl animate-in slide-in-from-top-2">
          <Check className="w-5 h-5 text-zinc-800 dark:text-zinc-200" />
          <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-3 p-4 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-2xl animate-in slide-in-from-top-2">
          <AlertTriangle className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
          <span className="font-bold text-sm text-zinc-700 dark:text-zinc-300">{errorMsg}</span>
        </div>
      )}

      {/* Add User Form */}
      {showAddUser && isOwner && (
        <div className="bg-white dark:bg-zinc-950 rounded-3xl shadow-lg border border-zinc-200 dark:border-zinc-800 p-6 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
              <UserPlus className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
            </div>
            <h3 className="text-lg font-black text-zinc-800 dark:text-zinc-100">Add New User</h3>
          </div>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-black uppercase text-zinc-400 dark:text-zinc-500 mb-1.5 block tracking-wider">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:border-black dark:focus:border-white font-medium text-zinc-800 dark:text-zinc-200 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase text-zinc-400 dark:text-zinc-500 mb-1.5 block tracking-wider">
                  Full Name
                </label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:border-black dark:focus:border-white font-medium text-zinc-800 dark:text-zinc-200 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase text-zinc-400 dark:text-zinc-500 mb-1.5 block tracking-wider">
                  Team Name
                </label>
                <input
                  type="text"
                  value={newUserTeamName}
                  onChange={e => setNewUserTeamName(e.target.value)}
                  placeholder="Community Team"
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:border-black dark:focus:border-white font-medium text-zinc-800 dark:text-zinc-200 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-black uppercase text-zinc-400 dark:text-zinc-500 mb-1.5 block tracking-wider">
                Role
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNewUserRole('admin')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                    newUserRole === 'admin'
                      ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg'
                      : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => setNewUserRole('member')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                    newUserRole === 'member'
                      ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg'
                      : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  Member
                </button>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowAddUser(false); setNewUserEmail(''); setNewUserName(''); setNewUserTeamName(''); }}
                className="flex-1 px-4 py-3 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addingUser || !newUserEmail.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all disabled:opacity-50"
              >
                {addingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Add User
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-950 rounded-3xl shadow-lg border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
              <Users className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
            </div>
            <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400">Total Users</span>
          </div>
          <div className="text-3xl font-black text-zinc-800 dark:text-zinc-100">{users.length}</div>
        </div>
        <div className="bg-white dark:bg-zinc-950 rounded-3xl shadow-lg border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
              <ShieldCheck className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
            </div>
            <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400">Admins</span>
          </div>
          <div className="text-3xl font-black text-zinc-800 dark:text-zinc-100">
            {users.filter(u => u.role === 'admin').length}
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-950 rounded-3xl shadow-lg border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
              <UserCog className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
            </div>
            <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400">Members</span>
          </div>
          <div className="text-3xl font-black text-zinc-800 dark:text-zinc-100">
            {users.filter(u => u.role === 'member').length}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search users by name or email..."
          className="w-full pl-12 pr-4 py-4 bg-white dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 rounded-2xl outline-none focus:border-black dark:focus:border-white font-medium text-zinc-800 dark:text-zinc-200 transition-colors"
        />
      </div>

      {/* User List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-20">
          <Users className="w-16 h-16 mx-auto mb-4 text-zinc-300 dark:text-zinc-700" />
          <h3 className="text-xl font-black text-zinc-400 dark:text-zinc-600">No users found</h3>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map(user => {
            const isExpanded = expandedUser === user.email;
            const isOwnerUser = isOwnerEmail(user.email);
            const manageable = canManage(user.email);
            const isCurrentlySaving = saving === user.email;
            const userFeatures = mergeRequiredFeatures(user.features || []);
            const isEditingThisName = editingName === user.email;
            const isEditingThisTeam = editingTeam === user.email;

            return (
              <div
                key={user.email}
                className="bg-white dark:bg-zinc-950 rounded-3xl shadow-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden transition-all"
              >
                {/* User Row */}
                <div
                  className="flex items-center justify-between p-5 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                  onClick={() => setExpandedUser(isExpanded ? null : user.email)}
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shadow-md ${
                        isOwnerUser
                          ? 'bg-black dark:bg-white text-white dark:text-black ring-2 ring-zinc-400 dark:ring-zinc-600'
                          : user.role === 'admin'
                          ? 'bg-black dark:bg-white text-white dark:text-black'
                          : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {user.name?.substring(0, 2).toUpperCase() || 'TM'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-800 dark:text-zinc-100">
                          {user.name || 'Unknown User'}
                        </span>
                        {user.teamName && (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg">
                            {user.teamName}
                          </span>
                        )}
                        {isOwnerUser && (
                          <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-black dark:bg-white text-white dark:text-black rounded-lg">
                            <Crown className="w-3 h-3" />
                            Owner
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-zinc-500 dark:text-zinc-400">{user.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {isCurrentlySaving && (
                      <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                    )}

                    {manageable && (
                      <div>
                        <h4 className="text-xs font-black uppercase text-zinc-400 dark:text-zinc-500 mb-3 tracking-wider">
                          Team Name
                        </h4>
                        {isEditingThisTeam ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editTeamValue}
                              onChange={e => setEditTeamValue(e.target.value)}
                              onClick={e => e.stopPropagation()}
                              className="flex-1 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:border-black dark:focus:border-white font-medium text-zinc-800 dark:text-zinc-200 text-sm"
                              autoFocus
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveTeamName(user.email);
                                if (e.key === 'Escape') setEditingTeam(null);
                              }}
                            />
                            <button
                              onClick={e => { e.stopPropagation(); handleSaveTeamName(user.email); }}
                              disabled={isCurrentlySaving}
                              className="px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); setEditingTeam(null); }}
                              className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 rounded-xl font-bold text-sm hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setEditingTeam(user.email);
                              setEditTeamValue(user.teamName || '');
                            }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all w-full text-left"
                          >
                            <Pencil className="w-3.5 h-3.5 text-zinc-400" />
                            {user.teamName || 'No team set'} — click to edit
                          </button>
                        )}
                      </div>
                    )}
                    {/* Role Badge */}
                    <span
                      className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider ${
                        user.role === 'admin'
                          ? 'bg-black dark:bg-white text-white dark:text-black'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {user.role || 'member'}
                    </span>
                    <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 hidden sm:block">
                      {userFeatures.length} features
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-zinc-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-zinc-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Panel */}
                {isExpanded && (
                  <div className="border-t border-zinc-100 dark:border-zinc-800 p-5 space-y-5 animate-in slide-in-from-top-1 duration-200">
                    {/* Name Edit */}
                    {manageable && (
                      <div>
                        <h4 className="text-xs font-black uppercase text-zinc-400 dark:text-zinc-500 mb-3 tracking-wider">
                          Display Name
                        </h4>
                        {isEditingThisName ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editNameValue}
                              onChange={e => setEditNameValue(e.target.value)}
                              onClick={e => e.stopPropagation()}
                              className="flex-1 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:border-black dark:focus:border-white font-medium text-zinc-800 dark:text-zinc-200 text-sm"
                              autoFocus
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveName(user.email);
                                if (e.key === 'Escape') setEditingName(null);
                              }}
                            />
                            <button
                              onClick={e => { e.stopPropagation(); handleSaveName(user.email); }}
                              disabled={isCurrentlySaving}
                              className="px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); setEditingName(null); }}
                              className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 rounded-xl font-bold text-sm hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setEditingName(user.email);
                              setEditNameValue(user.name || '');
                            }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all w-full text-left"
                          >
                            <Pencil className="w-3.5 h-3.5 text-zinc-400" />
                            {user.name || 'No name set'} — click to edit
                          </button>
                        )}
                      </div>
                    )}

                    {/* Role Section */}
                    <div>
                      <h4 className="text-xs font-black uppercase text-zinc-400 dark:text-zinc-500 mb-3 tracking-wider">
                        Role
                      </h4>
                      {isOwnerUser ? (
                        <div className="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
                          <Crown className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                          <span className="text-sm font-bold text-zinc-600 dark:text-zinc-400">
                            Owner — cannot be changed
                          </span>
                        </div>
                      ) : manageable ? (
                        <div className="flex gap-2">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              if (user.role !== 'admin') {
                                setConfirmAction({ email: user.email, action: 'role', newRole: 'admin' });
                              }
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                              user.role === 'admin'
                                ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg'
                                : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                            }`}
                          >
                            <ShieldCheck className="w-4 h-4" />
                            Admin
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              if (user.role !== 'member') {
                                setConfirmAction({ email: user.email, action: 'role', newRole: 'member' });
                              }
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                              user.role === 'member'
                                ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg'
                                : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                            }`}
                          >
                            <Shield className="w-4 h-4" />
                            Member
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
                          <Shield className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                          <span className="text-sm font-bold text-zinc-600 dark:text-zinc-400">
                            {user.role === 'admin' ? 'Admin' : 'Member'} — only the owner can change roles
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Quick Presets */}
                    {manageable && (
                      <div>
                        <h4 className="text-xs font-black uppercase text-zinc-400 dark:text-zinc-500 mb-3 tracking-wider">
                          Feature Presets
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { key: 'all' as const, label: 'All Features' },
                            { key: 'admin-default' as const, label: 'Admin Default' },
                            { key: 'member-default' as const, label: 'Member Default' },
                            { key: 'minimal' as const, label: 'Minimal' },
                          ].map(preset => (
                            <button
                              key={preset.key}
                              onClick={e => {
                                e.stopPropagation();
                                handleBulkFeatureSet(user.email, preset.key);
                              }}
                              disabled={isCurrentlySaving}
                              className="px-3 py-2 text-xs font-bold bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all disabled:opacity-50"
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Features Grid */}
                    <div>
                      <h4 className="text-xs font-black uppercase text-zinc-400 dark:text-zinc-500 mb-3 tracking-wider">
                        Feature Access ({userFeatures.length}/{ALL_FEATURES.length})
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {ALL_FEATURES.map(feature => {
                          const isEnabled = userFeatures.includes(feature.id);
                          const isSharedFeature = ALWAYS_AVAILABLE_FEATURES.includes(feature.id as (typeof ALWAYS_AVAILABLE_FEATURES)[number]);
                          const disabled = !manageable || isCurrentlySaving || isSharedFeature;

                          return (
                            <button
                              key={feature.id}
                              onClick={e => {
                                e.stopPropagation();
                                if (!disabled) handleToggleFeature(user.email, feature.id);
                              }}
                              disabled={disabled}
                              className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                                isEnabled
                                  ? 'bg-black dark:bg-white text-white dark:text-black'
                                  : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                              } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              <feature.icon className="w-4 h-4 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold truncate">{feature.label}</div>
                                {isSharedFeature && (
                                  <div className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] opacity-70">
                                    Shared for all accounts
                                  </div>
                                )}
                              </div>
                              {isEnabled ? (
                                <ToggleRight className="w-5 h-5 flex-shrink-0" />
                              ) : (
                                <ToggleLeft className="w-5 h-5 flex-shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Bottom Actions & Meta */}
                    <div className="flex items-center justify-between gap-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                      <span className="text-xs text-zinc-400 dark:text-zinc-600">
                        Joined: {user.addedAt ? new Date(user.addedAt).toLocaleDateString() : 'Unknown'}
                      </span>
                      {manageable && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setConfirmAction({ email: user.email, action: 'remove' });
                          }}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-zinc-500 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remove User
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white dark:bg-zinc-950 rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in fade-in zoom-in duration-200 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-2xl">
                <AlertTriangle className="w-6 h-6 text-zinc-700 dark:text-zinc-300" />
              </div>
              <div>
                <h3 className="text-xl font-black text-zinc-800 dark:text-zinc-100">
                  {confirmAction.action === 'remove' ? 'Confirm Removal' : 'Confirm Role Change'}
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {confirmAction.action === 'remove'
                    ? 'This will remove the user from the system'
                    : 'This will change access permissions'}
                </p>
              </div>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
              {confirmAction.action === 'remove' ? (
                <>
                  Are you sure you want to remove{' '}
                  <strong className="text-zinc-800 dark:text-zinc-200">{confirmAction.email}</strong>?
                  They will lose all access and will need to be re-added.
                </>
              ) : (
                <>
                  Are you sure you want to change{' '}
                  <strong className="text-zinc-800 dark:text-zinc-200">{confirmAction.email}</strong> to{' '}
                  <strong className="text-zinc-800 dark:text-zinc-200">{confirmAction.newRole}</strong>?
                  Their feature access will be reset to{' '}
                  {confirmAction.newRole === 'admin' ? 'full admin' : 'default member'} permissions.
                </>
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 px-4 py-3 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmAction.action === 'remove') {
                    handleRemoveUser(confirmAction.email);
                  } else {
                    handleRoleChange(confirmAction.email, confirmAction.newRole as 'admin' | 'member');
                  }
                }}
                className="flex-1 px-4 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all"
              >
                {confirmAction.action === 'remove' ? 'Remove' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
