import { createClient } from '@supabase/supabase-js';

// User provided credentials are placed here as requested.
const supabaseUrl = 'https://miwicynolzpqjciiqmft.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pd2ljeW5vbHpwcWpjaWlxbWZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTk1MzgsImV4cCI6MjA3NzgzNTUzOH0.6wfI3E04o_QPHh-4kHSsLSVKbYwP2sGQ7bK34paDe6k';

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL and Anon Key must be provided.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);