
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Basic env parser
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function getInventorySchema() {
  console.log('Querying inventory-related tables...');
  
  // 1. Try to get data from inventory_items
  const { data: items, error: itemError } = await supabase
    .from('inventory_items')
    .select('*')
    .limit(1);

  if (itemError) {
    console.error('Error querying inventory_items:', itemError.message);
  } else {
    console.log('--- inventory_items schema (from data) ---');
    if (items && items.length > 0) {
      console.log('Columns:', Object.keys(items[0]));
      console.log('Sample data:', items[0]);
    } else {
      console.log('Table exists but is empty. Trying to guess columns...');
    }
  }

  // 2. Try to get data from inventory_categories (common related table)
  const { data: categories, error: catError } = await supabase
    .from('inventory_categories')
    .select('*')
    .limit(1);

  if (!catError) {
    console.log('--- inventory_categories schema ---');
    if (categories && categories.length > 0) {
      console.log('Columns:', Object.keys(categories[0]));
    } else {
      console.log('Table inventory_categories exists.');
    }
  }

  // 3. Try to get data from inventory_transactions or logs
  const { data: logs, error: logError } = await supabase
    .from('inventory_logs')
    .select('*')
    .limit(1);

  if (!logError) {
    console.log('--- inventory_logs schema ---');
    if (logs && logs.length > 0) {
      console.log('Columns:', Object.keys(logs[0]));
    } else {
      console.log('Table inventory_logs exists.');
    }
  }
}

getInventorySchema();
