'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  TrendingUp,
  Upload,
  Loader2,
  History,
  BarChart3,
  RefreshCw,
  ShoppingCart,
  Trash2,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  ArrowDown,
  ArrowUp,
  Edit3,
  Check,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  uploadSalesFiles,
  fetchSalesHistory,
  getSalesMetrics,
  deleteSalesUpload,
  type SalesMetrics,
  getAllProductCategories,
  updateProductCategory,
  deleteCategory
} from '@/app/actions/sales-actions';
import { useReadOnly, READ_ONLY_DENY_MSG } from '@/components/providers/AuthProvider';
import { HintTooltip } from '@/components/ui/hint-tooltip';
import { useTheme } from 'next-themes';
import { getChartColors } from '@/lib/chart-theme';
import { SALES_CATEGORY_CARD_COLORS, SALES_SECTION_COLORS } from '@/lib/shift-colors';
import { readCache, writeCache, isStale } from '@/lib/cache/client-cache';
import SalesTopProductsChart from './components/SalesTopProductsChart';

const SALES_METRICS_KEY = 'salesMetrics';
// Separate TTL-tracking key for the server fetch; UI-editable categories
// still use 'blackandbrew-product-categories' in legacy format (merge logic)
const PRODUCT_CATEGORIES_SERVER_KEY = 'product-categories-server';
const CACHE_TTL = 300_000;

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('th-TH', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('th-TH').format(num);
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card p-4 rounded-2xl shadow-xl border border-border">
        <p className="text-sm font-medium text-foreground/80 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.name.includes('รายได้') || entry.name.includes('ยอดขาย') ? `฿${formatCurrency(entry.value)}` : formatNumber(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export interface ProductCategoryRow {
  product_name: string;
  category: string;
}

export interface SalesClientProps {
  initialMetrics: SalesMetrics | null;
  initialCategories: ProductCategoryRow[];
  locale: string;
}

export default function SalesClient({
  initialMetrics,
  initialCategories,
  locale,
}: SalesClientProps) {
  const isReadOnly = useReadOnly();
  const { resolvedTheme } = useTheme();
  const chartColors = getChartColors(resolvedTheme === 'dark');

  const blockIfReadOnly = () => {
    if (isReadOnly) {
      setError(READ_ONLY_DENY_MSG);
      return true;
    }
    return false;
  };

  // State
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [history, setHistory] = useState<any>(null);
  const [baseMetrics, setBaseMetrics] = useState<SalesMetrics | null>(initialMetrics);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<Array<{ fileName: string; recordCount: number; auditLog: any }> | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);
  const [sortBy, setSortBy] = useState<'quantity' | 'revenue'>('quantity');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [productCategories, setProductCategories] = useState<Map<string, string>>(new Map());
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [tempCategoryValues, setTempCategoryValues] = useState<Map<string, string>>(new Map());
  const [updatingProduct, setUpdatingProduct] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  const isEnteringEditModeRef = useRef(false);

  // Wait for component to mount before rendering charts
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Get unique categories - use allCategories which includes all user-added categories!
  const categories = useMemo(() => {
    return allCategories;
  }, [allCategories]);

  const metrics = useMemo(() => {
    if (!baseMetrics) return null;

    const allProducts = baseMetrics.allProducts.map((p) => ({
      ...p,
      category: productCategories.get(p.productName) || '',
    }));

    const topProducts = baseMetrics.topProducts.map((p) => ({
      ...p,
      category: productCategories.get(p.productName) || '',
    }));

    const newCategoryData = new Map<string, { revenue: number; quantity: number; transactionCount: number }>();
    allProducts.forEach((p) => {
      if (p.category) {
        const existing = newCategoryData.get(p.category) || { revenue: 0, quantity: 0, transactionCount: 0 };
        newCategoryData.set(p.category, {
          revenue: existing.revenue + p.totalRevenue,
          quantity: existing.quantity + p.totalQuantity,
          transactionCount: existing.transactionCount + 1,
        });
      }
    });

    const totalRevenue = allProducts.reduce((sum, p) => sum + p.totalRevenue, 0);
    const categoryMetrics = Array.from(newCategoryData.entries())
      .map(([category, data]) => ({
        category,
        totalRevenue: data.revenue,
        totalQuantity: data.quantity,
        transactionCount: data.transactionCount,
        revenuePercentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    return {
      ...baseMetrics,
      allProducts,
      topProducts,
      categoryMetrics,
    };
  }, [baseMetrics, productCategories]);

  // Sort and filter products
  const sortedAllProducts = useMemo(() => {
    if (!metrics?.allProducts) return [];

    let products = [...metrics.allProducts];

    if (selectedCategory !== 'all') {
      products = products.filter((p) => p.category === selectedCategory);
    }

    products.sort((a, b) => {
      const aVal = sortBy === 'quantity' ? a.totalQuantity : a.totalRevenue;
      const bVal = sortBy === 'quantity' ? b.totalQuantity : b.totalRevenue;

      if (sortOrder === 'desc') {
        return bVal - aVal;
      }
      return aVal - bVal;
    });

    return products;
  }, [metrics?.allProducts, sortBy, sortOrder, selectedCategory]);

  // Helper to load categories (combines server AND localStorage!)
  const loadCategories = useRef(async (categoriesFromServer: any[]) => {
    // Get from localStorage
    let localCategories: any[] = [];
    try {
      const localData = localStorage.getItem('blackandbrew-product-categories');
      if (localData) {
        localCategories = JSON.parse(localData);
      }
    } catch (e) {
      console.error('Error loading local categories:', e);
    }

    // Merge server and local categories, preferring server if there's a conflict
    const mergedCategories = new Map<string, string>();
    
    // Add server categories first
    categoriesFromServer.forEach((c: any) => {
      if (c.product_name && c.category) {
        mergedCategories.set(c.product_name, c.category);
      }
    });
    
    // Add local categories (won't overwrite server ones)
    localCategories.forEach((c: any) => {
      if (c.product_name && c.category && !mergedCategories.has(c.product_name)) {
        mergedCategories.set(c.product_name, c.category);
      }
    });
    
    // Build unique category set
    const uniqueCategories = new Set<string>();
    mergedCategories.forEach((category) => {
      if (category) uniqueCategories.add(category);
    });

    setProductCategories(mergedCategories);
    setAllCategories(Array.from(uniqueCategories));
    
    // Save merged categories back to localStorage
    const categoriesArray = Array.from(mergedCategories.entries()).map(([name, cat]) => ({
      product_name: name,
      category: cat
    }));
    localStorage.setItem('blackandbrew-product-categories', JSON.stringify(categoriesArray));
  });

  // Load data — reads cache first; fetches from Supabase when stale or missing
  const loadData = useRef(async (forceRefresh = false) => {
    setIsLoading(true);
    try {
      // --- salesMetrics cache ---
      const cachedMetrics = readCache<SalesMetrics>(SALES_METRICS_KEY);
      const metricsStale =
        forceRefresh ||
        cachedMetrics.data === null ||
        (cachedMetrics.savedAt !== null && isStale(cachedMetrics.savedAt, CACHE_TTL));

      // --- product-categories cache (server fetch TTL tracking) ---
      const cachedCategories = readCache<any[]>(PRODUCT_CATEGORIES_SERVER_KEY);
      const categoriesStale =
        forceRefresh ||
        cachedCategories.data === null ||
        (cachedCategories.savedAt !== null && isStale(cachedCategories.savedAt, CACHE_TTL));

      // Use cached metrics if still fresh
      if (!metricsStale && cachedMetrics.data) {
        setBaseMetrics(cachedMetrics.data);
      }

      // Categories: loadCategories reads from blackandbrew-product-categories (legacy key)
      // and merges server+local — call it regardless so UI gets local edits
      if (!categoriesStale && cachedCategories.data) {
        loadCategories.current(cachedCategories.data);
      }

      // Always load history (no cache for history to keep it fresh)
      const historyData = await fetchSalesHistory();
      if (historyData) setHistory(historyData);

      // Fetch stale/missing data from Supabase
      if (metricsStale || categoriesStale) {
        const fetches: Promise<any>[] = [];
        if (metricsStale) fetches.push(getSalesMetrics());
        if (categoriesStale) fetches.push(getAllProductCategories());

        const results = await Promise.all(fetches);
        let resultIdx = 0;

        if (metricsStale) {
          const metricsData: SalesMetrics = results[resultIdx++];
          if (metricsData) {
            // Supabase confirmed — update cache then UI
            writeCache(SALES_METRICS_KEY, metricsData, 'server');
            setBaseMetrics(metricsData);
          }
        }

        if (categoriesStale) {
          const categoriesResult = results[resultIdx++];
          if (categoriesResult.success) {
            // Supabase confirmed — update TTL cache then merge into UI
            writeCache(PRODUCT_CATEGORIES_SERVER_KEY, categoriesResult.categories, 'server');
            loadCategories.current(categoriesResult.categories);
          }
        }
      }
    } catch (e) {
      console.error('Error loading sales data', e);
    } finally {
      setIsLoading(false);
    }
  });



  // Ref for debounce timer
  const debounceRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Update product category
  const handleUpdateCategory = async (productName: string) => {
    if (blockIfReadOnly()) return;
    // Clear any existing debounce timer for this product
    if (debounceRef.current[productName]) {
      clearTimeout(debounceRef.current[productName]);
    }

    const currentValue = tempCategoryValues.get(productName) ?? '';
    const currentCategory = productCategories.get(productName) ?? '';
    
    // Only proceed if value actually changed
    if (currentValue === currentCategory) {
      setEditingProduct(null);
      setTempCategoryValues(prev => {
        const newMap = new Map(prev);
        newMap.delete(productName);
        return newMap;
      });
      return;
    }

    // Update local state immediately for better UX
    if (currentValue.trim()) {
      const newProductCategoriesMap = new Map(productCategories);
      newProductCategoriesMap.set(productName, currentValue);
      setProductCategories(newProductCategoriesMap);
      
      // Update all categories if this is a new one
      const newAllCategories = allCategories.includes(currentValue)
        ? allCategories
        : [...allCategories, currentValue];
      setAllCategories(newAllCategories);
      
      // Save to localStorage immediately as fallback
      const categoriesArray = Array.from(newProductCategoriesMap.entries()).map(([name, cat]) => ({
        product_name: name,
        category: cat
      }));
      localStorage.setItem('blackandbrew-product-categories', JSON.stringify(categoriesArray));
    }

    // Always exit edit mode
    setEditingProduct(null);
    setTempCategoryValues(prev => {
      const newMap = new Map(prev);
      newMap.delete(productName);
      return newMap;
    });

    // If value is empty, don't call server
    if (!currentValue.trim()) {
      return;
    }

    setUpdatingProduct(productName);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const result = await updateProductCategory(productName, currentValue);
      
      if (result.success) {
        setSuccessMessage(`อัปเดตหมวดหมู่สินค้า "${productName}" เป็น "${currentValue}" เรียบร้อยแล้ว!`);
      } else {
        setError(result.error || 'เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch (e) {
      console.error('[handleUpdateCategory] Error updating category', e);
      setError('เกิดข้อผิดพลาดในการอัปเดตหมวดหมู่');
    } finally {
      setUpdatingProduct(null);
    }
  };

  // Handle category delete
  const handleDeleteCategory = async (categoryName: string) => {
    setCategoryToDelete(categoryName);
  };

  // Confirm and delete category
  const confirmDeleteCategory = async () => {
    if (blockIfReadOnly()) return;
    if (!categoryToDelete) return;
    
    setIsDeletingCategory(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const result = await deleteCategory(categoryToDelete);
      
      if (result.success) {
        // Update local state
        const newProductCategoriesMap = new Map(productCategories);
        // Remove all products that had this category
        newProductCategoriesMap.forEach((cat, productName) => {
          if (cat === categoryToDelete) {
            newProductCategoriesMap.delete(productName);
          }
        });
        setProductCategories(newProductCategoriesMap);
        
        // Update all categories
        const newAllCategories = allCategories.filter(cat => cat !== categoryToDelete);
        setAllCategories(newAllCategories);
        
        // Update localStorage
        const categoriesArray = Array.from(newProductCategoriesMap.entries()).map(([name, cat]) => ({
          product_name: name,
          category: cat
        }));
        localStorage.setItem('blackandbrew-product-categories', JSON.stringify(categoriesArray));
        
        // If we were filtering by this category, reset filter
        if (selectedCategory === categoryToDelete) {
          setSelectedCategory('all');
        }
        
        setSuccessMessage(`ลบหมวดหมู่ "${categoryToDelete}" เรียบร้อยแล้ว!`);
      } else {
        setError(result.error || 'เกิดข้อผิดพลาดในการลบ');
      }
    } catch (e) {
      console.error('[confirmDeleteCategory] Error deleting category', e);
      setError('เกิดข้อผิดพลาดในการลบ');
    } finally {
      setIsDeletingCategory(false);
      setCategoryToDelete(null);
    }
  };

  // Seed server data into cache and load history on mount
  useEffect(() => {
    if (initialMetrics) {
      writeCache(SALES_METRICS_KEY, initialMetrics, 'server');
    }
    if (initialCategories.length > 0) {
      writeCache(PRODUCT_CATEGORIES_SERVER_KEY, initialCategories, 'server');
      loadCategories.current(initialCategories);
    }
    loadData.current();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData.current(true);
    setIsRefreshing(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (files.length > 24) {
        setError('สามารถอัปโหลดไฟล์ได้สูงสุด 24 ไฟล์ค่ะ');
        return;
      }
      setSelectedFiles(files);
      setError(null);
      setUploadSuccess(null);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (blockIfReadOnly()) return;
    if (selectedFiles.length === 0) {
      setError('กรุณาเลือกไฟล์ที่จะอัปโหลดค่ะ');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadSuccess(null);

    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('files', file);
    });

    const result = await uploadSalesFiles(formData);

    if (result.success && result.uploadedFiles) {
      setUploadSuccess(result.uploadedFiles);
      setSelectedFiles([]);
      await loadData.current();
    } else {
      setError(result.error || 'เกิดข้อผิดพลาดค่ะ');
    }

    setIsUploading(false);
  };

  const handleDeleteUpload = async (uploadId: string) => {
    if (blockIfReadOnly()) return;
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบไฟล์นี้? ข้อมูลทั้งหมดที่เกี่ยวข้องจะถูกลบออกจากระบบ')) {
      return;
    }

    setIsDeleting(uploadId);
    try {
      const result = await deleteSalesUpload(uploadId);
      if (result.success) {
        await loadData.current();
      } else {
        setError(result.error || 'เกิดข้อผิดพลาดในการลบ');
      }
    } catch (e) {
      console.error('Error deleting upload', e);
      setError('เกิดข้อผิดพลาดในการลบ');
    } finally {
      setIsDeleting(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-normal">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  const hasUploadHistory = history?.uploads && history.uploads.length > 0;

  return (
    <div className="min-h-screen bg-background text-foreground font-normal">
      <div className="max-w-7xl mx-auto px-3 md:px-6 py-6 md:pb-8">
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`p-3.5 rounded-2xl shrink-0 shadow-sm ${SALES_SECTION_COLORS.headerIcon}`}>
                  <TrendingUp className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <div>
                  <h1 className="text-2xl tracking-tight">Sales Dashboard</h1>
                  <p className="text-muted-foreground text-xs mt-1">จัดการและวิเคราะห์ข้อมูลยอดขายอย่างมีประสิทธิภาพ</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <button
                  onClick={() => setShowManageCategories(true)}
                  disabled={isReadOnly}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-card border border-border rounded-xl hover:bg-muted transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Edit3 className="w-4 h-4" />
                  <span className="text-sm">จัดการหมวดหมู่</span>
                </button>
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-card border border-border rounded-xl hover:bg-muted transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span className="text-sm">รีเฟรช</span>
                </button>
              </div>
            </div>
            
            {/* Success/Error messages */}
            <AnimatePresence>
              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4 p-4 bg-card border border-border rounded-xl"
                >
                  {successMessage}
                </motion.div>
              )}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4 p-4 bg-card border border-border rounded-xl"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Manage Categories Modal */}
            <AnimatePresence>
              {showManageCategories && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    onClick={() => setShowManageCategories(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative bg-card rounded-3xl border border-border shadow-xl max-w-lg w-full p-6"
                  >
                    <HintTooltip tip="ปิด">
                      <button
                        onClick={() => setShowManageCategories(false)}
                        className="absolute top-4 right-4 p-2 hover:bg-muted rounded-2xl transition-all text-muted-foreground hover:text-foreground z-10"
                        aria-label="ปิด"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </HintTooltip>
                    <div className="flex items-center justify-between mb-6 pr-10">
                      <div>
                        <h2 className="text-xl">จัดการหมวดหมู่</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          เพิ่ม, แก้ไข, หรือลบหมวดหมู่สินค้า
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto bb-smooth-scroll">
                      {allCategories.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          ยังไม่มีหมวดหมู่ที่บันทึกไว้
                        </div>
                      ) : (
                        allCategories.map((category) => (
                          <div
                            key={category}
                            className="flex items-center justify-between p-4 bg-muted rounded-2xl border border-border"
                          >
                            <span className="text-sm">{category}</span>
                            <HintTooltip tip="ลบหมวดหมู่">
                              <button
                                onClick={() => handleDeleteCategory(category)}
                                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all"
                                aria-label={`ลบหมวดหมู่ ${category}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </HintTooltip>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={() => setShowManageCategories(false)}
                        className="px-5 py-2.5 bg-muted border border-border rounded-xl hover:bg-muted/80 transition-all text-sm"
                      >
                        ปิด
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
              {categoryToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    onClick={() => setCategoryToDelete(null)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative bg-card rounded-3xl border border-border shadow-xl max-w-md w-full p-6"
                  >
                    <HintTooltip tip="ปิด">
                      <button
                        onClick={() => setCategoryToDelete(null)}
                        className="absolute top-4 right-4 p-2 hover:bg-muted rounded-2xl transition-all text-muted-foreground hover:text-foreground z-10"
                        aria-label="ปิด"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </HintTooltip>
                    <div className="text-center mb-6 mt-4">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
                        <Trash2 className="w-8 h-8 text-foreground" />
                      </div>
                      <h3 className="text-xl mb-2">
                        ลบหมวดหมู่ "{categoryToDelete}"
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        การลบหมวดหมู่นี้จะนำออกจากสินค้าทุกรายการที่ใช้หมวดหมู่นี้
                        คุณแน่ใจหรือไม่ว่าต้องการดำเนินการต่อ?
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setCategoryToDelete(null)}
                        disabled={isReadOnly || isDeletingCategory}
                        className="flex-1 px-5 py-3 bg-muted border border-border rounded-xl hover:bg-muted/80 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ยกเลิก
                      </button>
                      <button
                        onClick={confirmDeleteCategory}
                        disabled={isReadOnly || isDeletingCategory}
                        className="flex-1 px-5 py-3 bg-black text-white rounded-xl hover:bg-black/80 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isDeletingCategory ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            กำลังลบ...
                          </>
                        ) : (
                          'ลบหมวดหมู่'
                        )}
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
        </div>

        {/* Upload & History — unified section */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-6 rounded-2xl shadow-md overflow-hidden ${SALES_SECTION_COLORS.upload}`}
        >
          {/* Upload area */}
          <div className={`p-5 ${isReadOnly ? 'pointer-events-none opacity-60' : ''}`}>
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-card border border-border shrink-0">
                <Upload className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-base font-normal">อัปโหลดไฟล์ยอดขาย</h3>
                <p className="text-xs text-muted-foreground mt-0.5">รองรับ .xlsx, .xls สูงสุด 24 ไฟล์</p>
              </div>
            </div>

            <form onSubmit={handleFileUpload} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <div className="flex-1 min-w-0">
                <input
                  type="file"
                  id="file-upload"
                  name="files"
                  multiple
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex items-center gap-3 px-4 py-3 bg-card border-2 border-dashed border-border rounded-xl hover:bg-muted hover:border-foreground/20 transition-all"
                >
                  <FileSpreadsheet className="w-5 h-5 text-foreground/70 shrink-0" strokeWidth={1.5} />
                  <span className="text-sm text-foreground/70">
                    {selectedFiles.length > 0
                      ? `${selectedFiles.length} ไฟล์ที่เลือก`
                      : 'คลิกเพื่อเลือกไฟล์ Excel'}
                  </span>
                  {selectedFiles.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setSelectedFiles([]);
                      }}
                      className="ml-auto text-[11px] text-muted-foreground hover:text-foreground shrink-0"
                    >
                      ล้าง
                    </button>
                  )}
                </label>
              </div>

              <button
                type="submit"
                disabled={isReadOnly || isUploading || selectedFiles.length === 0}
                className="shrink-0 bg-[#000000] text-white px-6 py-3 rounded-xl hover:bg-black/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm flex items-center justify-center gap-2 shadow-sm"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    กำลังอัปโหลด...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    อัปโหลด
                  </>
                )}
              </button>
            </form>

            <AnimatePresence>
              {uploadSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mt-4 p-3.5 bb-pastel-surface text-black bg-[#d4edda] border border-[#c3e6cb] rounded-xl"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Check className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">อัปโหลดสำเร็จ!</span>
                  </div>
                  {uploadSuccess.map((file, index) => (
                    <div key={index} className="text-xs text-muted-foreground pl-6">
                      {file.fileName}: {file.recordCount} รายการ
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Upload history — collapsible, chevron on left to avoid AI chat FAB overlap */}
          {hasUploadHistory && (
            <>
              <div className="border-t border-border" />
              <button
                type="button"
                onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
                className="w-full flex items-center gap-2.5 px-5 py-4 hover:bg-muted transition-colors text-left"
                aria-expanded={!isHistoryCollapsed}
              >
                {isHistoryCollapsed ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <History className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-normal">ประวัติการอัปโหลด</span>
                <span className="text-[11px] bg-card border border-border px-2 py-0.5 rounded-full text-muted-foreground">
                  {history.uploads.length} ไฟล์
                </span>
              </button>

              <AnimatePresence initial={false}>
                {!isHistoryCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 space-y-2.5">
                      {history.uploads.map((upload: any) => (
                        <div
                          key={upload.id}
                          className="flex items-center justify-between p-3.5 bg-card border border-border rounded-xl hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
                              <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm truncate">{upload.file_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {upload.total_records} รายการ •{' '}
                                {new Date(upload.upload_date).toLocaleDateString('th-TH')}
                              </p>
                            </div>
                          </div>
                          <HintTooltip tip="ลบไฟล์">
                            <button
                              type="button"
                              onClick={() => handleDeleteUpload(upload.id)}
                              disabled={isReadOnly || isDeleting === upload.id}
                              className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 shrink-0 ml-2"
                              aria-label={`ลบไฟล์ ${upload.file_name}`}
                            >
                              {isDeleting === upload.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </HintTooltip>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </motion.div>

        {/* Dashboard Content */}
        {metrics ? (
          <div className="space-y-8">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Total Revenue */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0 }}
                className={`rounded-2xl shadow-md p-4 hover:shadow-lg transition-all duration-300 ${SALES_SECTION_COLORS.revenue}`}
              >
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-11 h-11 rounded-xl bg-white/50 border border-[#c3e6cb] flex items-center justify-center">
                    <TrendingUp className="w-5.5 h-5.5 text-black" />
                  </div>
                  <p className="text-xs text-muted-foreground">ยอดขายรวม</p>
                </div>
                <p className="text-2xl tracking-tight">฿{formatCurrency(metrics.overview.totalRevenue)}</p>
              </motion.div>

              {/* Total Quantity (Bills) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={`rounded-2xl shadow-md p-4 hover:shadow-lg transition-all duration-300 ${SALES_SECTION_COLORS.quantity}`}
              >
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-11 h-11 rounded-xl bg-white/50 border border-[#ffeeba] flex items-center justify-center">
                    <ShoppingCart className="w-5.5 h-5.5 text-black" />
                  </div>
                  <p className="text-xs text-muted-foreground">จำนวนที่ขาย</p>
                </div>
                <p className="text-2xl tracking-tight">{formatNumber(metrics.overview.totalQuantity)}</p>
              </motion.div>

              {/* Total Transactions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`rounded-2xl shadow-md p-4 hover:shadow-lg transition-all duration-300 ${SALES_SECTION_COLORS.menuItems}`}
              >
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-11 h-11 rounded-xl bg-white/50 border border-[#f5c6cb] flex items-center justify-center">
                    <FileSpreadsheet className="w-5.5 h-5.5 text-black" />
                  </div>
                  <p className="text-xs text-muted-foreground">รายการเมนู</p>
                </div>
                <p className="text-2xl tracking-tight">{formatNumber(metrics.overview.totalTransactions)}</p>
              </motion.div>
            </div>

            {/* Category Metrics */}
            {metrics?.categoryMetrics && metrics.categoryMetrics.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className={`rounded-2xl shadow-lg p-5 ${SALES_SECTION_COLORS.categories}`}
              >
                <div className="mb-4">
                  <h3 className="text-lg">ยอดขายแยกตามหมวดหมู่</h3>
                  <p className="text-xs text-muted-foreground mt-1">ดูยอดขายของแต่ละหมวดหมู่สินค้าแบบง่าย</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {metrics.categoryMetrics.map((category, index) => {
                    const cardColor = SALES_CATEGORY_CARD_COLORS[index % SALES_CATEGORY_CARD_COLORS.length];
                    return (
                    <div key={index} className={`p-4 rounded-xl border hover:shadow-md transition-all duration-300 ${cardColor}`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm">{category.category}</span>
                        <span className="text-[10px] text-black bg-white/50 border border-black/10 px-1.5 py-0.5 rounded-full">{category.revenuePercentage.toFixed(1)}%</span>
                      </div>
                      <div className="text-2xl mb-1.5">฿{formatCurrency(category.totalRevenue)}</div>
                      <div className="text-xs text-black/55">{formatNumber(category.totalQuantity)} ชิ้น • {formatNumber(category.transactionCount)} รายการ</div>
                      <div className="mt-2.5 h-2 bg-white/50 rounded-full overflow-hidden border border-black/5">
                        <div 
                          className="h-full bg-black/25 rounded-full transition-all duration-700"
                          style={{ width: `${Math.min(category.revenuePercentage, 100)}%` }}
                        />
                      </div>
                    </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Top 10 Products Bar Chart */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className={`rounded-2xl shadow-md p-5 ${SALES_SECTION_COLORS.topProducts}`}
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2.5 rounded-xl bg-card border border-border shrink-0">
                    <BarChart3 className="w-5 h-5" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-base font-normal">สินค้ายอดนิยม (Top 10)</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">เมนูที่มียอดขายสูงสุด</p>
                  </div>
                </div>
                <div className="h-64 w-full bg-card border border-border rounded-xl p-3">
                  {isMounted && (
                    <SalesTopProductsChart
                      topProducts={metrics.topProducts}
                      chartColors={chartColors}
                      formatCurrency={formatCurrency}
                      formatNumber={formatNumber}
                    />
                  )}
                </div>
              </motion.div>

            {/* Top 10 Products Table */}
            {metrics.topProducts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className={`rounded-2xl shadow-md p-5 ${SALES_SECTION_COLORS.topProducts}`}
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2.5 rounded-xl bg-card border border-border shrink-0">
                    <ShoppingCart className="w-5 h-5" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-base font-normal">สินค้ายอดนิยม (Top 10)</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">รายละเอียดของ 10 เมนูยอดนิยม</p>
                  </div>
                </div>
                <div className="overflow-x-auto bb-smooth-scroll bg-card border border-border rounded-xl">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-black/10">
                        <th className="text-left py-2.5 px-3 text-xs text-muted-foreground uppercase tracking-wider">อันดับ</th>
                        <th className="text-left py-2.5 px-3 text-xs text-muted-foreground uppercase tracking-wider">สินค้า</th>
                        <th className="text-left py-2.5 px-3 text-xs text-muted-foreground uppercase tracking-wider">หมวดหมู่</th>
                        <th className="text-right py-2.5 px-3 text-xs text-muted-foreground uppercase tracking-wider">จำนวนที่ขาย</th>
                        <th className="text-right py-2.5 px-3 text-xs text-muted-foreground uppercase tracking-wider">ยอดขาย</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.topProducts.map((product, index) => {
                        const productWithCategory = {
                          ...product,
                          category: productCategories.get(product.productName) || ''
                        };
                        return (
                        <tr key={product.productName} className="border-b border-black/5 last:border-0 hover:bg-black/[0.02] transition-colors">
                          <td className="py-2.5 px-3">
                            <span className="text-sm">
                              #{index + 1}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-sm">{product.productName}</td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center">
                              {editingProduct === product.productName ? (
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  className="flex items-center gap-1.5 w-full sm:w-auto"
                                >
                                  <div className="relative flex-1">
                                    <input
                                      id={`category-input-top-${product.productName}`}
                                      type="text"
                                      value={tempCategoryValues.get(product.productName) ?? ''}
                                      onChange={(e) => {
                                        setTempCategoryValues(prev => {
                                          const newMap = new Map(prev);
                                          newMap.set(product.productName, e.target.value);
                                          return newMap;
                                        });
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleUpdateCategory(product.productName);
                                        } else if (e.key === 'Escape') {
                                          setEditingProduct(null);
                                          setTempCategoryValues(prev => {
                                            const newMap = new Map(prev);
                                            newMap.delete(product.productName);
                                            return newMap;
                                          });
                                        }
                                      }}
                                      onBlur={() => {
                                        if (!isEnteringEditModeRef.current) {
                                          handleUpdateCategory(product.productName);
                                        }
                                      }}
                                      autoFocus
                                      list={`category-list-top-${product.productName}`}
                                      aria-label={`Edit category for ${product.productName}`}
                                      className="w-full px-3 py-2 rounded-lg border border-black/10 bg-white text-xs transition-all focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black/30 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                      placeholder="ป้อนชื่อหมวดหมู่"
                                      disabled={isReadOnly || updatingProduct === product.productName}
                                    />
                                    <datalist id={`category-list-top-${product.productName}`}>
                                      {allCategories.map((cat, idx) => (
                                        <option key={idx} value={cat} />
                                      ))}
                                    </datalist>
                                  </div>
                                  {updatingProduct === product.productName && (
                                    <div className="flex-shrink-0 p-1.5">
                                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                    </div>
                                  )}
                                  {updatingProduct !== product.productName && (
                                    <>
                                      <HintTooltip tip="บันทึกหมวดหมู่">
                                        <button
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleUpdateCategory(product.productName);
                                          }}
                                          disabled={isReadOnly || updatingProduct === product.productName}
                                          aria-label={`Save category for ${product.productName}`}
                                          className="flex-shrink-0 p-1.5 text-foreground hover:bg-muted rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          <Check className="w-4 h-4" />
                                        </button>
                                      </HintTooltip>
                                      <HintTooltip tip="ยกเลิก">
                                        <button
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setEditingProduct(null);
                                            setTempCategoryValues(prev => {
                                              const newMap = new Map(prev);
                                              newMap.delete(product.productName);
                                              return newMap;
                                            });
                                          }}
                                          disabled={isReadOnly || updatingProduct === product.productName}
                                          aria-label={`Cancel editing category for ${product.productName}`}
                                          className="flex-shrink-0 p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          <ChevronUp className="w-4 h-4" />
                                        </button>
                                      </HintTooltip>
                                    </>
                                  )}
                                </motion.div>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    isEnteringEditModeRef.current = true;
                                    setEditingProduct(product.productName);
                                    setTempCategoryValues(prev => {
                                      const newMap = new Map(prev);
                                      newMap.set(product.productName, productWithCategory.category ?? '');
                                      return newMap;
                                    });
                                    // Reset the ref after a short delay
                                    setTimeout(() => {
                                      isEnteringEditModeRef.current = false;
                                    }, 100);
                                  }}
                                  aria-label={`Click to edit category for ${product.productName}`}
                                  className="group inline-flex items-center px-2.5 py-1 rounded-full text-[10px] transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-black/10 focus:ring-offset-1"
                                >
                                  <span className={`${productWithCategory.category ? 'bg-muted text-foreground' : 'bg-muted/50 text-muted-foreground'} px-2 py-0.5 rounded-full group-hover:bg-muted/80`}>
                                    {productWithCategory.category || 'ยังไม่ระบุ'}
                                  </span>
                                  <Edit3 className="w-3 h-3 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground group-hover:text-foreground" />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-sm text-right">{formatNumber(product.totalQuantity)}</td>
                          <td className="py-2.5 px-3 text-sm text-right">฿{formatCurrency(product.totalRevenue)}</td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* All Products Table */}
            {metrics.allProducts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className={`rounded-2xl shadow-lg p-5 ${SALES_SECTION_COLORS.table}`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-lg">รายการสินค้าทั้งหมด</h3>
                    <p className="text-xs text-muted-foreground mt-1">ทุกเมนูที่มียอดขาย</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Category Filter */}
                    <div className="relative">
                      <select
                        id="category-filter"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        aria-label="Filter by product category"
                        className="appearance-none w-full sm:w-auto px-3 pr-8 py-2 rounded-lg border border-black/10 bg-white text-xs transition-all focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black/30 hover:border-black/20 shadow-sm"
                      >
                        <option value="all">ทุกหมวดหมู่</option>
                        {categories.map((cat, idx) => (
                          <option key={idx} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                    {/* Sort Buttons */}
                    <button
                      onClick={() => {
                        if (sortBy === 'quantity') {
                          setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                        } else {
                          setSortBy('quantity');
                          setSortOrder('desc');
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-all ${
                        sortBy === 'quantity'
                          ? 'bg-[#fff3cd] text-black border-[#ffeeba]'
                          : 'bg-white/80 border-black/10 hover:bg-[#fff3cd]/50'
                      }`}
                    >
                      <span className="text-[11px]">จำนวนที่ขาย</span>
                      {sortBy === 'quantity' && (
                        sortOrder === 'desc' ? <ArrowDown className="w-3.5 h-3.5" /> : <ArrowUp className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        if (sortBy === 'revenue') {
                          setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                        } else {
                          setSortBy('revenue');
                          setSortOrder('desc');
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-all ${
                        sortBy === 'revenue'
                          ? 'bg-[#d4edda] text-black border-[#c3e6cb]'
                          : 'bg-white/80 border-black/10 hover:bg-[#d4edda]/50'
                      }`}
                    >
                      <span className="text-[11px]">ยอดขายรวม</span>
                      {sortBy === 'revenue' && (
                        sortOrder === 'desc' ? <ArrowDown className="w-3.5 h-3.5" /> : <ArrowUp className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto bb-smooth-scroll">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-black/10">
                        <th className="text-left py-2.5 px-3 text-xs text-muted-foreground uppercase tracking-wider">สินค้า</th>
                        <th className="text-left py-2.5 px-3 text-xs text-muted-foreground uppercase tracking-wider">หมวดหมู่</th>
                        <th className="text-right py-2.5 px-3 text-xs text-muted-foreground uppercase tracking-wider">จำนวนที่ขาย</th>
                        <th className="text-right py-2.5 px-3 text-xs text-muted-foreground uppercase tracking-wider">ยอดขาย</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedAllProducts.map((product) => (
                        <tr key={product.productName} className="border-b border-black/5 last:border-0 hover:bg-black/[0.02] transition-colors">
                          <td className="py-2.5 px-3 text-sm">{product.productName}</td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center">
                              {editingProduct === product.productName ? (
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  className="flex items-center gap-1.5 w-full sm:w-auto"
                                >
                                  <div className="relative flex-1">
                                    <input
                                      id={`category-input-${product.productName}`}
                                      type="text"
                                      value={tempCategoryValues.get(product.productName) ?? ''}
                                      onChange={(e) => {
                                        setTempCategoryValues(prev => {
                                          const newMap = new Map(prev);
                                          newMap.set(product.productName, e.target.value);
                                          return newMap;
                                        });
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleUpdateCategory(product.productName);
                                        } else if (e.key === 'Escape') {
                                          setEditingProduct(null);
                                          setTempCategoryValues(prev => {
                                            const newMap = new Map(prev);
                                            newMap.delete(product.productName);
                                            return newMap;
                                          });
                                        }
                                      }}
                                      onBlur={() => {
                                        if (!isEnteringEditModeRef.current) {
                                          handleUpdateCategory(product.productName);
                                        }
                                      }}
                                      autoFocus
                                      list={`category-list-${product.productName}`}
                                      aria-label={`Edit category for ${product.productName}`}
                                      className="w-full px-3 py-2 rounded-lg border border-black/10 bg-white text-xs transition-all focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black/30 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                      placeholder="ป้อนชื่อหมวดหมู่"
                                      disabled={isReadOnly || updatingProduct === product.productName}
                                    />
                                    <datalist id={`category-list-${product.productName}`}>
                                      {allCategories.map((cat, idx) => (
                                        <option key={idx} value={cat} />
                                      ))}
                                    </datalist>
                                  </div>
                                  {updatingProduct === product.productName && (
                                    <div className="flex-shrink-0 p-1.5">
                                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                    </div>
                                  )}
                                  {updatingProduct !== product.productName && (
                                    <>
                                      <HintTooltip tip="บันทึกหมวดหมู่">
                                        <button
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleUpdateCategory(product.productName);
                                          }}
                                          disabled={isReadOnly || updatingProduct === product.productName}
                                          aria-label={`Save category for ${product.productName}`}
                                          className="flex-shrink-0 p-1.5 text-foreground hover:bg-muted rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          <Check className="w-4 h-4" />
                                        </button>
                                      </HintTooltip>
                                      <HintTooltip tip="ยกเลิก">
                                        <button
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setEditingProduct(null);
                                            setTempCategoryValues(prev => {
                                              const newMap = new Map(prev);
                                              newMap.delete(product.productName);
                                              return newMap;
                                            });
                                          }}
                                          disabled={isReadOnly || updatingProduct === product.productName}
                                          aria-label={`Cancel editing category for ${product.productName}`}
                                          className="flex-shrink-0 p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          <ChevronUp className="w-4 h-4" />
                                        </button>
                                      </HintTooltip>
                                    </>
                                  )}
                                </motion.div>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    isEnteringEditModeRef.current = true;
                                    setEditingProduct(product.productName);
                                    setTempCategoryValues(prev => {
                                      const newMap = new Map(prev);
                                      newMap.set(product.productName, product.category ?? '');
                                      return newMap;
                                    });
                                    // Reset the ref after a short delay
                                    setTimeout(() => {
                                      isEnteringEditModeRef.current = false;
                                    }, 100);
                                  }}
                                  aria-label={`Click to edit category for ${product.productName}`}
                                  className="group inline-flex items-center px-2.5 py-1 rounded-full text-[10px] transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-black/10 focus:ring-offset-1"
                                >
                                  <span className={`${product.category ? 'bg-muted text-foreground' : 'bg-muted/50 text-muted-foreground'} px-2 py-0.5 rounded-full group-hover:bg-muted/80`}>
                                    {product.category || 'ยังไม่ระบุ'}
                                  </span>
                                  <Edit3 className="w-3 h-3 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground group-hover:text-foreground" />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-sm text-right">{formatNumber(product.totalQuantity)}</td>
                          <td className="py-2.5 px-3 text-sm text-right">฿{formatCurrency(product.totalRevenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`rounded-3xl shadow-sm p-16 text-center ${SALES_SECTION_COLORS.empty}`}
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/60 border border-[#ffeeba] flex items-center justify-center">
              <BarChart3 className="w-10 h-10 text-muted-foreground/70" />
            </div>
            <h3 className="text-xl font-normal mb-2">ยังไม่มีข้อมูลยอดขาย</h3>
            <p className="text-muted-foreground mb-6">อัปโหลดไฟล์ Excel ด้านบนเพื่อเริ่มต้นใช้งานระบบ</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
