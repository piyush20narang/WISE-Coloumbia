// ============================================
// SUPABASE CONFIGURATION
// ============================================
// Step 1: Go to https://supabase.com/dashboard → your project → Settings → API
// Step 2: Copy "Project URL" and "anon public" key below
// Step 3: Save this file — newsletters & gallery will go live automatically
// ============================================

const SUPABASE_URL      = 'https://crgudyknzkoqzwdhcyzy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyZ3VkeWtuemtvcXp3ZGhjeXp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4ODY3OTUsImV4cCI6MjA5NzQ2Mjc5NX0.UFU8estkatvzR7cg4o7hF7omZaK3IkCp6W2ZbhqU0W0';

// Initialize the Supabase client
// (supabase-js must be loaded via CDN before this script)
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
