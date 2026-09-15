import { useInfiniteSales, useExportAndPurgeSales } from '../hooks/useSalesAPI';
import GlassCard from '../components/GlassCard';
import GlassButton from '../components/GlassButton';
import { History, Download, Loader2, Package, Tag, Hash, Clock, CircleDollarSign } from 'lucide-react';
import React, { Fragment } from 'react';

export default function Sales() {
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteSales();

  const { mutateAsync: exportAndPurge, isPending: isExporting } = useExportAndPurgeSales();

  const handleExport = async () => {
    try {
      await exportAndPurge();
    } catch (err) {
      console.error("Failed to export sales", err);
      alert("Failed to export sales: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-primary-800">
            Sales History
          </h1>
          <p className="text-primary-700/60 mt-1">
            View completed transactions and export records
          </p>
        </div>
        
        <GlassButton 
          onClick={handleExport} 
          isLoading={isExporting}
          variant="primary"
          className="bg-accent-600 hover:bg-accent-500 text-white"
        >
          <Download size={16} />
          Download & Purge All
        </GlassButton>
      </div>

      {isError && (
        <div className="p-4 bg-secondary-500/20 text-secondary-800 rounded-xl">
          Error loading sales: {error?.message}
        </div>
      )}

      {/* Sales Table */}
      <GlassCard className="!p-0 overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-white/30">
          <History className="text-primary-600" size={20} />
          <h2 className="font-display font-semibold text-primary-800">
            Sold Items
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/30">
                <th className="text-left text-xs font-semibold text-primary-700/60 uppercase tracking-wide px-6 py-3">
                  <div className="flex items-center gap-1.5"><Clock size={14} /> Sold At</div>
                </th>
                <th className="text-left text-xs font-semibold text-primary-700/60 uppercase tracking-wide px-6 py-3">
                  <div className="flex items-center gap-1.5"><Package size={14} /> Item</div>
                </th>
                <th className="text-left text-xs font-semibold text-primary-700/60 uppercase tracking-wide px-6 py-3">
                  <div className="flex items-center gap-1.5"><Tag size={14} /> Serial</div>
                </th>
                <th className="text-left text-xs font-semibold text-primary-700/60 uppercase tracking-wide px-6 py-3">
                  <div className="flex items-center gap-1.5"><Hash size={14} /> Session ID</div>
                </th>
                <th className="text-left text-xs font-semibold text-primary-700/60 uppercase tracking-wide px-6 py-3">
                  <div className="flex items-center gap-1.5"><CircleDollarSign size={14} /> Price</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/20">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-primary-700/50">
                    <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                    Loading sales records...
                  </td>
                </tr>
              ) : !data || data.pages[0].data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-primary-700/40">
                    <History size={40} className="mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No sales records found.</p>
                  </td>
                </tr>
              ) : (
                data.pages.map((page, i) => (
                  <Fragment key={i}>
                    {page.data.map((sale) => (
                      <tr key={sale.serial} className="hover:bg-white/20 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-800">
                          {new Date(sale.soldAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-primary-800">
                              {sale.brand} {sale.model}
                            </span>
                            <span className="text-xs text-primary-700/60 uppercase tracking-wider">
                              {sale.productType}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono text-sm text-primary-800 bg-primary-900/5 px-2 py-1 rounded">
                            {sale.serial}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-primary-700/60">
                          {sale.sessionId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-primary-800">
                          ₹{sale.sellingPrice.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Load More Button */}
        {hasNextPage && (
          <div className="p-4 flex justify-center border-t border-white/30">
            <GlassButton 
              variant="secondary" 
              onClick={() => fetchNextPage()}
              isLoading={isFetchingNextPage}
            >
              Load More
            </GlassButton>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
