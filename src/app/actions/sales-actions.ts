'use server';

import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { assertWritableSession } from '@/app/actions/auth';
import { recordDataChange } from '@/app/actions/data-change-log-actions';
import { computeFieldChanges } from '@/lib/data-change-log';
import { ensureServerSession } from '@/lib/security/server-auth';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 24;
const SALES_UPLOAD_COLUMNS = 'id, file_name, total_records, status, upload_date, created_at, analysis_summary';
const SALES_RECORD_COLUMNS = 'id, product_name, quantity, total_amount, unit_price, sale_date, category, payment_method, upload_id, notes, created_at';
const PRODUCT_CATEGORY_COLUMNS = 'id, product_name, category, is_ai_generated, created_at, updated_at';
const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel'
];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const getSupabaseAdmin = () => {
  const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseAdminKey) return null;
  return createClient(supabaseUrl, supabaseAdminKey);
};

async function checkAuth(): Promise<{ success: false; error: string } | { success: true }> {
  const auth = await ensureServerSession();
  if (!auth.ok) return { success: false, error: auth.error };
  return { success: true };
}

// Zod schema for sales record validation
const SalesRecordSchema = z.object({
  sale_date: z.coerce.date().optional().default(new Date()), // Make date optional, default to now
  product_name: z.string().min(1, 'Product name is required'),
  category: z.string().optional().default('Uncategorized'),
  quantity: z.coerce.number().min(0, 'Quantity must be non-negative'),
  unit_price: z.coerce.number().min(0, 'Unit price must be non-negative').optional().default(0),
  total_amount: z.coerce.number().min(0, 'Total amount must be non-negative'),
  payment_method: z.string().optional().default('Other'),
  notes: z.string().optional().default(''),
});

// Helper to normalize Excel column names
function normalizeColumnName(col: string): string {
  return col
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

/**
 * Extract a date from a filename that encodes a date range.
 * Handles patterns like: _20260101–20260131, _20260101-20260131, _202601
 * Returns the first day of the encoded period, or undefined if not found.
 */
function extractDateFromFilename(fileName: string): Date | undefined {
  const match = fileName.match(/(\d{4})(\d{2})(\d{2})/);
  if (!match) return undefined;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1; // JS month is 0-indexed
  const day = parseInt(match[3], 10);
  if (year < 2000 || year > 2100 || month < 0 || month > 11) return undefined;
  const date = new Date(year, month, day);
  return isNaN(date.getTime()) ? undefined : date;
}

// Data processing function
interface DataProcessingResult {
  validRecords: any[];
  auditLog: {
    totalRecords: number;
    duplicatesRemoved: number;
    missingDataFilled: number;
    invalidRecords: number;
    details: string[];
  };
}

/**
 * Process raw Excel rows into valid sales records.
 * @param rawRecords Rows parsed from XLSX
 * @param filenameDate Fallback date extracted from the filename (used when rows have no date column)
 */
function processSalesData(rawRecords: any[], filenameDate?: Date): DataProcessingResult {
  const auditLog = {
    totalRecords: rawRecords.length,
    duplicatesRemoved: 0,
    missingDataFilled: 0,
    invalidRecords: 0,
    details: [] as string[],
  };

  const seenRecords = new Set<string>();
  const validRecords: any[] = [];

  rawRecords.forEach((record, index) => {
    // Normalize record
    const normalized: any = {};
    Object.keys(record).forEach(key => {
      normalized[normalizeColumnName(key)] = record[key];
    });

    // Map fields - prioritize user's column names
    // For monthly-summary Excel files (no per-row date), fall back to the date
    // encoded in the filename (e.g. _20260101–20260131 → Jan 1 2026).
    const mapped: any = {
      sale_date:
        normalized.date ||
        normalized.sale_date ||
        normalized.saledate ||
        normalized.transaction_date ||
        filenameDate,
      product_name: normalized.product || normalized.product_name || normalized.productname || normalized.item || normalized.item_name || normalized.menu_name || normalized.menu,
      category: normalized.category || normalized.product_category,
      quantity: normalized.quantity || normalized.qty || normalized.bills,
      unit_price: normalized.price || normalized.unit_price || normalized.unitprice,
      total_amount: normalized.total || normalized.total_amount || normalized.amount || normalized.sales,
      payment_method: normalized.payment || normalized.payment_method,
      notes: normalized.notes || normalized.note,
    };

    const validation = SalesRecordSchema.safeParse(mapped);
    if (!validation.success) {
      auditLog.invalidRecords++;
      auditLog.details.push(`Row ${index + 2}: Invalid - ${validation.error.issues.map(e => e.message).join(', ')}`);
      return;
    }

    const validRecord = validation.data;

    // Deduplication: create a unique key based on date, product, quantity, and total
    const uniqueKey = `${validRecord.sale_date.toISOString()}-${validRecord.product_name}-${validRecord.quantity}-${validRecord.total_amount}`;
    if (seenRecords.has(uniqueKey)) {
      auditLog.duplicatesRemoved++;
      auditLog.details.push(`Row ${index + 2}: Duplicate removed`);
      return;
    }
    seenRecords.add(uniqueKey);

    // Check and fill missing data
    let filledCount = 0;
    if (!mapped.category) filledCount++;
    if (!mapped.payment_method) filledCount++;
    if (!mapped.notes) filledCount++;
    // Use English defaults to avoid encoding issues
    if (!mapped.category) mapped.category = 'Uncategorized';
    if (!mapped.payment_method) mapped.payment_method = 'Other';
    if (!mapped.notes) mapped.notes = '';
    
    if (filledCount > 0) {
      auditLog.missingDataFilled += filledCount;
      auditLog.details.push(`Row ${index + 2}: Filled ${filledCount} missing fields`);
    }

    validRecords.push(validRecord);
  });

  return { validRecords, auditLog };
}

// Map raw Excel data to sales record fields
function mapSalesRecord(raw: any, uploadId: string): any {
  const normalized: any = {};
  Object.keys(raw).forEach(key => {
    normalized[normalizeColumnName(key)] = raw[key];
  });

  // Try to find common field names
  const record: any = {
    upload_id: uploadId,
    sale_date: new Date(), // Default to now
  };

  // Map date fields
  if (normalized.date) record.sale_date = normalized.date;
  else if (normalized.sale_date) record.sale_date = normalized.sale_date;
  else if (normalized.saledate) record.sale_date = normalized.saledate;
  else if (normalized.transaction_date) record.sale_date = normalized.transaction_date;

  // Map product fields
  if (normalized.product) record.product_name = normalized.product;
  else if (normalized.product_name) record.product_name = normalized.product_name;
  else if (normalized.productname) record.product_name = normalized.productname;
  else if (normalized.item) record.product_name = normalized.item;
  else if (normalized.item_name) record.product_name = normalized.item_name;
  else if (normalized.menu_name) record.product_name = normalized.menu_name;
  else if (normalized.menu) record.product_name = normalized.menu;

  // Map category fields
  if (normalized.category) record.category = normalized.category;
  else if (normalized.product_category) record.category = normalized.product_category;
  else record.category = 'Uncategorized';

  // Map quantity fields
  if (normalized.quantity !== undefined) record.quantity = Number(normalized.quantity);
  else if (normalized.qty !== undefined) record.quantity = Number(normalized.qty);
  else if (normalized.bills !== undefined) record.quantity = Number(normalized.bills);
  else record.quantity = 0;

  // Map price fields
  if (normalized.price !== undefined) record.unit_price = Number(normalized.price);
  else if (normalized.unit_price !== undefined) record.unit_price = Number(normalized.unit_price);
  else if (normalized.unitprice !== undefined) record.unit_price = Number(normalized.unitprice);
  else record.unit_price = 0;

  // Map total fields
  if (normalized.total !== undefined) record.total_amount = Number(normalized.total);
  else if (normalized.total_amount !== undefined) record.total_amount = Number(normalized.total_amount);
  else if (normalized.amount !== undefined) record.total_amount = Number(normalized.amount);
  else if (normalized.sales !== undefined) record.total_amount = Number(normalized.sales);
  else record.total_amount = 0;

  // Map payment method
  if (normalized.payment) record.payment_method = normalized.payment;
  else if (normalized.payment_method !== undefined) record.payment_method = normalized.payment_method;
  else record.payment_method = 'Other';

  // Map notes
  if (normalized.notes) record.notes = normalized.notes;
  else if (normalized.note) record.notes = normalized.note;
  else record.notes = '';

  return record;
}

export async function uploadSalesFiles(formData: FormData): Promise<{
  success: boolean;
  uploadedFiles?: Array<{ fileName: string; recordCount: number; auditLog: any }>;
  error?: string;
}> {
  const authCheck = await checkAuth();
  if (!authCheck.success) {
    return authCheck;
  }

  const writable = await assertWritableSession();
  if (!writable.ok) {
    return { success: false, error: writable.error };
  }
  
  const supabase = getSupabaseAdmin();
  
  if (!supabase) {
    return { 
      success: false, 
      error: 'ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้ กรุณาตรวจสอบค่าเซ็ตอัพค่ะ' 
    };
  }

  try {
    const files = formData.getAll('files') as File[];

    // Validate files exist
    if (!files || files.length === 0) {
      return { success: false, error: 'กรุณาเลือกไฟล์ที่จะอัปโหลดค่ะ' };
    }

    // Validate max files
    if (files.length > MAX_FILES) {
      return { 
        success: false, 
        error: `สามารถอัปโหลดไฟล์ได้สูงสุด ${MAX_FILES} ไฟล์ค่ะ` 
      };
    }

    const uploadedFiles: Array<{ fileName: string; recordCount: number; auditLog: any }> = [];

    for (const file of files) {
      // Validate file type
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return { 
          success: false, 
          error: `ไฟล์ ${file.name} ต้องเป็น .xlsx หรือ .xls เท่านั้นค่ะ` 
        };
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return { 
          success: false, 
          error: `ขนาดไฟล์ ${file.name} ต้องไม่เกิน 10MB ค่ะ` 
        };
      }

      // Parse Excel file
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(firstSheet);

      // Extract date from filename as fallback for monthly-summary files
      // that don't have a per-row date column (e.g. อันดับเมนูขายดี_20260101–20260131.xlsx)
      const filenameDate = extractDateFromFilename(file.name);

      // Process data
      const { validRecords, auditLog } = processSalesData(rawData, filenameDate);

      // Create upload record in Supabase
      const { data: uploadData, error: uploadError } = await supabase
        .from('sales_uploads')
        .insert({
          file_name: file.name,
          total_records: validRecords.length,
          status: validRecords.length > 0 ? 'completed' : 'failed',
          // Removed audit_log since column doesn't exist
        })
        .select()
        .single();

      if (uploadError) {
        console.error('[SUPABASE_UPLOAD_ERROR]', uploadError);
        return { 
          success: false, 
          error: `ไม่สามารถบันทึกข้อมูลอัปโหลดไฟล์ ${file.name} ไปยังฐานข้อมูลได้ (${uploadError.message})` 
        };
      }

      const uploadId = uploadData.id;

      // Prepare and insert sales records
      if (validRecords.length > 0) {
        const salesRecords = validRecords.map(r => ({
          ...r,
          upload_id: uploadId,
        }));
        
        const { error: recordsError } = await supabase
          .from('sales_records')
          .insert(salesRecords);

        if (recordsError) {
          console.error('[SUPABASE_RECORDS_ERROR]', recordsError);
          // Update upload status to failed
          await supabase
            .from('sales_uploads')
            .update({ status: 'failed' })
            .eq('id', uploadId);
          
          return { 
            success: false, 
            error: `ไม่สามารถบันทึกข้อมูลยอดขายจากไฟล์ ${file.name} ไปยังฐานข้อมูลได้ (${recordsError.message})` 
          };
        }
      }

      uploadedFiles.push({
        fileName: file.name,
        recordCount: validRecords.length,
        auditLog,
      });
    }

    return { success: true, uploadedFiles };

  } catch (error) {
    console.error('[SALES_UPLOAD_ERROR]', error);
    return { 
      success: false, 
      error: 'เกิดข้อผิดพลาดในการประมวลผลข้อมูล กรุณาลองใหม่อีกครั้งค่ะ' 
    };
  }
}

interface DailyMetric {
  date: string;
  totalRevenue: number;
  totalQuantity: number;
  transactionCount: number;
}

interface MonthlyMetric {
  year: number;
  month: number;
  totalRevenue: number;
  totalQuantity: number;
  transactionCount: number;
  avgDailyRevenue: number;
}

interface CategoryMetric {
  category: string;
  totalRevenue: number;
  totalQuantity: number;
  transactionCount: number;
  revenuePercentage: number;
}

export interface SalesMetrics {
  overview: {
    totalRevenue: number;
    totalQuantity: number;
    totalTransactions: number;
    avgTransactionValue: number;
    dateRange: {
      start: string | null;
      end: string | null;
      totalMonths: number;
    };
  };
  dailyMetrics: DailyMetric[];
  monthlyMetrics: MonthlyMetric[];
  categoryMetrics: CategoryMetric[];
  topProducts: Array<{
    productName: string;
    category: string;
    totalRevenue: number;
    totalQuantity: number;
  }>;
  allProducts: Array<{
    productName: string;
    category: string;
    totalRevenue: number;
    totalQuantity: number;
  }>;
  comparisons: {
    mom: {
      currentMonthRevenue: number;
      previousMonthRevenue: number;
      changePercentage: number;
      changeAbsolute: number;
    } | null;
    yoy: {
      currentYearRevenue: number;
      previousYearRevenue: number;
      changePercentage: number;
      changeAbsolute: number;
    } | null;
  };
}



// Function to fetch sales data for history with pagination
export async function fetchSalesHistory(page = 1, pageSize = 10) {
  const auth = await ensureServerSession();
  if (!auth.ok) return null;

  const supabase = getSupabaseAdmin();
  
  if (!supabase) return null;

  try {
    // Calculate offset
    const offset = (page - 1) * pageSize;

    // Fetch uploads and records together; they do not depend on each other.
    const uploadsPromise = supabase
      .from('sales_uploads')
      .select(SALES_UPLOAD_COLUMNS, { count: 'exact' })
      .order('upload_date', { ascending: false })
      .range(offset, offset + pageSize - 1);

    const recordsPromise = supabase
      .from('sales_records')
      .select(SALES_RECORD_COLUMNS)
      .order('sale_date', { ascending: false });

    const [
      { data: uploads, error: uploadsError, count },
      { data: records, error: recordsError },
    ] = await Promise.all([uploadsPromise, recordsPromise]);

    if (uploadsError) {
      if (uploadsError.message?.includes('Could not find the table')) {
        return { uploads: [], records: [], total: 0, totalPages: 0 };
      }
      throw uploadsError;
    }

    if (recordsError) {
      if (recordsError.message?.includes('Could not find the table')) {
        return { uploads: uploads || [], records: [], total: count || 0, totalPages: Math.ceil((count || 0) / pageSize) };
      }
      throw recordsError;
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / pageSize);

    return { uploads, records, total, totalPages };
  } catch (error) {
    console.error('[FETCH_SALES_ERROR]', error);
    return null;
  }
}

// Function to delete a sales upload and its associated records
export async function deleteSalesUpload(uploadId: string) {
  const authCheck = await checkAuth();
  if (!authCheck.success) {
    return authCheck;
  }

  const writable = await assertWritableSession();
  if (!writable.ok) {
    return { success: false, error: writable.error };
  }
  
  const supabase = getSupabaseAdmin();
  
  if (!supabase) {
    return { success: false, error: 'ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้' };
  }

  try {
    // First delete all sales records associated with this upload
    const { error: recordsError } = await supabase
      .from('sales_records')
      .delete()
      .eq('upload_id', uploadId);

    if (recordsError) {
      console.error('[DELETE_RECORDS_ERROR]', recordsError);
      return { success: false, error: 'ไม่สามารถลบข้อมูลยอดขายได้' };
    }

    // Then delete the upload record itself
    const { error: uploadError } = await supabase
      .from('sales_uploads')
      .delete()
      .eq('id', uploadId);

    if (uploadError) {
      console.error('[DELETE_UPLOAD_ERROR]', uploadError);
      return { success: false, error: 'ไม่สามารถลบข้อมูลการอัปโหลดได้' };
    }

    return { success: true };
  } catch (error) {
    console.error('[DELETE_SALES_UPLOAD_ERROR]', error);
    return { success: false, error: 'เกิดข้อผิดพลาดในการลบข้อมูล' };
  }
}

// ==================== PRODUCT CATEGORY MANAGEMENT ====================

/**
 * AI-powered auto-categorization for products using Gemini
 */
async function categorizeProductsWithAI(
  productNames: string[],
  existingCategories: string[] = []
): Promise<Map<string, string>> {
  try {
    // First, check for exact product matches from existing product categories
    // (We'll check this in autoCategorizeAllProducts)
    
    // Then use AI for remaining products, and prioritize existing categories
    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      system: `คุณคือผู้ช่วยจัดหมวดหมู่สินค้าสำหรับร้าน BLACKANDBREW (ร้านกาแฟและขนม)
      
      ${existingCategories.length > 0 
        ? `หมวดหมู่ที่มีอยู่แล้ว (ใช้สิ่งนี้เป็นอันดับแรกถ้าเหมาะสม):
${existingCategories.map(c => `- ${c}`).join('\n')}
`
        : ''
      }
      
      ให้จัดหมวดหมู่สินค้าตามชื่อสินค้าให้เหมาะสมกับบริบทของร้านกาแฟ BLACKANDBREW
      หากเป็นไปได้ให้ใช้หมวดหมู่ที่มีอยู่แล้ว (ถ้ามี)
      ถ้าต้องสร้างหมวดหมู่ใหม่ก็ทำได้
      
      ตอบในรูปแบบ JSON: {"ชื่อสินค้า": "หมวดหมู่"} เท่านั้น ไม่ต้องมีข้อความอื่นๆ`,
      prompt: `จัดหมวดหมู่สินค้าต่อไปนี้:
${JSON.stringify(productNames, null, 2)}`,
    });

    // Parse the JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const categories = JSON.parse(jsonMatch[0]);
      return new Map(Object.entries(categories));
    }
    return new Map();
  } catch (error) {
    console.error('[AI_CATEGORIZATION_ERROR]', error);
    return new Map();
  }
}

/**
 * Get or create product category from database
 */
async function getProductCategory(productName: string, supabase: any): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('product_categories')
      .select('category')
      .eq('product_name', productName)
      .single();

    return data?.category || null;
  } catch (error) {
    return null;
  }
}

/**
 * Save product category to database
 */
async function saveProductCategory(productName: string, category: string, isAiGenerated: boolean, supabase: any) {
  try {
    const { data, error } = await supabase
      .from('product_categories')
      .upsert(
        {
          product_name: productName,
          category,
          is_ai_generated: isAiGenerated,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'product_name' }
      )
      .select();

    if (error) {
      console.error('[SAVE_CATEGORY_ERROR]', error);
    }
  } catch (error) {
    console.error('[SAVE_CATEGORY_ERROR]', error);
  }
}

/**
 * Get all product categories
 */
export async function getAllProductCategories() {
  const auth = await ensureServerSession();
  if (!auth.ok) {
    return { success: false, error: auth.error, categories: [] };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { success: false, error: 'ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้', categories: [] };
  }

  try {
    const { data, error } = await supabase
      .from('product_categories')
      .select(PRODUCT_CATEGORY_COLUMNS)
      .order('product_name', { ascending: true });
    if (error && (error.message?.includes('Could not find the table') || error.code === 'PGRST205')) {
      return { success: true, categories: [] };
    }

    if (error) {
      return { success: false, error: error.message, categories: [] };
    }

    return { success: true, categories: data || [] };
  } catch (error) {
    console.error('[GET_ALL_CATEGORIES_ERROR]', error);
    return { success: true, categories: [] }; // Fallback to empty if error
  }
}

// Helper function to create product_categories table if it doesn't exist
async function ensureProductCategoriesTable(supabase: any) {
  try {
    const { error: checkError } = await supabase.from('product_categories').select('id').limit(1);

    if (checkError && (checkError.message?.includes('Could not find the table') || checkError.code === 'PGRST205')) {
      return { tableExists: false };
    }

    if (checkError) {
      console.error('[ensureProductCategoriesTable] Error checking table:', checkError);
      return { tableExists: false };
    }

    return { tableExists: true };
  } catch (e) {
    console.error('[ensureProductCategoriesTable] Exception:', e);
    return { tableExists: false };
  }
}


/**
 * Update product category (user edit)
 */
export async function updateProductCategory(productName: string, newCategory: string) {
  const authCheck = await checkAuth();
  if (!authCheck.success) {
    return authCheck;
  }

  const writable = await assertWritableSession();
  if (!writable.ok) {
    return { success: false, error: writable.error };
  }
  
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { success: false, error: 'ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้' };
  }

  try {
    // Get old category for audit log
    const { data: oldCategoryData } = await supabase
      .from('product_categories')
      .select('category')
      .eq('product_name', productName)
      .single();

    // Check if table exists
    const { tableExists } = await ensureProductCategoriesTable(supabase);
    if (!tableExists) {
      console.warn('[updateProductCategory] product_categories table not found, using temporary storage');
      return { success: true, isTemporary: true };
    }
    
    const { data, error } = await supabase
      .from('product_categories')
      .upsert(
        {
          product_name: productName,
          category: newCategory,
          is_ai_generated: false,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'product_name' }
      )
      .select();

    if (error) {
      console.error('[UPDATE_CATEGORY_SUPABASE_ERROR]', error);
      await recordDataChange({
        action: 'UPDATE',
        module: 'sales',
        entityType: 'product_category',
        entityId: productName,
        entityLabel: productName,
        fieldChanges: computeFieldChanges(
          { category: oldCategoryData?.category ?? null },
          { category: newCategory }
        ),
        status: 'failed',
        errorMessage: error.message,
      });
      return { success: false, error: error.message };
    }

    await recordDataChange({
      action: 'UPDATE',
      module: 'sales',
      entityType: 'product_category',
      entityId: productName,
      entityLabel: productName,
      fieldChanges: computeFieldChanges(
        { category: oldCategoryData?.category ?? null },
        { category: newCategory }
      ),
    });

    return { success: true };
  } catch (error) {
    console.error('[UPDATE_CATEGORY_ERROR]', error);
    return { success: false, error: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล' };
  }
}

/**
 * Delete a category (removes it from all products that use it)
 */
export async function deleteCategory(categoryName: string) {
  const authCheck = await checkAuth();
  if (!authCheck.success) {
    return authCheck;
  }

  const writable = await assertWritableSession();
  if (!writable.ok) {
    return { success: false, error: writable.error };
  }
  
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { success: false, error: 'ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้' };
  }

  try {
    // Delete all entries with this category
    const { error } = await supabase
      .from('product_categories')
      .delete()
      .eq('category', categoryName);

    if (error) {
      console.error('[DELETE_CATEGORY_ERROR]', error);
      await recordDataChange({
        action: 'DELETE',
        module: 'sales',
        entityType: 'category',
        entityId: categoryName,
        entityLabel: categoryName,
        oldValue: categoryName,
        status: 'failed',
        errorMessage: error.message,
      });
      return { success: false, error: error.message };
    }

    await recordDataChange({
      action: 'DELETE',
      module: 'sales',
      entityType: 'category',
      entityId: categoryName,
      entityLabel: categoryName,
      oldValue: categoryName,
    });

    return { success: true };
  } catch (error) {
    console.error('[DELETE_CATEGORY_ERROR]', error);
    return { success: false, error: 'เกิดข้อผิดพลาดในการลบข้อมูล' };
  }
}

/**
 * Auto-categorize all uncategorized products using AI
 */
export async function autoCategorizeAllProducts() {
  const authCheck = await checkAuth();
  if (!authCheck.success) {
    return authCheck;
  }

  const writable = await assertWritableSession();
  if (!writable.ok) {
    return { success: false, error: writable.error };
  }
  
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { success: false, error: 'ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้' };
  }

  try {
    // Get all unique product names from sales_records
    const { data: records, error: recordsError } = await supabase
      .from('sales_records')
      .select('product_name');

    if (recordsError) {
      return { success: false, error: recordsError.message };
    }

    const uniqueProducts = [...new Set((records || []).map((r: any) => r.product_name).filter(Boolean))];

    // Get existing product categories
    const { data: existingProductCats } = await supabase
      .from('product_categories')
      .select('product_name, category');

    const existingProdMap = new Map<string, string>();
    const existingCatSet = new Set<string>();
    (existingProductCats || []).forEach((c: any) => {
      existingProdMap.set(c.product_name, c.category);
      existingCatSet.add(c.category);
    });

    // Find products without categories
    const productsToCategorize = uniqueProducts.filter(p => !existingProdMap.has(p));

    if (productsToCategorize.length === 0) {
      return { success: true, message: 'ทุกสินค้ามีหมวดหมู่แล้ว', categorized: 0 };
    }

    // Categorize with AI
    const categoryMap = await categorizeProductsWithAI(
      productsToCategorize,
      Array.from(existingCatSet)
    );

    // Save categories
    let categorizedCount = 0;
    for (const productName of productsToCategorize) {
      const category = categoryMap.get(productName);
      if (category) {
        await saveProductCategory(productName, category, true, supabase);
        categorizedCount++;
      }
    }

    return { success: true, message: `จัดหมวดหมู่สินค้า ${categorizedCount} รายการเรียบร้อยแล้ว`, categorized: categorizedCount };
  } catch (error) {
    console.error('[AUTO_CATEGORIZE_ERROR]', error);
    return { success: false, error: 'เกิดข้อผิดพลาดในการจัดหมวดหมู่' };
  }
}

/**
 * Enhanced getSalesMetrics that uses product categories
 */
export async function getSalesMetrics(startDateStr?: string, endDateStr?: string): Promise<SalesMetrics | null> {
  const auth = await ensureServerSession();
  if (!auth.ok) return null;

  const supabase = getSupabaseAdmin();
  
  if (!supabase) return null;

  try {
    const recordsPromise = supabase
      .from('sales_records')
      .select(SALES_RECORD_COLUMNS)
      .order('sale_date', { ascending: true });

    const productCategoriesPromise = supabase
      .from('product_categories')
      .select('product_name, category');

    const [
      { data: records, error },
      { data: productCategories, error: categoriesError },
    ] = await Promise.all([recordsPromise, productCategoriesPromise]);

    if (error) {
      if (error.message?.includes('Could not find the table')) {
        return null;
      }
      throw error;
    }

    if (!records || records.length === 0) return null;

    // If product_categories table doesn't exist, use empty array
    const categories = (categoriesError && (categoriesError.message?.includes('Could not find the table') || categoriesError.code === 'PGRST205')) 
      ? [] 
      : (productCategories || []);

    const categoryMap = new Map<string, string>();
    categories.forEach((pc: any) => {
      categoryMap.set(pc.product_name, pc.category);
    });

    // Process all records with valid numeric data
    let validRecords = records
      .filter(r => r.sale_date && r.total_amount !== null && r.total_amount !== undefined)
      .map(r => ({
        ...r,
        total_amount: Number(r.total_amount) || 0,
        quantity: Number(r.quantity) || 0,
        sale_date: new Date(r.sale_date),
        category: categoryMap.get(r.product_name) || '' // No default "อื่นๆ"
      }))
      .filter(r => !isNaN(r.sale_date.getTime()) && r.total_amount >= 0);

    // Apply date range filter if provided
    if (startDateStr) {
      const startDate = new Date(startDateStr);
      startDate.setHours(0, 0, 0, 0);
      validRecords = validRecords.filter(r => r.sale_date >= startDate);
    }

    if (endDateStr) {
      const endDate = new Date(endDateStr);
      endDate.setHours(23, 59, 59, 999);
      validRecords = validRecords.filter(r => r.sale_date <= endDate);
    }

    if (validRecords.length === 0) return null;

    // Calculate date range
    const sortedDates = validRecords.map(r => r.sale_date).sort((a, b) => a.getTime() - b.getTime());
    const dataStartDate = sortedDates[0];
    const dataEndDate = sortedDates[sortedDates.length - 1];
    
    const monthsDiff = (dataEndDate.getFullYear() - dataStartDate.getFullYear()) * 12 + 
                       (dataEndDate.getMonth() - dataStartDate.getMonth()) + 1;

    // Overview metrics
    const totalRevenue = validRecords.reduce((sum, r) => sum + r.total_amount, 0);
    const totalQuantity = validRecords.reduce((sum, r) => sum + r.quantity, 0);
    const totalTransactions = validRecords.length;
    const avgTransactionValue = totalRevenue / totalTransactions;

    // Daily metrics
    const dailyMap = new Map<string, { revenue: number; quantity: number; count: number }>();
    validRecords.forEach(r => {
      const dateKey = r.sale_date.toISOString().split('T')[0];
      const existing = dailyMap.get(dateKey) || { revenue: 0, quantity: 0, count: 0 };
      dailyMap.set(dateKey, {
        revenue: existing.revenue + r.total_amount,
        quantity: existing.quantity + r.quantity,
        count: existing.count + 1
      });
    });

    const dailyMetrics: DailyMetric[] = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        totalRevenue: data.revenue,
        totalQuantity: data.quantity,
        transactionCount: data.count
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Monthly metrics
    const monthlyMap = new Map<string, { revenue: number; quantity: number; count: number; days: Set<string> }>();
    validRecords.forEach(r => {
      const monthKey = `${r.sale_date.getFullYear()}-${String(r.sale_date.getMonth() + 1).padStart(2, '0')}`;
      const dateKey = r.sale_date.toISOString().split('T')[0];
      const existing = monthlyMap.get(monthKey) || { revenue: 0, quantity: 0, count: 0, days: new Set() };
      existing.days.add(dateKey);
      monthlyMap.set(monthKey, {
        revenue: existing.revenue + r.total_amount,
        quantity: existing.quantity + r.quantity,
        count: existing.count + 1,
        days: existing.days
      });
    });

    const monthlyMetrics: MonthlyMetric[] = Array.from(monthlyMap.entries())
      .map(([monthKey, data]) => {
        const [year, month] = monthKey.split('-').map(Number);
        return {
          year,
          month,
          totalRevenue: data.revenue,
          totalQuantity: data.quantity,
          transactionCount: data.count,
          avgDailyRevenue: data.revenue / data.days.size
        };
      })
      .sort((a, b) => a.year - b.year || a.month - b.month);

    // Category metrics
    const categoryDataMap = new Map<string, { revenue: number; quantity: number; count: number }>();
    validRecords.forEach(r => {
      const existing = categoryDataMap.get(r.category) || { revenue: 0, quantity: 0, count: 0 };
      categoryDataMap.set(r.category, {
        revenue: existing.revenue + r.total_amount,
        quantity: existing.quantity + r.quantity,
        count: existing.count + 1
      });
    });

    const categoryMetrics: CategoryMetric[] = Array.from(categoryDataMap.entries())
      .map(([category, data]) => ({
        category,
        totalRevenue: data.revenue,
        totalQuantity: data.quantity,
        transactionCount: data.count,
        revenuePercentage: (data.revenue / totalRevenue) * 100
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    // All products and top products
    const productMap = new Map<string, { revenue: number; quantity: number; category: string }>();
    validRecords.forEach(r => {
      const productName = r.product_name || 'ไม่ระบุ';
      const existing = productMap.get(productName) || { revenue: 0, quantity: 0, category: r.category };
      productMap.set(productName, {
        revenue: existing.revenue + r.total_amount,
        quantity: existing.quantity + r.quantity,
        category: r.category
      });
    });

    const allProducts = Array.from(productMap.entries())
      .map(([productName, data]) => ({
        productName,
        category: data.category,
        totalRevenue: data.revenue,
        totalQuantity: data.quantity
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    const topProducts = allProducts.slice(0, 10);

    // MoM comparison
    let momComparison = null;
    if (monthlyMetrics.length >= 2) {
      const currentMonth = monthlyMetrics[monthlyMetrics.length - 1];
      const previousMonth = monthlyMetrics[monthlyMetrics.length - 2];
      const changeAbsolute = currentMonth.totalRevenue - previousMonth.totalRevenue;
      const changePercentage = previousMonth.totalRevenue > 0 
        ? (changeAbsolute / previousMonth.totalRevenue) * 100 
        : 0;
      
      momComparison = {
        currentMonthRevenue: currentMonth.totalRevenue,
        previousMonthRevenue: previousMonth.totalRevenue,
        changePercentage,
        changeAbsolute
      };
    }

    // YoY comparison
    let yoyComparison = null;
    const currentYear = dataEndDate.getFullYear();
    const previousYear = currentYear - 1;
    
    const currentYearRevenue = validRecords
      .filter(r => r.sale_date.getFullYear() === currentYear)
      .reduce((sum, r) => sum + r.total_amount, 0);
    
    const previousYearRevenue = validRecords
      .filter(r => r.sale_date.getFullYear() === previousYear)
      .reduce((sum, r) => sum + r.total_amount, 0);

    if (previousYearRevenue > 0) {
      const changeAbsolute = currentYearRevenue - previousYearRevenue;
      const changePercentage = (changeAbsolute / previousYearRevenue) * 100;
      
      yoyComparison = {
        currentYearRevenue,
        previousYearRevenue,
        changePercentage,
        changeAbsolute
      };
    }

    return {
      overview: {
        totalRevenue,
        totalQuantity,
        totalTransactions,
        avgTransactionValue,
        dateRange: {
          start: dataStartDate.toISOString().split('T')[0],
          end: dataEndDate.toISOString().split('T')[0],
          totalMonths: monthsDiff
        }
      },
      dailyMetrics,
      monthlyMetrics,
      categoryMetrics,
      topProducts,
      allProducts,
      comparisons: {
        mom: momComparison,
        yoy: yoyComparison
      }
    };

  } catch (error) {
    console.error('[METRICS_ERROR]', error);
    return null;
  }
}
