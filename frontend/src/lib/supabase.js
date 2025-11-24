import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://amydtgzyyohaufetvoea.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFteWR0Z3p5eW9oYXVmZXR2b2VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3NDE5NzcsImV4cCI6MjA3OTMxNzk3N30.7JpxGODDC4CvrdE3OXEmAFtsrU0UWZlWom8wEGiNqGQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);