import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createNotification, NotificationRecord } from '@/lib/notifications'

export async function GET(request: Request) {
  try {
    const supabase = await createClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const notifications: NotificationRecord[] = (data || []).map((n) => ({
      ...n,
      is_read: n.read ?? false,
    }))

    const unreadCount = notifications.filter((n) => !n.read).length

    return NextResponse.json({
      notifications,
      unreadCount,
      total: notifications.length,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { title, message, type, metadata } = body

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required.' }, { status: 400 })
    }

    const res = await createNotification({
      userId: user.id,
      title,
      message,
      type,
      metadata,
    })

    if (!res.success) {
      return NextResponse.json({ error: res.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, notificationId: res.notificationId }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

