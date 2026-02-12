import { useState } from 'react';
import { Plus, Trash2, CheckCircle, XCircle, Loader, Upload, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { useProxies } from '../hooks/useProxies';
import ProxyForm from '../components/ProxyForm';
import { parseBulkProxies } from '../lib/proxy-checker';
import type { Proxy } from '../lib/supabase';

export default function ProxyPage() {
  const { proxies, loading, createProxy, updateProxy, deleteProxy, deleteProxies, bulkImport, checkProxy } = useProxies();
  const [showForm, setShowForm] = useState(false);
  const [editingProxy, setEditingProxy] = useState<Proxy | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [checking, setChecking] = useState<Set<string>>(new Set());

  const handleSave = async (data: any) => {
    try {
      if (editingProxy) {
        await updateProxy(editingProxy.id, data);
        toast.success('Proxy updated');
      } else {
        await createProxy(data);
        toast.success('Proxy added');
      }
      setShowForm(false);
      setEditingProxy(null);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleBulkImport = async () => {
    const parsed = parseBulkProxies(bulkText);
    if (parsed.length === 0) {
      toast.error('No valid proxies found');
      return;
    }
    try {
      await bulkImport(parsed);
      setShowBulkImport(false);
      setBulkText('');
      toast.success(`Imported ${parsed.length} proxies`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCheck = async (id: string) => {
    setChecking(prev => new Set(prev).add(id));
    try {
      const result = await checkProxy(id);
      if (result.isValid) {
        toast.success(`Valid! IP: ${result.ip} (${result.country || 'unknown'}) - ${result.latencyMs}ms`);
      } else {
        toast.error(`Invalid: ${result.error}`);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setChecking(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} proxy(ies)?`)) return;
    try {
      await deleteProxies(Array.from(selected));
      setSelected(new Set());
      toast.success('Proxies deleted');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Proxy Manager</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBulkImport(true)}
            className="btn-secondary flex items-center gap-1.5 text-sm"
          >
            <Upload className="w-4 h-4" /> Bulk Import
          </button>
          <button
            onClick={() => {
              setEditingProxy(null);
              setShowForm(true);
            }}
            className="btn-primary flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Proxy
          </button>
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-ghost-800 border border-ghost-600 rounded-lg p-3">
          <span className="text-sm text-gray-400">{selected.size} selected</span>
          <button onClick={handleBulkDelete} className="btn-danger text-sm flex items-center gap-1">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
          <button onClick={() => setSelected(new Set())} className="text-sm text-gray-500 hover:text-gray-300 ml-auto">
            Clear
          </button>
        </div>
      )}

      {/* Add proxy form */}
      {showForm && (
        <div className="card">
          <ProxyForm
            key={editingProxy?.id || 'new'}
            proxy={editingProxy || undefined}
            onSubmit={handleSave}
            onCancel={() => {
              setShowForm(false);
              setEditingProxy(null);
            }}
          />
        </div>
      )}

      {/* Bulk import modal */}
      {showBulkImport && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-ghost-800 rounded-xl border border-ghost-600 w-full max-w-lg p-5 space-y-4">
            <h2 className="text-lg font-semibold">Bulk Import Proxies</h2>
            <p className="text-sm text-gray-400">
              One proxy per line. Formats: <code className="text-accent">protocol://user:pass@host:port</code> or{' '}
              <code className="text-accent">host:port:user:pass</code> or <code className="text-accent">host:port</code>
            </p>
            <textarea
              className="input-field h-40 text-sm font-mono"
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              placeholder="http://user:pass@1.2.3.4:8080&#10;5.6.7.8:3128:user:pass&#10;9.10.11.12:1080"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowBulkImport(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleBulkImport} className="btn-primary">
                Import ({parseBulkProxies(bulkText).length} proxies)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proxy list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent" />
        </div>
      ) : proxies.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No proxies yet. Add your first proxy!</div>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-ghost-700">
                <th className="p-3 w-8">
                  <input
                    type="checkbox"
                    checked={selected.size === proxies.length && proxies.length > 0}
                    onChange={e => {
                      if (e.target.checked) setSelected(new Set(proxies.map(p => p.id)));
                      else setSelected(new Set());
                    }}
                    className="rounded border-ghost-500 bg-ghost-700 text-accent"
                  />
                </th>
                <th className="p-3">Name</th>
                <th className="p-3">Protocol</th>
                <th className="p-3">Host:Port</th>
                <th className="p-3">Country</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {proxies.map(proxy => (
                <tr key={proxy.id} className="border-b border-ghost-700/50 hover:bg-ghost-800/50">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selected.has(proxy.id)}
                      onChange={() => {
                        setSelected(prev => {
                          const next = new Set(prev);
                          if (next.has(proxy.id)) next.delete(proxy.id);
                          else next.add(proxy.id);
                          return next;
                        });
                      }}
                      className="rounded border-ghost-500 bg-ghost-700 text-accent"
                    />
                  </td>
                  <td className="p-3 text-gray-300">{proxy.name || '-'}</td>
                  <td className="p-3">
                    <span className="px-1.5 py-0.5 bg-ghost-700 rounded text-xs uppercase">{proxy.protocol}</span>
                  </td>
                  <td className="p-3 font-mono text-gray-300">{proxy.host}:{proxy.port}</td>
                  <td className="p-3 text-gray-400">{proxy.country ? `${proxy.country}${proxy.city ? `, ${proxy.city}` : ''}` : '-'}</td>
                  <td className="p-3">
                    {proxy.is_valid ? (
                      <CheckCircle className="w-4 h-4 text-success" />
                    ) : (
                      <XCircle className="w-4 h-4 text-danger" />
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingProxy(proxy);
                          setShowForm(true);
                        }}
                        className="p-1 hover:bg-ghost-700 rounded"
                        title="Edit proxy"
                      >
                        <Pencil className="w-3.5 h-3.5 text-gray-300" />
                      </button>
                      <button
                        onClick={() => handleCheck(proxy.id)}
                        disabled={checking.has(proxy.id)}
                        className="px-2 py-1 text-xs bg-ghost-700 hover:bg-ghost-600 rounded transition-colors disabled:opacity-50"
                      >
                        {checking.has(proxy.id) ? <Loader className="w-3 h-3 animate-spin" /> : 'Check'}
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm('Delete this proxy?')) return;
                          try {
                            await deleteProxy(proxy.id);
                            toast.success('Proxy deleted');
                          } catch (err: any) {
                            toast.error(err.message);
                          }
                        }}
                        className="p-1 hover:bg-ghost-700 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-danger" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
