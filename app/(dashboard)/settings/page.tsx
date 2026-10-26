'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  User, 
  Key, 
  Lock, 
  ShieldCheck, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Trash2,
  ExternalLink
} from 'lucide-react'

interface UserProfile {
  id: string
  email: string
  full_name: string
  created_at: string
}

interface ApiKeyRecord {
  id: string
  provider: string
  key_preview: string
  is_active: boolean
  created_at: string
  last_used_at?: string
}

function SettingsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const activeTab = (tabParam === 'keys' || tabParam === 'security' || tabParam === 'profile') ? tabParam : 'profile'

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [fullName, setFullName] = useState('')
  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>([])
  
  // Loading states
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [isSavingKey, setIsSavingKey] = useState(false)
  const [isDeletingKey, setIsDeletingKey] = useState(false)

  // Password state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Gemini API Key state
  const [geminiApiKey, setGeminiApiKey] = useState('')

  // Feedback notifications
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [keyMessage, setKeyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const refreshApiKeys = async () => {
    try {
      const keysRes = await fetch('/api/user/keys')
      if (keysRes.ok) {
        const { keys } = await keysRes.json()
        setApiKeys(keys || [])
      }
    } catch (err) {
      console.error('Failed to reload API keys:', err)
    }
  }

  useEffect(() => {
    let ignore = false

    async function loadInitialData() {
      try {
        const [profileRes, keysRes] = await Promise.all([
          fetch('/api/user/profile'),
          fetch('/api/user/keys')
        ])

        if (!ignore && profileRes.ok) {
          const { user } = await profileRes.json()
          setProfile(user)
          setFullName(user.full_name || '')
        }

        if (!ignore && keysRes.ok) {
          const { keys } = await keysRes.json()
          setApiKeys(keys || [])
        }
      } catch (err) {
        console.error('Failed to load settings data:', err)
      } finally {
        if (!ignore) {
          setIsLoadingProfile(false)
        }
      }
    }

    loadInitialData()

    return () => {
      ignore = true
    }
  }, [])

  // Handle Profile Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileMessage(null)
    setIsSavingProfile(true)

    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update profile.')

      setProfileMessage({ type: 'success', text: 'Profile updated successfully.' })
      if (profile) {
        setProfile({ ...profile, full_name: fullName })
      }
    } catch (err: unknown) {
      setProfileMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error updating profile.' })
    } finally {
      setIsSavingProfile(false)
    }
  }

  // Handle Password Update
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMessage(null)

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters long.' })
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match.' })
      return
    }

    setIsSavingPassword(true)

    try {
      const res = await fetch('/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword, confirmPassword })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to change password.')

      setPasswordMessage({ type: 'success', text: 'Password changed successfully!' })
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      setPasswordMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error updating password.' })
    } finally {
      setIsSavingPassword(false)
    }
  }

  // Handle Save Gemini Key
  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault()
    setKeyMessage(null)

    if (!geminiApiKey.trim()) {
      setKeyMessage({ type: 'error', text: 'Please enter a valid Google Gemini API key.' })
      return
    }

    setIsSavingKey(true)

    try {
      const res = await fetch('/api/user/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'gemini', apiKey: geminiApiKey.trim() })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save API key.')

      setKeyMessage({ type: 'success', text: 'Google Gemini API key securely encrypted and saved.' })
      setGeminiApiKey('')
      
      // Refresh keys list
      await refreshApiKeys()
    } catch (err: unknown) {
      setKeyMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save API key.' })
    } finally {
      setIsSavingKey(false)
    }
  }

  // Handle Remove Gemini Key
  const handleDeleteApiKey = async () => {
    if (!confirm('Are you sure you want to remove your custom Gemini API key?')) return

    setIsDeletingKey(true)
    setKeyMessage(null)

    try {
      const res = await fetch('/api/user/keys?provider=gemini', {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('Failed to delete key.')

      setKeyMessage({ type: 'success', text: 'Custom API key removed.' })
      setApiKeys(apiKeys.filter(k => k.provider !== 'gemini'))
    } catch (err: unknown) {
      setKeyMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error deleting key.' })
    } finally {
      setIsDeletingKey(false)
    }
  }

  const activeGeminiKey = apiKeys.find(k => k.provider === 'gemini')

  if (isLoadingProfile) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account &amp; Platform Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your personal profile, security credentials, and AI provider integrations.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(val) => router.replace(`/settings?tab=${val}`)} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="profile" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <User className="h-4 w-4" /> Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Lock className="h-4 w-4" /> Password
          </TabsTrigger>
          <TabsTrigger value="keys" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Key className="h-4 w-4" /> AI Keys
          </TabsTrigger>
        </TabsList>

        {/* 1. Profile Section */}
        <TabsContent value="profile" className="mt-6 space-y-6">
          <Card>
            <form onSubmit={handleSaveProfile}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Update your display name and view your registered account details.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {profileMessage && (
                  <Alert variant={profileMessage.type === 'error' ? 'destructive' : 'default'} className={profileMessage.type === 'success' ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300' : ''}>
                    {profileMessage.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4" />}
                    <AlertDescription>{profileMessage.text}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    value={profile?.email || ''}
                    disabled
                    className="bg-muted cursor-not-allowed font-mono text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Your email is tied to your authentication identity and cannot be edited directly.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                {profile?.created_at && (
                  <div className="pt-2 text-xs text-muted-foreground">
                    Account created on {new Date(profile.created_at).toLocaleDateString()}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-end border-t pt-4">
                <Button type="submit" disabled={isSavingProfile} className="flex items-center gap-2">
                  {isSavingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Profile
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* 2. Password Security Section */}
        <TabsContent value="security" className="mt-6 space-y-6">
          <Card>
            <form onSubmit={handleUpdatePassword}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lock className="h-5 w-5 text-indigo-600" />
                  Update Password
                </CardTitle>
                <CardDescription>
                  Ensure your account is protected with a strong, unique password.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {passwordMessage && (
                  <Alert variant={passwordMessage.type === 'error' ? 'destructive' : 'default'} className={passwordMessage.type === 'success' ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300' : ''}>
                    {passwordMessage.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4" />}
                    <AlertDescription>{passwordMessage.text}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    required
                    minLength={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    required
                    minLength={6}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end border-t pt-4">
                <Button type="submit" disabled={isSavingPassword || !newPassword || !confirmPassword} className="flex items-center gap-2">
                  {isSavingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
                  Update Password
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* 3. Gemini API Key Management Section */}
        <TabsContent value="keys" className="mt-6 space-y-6">
          <Card>
            <form onSubmit={handleSaveApiKey}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Key className="h-5 w-5 text-purple-600" />
                    Google Gemini API Key
                  </CardTitle>
                  {activeGeminiKey ? (
                    <Badge className="bg-emerald-600 text-white flex items-center gap-1 text-xs">
                      <ShieldCheck className="h-3.5 w-3.5" /> Configured
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Using System Default (if set)
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  Connect your own Google AI Studio API key to power AI Insights and the Dataset Assistant without platform quotas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {keyMessage && (
                  <Alert variant={keyMessage.type === 'error' ? 'destructive' : 'default'} className={keyMessage.type === 'success' ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300' : ''}>
                    {keyMessage.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4" />}
                    <AlertDescription>{keyMessage.text}</AlertDescription>
                  </Alert>
                )}

                {/* Stored Key Preview Card */}
                {activeGeminiKey && (
                  <div className="p-4 border rounded-xl bg-muted/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold uppercase text-muted-foreground">Active Gemini Key</span>
                        <p className="font-mono text-sm font-semibold tracking-wider">{activeGeminiKey.key_preview}</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDeleteApiKey}
                        disabled={isDeletingKey}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200"
                      >
                        {isDeletingKey ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />}
                        Remove
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      Encrypted with AES-256-GCM. Never sent to the client in plaintext.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="geminiKey">{activeGeminiKey ? 'Replace API Key' : 'Enter Gemini API Key'}</Label>
                  <Input
                    id="geminiKey"
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Get a free API key from{' '}
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center gap-0.5"
                    >
                      Google AI Studio <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end border-t pt-4">
                <Button type="submit" disabled={isSavingKey || !geminiApiKey.trim()} className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2">
                  {isSavingKey && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save API Key
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    }>
      <SettingsContent />
    </Suspense>
  )
}
