// src/components/admin/DiscountsView.jsx
import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  X, 
  Trash2, 
  Edit3, 
  Play, 
  Calculator
} from 'lucide-react';
import adminApi from '@shared/api/adminApi';
import { formatINR } from '@shared/utils/formatters';
import useToastStore from '@shared/store/toastStore';

export default function DiscountsView() {
  const addToast = useToastStore((s) => s.addToast);

  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Builder Modal State
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [savingDiscount, setSavingDiscount] = useState(false);

  // Form State
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [audience, setAudience] = useState('both'); // 'both', 'retail', 'wholesale'
  const [type, setType] = useState('percentage'); // 'percentage', 'flat', 'rule_higher', 'rule_lower'
  const [value, setValue] = useState(10);
  const [rulePercentage, setRulePercentage] = useState(25);
  const [ruleFlat, setRuleFlat] = useState(200);
  const [ruleMode, setRuleMode] = useState('higher');
  const [scope, setScope] = useState('cart'); // 'cart', 'categories', 'products'
  const [scopeValues, setScopeValues] = useState('');
  const [minCartAmount, setMinCartAmount] = useState(1000);
  const [minQuantity, setMinQuantity] = useState(2);
  const [firstOrderOnly, setFirstOrderOnly] = useState(false);
  const [stackable, setStackable] = useState(false);
  const [usageLimit, setUsageLimit] = useState('');
  const [_startsAt, _setStartsAt] = useState('');
  const [_endsAt, _setEndsAt] = useState('');

  // Simulator Panel State
  const [testCode, setTestCode] = useState('FESTIVE25');
  const [testChannel, setTestChannel] = useState('retail');
  const [testCartItems, setTestCartItems] = useState([
    { id: 'image-1', name: 'Premium Wireless Earbuds', price: 1200, quantity: 2, category: 'Earbuds' }
  ]);
  const [simulationResult, setSimulationResult] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [_catalogProducts, setCatalogProducts] = useState([]);

  const fetchDiscounts = async () => {
    setLoading(true);
    const res = await adminApi.getDiscounts();
    if (res.data?.discounts) setDiscounts(res.data.discounts);
    setLoading(false);
  };

  useEffect(() => {
    fetchDiscounts();
    adminApi.getProducts({ limit: 50 }).then(res => {
      if (res.data?.products) setCatalogProducts(res.data.products);
    }).catch(() => {});
  }, []);

  const openAddBuilder = () => {
    setEditingId(null);
    setCode('PROMO' + Math.floor(100 + Math.random() * 900));
    setTitle('Special Promotional Discount');
    setDescription('');
    setAudience('both');
    setType('percentage');
    setValue(15);
    setRulePercentage(25);
    setRuleFlat(200);
    setRuleMode('higher');
    setScope('cart');
    setScopeValues('');
    setMinCartAmount(1000);
    setMinQuantity(1);
    setFirstOrderOnly(false);
    setStackable(false);
    setUsageLimit('');
    setIsBuilderOpen(true);
  };

  const openEditBuilder = (d) => {
    setEditingId(d.id);
    setCode(d.code || '');
    setTitle(d.title);
    setDescription(d.description || '');
    setAudience(d.audience || 'both');
    setType(d.type);
    setValue(d.value);
    setRulePercentage(d.rule_percentage || 25);
    setRuleFlat(d.rule_flat || 200);
    setRuleMode(d.rule_mode || 'higher');
    setScope(d.scope);
    setScopeValues(d.scope_values ? (typeof d.scope_values === 'string' ? d.scope_values : JSON.stringify(d.scope_values)) : '');
    setMinCartAmount(d.min_cart_amount || 0);
    setMinQuantity(d.min_quantity || 0);
    setFirstOrderOnly(Boolean(d.first_order_only));
    setStackable(Boolean(d.stackable));
    setUsageLimit(d.usage_limit || '');
    setIsBuilderOpen(true);
  };

  const handleSaveDiscount = async (e) => {
    e.preventDefault();
    setSavingDiscount(true);

    const payload = {
      code: code ? code.trim().toUpperCase() : null,
      title: title.trim(),
      description,
      audience,
      type,
      value: Number(value) || 0,
      rulePercentage: (type === 'rule_higher' || type === 'rule_lower') ? Number(rulePercentage) : null,
      ruleFlat: (type === 'rule_higher' || type === 'rule_lower') ? Number(ruleFlat) : null,
      ruleMode,
      scope,
      scopeValues: scopeValues ? scopeValues.split(',').map(s => s.trim()) : null,
      minCartAmount: Number(minCartAmount) || 0,
      minQuantity: Number(minQuantity) || 0,
      firstOrderOnly,
      stackable,
      usageLimit: usageLimit ? Number(usageLimit) : null
    };

    let res;
    if (editingId) {
      res = await adminApi.updateDiscount(editingId, payload);
    } else {
      res = await adminApi.createDiscount(payload);
    }
    setSavingDiscount(false);

    if (res.error) {
      addToast({ type: 'error', message: res.error });
    } else {
      addToast({ type: 'success', message: 'Discount saved successfully' });
      setIsBuilderOpen(false);
      fetchDiscounts();
    }
  };

  const handleToggleActive = async (d) => {
    const res = await adminApi.updateDiscount(d.id, { active: !d.active });
    if (!res.error) {
      fetchDiscounts();
    }
  };

  const handleDeleteDiscount = async (id) => {
    if (window.confirm('Delete this promotional discount?')) {
      await adminApi.deleteDiscount(id);
      fetchDiscounts();
    }
  };

  // Run Simulation
  const handleSimulate = async (customCode = null, customChannel = null) => {
    setSimulating(true);
    const targetCode = customCode !== null && typeof customCode === 'string' ? customCode : testCode;
    const targetChannel = customChannel !== null ? customChannel : testChannel;
    const res = await adminApi.simulateDiscount({
      code: targetCode,
      cartItems: testCartItems,
      channel: targetChannel
    });
    setSimulating(false);
    if (res.data) {
      setSimulationResult(res.data);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EAEAEA]">
        <div>
          <h1 className="text-xl font-bold font-mono uppercase tracking-tight text-[#0A0A0A]">
            Promotions & Discount Engine
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            Rule builder supporting Percentage, Flat ₹ off, and conditional "25% or ₹200 whichever is higher/lower" logic
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openAddBuilder}
            className="px-3 py-1.5 bg-[#0A0A0A] text-white text-xs font-mono uppercase tracking-wider hover:bg-[#FF4D00] flex items-center gap-1.5 transition-colors font-semibold"
          >
            <Plus className="w-4 h-4" />
            New Discount Rule
          </button>
        </div>
      </div>

      {/* Main Grid: Discounts Table & Live Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table of Discounts (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-[#EAEAEA] overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F7F7F7] border-b border-[#EAEAEA] font-mono uppercase text-[#6B6B6B] text-[11px]">
                  <th className="p-3">Coupon Code / Title</th>
                  <th className="p-3">Discount Formula</th>
                  <th className="p-3">Scope & Min Cart</th>
                  <th className="p-3 text-center">Redeemed</th>
                  <th className="p-3 text-center">Active</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {loading && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-xs font-mono text-[#6B6B6B]">
                      Loading discounts...
                    </td>
                  </tr>
                )}

                {!loading && discounts.map(d => (
                  <tr key={d.id} className="hover:bg-[#FBFBFB]">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-[#0A0A0A]">
                          {d.code ? d.code : <span className="text-[#FF4D00]">Auto Cart Rule</span>}
                        </span>
                        {d.audience === 'wholesale' ? (
                          <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase font-bold bg-orange-50 text-[#FF4D00] border border-orange-200">
                            Wholesale
                          </span>
                        ) : d.audience === 'retail' ? (
                          <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase font-bold bg-neutral-100 text-neutral-600 border border-neutral-200">
                            Retail
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase bg-neutral-50 text-neutral-500 border border-neutral-100">
                            Omnichannel
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#6B6B6B]">{d.title}</div>
                    </td>

                    <td className="p-3 font-mono text-xs">
                      {d.type === 'percentage' && <span className="font-bold text-[#0A0A0A]">{d.value}% Off</span>}
                      {d.type === 'flat' && <span className="font-bold text-[#0A0A0A]">{formatINR(d.value)} Flat</span>}
                      {(d.type === 'rule_higher' || d.type === 'rule_lower') && (
                        <span className="font-bold text-[#FF4D00]">
                          {d.rule_percentage}% or {formatINR(d.rule_flat)} ({d.rule_mode === 'higher' ? 'Higher' : 'Lower'})
                        </span>
                      )}
                    </td>

                    <td className="p-3 font-mono text-[11px] text-[#6B6B6B]">
                      <div>Scope: <strong className="text-[#0A0A0A] uppercase">{d.scope}</strong></div>
                      {d.min_cart_amount > 0 && <div>Min: {formatINR(d.min_cart_amount)}</div>}
                      {d.min_quantity > 0 && <div>Min Qty: {d.min_quantity} items</div>}
                    </td>

                    <td className="p-3 text-center font-mono font-semibold">
                      {d.used_count || 0} {d.usage_limit ? `/ ${d.usage_limit}` : ''}
                    </td>

                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleToggleActive(d)}
                        className={`w-8 h-4 rounded-full transition-colors relative ${
                          d.active ? 'bg-[#FF4D00]' : 'bg-gray-300'
                        }`}
                      >
                        <span className={`block w-3 h-3 bg-white rounded-full transition-transform ${
                          d.active ? 'translate-x-4' : 'translate-x-1'
                        }`} />
                      </button>
                    </td>

                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setTestCode(d.code || 'FESTIVE25');
                            handleSimulate();
                          }}
                          title="Simulate in Test Cart"
                          className="p-1.5 hover:text-[#FF4D00]"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditBuilder(d)}
                          className="p-1.5 hover:text-[#0A0A0A]"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteDiscount(d.id)}
                          className="p-1.5 text-neutral-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Simulator Panel (1 col) */}
        <div className="p-5 bg-white border border-[#EAEAEA] space-y-4">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-[#FF4D00]" />
            <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-[#0A0A0A]">
              Live Rule Simulator
            </h3>
          </div>
          <p className="text-[11px] text-[#6B6B6B]">
            Simulate cart payloads against server rules to verify conditional minimums, quantity gates, and "higher/lower" savings math.
          </p>

          <div className="space-y-3 font-mono text-xs">
            <div>
              <label className="block text-[10px] uppercase text-[#6B6B6B] mb-1">Coupon Code to Test</label>
              <input
                type="text"
                value={testCode}
                onChange={(e) => setTestCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-1.5 border border-[#EAEAEA] outline-none font-bold"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase text-[#6B6B6B] mb-1">Simulate Cart Channel</label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setTestChannel('retail')}
                  className={`py-1.5 text-center text-[10px] uppercase font-bold border transition-colors ${
                    testChannel === 'retail' ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]' : 'bg-white text-neutral-600 border-[#EAEAEA] hover:border-neutral-400'
                  }`}
                >
                  Retail Cart
                </button>
                <button
                  type="button"
                  onClick={() => setTestChannel('wholesale')}
                  className={`py-1.5 text-center text-[10px] uppercase font-bold border transition-colors ${
                    testChannel === 'wholesale' ? 'bg-[#FF4D00] text-white border-[#FF4D00]' : 'bg-white text-neutral-600 border-[#EAEAEA] hover:border-neutral-400'
                  }`}
                >
                  Wholesale Cart
                </button>
              </div>
            </div>

            {/* Test Cart Items */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] uppercase text-[#6B6B6B]">Test Cart Items:</span>
                <button
                  onClick={() => setTestCartItems([...testCartItems, { id: 'image-3', name: 'Smart Fitness Watch', price: 1800, quantity: 1, category: 'Smartwatches' }])}
                  className="text-[10px] text-[#FF4D00] hover:underline"
                >
                  + Add Item
                </button>
              </div>

              <div className="space-y-1.5">
                {testCartItems.map((it, idx) => (
                  <div key={idx} className="p-2 border border-[#EAEAEA] bg-gray-50 flex items-center justify-between text-[11px]">
                    <div>
                      <div className="font-bold text-[#0A0A0A]">{it.name}</div>
                      <div className="text-[#6B6B6B]">{it.quantity} × {formatINR(it.price)} ({it.category})</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={it.quantity}
                        onChange={(e) => {
                          const updated = [...testCartItems];
                          updated[idx].quantity = Number(e.target.value);
                          setTestCartItems(updated);
                        }}
                        className="w-12 px-1 border border-[#CCC] text-center"
                      />
                      <button
                        onClick={() => setTestCartItems(testCartItems.filter((_, i) => i !== idx))}
                        className="text-red-500"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 text-right text-xs text-[#6B6B6B]">
                Total Cart Value: <strong>{formatINR(testCartItems.reduce((acc, i) => acc + (i.price * i.quantity), 0))}</strong> ({testCartItems.reduce((acc, i) => acc + i.quantity, 0)} items)
              </div>
            </div>

            <button
              onClick={handleSimulate}
              disabled={simulating}
              className="w-full py-2 bg-[#0A0A0A] text-white text-xs uppercase hover:bg-[#FF4D00] transition-colors font-bold flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              {simulating ? 'Evaluating...' : 'Run Simulation'}
            </button>

            {/* Simulation Output Card */}
            {simulationResult && (
              <div className={`p-3 border mt-3 text-xs ${
                simulationResult.valid ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                <div className="font-bold uppercase text-[10px] mb-1">
                  {simulationResult.valid ? '✓ DISCOUNT APPLIED' : '✕ CANNOT APPLY'}
                </div>
                {simulationResult.valid ? (
                  <div className="space-y-1">
                    <div>Calculated Savings: <strong>{formatINR(simulationResult.discountAmount)}</strong></div>
                    <div className="text-[11px] opacity-80">Eligible Cart Value: {formatINR(simulationResult.eligibleAmount)}</div>
                  </div>
                ) : (
                  <div>Reason: {simulationResult.reason}</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* DISCOUNT BUILDER MODAL */}
      {/* ======================================================== */}
      {isBuilderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-white border border-[#0A0A0A] p-6 shadow-2xl relative my-8">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#EAEAEA]">
              <div>
                <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-[#0A0A0A]">
                  {editingId ? 'Edit Discount Rule' : 'New Discount Rule'}
                </h3>
              </div>
              <button onClick={() => setIsBuilderOpen(false)} className="p-1">
                <X className="w-4 h-4 text-[#6B6B6B]" />
              </button>
            </div>

            <form onSubmit={handleSaveDiscount} className="space-y-4 font-mono text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase text-[#6B6B6B] mb-1">Coupon Code (Leave empty for auto)</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. FESTIVE25"
                    className="w-full px-3 py-1.5 border border-[#CCC] font-bold uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-[#6B6B6B] mb-1">Promo Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Festive Special 25% or ₹200 Higher"
                    className="w-full px-3 py-1.5 border border-[#CCC]"
                  />
                </div>
              </div>

              {/* Target Channel / Audience */}
              <div>
                <label className="block text-[10px] uppercase text-[#6B6B6B] mb-1">Target Channel / Audience</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'both', label: 'Omnichannel (Both)' },
                    { id: 'retail', label: 'Retail Only' },
                    { id: 'wholesale', label: 'Wholesale Only' }
                  ].map(a => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setAudience(a.id)}
                      className={`p-2 border text-center text-[11px] font-semibold transition-colors ${
                        audience === a.id ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]' : 'bg-white border-[#EAEAEA] text-[#6B6B6B] hover:border-neutral-400'
                      }`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Type Selection */}
              <div>
                <label className="block text-[10px] uppercase text-[#6B6B6B] mb-1">Discount Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'percentage', label: 'Percentage (% Off)' },
                    { id: 'flat', label: 'Flat (₹ Off)' },
                    { id: 'rule_higher', label: '% OR ₹ Whichever Higher' }
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setType(m.id)}
                      className={`p-2 border text-center text-[11px] font-semibold ${
                        type === m.id ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]' : 'bg-white border-[#EAEAEA]'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Value Fields */}
              {type === 'percentage' && (
                <div>
                  <label className="block text-[10px] uppercase text-[#6B6B6B] mb-1">Discount Percentage (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full px-3 py-1.5 border border-[#CCC] font-bold"
                  />
                </div>
              )}

              {type === 'flat' && (
                <div>
                  <label className="block text-[10px] uppercase text-[#6B6B6B] mb-1">Flat Discount Amount (₹)</label>
                  <input
                    type="number"
                    min="1"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full px-3 py-1.5 border border-[#CCC] font-bold"
                  />
                </div>
              )}

              {(type === 'rule_higher' || type === 'rule_lower') && (
                <div className="p-3 bg-orange-50 border border-orange-200 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase text-[#6B6B6B] mb-1">Percentage Option (%)</label>
                    <input
                      type="number"
                      min="1"
                      value={rulePercentage}
                      onChange={(e) => setRulePercentage(e.target.value)}
                      className="w-full px-3 py-1.5 border border-[#CCC] bg-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-[#6B6B6B] mb-1">Flat Option (₹)</label>
                    <input
                      type="number"
                      min="1"
                      value={ruleFlat}
                      onChange={(e) => setRuleFlat(e.target.value)}
                      className="w-full px-3 py-1.5 border border-[#CCC] bg-white font-bold"
                    />
                  </div>
                </div>
              )}

              {/* Conditions */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase text-[#6B6B6B] mb-1">Min Cart Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={minCartAmount}
                    onChange={(e) => setMinCartAmount(e.target.value)}
                    className="w-full px-3 py-1.5 border border-[#CCC]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-[#6B6B6B] mb-1">Min Items Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={minQuantity}
                    onChange={(e) => setMinQuantity(e.target.value)}
                    className="w-full px-3 py-1.5 border border-[#CCC]"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsBuilderOpen(false)}
                  className="flex-1 py-2 border border-[#CCC] uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDiscount}
                  className="flex-1 py-2 bg-[#0A0A0A] text-white uppercase hover:bg-[#FF4D00] transition-colors font-bold"
                >
                  {savingDiscount ? 'Saving...' : 'Save Promotion Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
