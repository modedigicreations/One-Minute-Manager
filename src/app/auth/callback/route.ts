import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  if (code) {
    try {
      const supabase = await createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (!error) {
        return NextResponse.redirect(`${requestUrl.origin}${next}`)
      }
      console.error('Exchange code error:', error)
    } catch (err) {
      console.error('Callback handler error:', err)
    }
  }

  // Return to login with error message if token exchange fails or code is missing
  return NextResponse.redirect(
    `${requestUrl.origin}/login?error=Invalid+or+expired+authentication+link.+Please+request+a+new+one.`
  )
}
