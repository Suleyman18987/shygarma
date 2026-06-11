import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTelegramMessage } from '@/lib/telegram'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(req: Request) {
  try {
    const { parentId, message } = await req.json()

    if (!parentId || !message) {
      return NextResponse.json({ error: 'Missing parentId or message' }, { status: 400 })
    }

    const { data: parentProfile, error } = await supabase
      .from('profiles')
      .select('telegram_chat_id')
      .eq('id', parentId)
      .single()

    if (error || !parentProfile || !parentProfile.telegram_chat_id) {
      return NextResponse.json({ error: 'Parent has not linked Telegram or not found' }, { status: 404 })
    }

    const ok = await sendTelegramMessage(parentProfile.telegram_chat_id, message)
    if (!ok) {
      return NextResponse.json({ error: 'Failed to send message via Telegram API' }, { status: 502 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Send Telegram message endpoint error:', error)
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 })
  }
}
