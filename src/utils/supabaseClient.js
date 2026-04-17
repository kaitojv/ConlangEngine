import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hgeuyvgjhonklflcdinj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Ye_8zJGOXQBma3O3TMHDaA_Nr0eCYIy';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);