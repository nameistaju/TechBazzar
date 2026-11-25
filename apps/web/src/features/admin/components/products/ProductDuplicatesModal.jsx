import React from 'react';
import { Sparkles, X, RefreshCw, CheckCircle2, Check } from 'lucide-react';
import { formatINR } from '@shared/utils/formatters';

export default function ProductDuplicatesModal({
  showDuplicatesModal,
  setShowDuplicatesModal,
  duplicateGroups,
  dismissedGroupKeys,
  setDismissedGroupKeys,
  handleMergeAllSafeGroups,
  mergingAll,
  loadingDuplicates,
  loadDuplicateGroups,
  handleDismissGroup,
  mergingGroupId,
  handleMergeGroup,
}) {
  if (!showDuplicatesModal) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-[#0A0A0A] w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#EAEAEA] flex items-center justify-between bg-white">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold font-mono uppercase tracking-tight text-[#0A0A0A] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent-text" />
                Duplicate Products Review
              </h2>
              {duplicateGroups.filter(g => !dismissedGroupKeys.has(g.key)).length > 0 && (
                <span className="px-2 py-0.5 bg-accent text-accent-contrast text-[10px] font-mono font-bold uppercase rounded">
                  {duplicateGroups.filter(g => !dismissedGroupKeys.has(g.key)).length} Groups Detected
                </span>
              )}
            </div>
            <p className="text-xs text-[#6B6B6B] mt-1 font-mono">
              Consolidate identical models into one canonical record with unified image galleries and variants.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {duplicateGroups.filter(g => !dismissedGroupKeys.has(g.key)).length > 0 && (
              <button
                onClick={handleMergeAllSafeGroups}
                disabled={mergingAll}
                className="px-3.5 py-1.5 bg-[#0A0A0A] hover:bg-accent text-white hover:text-accent-contrast text-xs font-mono uppercase tracking-wider font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-accent-text" />
                {mergingAll ? 'Merging All...' : 'Merge All Safe Groups'}
              </button>
            )}
            <button
              onClick={() => setShowDuplicatesModal(false)}
              className="p-1.5 text-[#6B6B6B] hover:text-[#0A0A0A] hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAFAFA]">
          {loadingDuplicates ? (
            <div className="p-12 text-center space-y-3">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-accent-text" />
              <p className="text-xs font-mono text-[#6B6B6B]">Scanning product catalog for duplicates...</p>
            </div>
          ) : duplicateGroups.filter(g => !dismissedGroupKeys.has(g.key)).length === 0 ? (
            <div className="p-12 text-center bg-white border border-[#EAEAEA] rounded space-y-3">
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold font-mono uppercase tracking-wide text-[#0A0A0A]">
                No Duplicate Products Found
              </h3>
              <p className="text-xs text-[#6B6B6B] max-w-md mx-auto">
                All products in the catalog have distinct brand and model identifiers. Duplicate detection runs automatically whenever you add or edit products.
              </p>
              <button
                onClick={() => {
                  setDismissedGroupKeys(new Set());
                  loadDuplicateGroups();
                }}
                className="mt-2 px-3 py-1.5 border border-[#EAEAEA] bg-white text-xs font-mono uppercase tracking-wider text-[#0A0A0A] hover:border-[#0A0A0A]"
              >
                Re-scan Catalog
              </button>
            </div>
          ) : (
            duplicateGroups
              .filter(g => !dismissedGroupKeys.has(g.key))
              .map((group) => {
                const canonicalId = group.canonicalId || group.products[0]?.id;
                const duplicatesList = group.products.filter(p => p.id !== canonicalId);

                return (
                  <div key={group.key} className="border border-[#EAEAEA] bg-white p-5 shadow-sm space-y-4">
                    {/* Group Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#EAEAEA] gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-[#0A0A0A] text-white text-[10px] font-mono uppercase font-bold tracking-wider">
                          {group.brand}
                        </span>
                        <h3 className="text-sm font-bold font-mono text-[#0A0A0A]">
                          {group.canonical?.name || group.products[0]?.name}
                        </h3>
                        <span className="text-xs text-[#6B6B6B] font-mono">
                          ({group.products.length} entries)
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDismissGroup(group.key)}
                        className="text-xs text-[#6B6B6B] hover:text-[#0A0A0A] font-mono underline self-start sm:self-auto"
                      >
                        Keep separate
                      </button>
                    </div>

                    {/* Products Side by Side Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {group.products.map((p) => {
                        const isCanonical = p.id === canonicalId;
                        return (
                          <div
                            key={p.id}
                            className={`p-3 border flex flex-col justify-between relative transition-all ${
                              isCanonical
                                ? 'border-accent bg-accent-tint'
                                : 'border-[#EAEAEA] bg-white hover:border-[#0A0A0A]'
                            }`}
                          >
                            {isCanonical && (
                              <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-[#0A0A0A] text-accent-text text-[9px] font-mono font-bold uppercase tracking-wider z-10">
                                Canonical
                              </span>
                            )}

                            <div>
                              <div className="h-28 w-full bg-[#F7F7F7] border border-[#EAEAEA] p-2 flex items-center justify-center mb-2 overflow-hidden">
                                <img
                                  src={p.image || '/images/placeholder-product.svg'}
                                  alt={p.name}
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = '/images/placeholder-product.svg';
                                  }}
                                  className="h-full w-full object-contain"
                                />
                              </div>

                              <div className="text-xs font-semibold text-[#0A0A0A] line-clamp-2 leading-snug">
                                {p.name}
                              </div>

                              <div className="mt-1 flex items-center gap-2 text-[10px] font-mono text-[#6B6B6B]">
                                <span>SKU: {p.sku || p.id}</span>
                                <span>•</span>
                                <span className="capitalize">{p.category}</span>
                              </div>

                              <div className="mt-2 pt-2 border-t border-[#F0F0F0] grid grid-cols-2 gap-2 text-[11px] font-mono">
                                <div>
                                  <span className="text-[#6B6B6B] block text-[9px] uppercase">Selling Price</span>
                                  <span className="font-bold text-[#0A0A0A]">{formatINR(p.price)}</span>
                                </div>
                                <div>
                                  <span className="text-[#6B6B6B] block text-[9px] uppercase">Stock</span>
                                  <span className={p.stock > 0 ? 'text-[#0A0A0A]' : 'text-red-600 font-bold'}>
                                    {p.stock} units
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 pt-2 border-t border-[#F0F0F0]">
                              {isCanonical ? (
                                <button
                                  type="button"
                                  disabled={mergingGroupId === p.id}
                                  onClick={() => handleMergeGroup(p.id, duplicatesList.map(d => d.id))}
                                  className="w-full py-1.5 bg-[#0A0A0A] hover:bg-accent text-white hover:text-accent-contrast text-xs font-mono uppercase font-semibold tracking-wider transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                                >
                                  <Check className="w-3.5 h-3.5 text-accent-text" />
                                  {mergingGroupId === p.id ? 'Merging...' : 'Merge into this one'}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={mergingGroupId === p.id}
                                  onClick={() => {
                                    const otherIds = group.products.filter(item => item.id !== p.id).map(item => item.id);
                                    handleMergeGroup(p.id, otherIds);
                                  }}
                                  className="w-full py-1.5 border border-[#0A0A0A] bg-white text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white text-xs font-mono uppercase font-semibold tracking-wider transition-colors disabled:opacity-50"
                                >
                                  Make Canonical & Merge
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#EAEAEA] bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-[#6B6B6B] font-mono text-[11px]">
            🛡️ Safe Merge: Consolidated images form a gallery, duplicate products are archived with URL redirection, and actions can be reversed in the <span className="text-[#0A0A0A] font-semibold">Activity Log</span>.
          </div>

          <button
            type="button"
            onClick={() => setShowDuplicatesModal(false)}
            className="px-4 py-1.5 bg-[#0A0A0A] text-white hover:text-accent-contrast text-xs font-mono uppercase tracking-wider hover:bg-accent transition-colors shrink-0"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
