import React from 'react';
import { RefreshCw, CheckCircle2 } from 'lucide-react';

export default function WholesaleApplicationsTab({
  appFilter,
  setAppFilter,
  fetchApplications,
  loadingApps,
  applications,
  handleApproveApp,
  setRejectAppId,
}) {
  return (
    <div className="space-y-4">
      {/* Status Filter */}
      <div className="p-4 bg-white border border-[#EAEAEA] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono uppercase text-[#6B6B6B]">Filter Status:</span>
          {['all', 'pending', 'approved', 'rejected'].map(st => (
            <button
              key={st}
              onClick={() => setAppFilter(st)}
              className={`px-3 py-1 rounded text-xs font-mono uppercase transition-colors cursor-pointer ${
                appFilter === st
                  ? 'bg-[#0A0A0A] text-white font-bold'
                  : 'bg-neutral-100 text-[#6B6B6B] hover:text-[#0A0A0A]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <button
          onClick={fetchApplications}
          className="p-1.5 text-[#6B6B6B] hover:text-[#0A0A0A] border border-[#EAEAEA] rounded cursor-pointer"
          title="Refresh applications list"
        >
          <RefreshCw size={13} className={loadingApps ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Applications Table */}
      <div className="bg-white border border-[#EAEAEA] overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#F7F7F7] border-b border-[#EAEAEA] font-mono uppercase text-[#6B6B6B] text-[11px]">
              <th className="p-3">Company / Applicant</th>
              <th className="p-3">Type & City</th>
              <th className="p-3">GSTIN</th>
              <th className="p-3">Monthly Volume</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Review Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F0F0]">
            {loadingApps && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-xs font-mono text-[#6B6B6B]">
                  Loading wholesale applications...
                </td>
              </tr>
            )}

            {!loadingApps && applications.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-xs text-[#6B6B6B]">
                  No wholesale applications found in this status.
                </td>
              </tr>
            )}

            {!loadingApps && applications.map(app => (
              <tr key={app.id} className="hover:bg-[#FBFBFB]">
                <td className="p-3">
                  <div className="font-bold text-[#0A0A0A]">{app.business_name}</div>
                  <div className="text-[11px] text-[#6B6B6B]">{app.contact_name} · {app.email}</div>
                  <div className="text-[10px] text-[#8A8A8A] font-mono">{app.phone}</div>
                </td>
                <td className="p-3 font-mono">
                  <div className="uppercase text-[#0A0A0A] font-medium">{app.business_type}</div>
                  <div className="text-[10px] text-[#8A8A8A]">{app.city}</div>
                </td>
                <td className="p-3 font-mono">
                  {app.gstin ? (
                    <div className="flex items-center gap-1 text-emerald-700 font-semibold">
                      <CheckCircle2 size={12} />
                      <span>{app.gstin}</span>
                    </div>
                  ) : (
                    <span className="text-[#A1A1AA] text-[10px]">No GSTIN provided</span>
                  )}
                </td>
                <td className="p-3 font-mono text-[#0A0A0A]">
                  {app.expected_monthly_volume}
                </td>
                <td className="p-3 font-mono">
                  {app.status === 'approved' ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Approved ({app.assigned_group_name || 'Gold'})
                    </span>
                  ) : app.status === 'rejected' ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-800 border border-red-200">
                      Rejected
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                      Pending Review
                    </span>
                  )}
                </td>
                <td className="p-3 text-right">
                  {app.status === 'pending' ? (
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleApproveApp(app.id, 3)}
                        className="px-2.5 py-1 text-[10px] font-mono uppercase bg-[#0A0A0A] text-white hover:bg-emerald-600 rounded transition-colors font-semibold cursor-pointer"
                        title="Approve immediately as Gold Buyer"
                      >
                        Approve (Gold)
                      </button>
                      <button
                        onClick={() => setRejectAppId(app.id)}
                        className="px-2 py-1 text-[10px] font-mono uppercase border border-red-200 text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-[#A1A1AA] font-mono">Resolved</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
