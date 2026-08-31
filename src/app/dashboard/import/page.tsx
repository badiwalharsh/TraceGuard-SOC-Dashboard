'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Upload, 
  Terminal, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  Loader, 
  FileCode,
  Eye,
  AlertTriangle,
  Play,
  ArrowLeft
} from 'lucide-react';

interface PreviewAlert {
  timestamp: string;
  ruleName: string;
  category: string;
  severity: string;
  sourceIp?: string;
  destIp?: string;
  targetHost?: string;
  details: string;
  mitreAttack?: string;
  isDuplicate: boolean;
  duplicateActionMessage: string;
}

interface PreviewSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateCount: number;
}

export default function ImportPage() {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [format, setFormat] = useState<'csv' | 'json'>('json');
  const [loading, setLoading] = useState(false);
  const [duplicateHandling, setDuplicateHandling] = useState<'SKIP' | 'OVERWRITE' | 'DUPLICATE'>('SKIP');
  
  // Preview states
  const [previewActive, setPreviewActive] = useState(false);
  const [previewAlerts, setPreviewAlerts] = useState<PreviewAlert[]>([]);
  const [previewSummary, setPreviewSummary] = useState<PreviewSummary | null>(null);
  const [previewErrors, setPreviewErrors] = useState<string[]>([]);
  
  const [result, setResult] = useState<{
    success: boolean;
    importedCount: number;
    errors: string[] | null;
  } | null>(null);
  
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    setResult(null);
    setPreviewErrors([]);

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, format, preview: true, duplicateHandling }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        setResult({
          success: false,
          importedCount: 0,
          errors: Array.isArray(data.details) ? data.details : [data.error || 'Preview failed'],
        });
      } else {
        setPreviewAlerts(data.alerts || []);
        setPreviewSummary(data.summary || null);
        setPreviewErrors(data.errors || []);
        setPreviewActive(true);
      }
    } catch (err) {
      console.error(err);
      setResult({
        success: false,
        importedCount: 0,
        errors: ['Network communication error during preview generation.'],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, format, preview: false, duplicateHandling }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        setResult({
          success: false,
          importedCount: 0,
          errors: Array.isArray(data.details) ? data.details : [data.error || 'Import failed'],
        });
      } else {
        setResult({
          success: true,
          importedCount: data.importedCount,
          errors: data.errors,
        });
        setContent('');
        setPreviewActive(false);
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      setResult({
        success: false,
        importedCount: 0,
        errors: ['Network communication error during alert ingestion.'],
      });
    } finally {
      setLoading(false);
    }
  };

  const sampleJSON = `[
  {
    "timestamp": "2026-08-30T10:15:30Z",
    "ruleName": "SQL Injection Attempt",
    "category": "Initial Access",
    "severity": "HIGH",
    "sourceIp": "198.51.100.42",
    "destIp": "10.0.4.15",
    "targetHost": "prod-db-01",
    "details": "SELECT * FROM users WHERE password LIKE '%1'",
    "mitreAttack": "T1190"
  },
  {
    "timestamp": "2026-08-30T10:18:22Z",
    "ruleName": "Egress Ransomware C2 Beaconing",
    "category": "Command and Control",
    "severity": "CRITICAL",
    "sourceIp": "10.0.5.22",
    "destIp": "185.220.101.42",
    "targetHost": "finance-srv-02",
    "details": "LockBit signature beaconing to remote port 443",
    "mitreAttack": "T1071.001"
  }
]`;

  const sampleCSV = `timestamp,ruleName,category,severity,sourceIp,destIp,targetHost,details,mitreAttack
2026-08-30T10:15:30Z,SQL Injection Attempt,Initial Access,HIGH,198.51.100.42,10.0.4.15,prod-db-01,SELECT * FROM users,T1190
2026-08-30T10:18:22Z,Egress Ransomware C2 Beaconing,Command and Control,CRITICAL,10.0.5.22,185.220.101.42,finance-srv-02,LockBit,T1071.001`;

  const copySample = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight sm:text-3xl">Safe Alert Ingestion</h2>
        <p className="text-sm text-cyber-muted font-mono">
          {!previewActive 
            ? 'Safely inspect, validate, and import fictional JSON or CSV incident alert logs.'
            : 'Review parsed entries, duplicate flags, validation status, and select duplicate-handling policy.'
          }
        </p>
      </div>

      {!previewActive ? (
        // Step 1: Input Form & Sample View
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="cyber-card p-6 relative">
              <div className="absolute top-0 left-0 right-0 h-1 bg-cyber-cyan rounded-t-xl" />
              
              <form onSubmit={handlePreview} className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-cyber-muted uppercase tracking-wider">Format</span>
                  <div className="flex bg-cyber-bg p-1 border border-cyber-border rounded-lg">
                    <button
                      type="button"
                      onClick={() => setFormat('json')}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition ${format === 'json' ? 'bg-cyber-panel text-white border border-cyber-cyan/30' : 'text-cyber-muted'}`}
                    >
                      JSON
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormat('csv')}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition ${format === 'csv' ? 'bg-cyber-panel text-white border border-cyber-cyan/30' : 'text-cyber-muted'}`}
                    >
                      CSV
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-cyber-muted block">Paste Alert Logs</label>
                  <textarea
                    rows={10}
                    required
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={format === 'json' ? 'Paste JSON array here...' : 'Paste CSV rows (with headers) here...'}
                    className="w-full rounded-lg bg-cyber-bg border border-cyber-border px-4 py-3 text-xs text-white font-mono placeholder-cyber-muted/30 focus:border-cyber-cyan focus:outline-none transition resize-y"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !content.trim()}
                  className="w-full py-2.5 px-4 bg-cyber-cyan hover:bg-cyber-cyan/90 text-cyber-bg font-extrabold text-xs rounded-lg transition disabled:opacity-40 flex items-center justify-center gap-1.5"
                >
                  {loading ? (
                    <Loader className="animate-spin h-4 w-4" />
                  ) : (
                    <>
                      <Eye className="h-4 w-4" />
                      PREVIEW ALERT INGESTION
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* General run logs if not previewing */}
            {result && (
              <div className={`cyber-card p-6 border-l-4 ${result.success ? 'border-l-cyber-green' : 'border-l-cyber-red'}`}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-white border-b border-cyber-border pb-3 mb-4 flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle2 className="h-4 w-4 text-cyber-green" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-cyber-red" />
                  )}
                  Ingestion Run Result
                </h3>

                <div className="space-y-4 text-xs font-mono">
                  <div>
                    <span className="text-cyber-muted block">Ingested Incidents Created:</span>
                    <span className={`text-sm font-bold ${result.importedCount > 0 ? 'text-cyber-green' : 'text-cyber-muted'}`}>
                      {result.importedCount} record(s)
                    </span>
                  </div>

                  {result.errors && (
                    <div>
                      <span className="text-cyber-muted block mb-2">Validation Errors / Logs:</span>
                      <div className="bg-cyber-bg max-h-48 overflow-y-auto border border-cyber-border rounded-lg p-3 space-y-1.5">
                        {result.errors.map((err, i) => (
                          <div key={i} className="text-cyber-red flex gap-1.5 items-start">
                            <span className="shrink-0 text-cyber-red/50">⚠</span>
                            <span>{err}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right column instructions */}
          <div className="space-y-6">
            <div className="cyber-card p-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white border-b border-cyber-border pb-3 flex items-center gap-2">
                <FileCode className="h-4 w-4 text-cyber-cyan" />
                Test Templates
              </h3>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-bold text-cyber-muted">
                  <span>SAMPLE JSON PAYLOAD</span>
                  <button
                    onClick={() => copySample(sampleJSON, 1)}
                    className="flex items-center gap-1 hover:text-white transition"
                  >
                    {copiedIndex === 1 ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    Copy
                  </button>
                </div>
                <pre className="bg-cyber-bg border border-cyber-border rounded-lg p-2.5 text-[10px] font-mono text-cyber-muted overflow-x-auto max-h-32">
                  {sampleJSON}
                </pre>
              </div>

              <div className="space-y-2 pt-2 border-t border-cyber-border">
                <div className="flex justify-between items-center text-[10px] font-bold text-cyber-muted">
                  <span>SAMPLE CSV PAYLOAD</span>
                  <button
                    onClick={() => copySample(sampleCSV, 2)}
                    className="flex items-center gap-1 hover:text-white transition"
                  >
                    {copiedIndex === 2 ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    Copy
                  </button>
                </div>
                <pre className="bg-cyber-bg border border-cyber-border rounded-lg p-2.5 text-[10px] font-mono text-cyber-muted overflow-x-auto max-h-32">
                  {sampleCSV}
                </pre>
              </div>
            </div>

            <div className="cyber-card p-6 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white border-b border-cyber-border pb-3 flex items-center gap-2">
                <Terminal className="h-4 w-4 text-cyber-cyan" />
                Safety Boundaries
              </h3>
              <ul className="space-y-2 text-xs text-cyber-muted leading-relaxed">
                <li className="flex gap-1.5 items-start">
                  <span className="text-cyber-cyan">▪</span>
                  This portal processes uploaded alert strings as data arrays only.
                </li>
                <li className="flex gap-1.5 items-start">
                  <span className="text-cyber-cyan">▪</span>
                  No network scanning, brute-forcing, or external web queries will trigger.
                </li>
                <li className="flex gap-1.5 items-start">
                  <span className="text-cyber-cyan">▪</span>
                  Cell formula injections (=, +, -, @) are sanitized upon upload.
                </li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        // Step 2: Interactive Preview Screen
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPreviewActive(false)}
              className="px-3 py-1.5 rounded-lg border border-cyber-border bg-cyber-panel text-cyber-muted hover:text-white text-xs font-bold flex items-center gap-1.5 transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Modify Raw Content
            </button>
          </div>

          {/* Preview configuration & summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="cyber-card p-6 col-span-2 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white border-b border-cyber-border pb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-cyber-cyan" />
                Select Ingestion Settings
              </h3>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-cyber-muted block">
                  Duplicate-Handling Approach
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDuplicateHandling('SKIP')}
                    className={`p-3 rounded-lg border text-center transition flex flex-col items-center gap-1.5 ${duplicateHandling === 'SKIP' ? 'border-cyber-cyan bg-cyber-cyan/10 text-white' : 'border-cyber-border bg-cyber-bg text-cyber-muted'}`}
                  >
                    <span className="text-xs font-extrabold">Skip Duplicates</span>
                    <span className="text-[9px] font-mono leading-none">Skip duplicate alerts (Default)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDuplicateHandling('OVERWRITE')}
                    className={`p-3 rounded-lg border text-center transition flex flex-col items-center gap-1.5 ${duplicateHandling === 'OVERWRITE' ? 'border-cyber-cyan bg-cyber-cyan/10 text-white' : 'border-cyber-border bg-cyber-bg text-cyber-muted'}`}
                  >
                    <span className="text-xs font-extrabold">Overwrite</span>
                    <span className="text-[9px] font-mono leading-none">Update details of existing alert</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDuplicateHandling('DUPLICATE')}
                    className={`p-3 rounded-lg border text-center transition flex flex-col items-center gap-1.5 ${duplicateHandling === 'DUPLICATE' ? 'border-cyber-cyan bg-cyber-cyan/10 text-white' : 'border-cyber-border bg-cyber-bg text-cyber-muted'}`}
                  >
                    <span className="text-xs font-extrabold">Ingest Duplicate</span>
                    <span className="text-[9px] font-mono leading-none">Ingest as new duplicate incidents</span>
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleConfirmImport}
                  disabled={loading}
                  className="w-full py-3 bg-cyber-green hover:bg-cyber-green/90 text-cyber-bg font-extrabold text-xs rounded-lg transition disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg"
                >
                  {loading ? (
                    <Loader className="animate-spin h-4 w-4" />
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      CONFIRM & RUN IMPORT OPERATION
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Run summary */}
            {previewSummary && (
              <div className="cyber-card p-6 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white border-b border-cyber-border pb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-cyber-cyan" />
                  Preview Run Summary
                </h3>

                <div className="divide-y divide-cyber-border text-xs font-mono">
                  <div className="py-2 flex justify-between">
                    <span className="text-cyber-muted">Total Rows Analyzed:</span>
                    <span className="text-white font-bold">{previewSummary.totalRows}</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-cyber-muted">Valid Alert Rows:</span>
                    <span className="text-cyber-green font-bold">{previewSummary.validRows}</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-cyber-muted">Invalid / Format Errors:</span>
                    <span className="text-cyber-red font-bold">{previewSummary.invalidRows}</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-cyber-muted">Potential Duplicates:</span>
                    <span className="text-cyber-amber font-bold">{previewSummary.duplicateCount}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Ingest preview data table */}
          {previewAlerts.length > 0 && (
            <div className="cyber-card p-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white border-b border-cyber-border pb-3 mb-4">
                Valid Alert Records Preview ({previewAlerts.length})
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-cyber-border text-cyber-muted uppercase text-[10px]">
                      <th className="py-2">Timestamp</th>
                      <th className="py-2">Rule Name</th>
                      <th className="py-2">Category</th>
                      <th className="py-2">Severity</th>
                      <th className="py-2">Target Host / IP</th>
                      <th className="py-2">Duplicate Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cyber-border text-white">
                    {previewAlerts.map((alert, idx) => (
                      <tr key={idx} className="hover:bg-cyber-bg/20">
                        <td className="py-3 text-[11px] whitespace-nowrap">{new Date(alert.timestamp).toLocaleString()}</td>
                        <td className="py-3 font-bold">{alert.ruleName}</td>
                        <td className="py-3 text-cyber-muted">{alert.category}</td>
                        <td className="py-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] border ${alert.severity === 'CRITICAL' || alert.severity === 'HIGH' ? 'text-cyber-red border-cyber-red/20 bg-cyber-red/10' : 'text-cyber-amber border-cyber-amber/20 bg-cyber-amber/10'}`}>
                            {alert.severity}
                          </span>
                        </td>
                        <td className="py-3 text-cyber-muted">
                          {alert.targetHost || alert.sourceIp || alert.destIp || 'N/A'}
                        </td>
                        <td className="py-3">
                          {alert.isDuplicate ? (
                            <span className="text-cyber-amber font-bold text-[10px] flex items-center gap-1">
                              ⚠ Duplicate
                            </span>
                          ) : (
                            <span className="text-cyber-green font-bold text-[10px] flex items-center gap-1">
                              ✓ New Record
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Validation errors */}
          {previewErrors.length > 0 && (
            <div className="cyber-card p-6 border-l-4 border-l-cyber-red">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white border-b border-cyber-border pb-3 mb-4 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-cyber-red" />
                Ingestion Diagnostic Errors ({previewErrors.length})
              </h3>
              
              <div className="bg-cyber-bg border border-cyber-border rounded-lg p-4 space-y-2 max-h-60 overflow-y-auto text-xs font-mono">
                {previewErrors.map((err, i) => (
                  <div key={i} className="text-cyber-red flex gap-2 items-start">
                    <span className="shrink-0 text-cyber-red/50">⚠</span>
                    <span>{err}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
