// src/components/admin/ReportsView.jsx
import React, { useState, useEffect } from 'react';
import { 
  Download, 
  RefreshCw
} from 'lucide-react';
import adminApi from '../../api/adminApi';
import { formatINR } from '../../utils/formatters';

export default function ReportsView() {
  const [activeTab, setActiveTab] = useState('sales'); // sales, products, categories, discounts, tax, valuation
  const [loading, setLoading] = useState(true);

  // Data states
  const [salesData, setSalesData] = useState(null);
  const [productsData, setProductsData] = useState([]);
  const [categoriesData, setCategoriesData] = useState([]);
  const [discountsData, setDiscountsData] = useState([]);
  const [taxData, setTaxData] = useState(null);
  const [valuationData, setValuationData] = useState(null);

  const loadCurrentReport = async () => {
    setLoading(true);
    if (activeTab === 'sales') {
      const res = await adminApi.getSalesReport();
      if (res.data) setSalesData(res.data);
    } else if (activeTab === 'products') {
      const res = await adminApi.getProductsReport();
      if (res.data?.products) setProductsData(res.data.products);
    } else if (activeTab === 'categories') {
      const res = await adminApi.getCategoriesReport();
      if (res.data?.categories) setCategoriesData(res.data.categories);
    } else if (activeTab === 'discounts') {
      const res = await adminApi.getDiscountsReport();
      if (res.data?.discounts) setDiscountsData(res.data.discounts);
    } else if (activeTab === 'tax') {
      const res = await adminApi.getTaxReport();
      if (res.data) setTaxData(res.data);
    } else if (activeTab === 'valuation') {
      const res = await adminApi.getStockValuationReport();
      if (res.data) setValuationData(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCurrentReport();
  }, [activeTab]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EAEAEA]">
        <div>
          <h1 className="text-xl font-bold font-mono uppercase tracking-tight text-[#0A0A0A]">
            Financial & Operations Analytics
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            Audit-ready reports for sales, GSTR-1 tax filings, inventory valuation, and margin analysis
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 border border-[#EAEAEA] bg-white text-xs font-mono uppercase tracking-wider text-[#0A0A0A] hover:border-[#0A0A0A] flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Print Report
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-[#EAEAEA] bg-white px-2 text-xs font-mono uppercase tracking-wider">
        {[
          { id: 'sales', label: 'Sales & Revenue' },
          { id: 'products', label: 'Product Margins' },
          { id: 'categories', label: 'Categories' },
          { id: 'discounts', label: 'Discounts Impact' },
          { id: 'tax', label: 'GST Summary (GSTR-1)' },
          { id: 'valuation', label: 'Inventory Valuation' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`py-3 px-4 border-b-2 font-semibold transition-colors whitespace-nowrap ${
              activeTab === t.id
                ? 'border-[#FF4D00] text-[#0A0A0A]'
                : 'border-transparent text-[#6B6B6B] hover:text-[#0A0A0A]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="py-16 text-center text-xs font-mono text-[#6B6B6B]">
          <RefreshCw className="w-4 h-4 animate-spin inline-block mr-2" />
          Aggregating financial ledger data...
        </div>
      )}

      {/* 1. SALES REPORT */}
      {!loading && activeTab === 'sales' && salesData && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-white border border-[#EAEAEA]">
              <div className="text-[10px] font-mono uppercase text-[#6B6B6B]">Gross Orders Total</div>
              <div className="text-xl font-bold font-mono text-[#0A0A0A] mt-1">
                {formatINR(salesData.stats?.gross_sales || 0)}
              </div>
            </div>

            <div className="p-4 bg-white border border-[#EAEAEA]">
              <div className="text-[10px] font-mono uppercase text-[#6B6B6B]">Total Discounts Given</div>
              <div className="text-xl font-bold font-mono text-[#FF4D00] mt-1">
                -{formatINR(salesData.stats?.total_discounts || 0)}
              </div>
            </div>

            <div className="p-4 bg-white border border-[#EAEAEA]">
              <div className="text-[10px] font-mono uppercase text-[#6B6B6B]">Shipping Collected</div>
              <div className="text-xl font-bold font-mono text-[#0A0A0A] mt-1">
                {formatINR(salesData.stats?.total_shipping || 0)}
              </div>
            </div>

            <div className="p-4 bg-white border border-[#0A0A0A]">
              <div className="text-[10px] font-mono uppercase text-[#6B6B6B]">Net Realized Sales</div>
              <div className="text-xl font-bold font-mono text-[#0A0A0A] mt-1">
                {formatINR(salesData.stats?.net_sales || 0)}
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#EAEAEA]">
            <div className="p-3 bg-[#F7F7F7] font-mono text-xs uppercase font-bold text-[#0A0A0A]">
              Daily Sales Breakdown
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#EAEAEA] font-mono uppercase text-[10px] text-[#6B6B6B]">
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5 text-center">Orders Count</th>
                  <th className="p-2.5 text-right">Revenue (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0] font-mono">
                {(salesData.timeline || []).map((t, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="p-2.5">{t.date}</td>
                    <td className="p-2.5 text-center">{t.orders}</td>
                    <td className="p-2.5 text-right font-bold">{formatINR(t.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. PRODUCT PERFORMANCE & MARGIN */}
      {!loading && activeTab === 'products' && (
        <div className="bg-white border border-[#EAEAEA] overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="bg-[#F7F7F7] border-b border-[#EAEAEA] uppercase text-[10px] text-[#6B6B6B]">
                <th className="p-3">Product Name</th>
                <th className="p-3">SKU</th>
                <th className="p-3 text-center">Units Sold</th>
                <th className="p-3 text-right">Selling Price</th>
                <th className="p-3 text-right">Cost Price</th>
                <th className="p-3 text-center">Margin %</th>
                <th className="p-3 text-right">Total Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0F0]">
              {productsData.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="p-3 font-sans font-semibold text-[#0A0A0A]">{p.name}</td>
                  <td className="p-3 text-[#6B6B6B]">{p.sku || p.id}</td>
                  <td className="p-3 text-center font-bold">{p.units_sold}</td>
                  <td className="p-3 text-right">{formatINR(p.price)}</td>
                  <td className="p-3 text-right text-[#6B6B6B]">{formatINR(p.cost_price || 0)}</td>
                  <td className="p-3 text-center">
                    <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 font-bold text-[10px]">
                      {p.margin}%
                    </span>
                  </td>
                  <td className="p-3 text-right font-bold text-[#0A0A0A]">{formatINR(p.profit || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. CATEGORIES */}
      {!loading && activeTab === 'categories' && (
        <div className="bg-white border border-[#EAEAEA]">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="bg-[#F7F7F7] border-b border-[#EAEAEA] uppercase text-[10px] text-[#6B6B6B]">
                <th className="p-3">Category</th>
                <th className="p-3 text-center">Catalog SKUs</th>
                <th className="p-3 text-center">Units Sold</th>
                <th className="p-3 text-right">Total Sales (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0F0]">
              {categoriesData.map((c, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="p-3 font-sans font-semibold capitalize text-[#0A0A0A]">{c.category}</td>
                  <td className="p-3 text-center text-[#6B6B6B]">{c.product_count}</td>
                  <td className="p-3 text-center font-bold">{c.units_sold}</td>
                  <td className="p-3 text-right font-bold text-[#0A0A0A]">{formatINR(c.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. DISCOUNTS IMPACT */}
      {!loading && activeTab === 'discounts' && (
        <div className="bg-white border border-[#EAEAEA]">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="bg-[#F7F7F7] border-b border-[#EAEAEA] uppercase text-[10px] text-[#6B6B6B]">
                <th className="p-3">Discount Code</th>
                <th className="p-3">Rule Title</th>
                <th className="p-3 text-center">Redemption Count</th>
                <th className="p-3 text-right">Total Discount Subsidized</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0F0]">
              {discountsData.map(d => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="p-3 font-bold text-[#FF4D00]">{d.code || 'Automatic'}</td>
                  <td className="p-3 font-sans text-[#0A0A0A]">{d.title}</td>
                  <td className="p-3 text-center font-bold">{d.used_count || 0}</td>
                  <td className="p-3 text-right font-bold text-[#0A0A0A]">{formatINR(d.total_discount_given || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. GST TAX SUMMARY (GSTR-1 READY) */}
      {!loading && activeTab === 'tax' && taxData && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-white border border-[#EAEAEA] font-mono">
              <div className="text-[10px] uppercase text-[#6B6B6B]">Total Taxable Turnover</div>
              <div className="text-xl font-bold text-[#0A0A0A] mt-1">{formatINR(taxData.summary?.totalTaxable || 0)}</div>
            </div>

            <div className="p-4 bg-white border border-[#EAEAEA] font-mono">
              <div className="text-[10px] uppercase text-[#6B6B6B]">CGST Collected</div>
              <div className="text-xl font-bold text-[#0A0A0A] mt-1">{formatINR(taxData.summary?.totalCGST || 0)}</div>
            </div>

            <div className="p-4 bg-white border border-[#EAEAEA] font-mono">
              <div className="text-[10px] uppercase text-[#6B6B6B]">SGST Collected</div>
              <div className="text-xl font-bold text-[#0A0A0A] mt-1">{formatINR(taxData.summary?.totalSGST || 0)}</div>
            </div>

            <div className="p-4 bg-white border border-[#0A0A0A] font-mono">
              <div className="text-[10px] uppercase text-[#6B6B6B]">Total Tax Liability</div>
              <div className="text-xl font-bold text-[#FF4D00] mt-1">{formatINR(taxData.summary?.totalTax || 0)}</div>
            </div>
          </div>

          <div className="bg-white border border-[#EAEAEA]">
            <div className="p-3 bg-[#F7F7F7] font-mono text-xs uppercase font-bold text-[#0A0A0A]">
              GST Rate Slab Breakdown (For GSTR-1 Table 12 / 8)
            </div>
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="border-b border-[#EAEAEA] uppercase text-[10px] text-[#6B6B6B]">
                  <th className="p-3">GST Slab</th>
                  <th className="p-3 text-right">Taxable Amount (₹)</th>
                  <th className="p-3 text-right">CGST (₹)</th>
                  <th className="p-3 text-right">SGST (₹)</th>
                  <th className="p-3 text-right">IGST (₹)</th>
                  <th className="p-3 text-right">Total Tax (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {(taxData.slabs || []).map((s, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="p-3 font-bold">{s.slab}</td>
                    <td className="p-3 text-right">{formatINR(s.taxable)}</td>
                    <td className="p-3 text-right text-[#6B6B6B]">{formatINR(s.cgst)}</td>
                    <td className="p-3 text-right text-[#6B6B6B]">{formatINR(s.sgst)}</td>
                    <td className="p-3 text-right text-[#6B6B6B]">{formatINR(s.igst)}</td>
                    <td className="p-3 text-right font-bold text-[#0A0A0A]">{formatINR(s.cgst + s.sgst + s.igst)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. STOCK VALUATION */}
      {!loading && activeTab === 'valuation' && valuationData && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-white border border-[#EAEAEA] font-mono">
              <div className="text-[10px] uppercase text-[#6B6B6B]">Total Inventory Units</div>
              <div className="text-xl font-bold text-[#0A0A0A] mt-1">{valuationData.totalStockUnits}</div>
            </div>

            <div className="p-4 bg-white border border-[#EAEAEA] font-mono">
              <div className="text-[10px] uppercase text-[#6B6B6B]">Valuation at Cost</div>
              <div className="text-xl font-bold text-[#0A0A0A] mt-1">{formatINR(valuationData.valuationCost)}</div>
            </div>

            <div className="p-4 bg-white border border-[#EAEAEA] font-mono">
              <div className="text-[10px] uppercase text-[#6B6B6B]">Valuation at Selling Price</div>
              <div className="text-xl font-bold text-[#0A0A0A] mt-1">{formatINR(valuationData.valuationSelling)}</div>
            </div>

            <div className="p-4 bg-white border border-[#0A0A0A] font-mono">
              <div className="text-[10px] uppercase text-[#6B6B6B]">Potential Gross Profit</div>
              <div className="text-xl font-bold text-emerald-600 mt-1">{formatINR(valuationData.potentialProfit)} ({valuationData.overallMargin}%)</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
