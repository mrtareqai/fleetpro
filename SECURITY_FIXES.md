# إصلاحات الأمان الحرجة - FleetPro

## نظرة عامة
هذا الملف يحتوي على الإصلاحات الأمنية الحرجة التي يجب تنفيذها فوراً.

---

## 1. تشفير كلمات المرور

### المشكلة الحالية
\`\`\`typescript
// app/api/admin/users/route.ts:93
const password_hash = password // ⚠️ كلمة المرور تُحفظ كنص عادي!
\`\`\`

### الحل

#### الخطوة 1: تثبيت المكتبة
\`\`\`bash
npm install bcryptjs
npm install --save-dev @types/bcryptjs
\`\`\`

#### الخطوة 2: إنشاء دوال مساعدة
\`\`\`typescript
// lib/password.ts
import bcrypt from 'bcryptjs'

/**
 * تشفير كلمة المرور
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10
  return await bcrypt.hash(password, saltRounds)
}

/**
 * التحقق من كلمة المرور
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return await bcrypt.compare(password, hash)
}
\`\`\`

#### الخطوة 3: تحديث API إنشاء المستخدم
\`\`\`typescript
// app/api/admin/users/route.ts
import { hashPassword } from '@/lib/password'

export async function POST(request: NextRequest) {
  
  const { username, email, password, full_name, role, company_id } = body

  // تشفير كلمة المرور
  const password_hash = await hashPassword(password)

  const result = await sql`
    INSERT INTO users (username, email, password_hash, full_name, role, company_id)
    VALUES (${username}, ${email}, ${password_hash}, ${full_name}, ${role}, ${company_id})
    RETURNING id, username, email, full_name, role, company_id, created_at
  `
  
}
\`\`\`

#### الخطوة 4: إنشاء Login API
\`\`\`typescript
// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { verifyPassword } from '@/lib/password'
import { generateToken } from '@/lib/jwt'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      )
    }

    // جلب المستخدم من قاعدة البيانات
    const users = await sql`
      SELECT * FROM users WHERE username = ${username}
    `

    if (users.length === 0) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      )
    }

    const user = users[0]

    // التحقق من كلمة المرور
    const isValid = await verifyPassword(password, user.password_hash)

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      )
    }

    // إنشاء JWT Token
    const token = generateToken(user.id)

    // إرجاع بيانات المستخدم بدون كلمة المرور
    const { password_hash, ...userWithoutPassword } = user

    return NextResponse.json({
      user: userWithoutPassword,
      token
    })
  } catch (error) {
    console.error("[v0] Login error:", error)
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    )
  }
}
\`\`\`

---

## 2. JWT Authentication

### المشكلة الحالية
\`\`\`typescript
// lib/api-auth.ts
const userId = request.headers.get("x-user-id") // ⚠️ غير آمن!
\`\`\`

### الحل

#### الخطوة 1: تثبيت المكتبة
\`\`\`bash
npm install jsonwebtoken
npm install --save-dev @types/jsonwebtoken
\`\`\`

#### الخطوة 2: إضافة متغير البيئة
\`\`\`bash
# .env.local
JWT_SECRET=your-super-secret-key-change-this-in-production
\`\`\`

#### الخطوة 3: إنشاء JWT Helper
\`\`\`typescript
// lib/jwt.ts
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key'
const JWT_EXPIRES_IN = '7d' // صلاحية التوكن 7 أيام

export interface JWTPayload {
  userId: string
  iat?: number
  exp?: number
}

/**
 * إنشاء JWT Token
 */
export function generateToken(userId: string): string {
  return jwt.sign(
    { userId } as JWTPayload,
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )
}

/**
 * التحقق من JWT Token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    return decoded
  } catch (error) {
    console.error("[v0] JWT verification failed:", error)
    return null
  }
}

/**
 * فك تشفير Token بدون التحقق (للتصحيح فقط)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload
  } catch {
    return null
  }
}
\`\`\`

#### الخطوة 4: تحديث API Auth
\`\`\`typescript
// lib/api-auth.ts
import type { NextRequest } from "next/server"
import { verifyToken } from "@/lib/jwt"
import { getUserPermissions, hasPermission, hasAnyPermission } from "@/lib/permissions"

/**
 * استخراج User ID من JWT Token
 */
export function getUserIdFromRequest(request: NextRequest): string | null {
  try {
    // الحصول على Authorization Header
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    // استخراج التوكن
    const token = authHeader.substring(7) // إزالة "Bearer "

    // التحقق من التوكن
    const decoded = verifyToken(token)
    
    return decoded?.userId || null
  } catch (error) {
    console.error("[v0] Error getting user from request:", error)
    return null
  }
}

// ... باقي الدوال تبقى كما هي ...
\`\`\`

#### الخطوة 5: تحديث Frontend

\`\`\`typescript
// lib/auth-context.tsx
"use client"

import { createContext, useContext, useState, useEffect } from "react"
import type { ReactNode } from "react"
import { getUserPermissions, hasPermission, hasAnyPermission } from "./permissions"

// ... existing types ...

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [permissions, setPermissions] = useState<UserPermissions | null>(null)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    // تحميل البيانات من localStorage
    const savedUser = localStorage.getItem("auth_user")
    const savedToken = localStorage.getItem("auth_token")
    
    if (savedUser && savedToken) {
      const parsedUser = JSON.parse(savedUser)
      setUser(parsedUser)
      setToken(savedToken)
      loadPermissions(parsedUser.id)
    }
  }, [])

  const loadPermissions = async (userId: string) => {
    try {
      const perms = await getUserPermissions(userId)
      setPermissions(perms)
    } catch (error) {
      console.error("[v0] Failed to load permissions:", error)
    }
  }

  const login = (userData: AuthUser, authToken: string) => {
    setUser(userData)
    setToken(authToken)
    localStorage.setItem("auth_user", JSON.stringify(userData))
    localStorage.setItem("auth_token", authToken)
    loadPermissions(userData.id)
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    setPermissions(null)
    localStorage.removeItem("auth_user")
    localStorage.removeItem("auth_token")
  }


  return (
    <AuthContext.Provider value={{ user, permissions, token, login, logout, hasPermission: hasPermissionWrapper, hasAnyPermission: hasAnyPermissionWrapper }}>
      {children}
    </AuthContext.Provider>
  )
}
\`\`\`

\`\`\`typescript
// lib/api-client.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ""

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // الحصول على التوكن من localStorage
  const token = typeof window !== 'undefined' 
    ? localStorage.getItem('auth_token') 
    : null

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  }

  // إضافة Authorization Header
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    if (response.status === 401) {
      // التوكن منتهي الصلاحية - تسجيل خروج
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
        window.location.href = '/login'
      }
    }
    throw new Error(`API Error: ${response.statusText}`)
  }

  return response.json()
}
\`\`\`

---

## 3. حماية من SQL Injection

### الممارسات الآمنة

#### ✅ صحيح - استخدام Parameterized Queries
\`\`\`typescript
// آمن - المتغيرات يتم escape تلقائياً
const result = await sql`
  SELECT * FROM users WHERE username = ${username}
`
\`\`\`

#### ❌ خطأ - String Concatenation
\`\`\`typescript
// خطير - عرضة لـ SQL Injection
const result = await sql`
  SELECT * FROM users WHERE username = '${username}'
`
\`\`\`

### مثال على SQL Injection Attack
\`\`\`typescript
// إذا كان username = "admin' OR '1'='1"
// الاستعلام يصبح:
SELECT * FROM users WHERE username = 'admin' OR '1'='1'
// هذا يرجع جميع المستخدمين!
\`\`\`

---

## 4. Rate Limiting

### تنفيذ Rate Limiting بسيط

\`\`\`typescript
// lib/rate-limit.ts
const rateLimit = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000 // دقيقة واحدة
): boolean {
  const now = Date.now()
  const record = rateLimit.get(identifier)

  if (!record || now > record.resetTime) {
    // نافذة جديدة
    rateLimit.set(identifier, {
      count: 1,
      resetTime: now + windowMs
    })
    return true
  }

  if (record.count >= maxRequests) {
    return false // تجاوز الحد
  }

  record.count++
  return true
}
\`\`\`

\`\`\`typescript
// استخدام في Login API
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  
  if (!checkRateLimit(`login:${ip}`, 5, 300000)) { // 5 محاولات كل 5 دقائق
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      { status: 429 }
    )
  }

  // ... باقي الكود ...
}
\`\`\`

---

## 5. CORS Configuration

\`\`\`typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // CORS Headers
  const response = NextResponse.next()
  
  response.headers.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  // Security Headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  return response
}

export const config = {
  matcher: '/api/:path*',
}
\`\`\`

---

## الخلاصة

بعد تنفيذ هذه الإصلاحات:
- ✅ كلمات المرور مشفرة
- ✅ المصادقة آمنة عبر JWT
- ✅ حماية من SQL Injection
- ✅ Rate Limiting للحماية من Brute Force
- ✅ CORS و Security Headers

المشروع سيكون آمناً للاستخدام في الإنتاج.
