import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { FolderOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { APP_NAME, APP_VERSION } from '../lib/brand';

export default function SettingsPage() {
  const { user } = useAuth();
  const [profilesPath, setProfilesPath] = useState('');
  const [cleaning, setCleaning] = useState(false);

  useEffect(() => {
    const api = (window as any).electronAPI;
    if (api) {
      api.getUserDataPath().then((p: string) => setProfilesPath(p));
    }
  }, []);

  const handleCleanupOrphans = async () => {
    const api = (window as any).electronAPI;
    if (!api?.cleanupOrphanProfileData) {
      toast.error('Cleanup API not available');
      return;
    }

    setCleaning(true);
    try {
      const { data, error } = await supabase.from('profiles').select('id');
      if (error) throw error;
      const ids = (data || []).map((p: { id: string }) => p.id);

      const result = await api.cleanupOrphanProfileData(ids);
      if (!result?.success) {
        throw new Error(result?.error || 'Cleanup failed');
      }

      if (result.removed.length === 0) {
        toast.success('No orphan local profile folders found');
      } else {
        toast.success(`Removed ${result.removed.length} orphan folder(s)`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Cleanup failed');
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Account */}
      <div className="card space-y-4">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Account</h3>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Email</label>
          <input className="input-field" value={user?.email || ''} disabled />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">User ID</label>
          <input className="input-field font-mono text-xs" value={user?.id || ''} disabled />
        </div>
      </div>

      {/* Storage */}
      <div className="card space-y-4">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Storage</h3>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Browser Profiles Directory</label>
          <div className="flex gap-2">
            <input className="input-field font-mono text-xs" value={profilesPath} disabled />
            <button
              onClick={() => {
                const api = (window as any).electronAPI;
                if (api) api.openExternal(`file://${profilesPath}`);
              }}
              className="btn-secondary flex items-center gap-1.5 whitespace-nowrap"
            >
              <FolderOpen className="w-4 h-4" /> Open
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Each profile has its own isolated directory with cookies, cache, and local storage.
          </p>
        </div>
        <div className="flex items-center justify-between bg-ghost-900/50 border border-ghost-700 rounded-lg p-3">
          <p className="text-sm text-gray-400">
            Remove old local folders that no longer exist in your profile list.
          </p>
          <button
            onClick={handleCleanupOrphans}
            className="btn-secondary text-sm"
            disabled={cleaning}
          >
            {cleaning ? 'Cleaning...' : 'Cleanup Orphans'}
          </button>
        </div>
      </div>

      {/* About */}
      <div className="card space-y-2">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">About</h3>
        <p className="text-sm text-gray-400">{APP_NAME} v{APP_VERSION}</p>
        <p className="text-sm text-gray-500">
          Open-source antidetect browser. Manage multiple browser profiles with unique fingerprints.
        </p>
      </div>
    </div>
  );
}
