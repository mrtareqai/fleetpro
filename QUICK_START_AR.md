# 🚀 دليل البدء السريع - Quick Start Guide

## خطوات الإعداد السريع

### 1️⃣ إضافة سلسلة اتصال قاعدة البيانات

أضف المتغير التالي في **Vercel Environment Variables**:

\`\`\`env
NEON_NEON_DATABASE_URL=postgresql://neondb_owner:npg_yrGIk2Awoab8@ep-icy-cloud-adpafx3r-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
\`\`\`

**كيفية الإضافة:**

#### من خلال v0 (الأسرع):
1. افتح الشريط الجانبي في المحادثة
2. اضغط **Vars**
3. أضف `NEON_DATABASE_URL` مع القيمة أعلاه

#### من خلال Vercel Dashboard:
1. افتح [Vercel Dashboard](https://vercel.com/dashboard)
2. Settings → Environment Variables
3. أضف المتغير واحفظ
4. أعد النشر

### 2️⃣ تشغيل سكريبتات قاعدة البيانات

اتصل بقاعدة البيانات وشغل السكريبتات:

\`\`\`bash
# الاتصال
psql 'postgresql://neondb_owner:npg_yrGIk2Awoab8@ep-icy-cloud-adpafx3r-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'

# تشغيل السكريبتات بالترتيب
\i scripts/01_create_tables.sql
\i scripts/02_seed_demo_data.sql
\i scripts/03_add_rbac_tables.sql
\i scripts/04_seed_rbac_data.sql
\i scripts/05_add_indexes.sql
\`\`\`

أو اطلب من v0:
\`\`\`
قم بتشغيل جميع سكريبتات SQL في مجلد scripts/
\`\`\`

### 3️⃣ التحقق من الإعداد

\`\`\`sql
-- عرض الجداول
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;

-- عدد المستخدمين
SELECT COUNT(*) FROM users;

-- عدد المركبات
SELECT COUNT(*) FROM vehicles;
\`\`\`

### 4️⃣ تشغيل التطبيق

\`\`\`bash
# محلياً
npm run dev

# أو انشر على Vercel
vercel --prod
\`\`\`

### 5️⃣ تسجيل الدخول

استخدم أحد الحسابات التجريبية:

**مدير النظام:**
- البريد: `admin@fleetpro.com`
- كلمة المرور: `Admin@123`

**مدير الأسطول:**
- البريد: `fleet.manager@fleetpro.com`
- كلمة المرور: `Fleet@123`

## ✅ جاهز!

الآن يمكنك:
- إدارة المركبات والسائقين
- إنشاء الحجوزات والتذاكر
- تتبع الحركات
- إدارة المستخدمين والصلاحيات

## 📚 مزيد من المعلومات

- [دليل إعداد قاعدة البيانات الكامل](docs/DATABASE_SETUP_AR.md)
- [متغيرات البيئة](docs/ENVIRONMENT_VARIABLES.md)
- [نظام الصلاحيات](docs/RBAC_IMPLEMENTATION.md)
- [README الكامل](README.md)

## 🐛 مشاكل شائعة

**"Database connection failed"**
→ تحقق من إضافة `NEON_DATABASE_URL` في Vercel

**"relation does not exist"**
→ قم بتشغيل سكريبتات SQL

**"Invalid credentials"**
→ استخدم الحسابات التجريبية أعلاه

## 📞 الدعم

إذا واجهت مشاكل، راجع [استكشاف الأخطاء](docs/DATABASE_SETUP_AR.md#-استكشاف-الأخطاء)
