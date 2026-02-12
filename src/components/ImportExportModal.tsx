import { useState, useRef } from 'react';
import { X, Upload, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { EXPORT_PROFILES_PREFIX } from '../lib/brand';

interface Props {
  mode: 'import' | 'export';
  exportData?: string;
  onImport?: (data: any[]) => Promise<void>;
  onClose: () => void;
}

export default function ImportExportModal({ mode, exportData, onImport, onClose }: Props) {
  const [textData, setTextData] = useState(exportData || '');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      setTextData(ev.target?.result as string || '');
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!onImport) return;
    setLoading(true);
    try {
      const parsed = JSON.parse(textData);
      const data = Array.isArray(parsed) ? parsed : [parsed];
      await onImport(data);
      toast.success(`Imported ${data.length} profile(s)`);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Invalid JSON');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([textData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${EXPORT_PROFILES_PREFIX}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('File downloaded');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(textData);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-ghost-800 rounded-xl border border-ghost-600 w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b border-ghost-700">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            {mode === 'import' ? <Upload className="w-5 h-5" /> : <Download className="w-5 h-5" />}
            {mode === 'import' ? 'Import Profiles' : 'Export Profiles'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-ghost-700 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {mode === 'import' && (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button onClick={() => fileRef.current?.click()} className="btn-secondary text-sm">
                Choose JSON File
              </button>
            </div>
          )}

          <textarea
            className="input-field h-60 text-xs font-mono"
            value={textData}
            onChange={e => setTextData(e.target.value)}
            placeholder={mode === 'import' ? 'Paste JSON data here or upload a file...' : ''}
            readOnly={mode === 'export'}
          />
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-ghost-700">
          {mode === 'export' && (
            <>
              <button onClick={handleCopy} className="btn-secondary">Copy</button>
              <button onClick={handleDownload} className="btn-primary">Download JSON</button>
            </>
          )}
          {mode === 'import' && (
            <button onClick={handleImport} className="btn-primary" disabled={loading || !textData}>
              {loading ? 'Importing...' : 'Import'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
