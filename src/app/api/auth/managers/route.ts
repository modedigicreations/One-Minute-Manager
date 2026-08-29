import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const supabase = await createClient()

    // 1. Try calling the SECURITY DEFINER RPC function (bypasses anon RLS)
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_available_managers')

    if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
      return NextResponse.json(rpcData, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      })
    }

    // 2. Fallback to direct query on public.profiles
    const { data: managers, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .in('role', ['manager', 'managing_director'])
      .order('full_name', { ascending: true })

    if (error) {
      console.error('Direct managers query error:', error)
      return NextResponse.json(rpcData || [], {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      })
    }

    return NextResponse.json(managers || [], {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    })
  } catch (err) {
    console.error('Managers fetch error:', err)
    return NextResponse.json([], { status: 200 })
  }
}
