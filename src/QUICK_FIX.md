# 🚨 إصلاح خطأ "Failed to fetch" السريع

## المشكلة
تظهر رسالة `API call error: TypeError: Failed to fetch` لأن الخادم Express غير مُشغل.

## ✅ الحل السريع (3 خطوات)

### 1. افتح Terminal جديد وانتقل لمجلد الخادم
```bash
cd server
```

### 2. ثبت المتطلبات (فقط في المرة الأولى)
```bash
npm install
```

### 3. شغل الخادم
```bash
npm run dev
```

## 🎯 النتيجة المتوقعة

ستشاهد هذه الرسالة عند نجاح تشغيل الخادم:
```
🚀 procell API Server Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 Environment: development
🔗 Server URL: http://localhost:3001
📡 API Base: http://localhost:3001/api/v1
🏥 Health Check: http://localhost:3001/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 🔍 التحقق من الحل

1. **افتح المتصفح** وادخل على: http://localhost:3001/health
2. **في التطبيق** ستلاحظ اختفاء رسائل الخطأ
3. **في الـ Console** ستشاهد: `✅ Sample data initialized successfully`

## ⚙️ إعداد متغيرات البيئة (اختياري)

إذا كنت تريد استخدام Supabase:

1. انسخ ملف الإعدادات:
```bash
cd server
cp .env.example .env
```

2. حدث ملف `.env` بمعلومات Supabase الخاصة بك:
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 🆘 ما زالت هناك مشاكل؟

### خطأ "Port already in use"
```bash
# غير المنفذ في server/.env
PORT=3002
```

### خطأ "Cannot find module"
```bash
cd server
npm install
```

### خطأ "Permission denied"
```bash
sudo npm install
# أو
npm install --unsafe-perm
```

## 📱 مؤشرات حالة الخادم

- **نقطة خضراء** في أسفل اليسار = الخادم يعمل ✅
- **نقطة حمراء** في أسفل اليسار = الخادم متوقف ❌
- **تنبيه في الأعلى** = مشكلة في الاتصال ⚠️

---

**💡 نصيحة:** اتركوا Terminal الخادم مفتوح أثناء التطوير ليبقى الخادم شغال!

**📞 للدعم:** راجعوا ملف `server/README.md` للتفاصيل الكاملة