import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addGuestColumns() {
  console.log('Adding guest columns to orders table...');
  
  try {
    // Add guest columns using raw SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Add guest user fields to orders table
        ALTER TABLE public.orders
          ADD COLUMN IF NOT EXISTS guest_user_id TEXT,
          ADD COLUMN IF NOT EXISTS guest_first_name TEXT;

        -- Allow NULL for user_id for guests  
        ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;

        -- Create index for guest_user_id for performance
        CREATE INDEX IF NOT EXISTS idx_orders_guest_user_id ON public.orders(guest_user_id);
      `
    });

    if (error) {
      console.error('Error executing SQL:', error);
      
      // Try alternative approach using individual queries
      console.log('Trying alternative approach...');
      
      // Check if columns exist first
      const { data: columns, error: columnError } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'orders')
        .eq('table_schema', 'public');
        
      if (columnError) {
        console.error('Error checking columns:', columnError);
        return;
      }
      
      const columnNames = columns.map(col => col.column_name);
      console.log('Existing columns:', columnNames);
      
      if (!columnNames.includes('guest_user_id') || !columnNames.includes('guest_first_name')) {
        console.log('Guest columns are missing, this explains the error!');
        console.log('Please manually add the columns via Supabase Dashboard SQL Editor:');
        console.log(`
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS guest_user_id TEXT,
  ADD COLUMN IF NOT EXISTS guest_first_name TEXT;

ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_guest_user_id ON public.orders(guest_user_id);
        `);
      } else {
        console.log('✓ Guest columns already exist');
      }
    } else {
      console.log('✓ Successfully added guest columns');
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

// Test the connection and add columns
addGuestColumns();
