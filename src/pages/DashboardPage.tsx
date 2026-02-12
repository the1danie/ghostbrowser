import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Upload, Download, Trash2, Play } from 'lucide-react';
import toast from 'react-hot-toast';
import { useProfiles } from '../hooks/useProfiles';
import { useProxies } from '../hooks/useProxies';
import ProfileCard from '../components/ProfileCard';
import CookieWarmerModal from '../components/CookieWarmerModal';
import ImportExportModal from '../components/ImportExportModal';

export default function DashboardPage() {
  const navigate = useNavigate();
  const {
    profiles,
    loading,
    deleteProfile,
    deleteProfiles,
    duplicateProfile,
    updateProfile,
    importProfiles,
    exportProfiles,
  } = useProfiles();

  const { proxies } = useProxies();

  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [runningProfiles, setRunningProfiles] = useState<Set<string>>(new Set());
  const [warmerProfileId, setWarmerProfileId] = useState<string | null>(null);
  const [importExport, setImportExport] = useState<{ mode: 'import' | 'export'; data?: string } | null>(null);

  // Poll running profiles
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api) return;

    const interval = setInterval(async () => {
      const running = await api.getRunningProfiles();
      setRunningProfiles(new Set(running.map((r: any) => r.profileId)));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Listen for browser closed externally (user closed the browser window)
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api?.onProfileClosed) return;

    const cleanup = api.onProfileClosed(async (data: { profileId: string; cookies: any[] }) => {
      // Remove from running set immediately
      setRunningProfiles(prev => {
        const next = new Set(prev);
        next.delete(data.profileId);
        return next;
      });
      // Save cookies and update status in Supabase
      try {
        await updateProfile(data.profileId, { status: 'active', cookies: data.cookies });
      } catch {}
      toast('Browser closed', { icon: '\u23F9' });
    });

    return cleanup;
  }, [updateProfile]);

  const filteredProfiles = profiles.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !p.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))) {
      return false;
    }
    if (filterGroup && p.group_name !== filterGroup) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    return true;
  });

  const groups = [...new Set(profiles.map(p => p.group_name).filter(Boolean))] as string[];

  const handleLaunch = async (profileId: string) => {
    const api = (window as any).electronAPI;
    if (!api) { toast.error('Electron API not available'); return; }

    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return;

    // Resolve proxy data from proxy_id
    let proxy: { protocol: string; host: string; port: number; username?: string; password?: string } | undefined;
    if (profile.proxy_id) {
      const proxyRecord = proxies.find(p => p.id === profile.proxy_id);
      if (proxyRecord) {
        proxy = {
          protocol: proxyRecord.protocol,
          host: proxyRecord.host,
          port: proxyRecord.port,
          username: proxyRecord.username || undefined,
          password: proxyRecord.password || undefined,
        };
      }
    }

    try {
      const result = await api.launchProfile({
        id: profile.id,
        fingerprint: profile.fingerprint,
        cookies: profile.cookies,
        proxy,
      });

      if (result.success) {
        toast.success(`Profile launched${proxy ? ` via ${proxy.host}:${proxy.port}` : ''}`);
        await updateProfile(profileId, { status: 'running' });
      } else {
        toast.error(result.error || 'Failed to launch');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to launch');
    }
  };

  const handleStop = async (profileId: string) => {
    const api = (window as any).electronAPI;
    if (!api) return;

    try {
      const result = await api.closeProfile(profileId);
      if (result.success) {
        toast.success('Profile stopped');
        await updateProfile(profileId, { status: 'active', cookies: result.cookies });
      } else {
        toast.error(result.error || 'Failed to stop');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to stop');
    }
  };

  const handleCheckFingerprint = async (profileId: string) => {
    // Launch the profile and navigate to browserleaks.com
    const api = (window as any).electronAPI;
    if (!api) return;

    if (!runningProfiles.has(profileId)) {
      await handleLaunch(profileId);
    }
    // The user can manually navigate in the launched browser
    toast.success('Check your fingerprint at browserleaks.com in the launched browser');
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} profile(s)?`)) return;
    try {
      await deleteProfiles(Array.from(selected));
      setSelected(new Set());
      toast.success(`Deleted ${selected.size} profile(s)`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleBulkLaunch = async () => {
    for (const id of selected) {
      if (!runningProfiles.has(id)) {
        await handleLaunch(id);
      }
    }
  };

  const handleExport = () => {
    const ids = selected.size > 0 ? Array.from(selected) : profiles.map(p => p.id);
    const data = exportProfiles(ids);
    setImportExport({ mode: 'export', data });
  };

  const warmerProfile = profiles.find(p => p.id === warmerProfileId);
  const warmerProxyRecord = warmerProfile?.proxy_id
    ? proxies.find(p => p.id === warmerProfile.proxy_id)
    : undefined;
  const warmerProxy = warmerProxyRecord
    ? {
        protocol: warmerProxyRecord.protocol,
        host: warmerProxyRecord.host,
        port: warmerProxyRecord.port,
        username: warmerProxyRecord.username || undefined,
        password: warmerProxyRecord.password || undefined,
      }
    : undefined;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Browser Profiles</h1>
        <div className="flex gap-2">
          <button onClick={() => setImportExport({ mode: 'import' })} className="btn-secondary flex items-center gap-1.5 text-sm">
            <Upload className="w-4 h-4" /> Import
          </button>
          <button onClick={handleExport} className="btn-secondary flex items-center gap-1.5 text-sm">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={() => navigate('/profile/new')} className="btn-primary flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> New Profile
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            className="input-field pl-9"
            placeholder="Search by name or tag..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="select-field w-40"
          value={filterGroup}
          onChange={e => setFilterGroup(e.target.value)}
        >
          <option value="">All Groups</option>
          {groups.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select
          className="select-field w-36"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="new">New</option>
          <option value="active">Active</option>
          <option value="running">Running</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-ghost-800 border border-ghost-600 rounded-lg p-3">
          <span className="text-sm text-gray-400">{selected.size} selected</span>
          <button onClick={handleBulkLaunch} className="btn-secondary text-sm flex items-center gap-1">
            <Play className="w-3.5 h-3.5" /> Launch
          </button>
          <button onClick={handleBulkDelete} className="btn-danger text-sm flex items-center gap-1">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
          <button onClick={() => setSelected(new Set())} className="text-sm text-gray-500 hover:text-gray-300 ml-auto">
            Clear selection
          </button>
        </div>
      )}

      {/* Profiles List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent" />
        </div>
      ) : filteredProfiles.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {profiles.length === 0
            ? 'No profiles yet. Create your first profile!'
            : 'No profiles match your search.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredProfiles.map(profile => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              isRunning={runningProfiles.has(profile.id)}
              isSelected={selected.has(profile.id)}
              onToggleSelect={() => {
                setSelected(prev => {
                  const next = new Set(prev);
                  if (next.has(profile.id)) next.delete(profile.id);
                  else next.add(profile.id);
                  return next;
                });
              }}
              onLaunch={() => handleLaunch(profile.id)}
              onStop={() => handleStop(profile.id)}
              onEdit={() => navigate(`/profile/${profile.id}`)}
              onDuplicate={async () => {
                try {
                  await duplicateProfile(profile.id);
                  toast.success('Profile duplicated');
                } catch (err: any) {
                  toast.error(err.message);
                }
              }}
              onDelete={async () => {
                if (!confirm(`Delete "${profile.name}"?`)) return;
                try {
                  await deleteProfile(profile.id);
                  toast.success('Profile deleted');
                } catch (err: any) {
                  toast.error(err.message);
                }
              }}
              onWarmCookies={() => setWarmerProfileId(profile.id)}
              onCheckFingerprint={() => handleCheckFingerprint(profile.id)}
            />
          ))}
        </div>
      )}

      {/* Cookie Warmer Modal */}
      {warmerProfile && (
        <CookieWarmerModal
          profileId={warmerProfile.id}
          profileName={warmerProfile.name}
          proxy={warmerProxy}
          onClose={() => setWarmerProfileId(null)}
        />
      )}

      {/* Import/Export Modal */}
      {importExport && (
        <ImportExportModal
          mode={importExport.mode}
          exportData={importExport.data}
          onImport={importProfiles}
          onClose={() => setImportExport(null)}
        />
      )}
    </div>
  );
}
