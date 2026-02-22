import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

function createSupabaseClient(): SupabaseClient {
  // Try multiple ways to get the environment variables (same pattern as claudeApi.ts)
  // Fallback to hardcoded values if env vars aren't loading (temporary fix)
  const supabaseUrlFromExtra = Constants.expoConfig?.extra?.supabaseUrl
  const supabaseUrlFromEnv = process.env.EXPO_PUBLIC_SUPABASE_URL
  const supabaseUrlHardcoded = 'https://unyrkyvyngafjubjhkkf.supabase.co'
  const supabaseUrl = (supabaseUrlFromExtra || supabaseUrlFromEnv || supabaseUrlHardcoded)?.trim()
  
  const supabaseAnonKeyFromExtra = Constants.expoConfig?.extra?.supabaseAnonKey
  const supabaseAnonKeyFromEnv = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  const supabaseAnonKeyHardcoded = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVueXJreXZ5bmdhZmp1Ympoa2tmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNjQ5MjUsImV4cCI6MjA4NTc0MDkyNX0.ZSnPR76qULI3TjOudumVer4Vp_Wa69GlfiT4sfJ9VlM'
  const supabaseAnonKey = (supabaseAnonKeyFromExtra || supabaseAnonKeyFromEnv || supabaseAnonKeyHardcoded)?.trim()


  if (!supabaseUrl || supabaseUrl.length === 0) {
    throw new Error(
      'Missing EXPO_PUBLIC_SUPABASE_URL environment variable. ' +
      'Please check your .env file and restart the Expo development server with: npx expo start --clear'
    )
  }

  if (!supabaseAnonKey || supabaseAnonKey.length === 0) {
    throw new Error(
      'Missing EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable. ' +
      'Please check your .env file and restart the Expo development server with: npx expo start --clear'
    )
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  })
}

// Lazy initialization - only creates client when first accessed
let _supabase: SupabaseClient | null = null

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_supabase) {
      _supabase = createSupabaseClient()
    }
    const value = _supabase[prop as keyof SupabaseClient]
    if (typeof value === 'function') {
      return value.bind(_supabase)
    }
    return value
  },
})
