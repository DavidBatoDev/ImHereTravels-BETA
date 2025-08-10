import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://slemvconhlqgxarzfwzk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsZW12Y29uaGxxZ3hhcnpmd3prIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MDc2MTAsImV4cCI6MjA3MDM4MzYxMH0.MWHsZ__h_qJDXYBaDFbUzNxxCvuTqQ8j8fCJiNS9JQ0';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // Disable session persistence for admin operations
  },
});

// Create Supabase client with service role key for admin operations
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsZW12Y29uaGxxZ3hhcnpmd3prIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDgwNzYxMCwiZXhwIjoyMDcwMzgzNjEwfQ.sG3QcAk7MkiraLkaMMesgShn5Lto1Zkp0Zs3nAehbhE';

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export default supabase;
