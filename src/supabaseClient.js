import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = "https://ohbbyuupetxypdrhghyk.supabase.co";
export const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oYmJ5dXVwZXR4eXBkcmhnaHlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1ODcxNjksImV4cCI6MjA3MzE2MzE2OX0.tZAHvuDyLy4t_nsTx9mc-idMHXu4rpiUAVnlfRA67Ew";

export const supabase = createClient(supabaseUrl, supabaseKey);

export const TOKEN_KEY = "supabase_session";
