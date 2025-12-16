import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dstsihasiicoztkabigk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzdHNpaGFzaWljb3p0a2FiaWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NTE3NTQsImV4cCI6MjA4MTQyNzc1NH0.ug7RTePT8XrIF9JlJhwlARgYGyxC_h5Ul3iMi9RGFy8';

export const supabase = createClient(supabaseUrl, supabaseKey);