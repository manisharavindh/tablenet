import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/kitchen/.env.local' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data: res } = await supabase.from('restaurants').select('*');
  console.log('Restaurants:', res);
  const { data: tbl } = await supabase.from('tables').select('id, table_number, restaurant_id');
  console.log('Tables:', tbl);
}
run();
