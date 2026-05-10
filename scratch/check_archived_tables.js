
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkArchivedTables() {
  const archivedTables = [
    'inventory_items',
    'inventory_transactions',
    'inventory_checks',
    'purchase_orders'
  ];

  for (const table of archivedTables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (!error) {
      console.log(`Table found: ${table}`);
      if (data && data.length > 0) {
        console.log(`Columns for ${table}:`, Object.keys(data[0]));
      } else {
        console.log(`Table ${table} exists but is empty.`);
      }
    }
  }
}

checkArchivedTables();
