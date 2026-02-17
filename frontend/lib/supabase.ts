
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

// Only throw in development or runtime, not during build if possible
if ((!supabaseUrl || !supabaseKey) && process.env.NODE_ENV !== 'production') {
  console.warn('Supabase URL or Anon Key is missing from .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
