import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

export async function runInventoryMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseAdminKey);

  // Migration script: keep logs minimal.

  // 1. Read CSV File from project root
  const csvPath = path.join(process.cwd(), 'inventory-items.csv');
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found at ${csvPath}`);
  }

  const csvText = fs.readFileSync(csvPath, 'utf-8');
  
  // 2. Parse CSV Rows sequentially
  const lines = csvText.split(/\r?\n/);
  const csvItems: { name: string; stock: number | null }[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    let name = '';
    let stockStr = '';
    
    if (line.startsWith('"')) {
      const closingQuoteIndex = line.lastIndexOf('"');
      if (closingQuoteIndex !== -1 && closingQuoteIndex > 0) {
        name = line.substring(1, closingQuoteIndex).replace(/""/g, '"');
        const remaining = line.substring(closingQuoteIndex + 1);
        const commaIndex = remaining.indexOf(',');
        if (commaIndex !== -1) {
          stockStr = remaining.substring(commaIndex + 1).trim();
        }
      }
    } else {
      const commaIndex = line.indexOf(',');
      if (commaIndex !== -1) {
        name = line.substring(0, commaIndex).trim();
        stockStr = line.substring(commaIndex + 1).trim();
      } else {
        name = line;
      }
    }
    
    let stock: number | null = null;
    if (stockStr && stockStr !== '-') {
      const parsedStock = Number(stockStr);
      if (!isNaN(parsedStock)) {
        stock = parsedStock;
      }
    }
    
    if (name) {
      csvItems.push({ name, stock });
    }
  }

  // Parsed CSV items.

  // 3. Fetch existing items from database
  const { data: dbItems, error: fetchErr } = await supabase
    .from('inventory_items')
    .select('id, name, stock');

  if (fetchErr) {
    console.error('Fetch error:', fetchErr);
    throw fetchErr;
  }

  const dbItemsMap = new Map<string, { id: string; stock: number }>();
  if (dbItems) {
    dbItems.forEach(item => {
      dbItemsMap.set(item.name, { id: item.id, stock: Number(item.stock) || 0 });
    });
  }

  let updatedCount = 0;
  let insertedCount = 0;

  // 4. Update or Insert items with sort_order (1-based index)
  for (let index = 0; index < csvItems.length; index++) {
    const csvItem = csvItems[index];
    const sortOrder = index + 1; // 1-based sequential index
    const existing = dbItemsMap.get(csvItem.name);

    if (existing) {
      // Update existing item
      const updatedStock = csvItem.stock !== null ? csvItem.stock : existing.stock;
      const { error: updateErr } = await supabase
        .from('inventory_items')
        .update({
          sort_order: sortOrder,
          stock: updatedStock
        })
        .eq('id', existing.id);

      if (updateErr) {
        console.error(`Failed to update ${csvItem.name}:`, updateErr.message);
      } else {
        updatedCount++;
      }
    } else {
      // Insert new item
      const initialStock = csvItem.stock !== null ? csvItem.stock : 0;
      const { error: insertErr } = await supabase
        .from('inventory_items')
        .insert({
          name: csvItem.name,
          stock: initialStock,
          sort_order: sortOrder,
          unit: 'ชิ้น', // Default unit since it's not in CSV
          order_qty: 0,
          order_point: 0,
          target_stock: 0,
          source: ''
        });

      if (insertErr) {
        console.error(`Failed to insert ${csvItem.name}:`, insertErr.message);
      } else {
        insertedCount++;
      }
    }
  }

  // Migration complete.
  return { updatedCount, insertedCount };
}
