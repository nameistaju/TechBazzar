import React from 'react';
import { formatINR } from '@shared/utils/formatters';

export default function WholesaleGroupsTab({ groups }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {groups.map((grp) => (
          <div key={grp.id} className="bg-white border border-[#EAEAEA] p-5 rounded-[4px] space-y-3 relative">
            <div className="flex items-center justify-between pb-2 border-b border-[#F0F0F0]">
              <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-[#0A0A0A]">
                {grp.name} Tier
              </h3>
              <span className="text-[10px] font-mono text-[#8A8A8A]">
                {grp.member_count || 0} members
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#6B6B6B]">Extra Margin:</span>
                <strong className="text-[#FF4D00] font-bold">+{grp.extra_discount_percent}%</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B6B6B]">Credit Facility:</span>
                <strong className="text-[#0A0A0A] font-mono">
                  {grp.credit_limit > 0 ? formatINR(grp.credit_limit) : 'Prepaid Only'}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B6B6B]">Payment Terms:</span>
                <strong className="uppercase font-mono text-[#0A0A0A]">{grp.payment_terms}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B6B6B]">Minimum Order (MOV):</span>
                <strong className="font-mono text-[#0A0A0A]">
                  {formatINR(grp.min_order_value || 250000)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B6B6B]">Free Freight at:</span>
                <strong className="font-mono text-[#0A0A0A]">
                  {formatINR(grp.free_shipping_threshold || 1000000)}
                </strong>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
