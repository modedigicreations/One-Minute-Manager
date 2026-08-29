'use client'

import { useState, useEffect, useRef, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Bell, 
  CheckCheck, 
  Flag, 
  Award, 
  CheckCircle2, 
  Target, 
  Info, 
  Sparkles, 
  Volume2
} from 'lucide-react'
import { 
  getNotificationsAction, 
  markNotificationReadAction, 
  markAllNotificationsReadAction, 
  AppNotification 
} from '@/app/dashboard/notifications/actions'
import { ClientFeedbackTime } from '@/lib/utils'

function subscribeToPermission(callback: () => void) {
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', callback)
    return () => window.removeEventListener('focus', callback)
  }
  return () => {}
}

function getPermissionSnapshot(): NotificationPermission {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    return Notification.permission
  }
  return 'default'
}

function getServerPermissionSnapshot(): NotificationPermission {
  return 'default'
}

export default function NotificationBell() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const prevCountRef = useRef(0)
  const popoverRef = useRef<HTMLDivElement>(null)

  // External browser Notification permission subscription
  const pushPermission = useSyncExternalStore(
    subscribeToPermission,
    getPermissionSnapshot,
    getServerPermissionSnapshot
  )

  const pushSupported = typeof window !== 'undefined' && 'Notification' in window

  // Fetch and poll notifications
  useEffect(() => {
    let active = true

    async function sync(notifyNew: boolean) {
      try {
        const res = await getNotificationsAction()
        if (active && res.success) {
          setNotifications(res.notifications)
          setUnreadCount(res.unreadCount)

          if (notifyNew && res.unreadCount > prevCountRef.current && typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'granted') {
              const newest = res.notifications.find(n => !n.read)
              if (newest) {
                try {
                  new Notification(newest.title, {
                    body: newest.message,
                    icon: '/favicon.ico',
                  })
                } catch {
                  // Fallback
                }
              }
            }
          }
          prevCountRef.current = res.unreadCount
        }
      } catch (err) {
        console.error('Failed to sync notifications:', err)
      }
    }

    // Initial load
    sync(false)

    // Polling interval
    const interval = setInterval(() => {
      sync(true)
    }, 20000)

    function handleFocus() {
      sync(true)
    }

    window.addEventListener('focus', handleFocus)

    return () => {
      active = false
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Request browser push permission
  async function handleEnablePush() {
    if (!('Notification' in window)) return
    try {
      const perm = await Notification.requestPermission()
      if (perm === 'granted') {
        new Notification('One-Minute Manager', {
          body: 'Push alerts enabled! You will be notified of directives and goal completions.',
          icon: '/favicon.ico',
        })
      }
    } catch (err) {
      console.error('Request permission error:', err)
    }
  }

  // Mark single notification read & navigate
  async function handleNotificationClick(n: AppNotification) {
    if (!n.read) {
      await markNotificationReadAction(n.id)
      setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item))
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
    if (n.link) {
      setIsOpen(false)
      router.push(n.link)
    }
  }

  // Mark all read
  async function handleMarkAllRead() {
    setLoading(true)
    await markAllNotificationsReadAction()
    setNotifications(prev => prev.map(item => ({ ...item, read: true })))
    setUnreadCount(0)
    setLoading(false)
  }

  return (
    <div className="relative" ref={popoverRef}>
      {/* Trigger Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white transition cursor-pointer flex items-center justify-center"
        aria-label="Notifications"
      >
        <Bell size={17} className={unreadCount > 0 ? 'text-amber-400' : 'text-slate-400'} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] font-extrabold text-white shadow-xs animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200 shadow-2xl z-50 overflow-hidden text-slate-900 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-3.5 sm:p-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-tight">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={loading}
                className="text-[11px] font-bold text-slate-400 hover:text-white flex items-center gap-1 transition cursor-pointer"
              >
                <CheckCheck size={13} />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Browser Native Push Permission Banner */}
          {pushSupported && pushPermission !== 'granted' && (
            <div className="p-2.5 bg-gradient-to-r from-amber-50 to-indigo-50 border-b border-amber-200/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-700 min-w-0">
                <Volume2 size={14} className="text-amber-600 shrink-0" />
                <span className="truncate text-[11px]">Enable desktop/mobile push alerts</span>
              </div>
              <button
                type="button"
                onClick={handleEnablePush}
                className="text-[10px] font-bold bg-slate-900 text-white px-2.5 py-1 rounded-lg shrink-0 hover:bg-slate-800 transition cursor-pointer shadow-xs"
              >
                Enable
              </button>
            </div>
          )}

          {/* Notifications Feed */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                  <Sparkles size={18} />
                </div>
                <h5 className="font-bold text-xs text-slate-800">All caught up!</h5>
                <p className="text-[11px] text-slate-400">
                  You will be notified when directives are issued or goals are completed.
                </p>
              </div>
            ) : (
              notifications.map((n) => {
                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`p-3.5 hover:bg-slate-50 transition cursor-pointer flex gap-3 items-start ${
                      !n.read ? 'bg-amber-50/25' : ''
                    }`}
                  >
                    {/* Icon Badge */}
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                      n.type === 'directive' 
                        ? 'bg-rose-50 text-rose-600 border-rose-200' 
                        : n.type === 'goal_completed' 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                        : n.type === 'goal_assigned' 
                        ? 'bg-sky-50 text-sky-600 border-sky-200' 
                        : n.type === 'feedback' 
                        ? 'bg-violet-50 text-violet-600 border-violet-200' 
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {n.type === 'directive' && <Flag size={14} />}
                      {n.type === 'goal_completed' && <CheckCircle2 size={14} />}
                      {n.type === 'goal_assigned' && <Target size={14} />}
                      {n.type === 'feedback' && <Award size={14} />}
                      {n.type === 'system' && <Info size={14} />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <h5 className={`text-xs truncate ${!n.read ? 'font-extrabold text-slate-900' : 'font-semibold text-slate-700'}`}>
                          {n.title}
                        </h5>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">
                        {n.message}
                      </p>
                      <span className="text-[10px] text-slate-400 block pt-0.5">
                        <ClientFeedbackTime isoString={n.created_at} />
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
