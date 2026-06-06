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
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'next/navigation';
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

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
      <div className="bg-white p-4 rounded-2xl shadow-xl border border-black/5">
        <p className="text-sm font-medium text-black/80 mb-2">{label}</p>
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

export default function SalesPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'th';
  const isReadOnly = useReadOnly();

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
  const [metrics, setMetrics] = useState<SalesMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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

  // Sort and filter products
  const sortedAllProducts = useMemo(() => {
    if (!metrics?.allProducts) return [];
    
    let products = metrics.allProducts.map(p => ({
      ...p,
      category: productCategories.get(p.productName) || ''
    }));
    
    // Filter by category
    if (selectedCategory !== 'all') {
      products = products.filter(p => p.category === selectedCategory);
    }
    
    // Sort
    products.sort((a, b) => {
      const aVal = sortBy === 'quantity' ? a.totalQuantity : a.totalRevenue;
      const bVal = sortBy === 'quantity' ? b.totalQuantity : b.totalRevenue;
      
      if (sortOrder === 'desc') {
        return bVal - aVal;
      } else {
        return aVal - bVal;
      }
    });
    
    return products;
  }, [metrics?.allProducts, sortBy, sortOrder, selectedCategory, productCategories]);

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

  // Load data
  const loadData = useRef(async () => {
    setIsLoading(true);
    try {
      const [historyData, metricsData, categoriesData] = await Promise.all([
        fetchSalesHistory(),
        getSalesMetrics(),
        getAllProductCategories()
      ]);
      
      if (historyData) setHistory(historyData);
      setMetrics(metricsData);
      
      // Load product categories
      if (categoriesData.success) {
        loadCategories.current(categoriesData.categories);
      }
      
      // Save data to localStorage for insights page
      if (metricsData) {
        localStorage.setItem('salesMetrics', JSON.stringify(metricsData));
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

  // Ref to track previous product categories to prevent infinite loops
  const previousProductCategories = useRef<string>('');

  // Effect to update metrics with client-side categories
  useEffect(() => {
    if (metrics) {
      // Create a string representation to compare if productCategories actually changed
      const currentCategoriesString = JSON.stringify(Array.from(productCategories.entries()));
      
      if (previousProductCategories.current !== currentCategoriesString) {
        previousProductCategories.current = currentCategoriesString;
        
        const updatedMetrics = { ...metrics };
        
        // Update allProducts - use empty string if no category
        updatedMetrics.allProducts = metrics.allProducts.map((p: any) => ({
          ...p,
          category: productCategories.get(p.productName) || ''
        }));
        
        // Update topProducts
        updatedMetrics.topProducts = metrics.topProducts.map((p: any) => ({
          ...p,
          category: productCategories.get(p.productName) || ''
        }));
        
        // Update categoryMetrics - only include non-empty categories
        const newCategoryData = new Map<string, { revenue: number, quantity: number, transactionCount: number }>();
        updatedMetrics.allProducts.forEach((p: any) => {
          if (p.category) {
            const existing = newCategoryData.get(p.category) || { revenue: 0, quantity: 0, transactionCount: 0 };
            newCategoryData.set(p.category, {
              revenue: existing.revenue + p.totalRevenue,
              quantity: existing.quantity + p.totalQuantity,
              transactionCount: existing.transactionCount + 1
            });
          }
        });
        
        const totalRevenue = updatedMetrics.allProducts.reduce((sum, p) => sum + p.totalRevenue, 0);
        updatedMetrics.categoryMetrics = Array.from(newCategoryData.entries()).map(([cat, data]) => ({
          category: cat,
          totalRevenue: data.revenue,
          totalQuantity: data.quantity,
          transactionCount: data.transactionCount,
          revenuePercentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0
        })).sort((a, b) => b.totalRevenue - a.totalRevenue);
        
        setMetrics(updatedMetrics);
      }
    }
  }, [productCategories, metrics]);

  useEffect(() => {
    loadData.current();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData.current();
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
      <div className="min-h-screen bg-[#fdfcf0] flex items-center justify-center font-normal">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-black/30 mx-auto mb-4" />
          <p className="text-black/40">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfcf0] text-black font-normal">
      <div className="max-w-7xl mx-auto px-3 md:px-6 py-6">
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3.5 bg-white border border-black/5 text-black rounded-2xl shrink-0 shadow-sm">
                  <TrendingUp className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <div>
                  <h1 className="text-2xl tracking-tight">Sales Dashboard</h1>
                  <p className="text-black/40 text-xs mt-1">จัดการและวิเคราะห์ข้อมูลยอดขายอย่างมีประสิทธิภาพ</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <button
                  onClick={() => setShowManageCategories(true)}
                  disabled={isReadOnly}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-black/5 rounded-xl hover:bg-black/5 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Edit3 className="w-4 h-4" />
                  <span className="text-sm">จัดการหมวดหมู่</span>
                </button>
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-black/5 rounded-xl hover:bg-black/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
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
                  className="mt-4 p-4 bg-white border border-black/5 rounded-xl"
                >
                  {successMessage}
                </motion.div>
              )}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4 p-4 bg-white border border-black/5 rounded-xl"
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
                    className="relative bg-white rounded-3xl border border-black/5 shadow-xl max-w-lg w-full p-6"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-xl">จัดการหมวดหมู่</h2>
                        <p className="text-sm text-black/50 mt-1">
                          เพิ่ม, แก้ไข, หรือลบหมวดหมู่สินค้า
                        </p>
                      </div>
                      <button
                        onClick={() => setShowManageCategories(false)}
                        className="p-2 hover:bg-black/5 rounded-xl transition-all"
                        aria-label="ปิด"
                      >
                        <ChevronUp className="w-5 h-5 transform rotate-45" />
                      </button>
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {allCategories.length === 0 ? (
                        <div className="text-center py-8 text-black/40">
                          ยังไม่มีหมวดหมู่ที่บันทึกไว้
                        </div>
                      ) : (
                        allCategories.map((category) => (
                          <div
                            key={category}
                            className="flex items-center justify-between p-4 bg-black/[0.02] rounded-2xl border border-black/5"
                          >
                            <span className="text-sm">{category}</span>
                            <button
                              onClick={() => handleDeleteCategory(category)}
                              className="p-2 text-black/40 hover:text-black hover:bg-black/5 rounded-xl transition-all"
                              aria-label={`ลบหมวดหมู่ ${category}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={() => setShowManageCategories(false)}
                        className="px-5 py-2.5 bg-black/5 border border-black/10 rounded-xl hover:bg-black/10 transition-all text-sm"
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
                    className="relative bg-white rounded-3xl border border-black/5 shadow-xl max-w-md w-full p-6"
                  >
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-black/5 flex items-center justify-center">
                        <Trash2 className="w-8 h-8 text-black" />
                      </div>
                      <h3 className="text-xl mb-2">
                        ลบหมวดหมู่ "{categoryToDelete}"
                      </h3>
                      <p className="text-black/60 text-sm">
                        การลบหมวดหมู่นี้จะนำออกจากสินค้าทุกรายการที่ใช้หมวดหมู่นี้
                        คุณแน่ใจหรือไม่ว่าต้องการดำเนินการต่อ?
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setCategoryToDelete(null)}
                        disabled={isReadOnly || isDeletingCategory}
                        className="flex-1 px-5 py-3 bg-black/5 border border-black/10 rounded-xl hover:bg-black/10 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* Upload Section */}
        <div className="mb-6">
          <div className={`bg-white rounded-2xl border border-black/5 shadow-md p-5 ${isReadOnly ? 'pointer-events-none opacity-60' : ''}`}>
            <form onSubmit={handleFileUpload} className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
              <div className="flex-1 w-full">
                <div className="flex items-center gap-4">
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
                    className="cursor-pointer inline-flex items-center gap-3 px-5 py-3.5 border-2 border-dashed border-black/10 rounded-xl hover:border-black/20 hover:bg-black/5 transition-all"
                  >
                    <Upload className="w-5 h-5 text-black" strokeWidth={1.5} />
                    <span className="text-sm">เลือกไฟล์</span>
                  </label>
                  {selectedFiles.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-black/60">{selectedFiles.length} ไฟล์ที่เลือก</span>
                      <button
                        type="button"
                        onClick={() => setSelectedFiles([])}
                        className="text-[11px] text-black/40 hover:text-black"
                      >
                        (ล้าง)
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <button
                type="submit"
                disabled={isReadOnly || isUploading || selectedFiles.length === 0}
                className="w-full lg:w-auto bg-black text-white px-6 py-3.5 rounded-xl hover:bg-black/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm flex items-center justify-center gap-2 shadow-sm"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    กำลังอัปโหลด...
                  </>
                ) : (
                  'อัปโหลด'
                )}
              </button>
            </form>

            <AnimatePresence>
              {uploadSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 bg-black/5 border border-black/10 rounded-xl"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center">
                      <span className="text-black text-[10px]">✓</span>
                    </div>
                    <span className="text-sm">อัปโหลดสำเร็จ!</span>
                  </div>
                  {uploadSuccess.map((file, index) => (
                    <div key={index} className="text-xs text-black/60">
                      {file.fileName}: {file.recordCount} รายการ
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

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
                className="bg-white border border-black/5 rounded-2xl shadow-md p-4 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-11 h-11 rounded-xl bg-black/5 flex items-center justify-center">
                    <TrendingUp className="w-5.5 h-5.5 text-black" />
                  </div>
                  <p className="text-xs text-black/60">ยอดขายรวม</p>
                </div>
                <p className="text-2xl tracking-tight">฿{formatCurrency(metrics.overview.totalRevenue)}</p>
              </motion.div>

              {/* Total Quantity (Bills) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white border border-black/5 rounded-2xl shadow-md p-4 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-11 h-11 rounded-xl bg-black/5 flex items-center justify-center">
                    <ShoppingCart className="w-5.5 h-5.5 text-black" />
                  </div>
                  <p className="text-xs text-black/60">จำนวนที่ขาย</p>
                </div>
                <p className="text-2xl tracking-tight">{formatNumber(metrics.overview.totalQuantity)}</p>
              </motion.div>

              {/* Total Transactions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white border border-black/5 rounded-2xl shadow-md p-4 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-11 h-11 rounded-xl bg-black/5 flex items-center justify-center">
                    <FileSpreadsheet className="w-5.5 h-5.5 text-black" />
                  </div>
                  <p className="text-xs text-black/60">รายการเมนู</p>
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
                className="bg-white rounded-2xl border border-black/5 shadow-lg p-5"
              >
                <div className="mb-4">
                  <h3 className="text-lg">ยอดขายแยกตามหมวดหมู่</h3>
                  <p className="text-xs text-black/40 mt-1">ดูยอดขายของแต่ละหมวดหมู่สินค้าแบบง่าย</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {metrics.categoryMetrics.map((category, index) => (
                    <div key={index} className="p-4 rounded-xl border border-black/5 hover:border-black/10 hover:shadow-md transition-all duration-300 bg-black/[0.02]">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm">{category.category}</span>
                        <span className="text-[10px] text-black bg-black/10 px-1.5 py-0.5 rounded-full">{category.revenuePercentage.toFixed(1)}%</span>
                      </div>
                      <div className="text-2xl mb-1.5">฿{formatCurrency(category.totalRevenue)}</div>
                      <div className="text-xs text-black/60">{formatNumber(category.totalQuantity)} ชิ้น • {formatNumber(category.transactionCount)} รายการ</div>
                      <div className="mt-2.5 h-2 bg-black/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-black/20 rounded-full transition-all duration-700"
                          style={{ width: `${Math.min(category.revenuePercentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Top 10 Products Bar Chart */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-2xl border border-black/5 shadow-lg p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg">สินค้ายอดนิยม (Top 10)</h3>
                    <p className="text-xs text-black/40 mt-1">เมนูที่มียอดขายสูงสุด</p>
                  </div>
                  <BarChart3 className="w-5 h-5 text-black" />
                </div>
                <div className="h-64 w-full">
                  {isMounted && (
                    <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={240}>
                      <BarChart data={metrics.topProducts}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="productName" 
                          axisLine={false} 
                          tickLine={false}
                          tick={{ fontSize: 11, fill: 'black' }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false}
                          tick={{ fontSize: 11, fill: 'black' }}
                          tickFormatter={(value) => `฿${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f5f5f5' }} />
                        <Bar dataKey="totalRevenue" name="ยอดขาย" fill="black" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </motion.div>

            {/* Top 10 Products Table */}
            {metrics.topProducts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-2xl border border-black/5 shadow-lg p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg">สินค้ายอดนิยม (Top 10)</h3>
                    <p className="text-xs text-black/40 mt-1">รายละเอียดของ 10 เมนูยอดนิยม</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-black/10">
                        <th className="text-left py-2.5 px-3 text-xs text-black/60 uppercase tracking-wider">อันดับ</th>
                        <th className="text-left py-2.5 px-3 text-xs text-black/60 uppercase tracking-wider">สินค้า</th>
                        <th className="text-left py-2.5 px-3 text-xs text-black/60 uppercase tracking-wider">หมวดหมู่</th>
                        <th className="text-right py-2.5 px-3 text-xs text-black/60 uppercase tracking-wider">จำนวนที่ขาย</th>
                        <th className="text-right py-2.5 px-3 text-xs text-black/60 uppercase tracking-wider">ยอดขาย</th>
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
                                      <Loader2 className="w-4 h-4 animate-spin text-black/40" />
                                    </div>
                                  )}
                                  {updatingProduct !== product.productName && (
                                    <>
                                      <button
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          handleUpdateCategory(product.productName);
                                        }}
                                        disabled={isReadOnly || updatingProduct === product.productName}
                                        aria-label={`Save category for ${product.productName}`}
                                        className="flex-shrink-0 p-1.5 text-black hover:bg-black/5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        <Check className="w-4 h-4" />
                                      </button>
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
                                        className="flex-shrink-0 p-1.5 text-black/40 hover:text-black hover:bg-black/5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        <ChevronUp className="w-4 h-4" />
                                      </button>
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
                                  <span className={`${productWithCategory.category ? 'bg-black/[0.05] text-black' : 'bg-black/[0.02] text-black/40'} px-2 py-0.5 rounded-full group-hover:bg-black/10`}>
                                    {productWithCategory.category || 'ยังไม่ระบุ'}
                                  </span>
                                  <Edit3 className="w-3 h-3 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-black/40 group-hover:text-black" />
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
                className="bg-white rounded-2xl border border-black/5 shadow-lg p-5"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-lg">รายการสินค้าทั้งหมด</h3>
                    <p className="text-xs text-black/40 mt-1">ทุกเมนูที่มียอดขาย</p>
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
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40 pointer-events-none" />
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
                          ? 'bg-black text-white border-black'
                          : 'bg-white border-black/10 hover:bg-black/5'
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
                          ? 'bg-black text-white border-black'
                          : 'bg-white border-black/10 hover:bg-black/5'
                      }`}
                    >
                      <span className="text-[11px]">ยอดขายรวม</span>
                      {sortBy === 'revenue' && (
                        sortOrder === 'desc' ? <ArrowDown className="w-3.5 h-3.5" /> : <ArrowUp className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-black/10">
                        <th className="text-left py-2.5 px-3 text-xs text-black/60 uppercase tracking-wider">สินค้า</th>
                        <th className="text-left py-2.5 px-3 text-xs text-black/60 uppercase tracking-wider">หมวดหมู่</th>
                        <th className="text-right py-2.5 px-3 text-xs text-black/60 uppercase tracking-wider">จำนวนที่ขาย</th>
                        <th className="text-right py-2.5 px-3 text-xs text-black/60 uppercase tracking-wider">ยอดขาย</th>
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
                                      <Loader2 className="w-4 h-4 animate-spin text-black/40" />
                                    </div>
                                  )}
                                  {updatingProduct !== product.productName && (
                                    <>
                                      <button
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          handleUpdateCategory(product.productName);
                                        }}
                                        disabled={isReadOnly || updatingProduct === product.productName}
                                        aria-label={`Save category for ${product.productName}`}
                                        className="flex-shrink-0 p-1.5 text-black hover:bg-black/5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        <Check className="w-4 h-4" />
                                      </button>
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
                                        className="flex-shrink-0 p-1.5 text-black/40 hover:text-black hover:bg-black/5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        <ChevronUp className="w-4 h-4" />
                                      </button>
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
                                  <span className={`${product.category ? 'bg-black/[0.05] text-black' : 'bg-black/[0.02] text-black/40'} px-2 py-0.5 rounded-full group-hover:bg-black/10`}>
                                    {product.category || 'ยังไม่ระบุ'}
                                  </span>
                                  <Edit3 className="w-3 h-3 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-black/40 group-hover:text-black" />
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

            {/* Upload History - Collapsible */}
            {history && history.uploads && history.uploads.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
                  className="w-full flex items-center justify-between p-6 hover:bg-black/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-black/30" />
                    <h3 className="text-lg font-normal">ประวัติการอัปโหลด</h3>
                  </div>
                  {isHistoryCollapsed ? (
                    <ChevronDown className="w-5 h-5 text-black/30" />
                  ) : (
                    <ChevronUp className="w-5 h-5 text-black/30" />
                  )}
                </button>
                
                <AnimatePresence>
                  {!isHistoryCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="px-6 pb-6 space-y-3">
                        {history.uploads.map((upload: any) => (
                          <div key={upload.id} className="flex items-center justify-between p-4 border border-black/5 rounded-2xl hover:bg-black/[0.02] transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-black/[0.05] flex items-center justify-center shrink-0">
                                <FileSpreadsheet className="w-5 h-5 text-black/60" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{upload.file_name}</p>
                                <p className="text-xs text-black/40">{upload.total_records} รายการ • {new Date(upload.upload_date).toLocaleDateString('th-TH')}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteUpload(upload.id)}
                              disabled={isReadOnly || isDeleting === upload.id}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
                            >
                              {isDeleting === upload.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-3xl border border-black/5 shadow-sm p-16 text-center"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-black/[0.05] flex items-center justify-center">
              <BarChart3 className="w-10 h-10 text-black/30" />
            </div>
            <h3 className="text-xl font-normal text-black mb-2">ยังไม่มีข้อมูลยอดขาย</h3>
            <p className="text-black/50 mb-6">อัปโหลดไฟล์ Excel เพื่อเริ่มต้นใช้งานระบบ</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
