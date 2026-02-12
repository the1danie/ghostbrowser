import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import type { Profile, BrowserFingerprint, Proxy } from '../lib/supabase';
import { generateFingerprint } from '../lib/fingerprint-generator';
import FingerprintEditor from '../components/FingerprintEditor';

export default function ProfileEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('new');
  const [proxyId, setProxyId] = useState<string | null>(null);
  const [fingerprint, setFingerprint] = useState<BrowserFingerprint>(generateFingerprint());
  const [proxies, setProxies] = useState<Proxy[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        // Load proxies list
        const { data: proxyData, error: proxyError } = await supabase
          .from('proxies')
          .select('*')
          .order('created_at', { ascending: false });
        if (proxyError) throw proxyError;
        setProxies(proxyData || []);

        if (!isNew) {
          const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
          if (error || !data) {
            toast.error('Profile not found');
            navigate('/');
            return;
          }
          setName(data.name);
          setGroupName(data.group_name || '');
          setTags(data.tags?.join(', ') || '');
          setNotes(data.notes || '');
          setStatus(data.status);
          setProxyId(data.proxy_id);
          setFingerprint(data.fingerprint);
        }
      } catch (err: any) {
        toast.error(err.message || 'Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isNew, navigate]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Profile name is required');
      return;
    }

    setSaving(true);
    try {
      const profileData = {
        name: name.trim(),
        group_name: groupName.trim() || null,
        tags: tags
          .split(',')
          .map(t => t.trim())
          .filter(Boolean),
        notes: notes.trim() || null,
        status,
        proxy_id: proxyId,
        fingerprint,
      };

      if (isNew) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await supabase.from('profiles').insert({
          ...profileData,
          user_id: user.id,
          cookies: [],
        });
        if (error) throw error;
        toast.success('Profile created');
      } else {
        const { error } = await supabase.from('profiles').update(profileData).eq('id', id);
        if (error) throw error;
        toast.success('Profile updated');
      }
      navigate('/');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-ghost-800 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">{isNew ? 'New Profile' : 'Edit Profile'}</h1>
      </div>

      {/* Basic Info */}
      <div className="card space-y-4">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Basic Info</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Profile Name</label>
            <input
              className="input-field"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="My Profile"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Group</label>
            <input
              className="input-field"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder="e.g. Facebook Accounts"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Tags (comma-separated)</label>
            <input
              className="input-field"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="tag1, tag2"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Status</label>
            <select className="select-field" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="new">New</option>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Notes</label>
          <textarea
            className="input-field h-20"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Any notes about this profile..."
          />
        </div>
      </div>

      {/* Proxy */}
      <div className="card space-y-4">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Proxy</h3>
        <select
          className="select-field"
          value={proxyId || ''}
          onChange={e => setProxyId(e.target.value || null)}
        >
          <option value="">No Proxy</option>
          {proxies.map(p => (
            <option key={p.id} value={p.id}>
              {p.name || `${p.protocol}://${p.host}:${p.port}`}
              {p.country ? ` (${p.country})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Fingerprint */}
      <div className="card">
        <FingerprintEditor fingerprint={fingerprint} onChange={setFingerprint} />
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button onClick={handleSave} className="btn-primary flex items-center gap-1.5" disabled={saving}>
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : isNew ? 'Create Profile' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
