import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** True quando ha credenciais Supabase configuradas no ambiente. */
export const TEM_SUPABASE = Boolean(url && anonKey)

export const supabase: SupabaseClient | null = TEM_SUPABASE
  ? createClient(url as string, anonKey as string)
  : null
