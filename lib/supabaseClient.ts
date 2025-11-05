import { createClient } from '@supabase/supabase-js';

// User provided credentials are placed here as requested.
const supabaseUrl = 'https://stlmbfgwxfoxxzpwyqrg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0bG1iZmd3eGZveHh6cHd5cXJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5MDM5ODIsImV4cCI6MjA3NzQ3OTk4Mn0.ZXJns_QtMZAGiGQiC33tNpac9kCE1PdAM0UCA2bqcwY';

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL and Anon Key must be provided.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);