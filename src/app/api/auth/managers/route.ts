import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()

    // Query profiles with role = 'manager'
    const { data: managers, error } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'manager')
      .order('full_name', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(managers || [])
  } catch (err) {
    console.error('Managers fetch error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
