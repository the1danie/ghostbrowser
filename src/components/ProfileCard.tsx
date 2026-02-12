import { Play, Square, Copy, Trash2, Edit, Cookie, ExternalLink } from 'lucide-react';
import type { Profile } from '../lib/supabase';

interface Props {
  profile: Profile;
  isRunning: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onLaunch: () => void;
  onStop: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onWarmCookies: () => void;
  onCheckFingerprint: () => void;
}

const statusBadge: Record<string, string> = {
  new: 'badge-new',
  active: 'badge-active',
  running: 'badge-running',
  blocked: 'badge-blocked',
};

export default function ProfileCard({
  profile,
  isRunning,
  isSelected,
  onToggleSelect,
  onLaunch,
  onStop,
  onEdit,
  onDuplicate,
  onDelete,
  onWarmCookies,
  onCheckFingerprint,
}: Props) {
  return (
    <div
      className={`card hover:border-ghost-500 transition-colors ${
        isSelected ? 'border-accent ring-1 ring-accent' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="rounded border-ghost-500 bg-ghost-700 text-accent focus:ring-accent"
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-100">{profile.name}</h3>
              <span className={`badge ${statusBadge[profile.status] || 'badge-new'}`}>
                {profile.status}
              </span>
              {isRunning && (
                <span className="badge bg-green-900/50 text-green-300 animate-pulse">
                  Running
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
              <span>{profile.fingerprint.platform}</span>
              <span>{profile.fingerprint.screenResolution.width}x{profile.fingerprint.screenResolution.height}</span>
              <span>{profile.fingerprint.timezone}</span>
            </div>
            {profile.tags.length > 0 && (
              <div className="flex gap-1 mt-2">
                {profile.tags.map(tag => (
                  <span key={tag} className="px-1.5 py-0.5 bg-ghost-700 rounded text-xs text-gray-400">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {isRunning ? (
            <button onClick={onStop} className="p-2 hover:bg-ghost-700 rounded-lg transition-colors" title="Stop">
              <Square className="w-4 h-4 text-danger" />
            </button>
          ) : (
            <button onClick={onLaunch} className="p-2 hover:bg-ghost-700 rounded-lg transition-colors" title="Launch">
              <Play className="w-4 h-4 text-success" />
            </button>
          )}
          <button onClick={onEdit} className="p-2 hover:bg-ghost-700 rounded-lg transition-colors" title="Edit">
            <Edit className="w-4 h-4 text-gray-400" />
          </button>
          <button onClick={onWarmCookies} className="p-2 hover:bg-ghost-700 rounded-lg transition-colors" title="Warm Cookies">
            <Cookie className="w-4 h-4 text-gray-400" />
          </button>
          <button onClick={onCheckFingerprint} className="p-2 hover:bg-ghost-700 rounded-lg transition-colors" title="Check Fingerprint">
            <ExternalLink className="w-4 h-4 text-gray-400" />
          </button>
          <button onClick={onDuplicate} className="p-2 hover:bg-ghost-700 rounded-lg transition-colors" title="Duplicate">
            <Copy className="w-4 h-4 text-gray-400" />
          </button>
          <button onClick={onDelete} className="p-2 hover:bg-ghost-700 rounded-lg transition-colors" title="Delete">
            <Trash2 className="w-4 h-4 text-danger" />
          </button>
        </div>
      </div>
    </div>
  );
}
