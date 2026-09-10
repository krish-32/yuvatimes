import { useState, useEffect, useCallback } from "react";
import {
  Package,
  Plus,
  Printer,
  Check,
  X,
  RefreshCw,
  Loader2,
  AlertCircle,
  Tag,
} from "lucide-react";
import GlassCard from "../components/GlassCard";
import GlassInput from "../components/GlassInput";
import GlassButton from "../components/GlassButton";
import GlassModal from "../components/GlassModal";
import { useInventoryAPI } from "../hooks/useInventoryAPI";

export default function Inventory() {
  const {
    getProducts,
    generateBatch,
    printZpl,
    commitBatch,
    revertBatch,
    loading,
    error,
  } = useInventoryAPI();

  const [products, setProducts] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [batches, setBatches] = useState([]);
  const [activeWorkflowBatch, setActiveWorkflowBatch] = useState(null);
  const [workflowStep, setWorkflowStep] = useState(0);
  const [actionBatchId, setActionBatchId] = useState(null);

  // Batch form state
  const [batchForm, setBatchForm] = useState({
    product_type: "watch",
    brand: "",
    model: "",
    purchase_price: "",
    selling_price: "",
    quantity: 1,
  });
  const [formError, setFormError] = useState(null);

  const loadProducts = useCallback(async () => {
    try {
      const response = await getProducts();
      const data = response.data || response;
      setProducts(Array.isArray(data) ? data : data.items || []);
    } catch (err) {
      setLoadError(err.message);
    }
  }, [getProducts]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleGenerateBatch = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!batchForm.brand || !batchForm.model) {
      setFormError("Brand and model are required");
      return;
    }
    try {
      const payload = {
        productType: batchForm.product_type,
        brand: batchForm.brand,
        model: batchForm.model,
        purchasePrice: parseFloat(batchForm.purchase_price) || 0,
        sellingPrice: parseFloat(batchForm.selling_price) || 0,
        quantity: parseInt(batchForm.quantity, 10) || 1,
      };
      const response = await generateBatch(payload);
      const data = response.data || response;
      console.log(data);

      const rawSerials = data.serials || data.barcodes || [];
      const serialList = rawSerials.map(b => typeof b === 'string' ? b : (b.serial || b.barcodeValue));

      const batch = {
        batchId: data.batch_id || data.batchId || data.id,
        serials: serialList,
        ...payload,
        status: "DRAFT",
      };
      setBatches((prev) => [batch, ...prev]);
      setShowBatchForm(false);
      setBatchForm({
        product_type: "watch",
        brand: "",
        model: "",
        purchase_price: "",
        selling_price: "",
        quantity: 1,
      });
      
      // Auto-trigger the 2-step workflow immediately
      setActiveWorkflowBatch(batch);
      setWorkflowStep(1);
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleSilentPrint = async () => {
    if (!activeWorkflowBatch) return;
    setFormError(null);
    try {
      const payload = {
        brand: activeWorkflowBatch.brand,
        model: activeWorkflowBatch.model,
        price: activeWorkflowBatch.sellingPrice ? activeWorkflowBatch.sellingPrice.toString() : "0",
        serials: activeWorkflowBatch.serials
      };
      // Send silent print job to the backend
      await printZpl(payload);
      // Automatically transition to step 2 after successful print dispatch
      setWorkflowStep(2);
    } catch (err) {
      setFormError(`Failed to print: ${err.message}`);
    }
  };

  const handleConfirmStock = async (confirm) => {
    if (!activeWorkflowBatch) return;
    if (confirm) {
      try {
        await commitBatch(activeWorkflowBatch.batchId);
        setBatches((prev) =>
          prev.map((b) =>
            b.batchId === activeWorkflowBatch.batchId ? { ...b, status: "IN_STOCK" } : b,
          ),
        );
        loadProducts(); // Refresh catalog
      } catch (err) {
        setFormError(err.message);
        return;
      }
    }
    // Close the workflow modal
    setActiveWorkflowBatch(null);
    setWorkflowStep(0);
  };

  const handleRevert = async (batch) => {
    setActionBatchId(batch.batchId);
    try {
      await revertBatch(batch.batchId);
      setBatches((prev) => prev.filter((b) => b.batchId !== batch.batchId));
    } catch (err) {
      setFormError(err.message);
    } finally {
      setActionBatchId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-primary-800">
            Inventory & Barcode Management
          </h1>
          <p className="text-primary-700/60 mt-1">
            View catalog, generate barcode batches, and manage stock
          </p>
        </div>
        <div className="flex gap-3">
          <GlassButton
            variant="secondary"
            onClick={loadProducts}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </GlassButton>
          <GlassButton onClick={() => setShowBatchForm(true)}>
            <Plus size={16} />
            Generate Batch
          </GlassButton>
        </div>
      </div>

      {/* Error banner */}
      {(loadError || error || formError) && (
        <GlassCard className="!bg-secondary-500/20 !border-secondary-400/50">
          <div className="flex items-center gap-3 text-secondary-700">
            <AlertCircle size={20} />
            <span className="text-sm font-medium">
              {loadError || error || formError}
            </span>
          </div>
        </GlassCard>
      )}

      {/* Product catalog table */}
      <GlassCard className="!p-0 overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-white/30">
          <Package className="text-primary-600" size={20} />
          <h2 className="font-display font-semibold text-primary-800">
            Product Catalog
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/30">
                <th className="text-left text-xs font-semibold text-primary-700/60 uppercase tracking-wide px-6 py-3">
                  Type
                </th>
                <th className="text-left text-xs font-semibold text-primary-700/60 uppercase tracking-wide px-6 py-3">
                  Brand
                </th>
                <th className="text-left text-xs font-semibold text-primary-700/60 uppercase tracking-wide px-6 py-3">
                  Model
                </th>
                <th className="text-right text-xs font-semibold text-primary-700/60 uppercase tracking-wide px-6 py-3">
                  Purchase
                </th>
                <th className="text-right text-xs font-semibold text-primary-700/60 uppercase tracking-wide px-6 py-3">
                  Selling
                </th>
                <th className="text-center text-xs font-semibold text-primary-700/60 uppercase tracking-wide px-6 py-3">
                  Total
                </th>
                <th className="text-center text-xs font-semibold text-primary-700/60 uppercase tracking-wide px-6 py-3">
                  Available
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && products.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-12 text-primary-700/50"
                  >
                    <Loader2 className="animate-spin inline mr-2" size={18} />
                    Loading products...
                  </td>
                </tr>
              ) : products.length === 0 && !loadError ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-12 text-primary-700/50"
                  >
                    No products found. Generate a batch to get started.
                  </td>
                </tr>
              ) : (
                products.map((p, i) => (
                  <tr
                    key={i}
                    className="border-b border-white/20 hover:bg-white/20 transition-colors"
                  >
                    <td className="px-6 py-3 text-sm text-primary-800">
                      {p.product_type || p.type || "—"}
                    </td>
                    <td className="px-6 py-3 text-sm font-medium text-primary-800">
                      {p.brand || "—"}
                    </td>
                    <td className="px-6 py-3 text-sm text-primary-700">
                      {p.model || "—"}
                    </td>
                    <td className="px-6 py-3 text-sm text-right text-primary-700">
                      ${(p.purchase_price || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-3 text-sm text-right font-semibold text-primary-800">
                      ${(p.selling_price || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-3 text-sm text-center text-primary-700">
                      {p.total_units || p.total || 0}
                    </td>
                    <td className="px-6 py-3 text-sm text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${
                            (p.available_units || p.available || 0) <= 5
                              ? "bg-secondary-500/20 text-secondary-700"
                              : "bg-green-500/20 text-green-700"
                          }`}
                      >
                        {p.available_units || p.available || 0}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Batch staging area */}
      {batches.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-primary-800 flex items-center gap-2">
            <Tag className="text-primary-600" size={20} />
            Batch Staging Area (Drafts)
          </h2>
          {batches.map((batch) => (
            <GlassCard key={batch.batchId}>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-display font-semibold text-primary-800">
                      {batch.brand} {batch.model}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${
                          batch.status === "IN_STOCK"
                            ? "bg-green-500/20 text-green-700"
                            : "bg-accent-200/40 text-primary-700"
                        }`}
                    >
                      {batch.status}
                    </span>
                    <span className="text-sm text-primary-700/60">
                      {batch.serials.length} barcodes
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {batch.serials.slice(0, 8).map((s, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 rounded-lg bg-white/40 text-xs font-mono text-primary-800 border border-white/50"
                      >
                        {s}
                      </span>
                    ))}
                    {batch.serials.length > 8 && (
                      <span className="px-2 py-1 text-xs text-primary-700/60">
                        +{batch.serials.length - 8} more
                      </span>
                    )}
                  </div>
                </div>
                {batch.status === "DRAFT" && (
                  <div className="flex gap-3">
                    <GlassButton
                      onClick={() => {
                        setActiveWorkflowBatch(batch);
                        setWorkflowStep(1);
                      }}
                      disabled={actionBatchId === batch.batchId}
                    >
                      <Printer size={16} />
                      Print Barcode
                    </GlassButton>
                    <GlassButton
                      variant="danger"
                      onClick={() => handleRevert(batch)}
                      disabled={actionBatchId === batch.batchId}
                    >
                      <X size={16} />
                      Revert
                    </GlassButton>
                  </div>
                )}
                {batch.status === "IN_STOCK" && (
                  <div className="flex items-center gap-2 text-green-600 font-medium text-sm">
                    <Check size={18} />
                    Committed to stock
                  </div>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Step 1: Draft Review & Print Modal */}
      <GlassModal
        open={workflowStep === 1 && !!activeWorkflowBatch}
        onClose={() => setWorkflowStep(0)}
        title="Step 1: Print Barcode"
        footer={
          <>
            <GlassButton variant="secondary" onClick={() => setWorkflowStep(0)}>
              Cancel
            </GlassButton>
            <GlassButton onClick={handleSilentPrint}>
              <Printer size={16} />
              Print Barcode
            </GlassButton>
          </>
        }
      >
        <div className="space-y-4 text-primary-800">
          <p className="text-sm">Please review the details for this draft batch before printing.</p>
          <div className="glass-card p-4 space-y-2">
            <div className="flex justify-between border-b border-white/20 pb-2">
              <span className="font-semibold">Brand / Model</span>
              <span>{activeWorkflowBatch?.brand} {activeWorkflowBatch?.model}</span>
            </div>
            <div className="flex justify-between border-b border-white/20 pb-2">
              <span className="font-semibold">Selling Price</span>
              <span>${activeWorkflowBatch?.sellingPrice}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Labels to Print</span>
              <span>{activeWorkflowBatch?.serials?.length || 0}</span>
            </div>
          </div>
        </div>
      </GlassModal>

      {/* Step 2: Quality & Stock Confirmation Modal */}
      <GlassModal
        open={workflowStep === 2 && !!activeWorkflowBatch}
        onClose={() => handleConfirmStock(false)}
        title="Step 2: Confirm Quality & Stock"
        footer={
          <>
            <GlassButton variant="secondary" onClick={() => handleConfirmStock(false)}>
              Close / Cancel
            </GlassButton>
            <GlassButton onClick={() => handleConfirmStock(true)}>
              <Check size={16} />
              In-Stock
            </GlassButton>
          </>
        }
      >
        <div className="space-y-4 text-primary-800">
          <p className="text-sm">Did the barcode print correctly and clearly on the physical label?</p>
          <div className="glass-card p-4 space-y-2 text-sm bg-accent-200/20">
            <p>If you click <strong>In-Stock</strong>, the product status will be updated from Draft to In-Stock, and the items will become active in your inventory.</p>
            <p className="mt-2">If you click <strong>Close / Cancel</strong>, the batch will remain as a Draft so you can try printing again later.</p>
          </div>
        </div>
      </GlassModal>

      {/* Generate Batch Modal */}
      <GlassModal
        open={showBatchForm}
        onClose={() => setShowBatchForm(false)}
        title="Generate Barcode Batch"
        footer={
          <>
            <GlassButton
              variant="secondary"
              onClick={() => setShowBatchForm(false)}
            >
              Cancel
            </GlassButton>
            <GlassButton onClick={handleGenerateBatch} loading={loading}>
              <Plus size={16} />
              Generate
            </GlassButton>
          </>
        }
      >
        <form onSubmit={handleGenerateBatch} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <GlassInput
              label="Product Type"
              value={batchForm.product_type}
              onChange={(e) =>
                setBatchForm({ ...batchForm, product_type: e.target.value })
              }
              placeholder="watch"
            />
            <GlassInput
              label="Quantity"
              type="number"
              min="1"
              value={batchForm.quantity}
              onChange={(e) =>
                setBatchForm({ ...batchForm, quantity: e.target.value })
              }
            />
            <GlassInput
              label="Brand"
              value={batchForm.brand}
              onChange={(e) =>
                setBatchForm({ ...batchForm, brand: e.target.value })
              }
              placeholder="e.g. Rolex"
              required
            />
            <GlassInput
              label="Model"
              value={batchForm.model}
              onChange={(e) =>
                setBatchForm({ ...batchForm, model: e.target.value })
              }
              placeholder="e.g. Submariner"
              required
            />
            <GlassInput
              label="Purchase Price ($)"
              type="number"
              step="0.01"
              min="0"
              value={batchForm.purchase_price}
              onChange={(e) =>
                setBatchForm({ ...batchForm, purchase_price: e.target.value })
              }
              placeholder="0.00"
            />
            <GlassInput
              label="Selling Price ($)"
              type="number"
              step="0.01"
              min="0"
              value={batchForm.selling_price}
              onChange={(e) =>
                setBatchForm({ ...batchForm, selling_price: e.target.value })
              }
              placeholder="0.00"
            />
          </div>
          <p className="text-xs text-primary-700/50">
            This will generate {batchForm.quantity} unique 8-character DRAFT
            UUIDs for barcode labels.
          </p>
        </form>
      </GlassModal>
    </div>
  );
}
