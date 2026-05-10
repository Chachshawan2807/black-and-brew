
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function getInventorySchema() {
  console.log('Querying inventory-related tables...');
  
  // Try to query information_schema.columns
  // This usually requires more than anon key, but let's see.
  const { data: tables, error: tableError } = await supabase
    .from('inventory_items')
    .select('*')
    .limit(1);

  if (tableError) {
    console.error('Error querying inventory_items:', tableError.message);
    
    // If table not found or error, let's try to find what tables exist
    // Note: This is a long shot with anon key
    const { data: schemaData, error: schemaError } = await supabase
      .rpc('get_schema_info'); // Custom RPC if it exists
      
    if (schemaError) {
       console.log('Could not query schema info via RPC.');
    }
  } else {
    console.log('Successfully connected to inventory_items.');
    if (tables && tables.length > 0) {
      console.log('Columns found in inventory_items:', Object.keys(tables[0]));
    } else {
      console.log('Table inventory_items exists but is empty.');
      // Try to get column names via a trick: select a non-existent column to see error message?
      // Or just try to select * and see the keys of the first object if any.
    }
  }
}

getInventorySchema();
