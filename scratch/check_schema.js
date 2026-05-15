
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Use env variables
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(url, key);

async function checkColumns() {
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log('Columns in profiles:', Object.keys(data[0] || {}));
}

checkColumns();
