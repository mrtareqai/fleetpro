# FleetPro Management System - حالة المشروع

## نظرة عامة
تاريخ التحديث: 2025-01-16
الحالة: قيد التطوير (70% مكتمل)

---

## جدول الميزات والحالة

### ✅ مكتمل بالكامل
- [x] البنية الأساسية (Next.js + TypeScript)
- [x] التصميم (Tailwind CSS + shadcn/ui)
- [x] دعم اللغتين (عربي/إنجليزي)
- [x] نظام الصلاحيات (RBAC) - الهيكل
- [x] Admin Panel - إدارة المستخدمين والأدوار
- [x] Movements API - مكتمل
- [x] Dashboard UI
- [x] قاعدة البيانات Neon - متصلة

### ⚠️ مكتمل جزئياً
- [ ] Drivers API (GET/POST فارغة، PUT/DELETE مفقودة)
- [ ] Vehicles API (GET مكتمل، POST فارغ، PUT/DELETE مفقودة)
- [ ] نظام المصادقة (موجود لكن غير آمن)
- [ ] تشفير كلمات المرور (مفقود - خطر أمني!)

### ❌ غير موجود
- [ ] Reservations API (جميع العمليات)
- [ ] Tickets API (جميع العمليات)
- [ ] Agency Supplies API (جميع العمليات)
- [ ] Reports API (جميع العمليات)
- [ ] JWT Authentication
- [ ] API Documentation
- [ ] Unit Tests
- [ ] Integration Tests

---

## المشاكل الحرجة

### 🔴 أمان - أولوية قصوى

#### 1. كلمات المرور غير مشفرة
**الملف**: `app/api/admin/users/route.ts:93`
\`\`\`typescript
// ⚠️ خطر أمني حرج!
const password_hash = password // TODO: Implement proper password hashing
\`\`\`

**الحل المطلوب**:
\`\`\`typescript
import bcrypt from 'bcryptjs'

const password_hash = await bcrypt.hash(password, 10)
\`\`\`

**الخطوات**:
1. تثبيت bcryptjs: `npm install bcryptjs @types/bcryptjs`
2. استبدال السطر 93 بالكود أعلاه
3. تحديث دالة تسجيل الدخول للتحقق:
\`\`\`typescript
const isValid = await bcrypt.compare(password, user.password_hash)
\`\`\`

#### 2. نظام المصادقة غير آمن
**الملف**: `lib/api-auth.ts:17`
\`\`\`typescript
// ⚠️ أي شخص يمكنه التظاهر بأنه مستخدم آخر!
const userId = request.headers.get("x-user-id")
\`\`\`

**الحل المطلوب**: تنفيذ JWT Authentication

**الخطوات**:
1. تثبيت jsonwebtoken: `npm install jsonwebtoken @types/jsonwebtoken`
2. إنشاء `lib/jwt.ts`:
\`\`\`typescript
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string }
  } catch {
    return null
  }
}
\`\`\`

3. تحديث `lib/api-auth.ts`:
\`\`\`typescript
import { verifyToken } from './jwt'

export function getUserIdFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  
  const token = authHeader.substring(7)
  const decoded = verifyToken(token)
  return decoded?.userId || null
}
\`\`\`

4. تحديث Login API لإرجاع Token:
\`\`\`typescript
// في app/api/auth/login/route.ts
import { generateToken } from '@/lib/jwt'

const token = generateToken(user.id)
return NextResponse.json({ user, token })
\`\`\`

5. تحديث Frontend لحفظ واستخدام Token:
\`\`\`typescript
// في lib/auth-context.tsx
localStorage.setItem('auth_token', token)

// في lib/api-client.ts
const token = localStorage.getItem('auth_token')
headers: {
  'Authorization': `Bearer ${token}`
}
\`\`\`

---

## إكمال API Routes

### نموذج كامل: Drivers API

#### الملف: `app/api/drivers/route.ts`

\`\`\`typescript
import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { MockDataStore } from "@/lib/mock-data"
import { requirePermission } from "@/lib/api-auth"

// GET - جلب جميع السائقين
export async function GET(request: NextRequest) {
  const authResult = await requirePermission(request, "drivers.read")
  if (authResult instanceof Response) return authResult

  try {
    // استخدام Mock Data إذا لم تكن قاعدة البيانات متاحة
    if (!sql) {
      const drivers = MockDataStore.getDrivers()
      return NextResponse.json({ drivers })
    }

    // جلب من قاعدة البيانات الحقيقية
    const drivers = await sql`
      SELECT 
        id, name, license_number, phone, email, 
        status, company_id, created_at, updated_at
      FROM drivers 
      ORDER BY created_at DESC
    `

    return NextResponse.json({ drivers })
  } catch (error) {
    console.error("[v0] Error fetching drivers:", error)
    return NextResponse.json(
      { error: "Failed to fetch drivers" }, 
      { status: 500 }
    )
  }
}

// POST - إضافة سائق جديد
export async function POST(request: NextRequest) {
  const authResult = await requirePermission(request, "drivers.create")
  if (authResult instanceof Response) return authResult

  try {
    const body = await request.json()
    const { name, license_number, phone, email, company_id } = body

    // التحقق من البيانات المطلوبة
    if (!name || !license_number) {
      return NextResponse.json(
        { error: "Name and license number are required" },
        { status: 400 }
      )
    }

    // استخدام Mock Data إذا لم تكن قاعدة البيانات متاحة
    if (!sql) {
      const driver = MockDataStore.addDriver(body)
      return NextResponse.json({ driver }, { status: 201 })
    }

    // إضافة إلى قاعدة البيانات الحقيقية
    const result = await sql`
      INSERT INTO drivers (
        name, license_number, phone, email, 
        company_id, status, created_at, updated_at
      )
      VALUES (
        ${name}, ${license_number}, ${phone || null}, ${email || null},
        ${company_id || null}, 'active', NOW(), NOW()
      )
      RETURNING *
    `

    const driver = result[0]
    return NextResponse.json({ driver }, { status: 201 })
  } catch (error) {
    console.error("[v0] Error creating driver:", error)
    
    // التحقق من الأخطاء المحددة
    if (error.message?.includes('duplicate key')) {
      return NextResponse.json(
        { error: "Driver with this license number already exists" },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: "Failed to create driver" },
      { status: 500 }
    )
  }
}
\`\`\`

#### الملف: `app/api/drivers/[id]/route.ts`

\`\`\`typescript
import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { MockDataStore } from "@/lib/mock-data"
import { requirePermission } from "@/lib/api-auth"

// GET - جلب سائق محدد
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requirePermission(request, "drivers.read")
  if (authResult instanceof Response) return authResult

  try {
    const { id } = params

    if (!sql) {
      const driver = MockDataStore.getDriverById(Number(id))
      if (!driver) {
        return NextResponse.json(
          { error: "Driver not found" },
          { status: 404 }
        )
      }
      return NextResponse.json({ driver })
    }

    const result = await sql`
      SELECT * FROM drivers WHERE id = ${id}
    `

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Driver not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ driver: result[0] })
  } catch (error) {
    console.error("[v0] Error fetching driver:", error)
    return NextResponse.json(
      { error: "Failed to fetch driver" },
      { status: 500 }
    )
  }
}

// PUT - تحديث سائق
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requirePermission(request, "drivers.update")
  if (authResult instanceof Response) return authResult

  try {
    const { id } = params
    const body = await request.json()
    const { name, license_number, phone, email, status, company_id } = body

    if (!sql) {
      const driver = MockDataStore.updateDriver(Number(id), body)
      if (!driver) {
        return NextResponse.json(
          { error: "Driver not found" },
          { status: 404 }
        )
      }
      return NextResponse.json({ driver })
    }

    const result = await sql`
      UPDATE drivers
      SET 
        name = COALESCE(${name}, name),
        license_number = COALESCE(${license_number}, license_number),
        phone = COALESCE(${phone}, phone),
        email = COALESCE(${email}, email),
        status = COALESCE(${status}, status),
        company_id = COALESCE(${company_id}, company_id),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Driver not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ driver: result[0] })
  } catch (error) {
    console.error("[v0] Error updating driver:", error)
    return NextResponse.json(
      { error: "Failed to update driver" },
      { status: 500 }
    )
  }
}

// DELETE - حذف سائق
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requirePermission(request, "drivers.delete")
  if (authResult instanceof Response) return authResult

  try {
    const { id } = params

    if (!sql) {
      const success = MockDataStore.deleteDriver(Number(id))
      if (!success) {
        return NextResponse.json(
          { error: "Driver not found" },
          { status: 404 }
        )
      }
      return NextResponse.json({ message: "Driver deleted successfully" })
    }

    const result = await sql`
      DELETE FROM drivers WHERE id = ${id} RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Driver not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: "Driver deleted successfully" })
  } catch (error) {
    console.error("[v0] Error deleting driver:", error)
    return NextResponse.json(
      { error: "Failed to delete driver" },
      { status: 500 }
    )
  }
}
\`\`\`

### نفس النمط ينطبق على:
- Vehicles API
- Reservations API
- Tickets API
- Agency Supplies API

---

## إكمال قاعدة البيانات

### الخطوة 1: تشغيل SQL Scripts

يمكن تشغيل السكريبتات مباشرة من v0:

1. السكريبتات موجودة في مجلد `/scripts`
2. يجب تشغيلها بالترتيب
3. v0 يمكنه تشغيلها تلقائياً

### الخطوة 2: التحقق من الجداول

بعد تشغيل السكريبتات، تحقق من وجود:
- `reservations`
- `tickets`
- `agency_supplies`
- `roles`
- `permissions`
- `role_permissions`
- `user_roles`

---

## أفضل الممارسات

### 1. معالجة الأخطاء
\`\`\`typescript
try {
  // العملية
} catch (error) {
  console.error("[v0] Error description:", error)
  return NextResponse.json(
    { error: "User-friendly message" },
    { status: 500 }
  )
}
\`\`\`

### 2. التحقق من البيانات
\`\`\`typescript
// استخدام Zod للتحقق
import { z } from 'zod'

const driverSchema = z.object({
  name: z.string().min(1),
  license_number: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
})

const validated = driverSchema.parse(body)
\`\`\`

### 3. التوثيق
\`\`\`typescript
/**
 * جلب قائمة السائقين
 * @route GET /api/drivers
 * @permission drivers.read
 * @returns {Driver[]} قائمة السائقين
 */
export async function GET(request: NextRequest) {
  // ...
}
\`\`\`

### 4. الأمان
- دائماً استخدم Parameterized Queries
- لا تثق بمدخلات المستخدم
- تحقق من الصلاحيات في كل API
- شفّر البيانات الحساسة

---

## خطة العمل الموصى بها

### الأسبوع 1: الأمان
- [ ] تنفيذ تشفير كلمات المرور
- [ ] تنفيذ JWT Authentication
- [ ] اختبار نظام المصادقة

### الأسبوع 2: API Routes الأساسية
- [ ] إكمال Drivers API
- [ ] إكمال Vehicles API
- [ ] اختبار العمليات CRUD

### الأسبوع 3: الميزات المتقدمة
- [ ] إنشاء Reservations API
- [ ] إنشاء Tickets API
- [ ] تشغيل SQL Scripts

### الأسبوع 4: التحسين والتوثيق
- [ ] إنشاء Agency Supplies API
- [ ] إنشاء Reports API
- [ ] كتابة API Documentation
- [ ] اختبار شامل

---

## الموارد المفيدة

### التوثيق
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Neon PostgreSQL](https://neon.tech/docs)
- [bcryptjs](https://www.npmjs.com/package/bcryptjs)
- [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken)

### أمثلة الكود
- راجع `app/api/movements/route.ts` - مثال مكتمل
- راجع `app/api/admin/users/route.ts` - مثال متقدم

---

## الخلاصة

المشروع في حالة جيدة من حيث البنية والتصميم، لكن يحتاج إلى:
1. إصلاح الأمان (أولوية قصوى)
2. إكمال API Routes
3. تشغيل SQL Scripts
4. التوثيق الشامل

مع اتباع هذا الدليل، يمكن إكمال المشروع بشكل منظم واحترافي.
