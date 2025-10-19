# 🚀 تشغيل خادم procell

## الخطوات السريعة لتشغيل الخادم

### 1. الانتقال لمجلد الخادم
```bash
cd server
```

### 2. تثبيت المتطلبات (فقط في المرة الأولى)
```bash
npm install
```

### 3. إعداد متغيرات البيئة
```bash
cp .env.example .env
```
ثم قم بتحديث ملف `.env` بالمعلومات التالية:
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PORT=3001
NODE_ENV=development
```

### 4. تشغيل الخادم
للتطوير (مع إعادة التشغيل التلقائي):
```bash
npm run dev
```

أو للإنتاج:
```bash
npm start
```

## ✅ التحقق من تشغيل الخادم

إذا تم تشغيل الخادم بنجاح، ستشاهد:
```
🚀 procell API Server Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 Environment: development
🔗 Server URL: http://localhost:3001
📡 API Base: http://localhost:3001/api/v1
🏥 Health Check: http://localhost:3001/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 🔍 اختبار الخادم

زيارة هذا الرابط للتأكد من عمل الخادم:
```
http://localhost:3001/health
```

## ❌ حل المشاكل الشائعة

### خطأ: `Cannot find module`
```bash
cd server
npm install
```

### خطأ: `Port already in use`
غيّر المنفذ في ملف `.env`:
```env
PORT=3002
```

### خطأ: `Missing Supabase configuration`
تأكد من إعداد متغيرات البيئة في ملف `.env`

## 📚 مراجعة إضافية

راجع ملف `server/README.md` للمزيد من التفاصيل حول:
- واجهات API المتاحة
- إعدادات الأمان
- طرق النشر
- استكشاف الأخطاء وإصلاحها