import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // Note: might need service role for schema changes, but let's see if DDL is enabled
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateSchema() {
  const { data, error } = await supabase.rpc('exec_sql', {
    sql_query: 'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;'
  });
  
  if (error) {
    console.error('Error updating schema:', error);
  } else {
    console.log('Schema updated successfully:', data);
  }
}

updateSchema();
