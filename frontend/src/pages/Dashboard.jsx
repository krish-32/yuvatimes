import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  DollarSign,
  TrendingUp,
  ScanLine,
  ArrowRight,
  Clock,
  AlertCircle,
} from "lucide-react";
import { useProducts } from "../hooks/useInventoryAPI";
import { Loader2 } from "lucide-react";
import GlassCard from "../components/GlassCard";

export default function Dashboard() {
  const { data: products = [], isLoading: loadingProducts, error: loadError } = useProducts();

  // Derive stats from catalog data
  const totalProducts = products.length;
  const totalUnits = products.reduce(
    (sum, p) => sum + (p.totalUnits || p.total || 0),
    0,
  );
  const availableUnits = products.reduce(
    (sum, p) => sum + (p.availableUnits || p.available || 0),
    0,
  );
  const totalValue = products.reduce(
    (sum, p) =>
      sum + (p.sellingPrice || 0) * (p.availableUnits || p.available || 0),
    0,
  );
  const lowStock = products.filter(
    (p) => (p.availableUnits || p.available || 0) <= 5,
  );

  const stats = [
    {
      label: "Total Products",
      value: totalProducts,
      icon: Package,
      color: "text-primary-600",
      bg: "bg-primary-500/15",
    },
    {
      label: "Total Units",
      value: totalUnits,
      icon: TrendingUp,
      color: "text-secondary-600",
      bg: "bg-secondary-500/15",
    },
    {
      label: "Available Units",
      value: availableUnits,
      icon: Clock,
      color: "text-green-600",
      bg: "bg-green-500/15",
    },
    {
      label: "Inventory Value",
      value: `₹${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: "text-primary-700",
      bg: "bg-accent-200/40",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl lg:text-3xl font-bold text-primary-800">
          Dashboard
        </h1>
        <p className="text-primary-700/60 mt-1">
          Overview of your watch inventory and sales
        </p>
      </div>

      {/* Error banner */}
      {loadError && (
        <GlassCard className="!bg-secondary-500/20 !border-secondary-400/50">
          <div className="flex items-center gap-3 text-secondary-700">
            <AlertCircle size={20} />
            <span className="text-sm font-medium">
              Could not load products: {loadError.message}
            </span>
          </div>
        </GlassCard>
      )}

      {loadingProducts && (
        <div className="flex justify-center p-8">
          <Loader2 className="animate-spin text-primary-500" size={32} />
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <GlassCard key={stat.label} hover className="!p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-primary-700/60 uppercase tracking-wide">
                  {stat.label}
                </p>
                <p className="text-xl lg:text-2xl font-display font-bold text-primary-800 mt-2">
                  {loadingProducts ? "..." : stat.value}
                </p>
              </div>
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.bg}`}
              >
                <stat.icon className={stat.color} size={20} />
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Link to="/inventory" className="block">
          <GlassCard hover>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500/15">
                  <Package className="text-primary-600" size={24} />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-primary-800">
                    Inventory
                  </h3>
                  <p className="text-sm text-primary-700/60">
                    Manage catalog & generate barcodes
                  </p>
                </div>
              </div>
              <ArrowRight className="text-primary-600" size={20} />
            </div>
          </GlassCard>
        </Link>

        <Link to="/pos" className="block">
          <GlassCard hover>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary-500/15">
                  <ScanLine className="text-secondary-600" size={24} />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-primary-800">
                    POS Checkout
                  </h3>
                  <p className="text-sm text-primary-700/60">
                    Scan watches and complete sales
                  </p>
                </div>
              </div>
              <ArrowRight className="text-secondary-600" size={20} />
            </div>
          </GlassCard>
        </Link>
      </div>
    </div>
  );
}
