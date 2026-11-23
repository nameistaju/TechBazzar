// src/components/admin/ActivityLogView.jsx
import React, { useState, useEffect } from 'react';
import { 
  History, 
  RotateCcw, 
  Search, 
  Check, 
  X, 
  AlertCircle,
  RefreshCw,
  Eye
} from 'lucide-react';
import adminApi from '../../api/adminApi';
import useToastStore from '../../store/toastStore';

export default function ActivityLogView() {
  const addToast = useToastStore((s) => s.addToast);

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');

  // Snapshot Inspection Modal
  const [inspectedLog, setInspectedLog] = useState(null);
  const [undoingId, setUndoingId] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    const res = await adminApi.getActivityLog({
      entity: entityFilter !== 'all' ? entityFilter : undefined,
      action: actionFilter !== 'all' ? actionFilter : undefined,
      limit: 100
    });
    if (res.data?.logs) setLogs(res.data.logs);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [entityFilter, actionFilter]);

  const handleUndo = async (log) => {
    if (!window.confirm(`Undo this action? "${log.details}" will be reversed.`)) {
      return;
    }

    setUndoingId(log.id);
    const res = await adminApi.undoActivity(log.id);
    setUndoingId(null);

    if (res.error) {
      addToast({ type: 'error', message: res.error });
    } else {
      addToast({ type: 'success', message: 'Action successfully undone.' });
      fetchLogs();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EAEAEA]">
        <div>
          <h1 className="text-xl font-bold font-mono uppercase tracking-tight text-[#0A0A0A]">
            Audit Trail & Activity Log
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            Immutable log of back-office modifications, price changes, inventory adjustments, and 1-click state undo
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="p-1.5 border border-[#EAEAEA] bg-white text-[#6B6B6B] hover:text-[#0A0A0A]"
          title="Refresh Logs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Filters */}
      <div className="p-4 bg-white border border-[#EAEAEA] flex flex-wrap items-center gap-3">
        {/* Entity Filter */}
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="px-3 py-1.5 border border-[#EAEAEA] text-xs font-mono bg-white outline-none"
        >
          <option value="all">All Entity Types</option>
          <option value="product">Products</option>
          <option value="order">Orders</option>
          <option value="invoice">Invoices</option>
          <option value="estimate">Estimates</option>
          <option value="discount">Discounts</option>
          <option value="customer">Customers</option>
          <option value="setting">Settings</option>
        </select>

        {/* Action Filter */}
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-1.5 border border-[#EAEAEA] text-xs font-mono bg-white outline-none"
        >
          <option value="all">All Actions</option>
          <option value="create">Created</option>
          <option value="update">Updated</option>
          <option value="delete">Archived / Deleted</option>
          <option value="price_change">Price Adjustments</option>
          <option value="stock_change">Stock Movements</option>
          <option value="status_change">Status Transitions</option>
          <option value="void">Voided</option>
          <option value="undo">Undone</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-[#EAEAEA] overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse font-mono">
          <thead>
            <tr className="bg-[#F7F7F7] border-b border-[#EAEAEA] uppercase text-[10px] text-[#6B6B6B]">
              <th className="p-3">Timestamp</th>
              <th className="p-3">Action</th>
              <th className="p-3">Entity</th>
              <th className="p-3">Entity ID</th>
              <th className="p-3">Activity Description</th>
              <th className="p-3 text-right">Snapshots & Undo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F0F0]">
            {loading && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-xs text-[#6B6B6B]">
                  Loading activity logs...
                </td>
              </tr>
            )}

            {!loading && logs.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-xs text-[#6B6B6B]">
                  No activity recorded for this filter.
                </td>
              </tr>
            )}

            {!loading && logs.map(l => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="p-3 text-[#6B6B6B] text-[11px]">
                  {new Date(l.created_at).toLocaleString()}
                </td>

                <td className="p-3">
                  <span className={`px-2 py-0.5 text-[10px] uppercase font-bold ${
                    l.action === 'create'
                      ? 'bg-emerald-100 text-emerald-800'
                      : l.action === 'delete' || l.action === 'void'
                      ? 'bg-red-100 text-red-700'
                      : l.action === 'stock_change' || l.action === 'price_change'
                      ? 'bg-orange-100 text-[#FF4D00]'
                      : l.action === 'undo'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-gray-100 text-[#0A0A0A]'
                  }`}>
                    {l.action}
                  </span>
                </td>

                <td className="p-3 uppercase font-bold text-[#0A0A0A]">
                  {l.entity_type}
                </td>

                <td className="p-3 text-[#6B6B6B]">
                  {l.entity_id}
                </td>

                <td className="p-3 font-sans text-xs text-[#0A0A0A]">
                  {l.details}
                </td>

                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {(l.before_state || l.after_state) && (
                      <button
                        onClick={() => setInspectedLog(l)}
                        className="px-2 py-1 text-[11px] border border-[#EAEAEA] hover:border-[#0A0A0A] flex items-center gap-1"
                        title="View Before / After JSON"
                      >
                        <Eye className="w-3 h-3" /> Diff
                      </button>
                    )}

                    {l.undoable === 1 && !l.undone && (
                      <button
                        onClick={() => handleUndo(l)}
                        disabled={undoingId === l.id}
                        className="px-2.5 py-1 text-[11px] bg-[#0A0A0A] text-white hover:bg-[#FF4D00] flex items-center gap-1 transition-colors font-bold uppercase"
                      >
                        <RotateCcw className="w-3 h-3" />
                        {undoingId === l.id ? 'Undoing...' : 'Undo'}
                      </button>
                    )}

                    {l.undone === 1 && (
                      <span className="text-[10px] text-gray-400 font-bold uppercase">
                        [Undone]
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Snapshot Diff Modal */}
      {inspectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-white border border-[#0A0A0A] p-6 shadow-2xl relative max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#EAEAEA]">
              <div>
                <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-[#0A0A0A]">
                  Activity Snapshot: {inspectedLog.action} on {inspectedLog.entity_type} #{inspectedLog.entity_id}
                </h3>
                <p className="text-[11px] text-[#6B6B6B]">{inspectedLog.details}</p>
              </div>
              <button onClick={() => setInspectedLog(null)} className="p-1">
                <X className="w-4 h-4 text-[#6B6B6B]" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <div className="text-[10px] font-bold uppercase text-[#6B6B6B] mb-1">Before State</div>
                <pre className="p-3 bg-gray-50 border border-[#EAEAEA] text-[11px] overflow-x-auto max-h-64 whitespace-pre-wrap">
                  {inspectedLog.before_state ? JSON.stringify(JSON.parse(inspectedLog.before_state), null, 2) : 'No snapshot recorded.'}
                </pre>
              </div>

              <div>
                <div className="text-[10px] font-bold uppercase text-[#6B6B6B] mb-1">After State</div>
                <pre className="p-3 bg-gray-50 border border-[#EAEAEA] text-[11px] overflow-x-auto max-h-64 whitespace-pre-wrap">
                  {inspectedLog.after_state ? JSON.stringify(JSON.parse(inspectedLog.after_state), null, 2) : 'No snapshot recorded.'}
                </pre>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={() => setInspectedLog(null)}
                className="px-4 py-1.5 bg-[#0A0A0A] text-white text-xs font-mono uppercase"
              >
                Close Diff
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
