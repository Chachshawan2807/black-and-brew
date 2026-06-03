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
  ArrowUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'next/navigation';
import {
  uploadSalesFiles,
  fetchSalesHistory,
  getSalesMetrics,
  deleteSalesUpload,
  type SalesMetrics
} from '@/app/actions/sales-actions';
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

  // Wait for component to mount before rendering charts
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sort products
  const sortedAllProducts = useMemo(() => {
    if (!metrics?.allProducts) return [];
    
    const products = [...metrics.allProducts];
    
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
  }, [metrics?.allProducts, sortBy, sortOrder]);

  // Load data
  const loadData = useRef(async () => {
    setIsLoading(true);
    try {
      const [historyData, metricsData] = await Promise.all([
        fetchSalesHistory(),
        getSalesMetrics()
      ]);
      
      if (historyData) setHistory(historyData);
      setMetrics(metricsData);
      
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
      <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-black/30 mx-auto mb-4" />
          <p className="text-black/40">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-black font-sans">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-black text-white rounded-2xl shrink-0">
                  <TrendingUp className="w-7 h-7" strokeWidth={1.5} />
                </div>
                <div>
                  <h1 className="text-3xl font-normal tracking-tight">Sales Dashboard</h1>
                  <p className="text-black/50 text-sm mt-1">จัดการและวิเคราะห์ข้อมูลยอดขาย</p>
                </div>
              </div>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-black/10 rounded-xl hover:bg-black/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="text-sm font-medium">รีเฟรช</span>
              </button>
            </div>
        </div>

        {/* Upload Section */}
        <div className="mb-8">
          <div className="bg-white rounded-3xl border border-black/5 shadow-sm p-6">
            <form onSubmit={handleFileUpload} className="flex flex-col lg:flex-row gap-6 items-start lg:items-center">
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
                    className="cursor-pointer inline-flex items-center gap-3 px-6 py-4 border-2 border-dashed border-black/10 rounded-2xl hover:border-black/30 hover:bg-black/[0.02] transition-all"
                  >
                    <Upload className="w-5 h-5 text-black/60" strokeWidth={1.5} />
                    <span className="text-base font-medium">เลือกไฟล์</span>
                  </label>
                  {selectedFiles.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-black/70">{selectedFiles.length} ไฟล์ที่เลือก</span>
                      <button
                        type="button"
                        onClick={() => setSelectedFiles([])}
                        className="text-xs text-black/40 hover:text-black/60"
                      >
                        (ล้าง)
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <button
                type="submit"
                disabled={isUploading || selectedFiles.length === 0}
                className="w-full lg:w-auto bg-black text-white px-8 py-4 rounded-2xl hover:bg-black/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-base font-medium flex items-center justify-center gap-3"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
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
                  className="mt-6 p-4 bg-green-50 border border-green-200 rounded-2xl"
                >
                  <div className="flex items-center gap-2 text-green-700 mb-2">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-green-700 font-bold text-xs">✓</span>
                    </div>
                    <span className="font-medium">อัปโหลดสำเร็จ!</span>
                  </div>
                  {uploadSuccess.map((file, index) => (
                    <div key={index} className="text-sm text-green-600 mt-1">
                      {file.fileName}: {file.recordCount} รายการ
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 bg-red-50 border border-red-200 p-4 rounded-2xl text-red-600"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Dashboard Content */}
        {metrics ? (
          <div className="space-y-8">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Total Revenue */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0 }}
                className="bg-white rounded-3xl border border-black/5 shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-black/[0.05] flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-black/70" />
                    </div>
                    <p className="text-sm text-black/50 font-medium">ยอดขายรวม</p>
                  </div>
                </div>
                <p className="text-3xl font-normal tracking-tight">฿{formatCurrency(metrics.overview.totalRevenue)}</p>
              </motion.div>

              {/* Total Quantity (Bills) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-3xl border border-black/5 shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-black/[0.05] flex items-center justify-center">
                      <ShoppingCart className="w-5 h-5 text-black/70" />
                    </div>
                    <p className="text-sm text-black/50 font-medium">จำนวนที่ขาย (Bills)</p>
                  </div>
                </div>
                <p className="text-3xl font-normal tracking-tight">{formatNumber(metrics.overview.totalQuantity)}</p>
              </motion.div>

              {/* Total Transactions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-3xl border border-black/5 shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-black/[0.05] flex items-center justify-center">
                      <FileSpreadsheet className="w-5 h-5 text-black/70" />
                    </div>
                    <p className="text-sm text-black/50 font-medium">จำนวนรายการเมนู</p>
                  </div>
                </div>
                <p className="text-3xl font-normal tracking-tight">{formatNumber(metrics.overview.totalTransactions)}</p>
              </motion.div>
            </div>

            {/* Top 10 Products Bar Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-3xl border border-black/5 shadow-sm p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-normal">สินค้ายอดนิยม (Top 10)</h3>
                  <p className="text-sm text-black/50 mt-1">เมนูที่มียอดขายสูงสุด</p>
                </div>
                <BarChart3 className="w-5 h-5 text-black/30" />
              </div>
              <div className="h-80 min-h-[320px] w-full">
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={320}>
                    <BarChart data={metrics.topProducts}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="productName" 
                        axisLine={false} 
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        angle={-45}
                        textAnchor="end"
                        height={100}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        tickFormatter={(value) => `฿${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="totalRevenue" name="ยอดขาย" fill="#000000" radius={[6, 6, 0, 0]} />
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
                transition={{ delay: 0.4 }}
                className="bg-white rounded-3xl border border-black/5 shadow-sm p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-normal">สินค้ายอดนิยม (Top 10)</h3>
                    <p className="text-sm text-black/50 mt-1">รายละเอียดของ 10 เมนูยอดนิยม</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-black/5">
                        <th className="text-left py-4 px-4 text-sm text-black/50 font-normal">อันดับ</th>
                        <th className="text-left py-4 px-4 text-sm text-black/50 font-normal">สินค้า</th>
                        <th className="text-right py-4 px-4 text-sm text-black/50 font-normal">จำนวนที่ขาย</th>
                        <th className="text-right py-4 px-4 text-sm text-black/50 font-normal">ยอดขาย</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.topProducts.map((product, index) => (
                        <tr key={index} className="border-b border-black/5 last:border-0 hover:bg-black/[0.02] transition-colors">
                          <td className="py-4 px-4">
                            <span className={`text-sm font-medium ${
                              index === 0 ? 'text-yellow-600' : 
                              index === 1 ? 'text-gray-500' : 
                              index === 2 ? 'text-amber-700' : 'text-black/40'
                            }`}>
                              #{index + 1}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-sm font-medium">{product.productName}</td>
                          <td className="py-4 px-4 text-sm text-right font-medium">{formatNumber(product.totalQuantity)}</td>
                          <td className="py-4 px-4 text-sm text-right font-medium">฿{formatCurrency(product.totalRevenue)}</td>
                        </tr>
                      ))}
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
                transition={{ delay: 0.5 }}
                className="bg-white rounded-3xl border border-black/5 shadow-sm p-6"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-normal">รายการสินค้าทั้งหมด</h3>
                    <p className="text-sm text-black/50 mt-1">ทุกเมนูที่มียอดขาย</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        if (sortBy === 'quantity') {
                          setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                        } else {
                          setSortBy('quantity');
                          setSortOrder('desc');
                        }
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                        sortBy === 'quantity'
                          ? 'bg-black text-white border-black'
                          : 'bg-white border-black/10 hover:bg-black/5'
                      }`}
                    >
                      <span className="text-sm font-medium">จำนวนที่ขาย</span>
                      {sortBy === 'quantity' && (
                        sortOrder === 'desc' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />
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
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                        sortBy === 'revenue'
                          ? 'bg-black text-white border-black'
                          : 'bg-white border-black/10 hover:bg-black/5'
                      }`}
                    >
                      <span className="text-sm font-medium">ยอดขายรวม</span>
                      {sortBy === 'revenue' && (
                        sortOrder === 'desc' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-black/5">
                        <th className="text-left py-4 px-4 text-sm text-black/50 font-normal">สินค้า</th>
                        <th className="text-right py-4 px-4 text-sm text-black/50 font-normal">จำนวนที่ขาย</th>
                        <th className="text-right py-4 px-4 text-sm text-black/50 font-normal">ยอดขาย</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedAllProducts.map((product, index) => (
                        <tr key={index} className="border-b border-black/5 last:border-0 hover:bg-black/[0.02] transition-colors">
                          <td className="py-4 px-4 text-sm font-medium">{product.productName}</td>
                          <td className="py-4 px-4 text-sm text-right font-medium">{formatNumber(product.totalQuantity)}</td>
                          <td className="py-4 px-4 text-sm text-right font-medium">฿{formatCurrency(product.totalRevenue)}</td>
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
                              disabled={isDeleting === upload.id}
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
