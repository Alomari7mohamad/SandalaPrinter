# Sandala Printer

تطبيق سطح مكتب عربي لإدارة المطبعة، مبني باستخدام Electron وReact وTypeScript وSQLite.

## تشغيل التطوير

```powershell
npm install
npm run dev
```

يشغّل الأمر خادم Vite ونافذة Electron مع Hot Reload.

## التحقق والبناء

```powershell
npm run typecheck
npm run test
npm run build
```

## إنشاء مثبت Windows

```powershell
npm run electron:build
```

الناتج المتوقع داخل `release` باسم `Sandala-Printer-Setup.exe`.

يجهّز البناء أيضًا ملفات التحديث الثلاثة في جذر المستودع: `latest.yml` و`Sandala-Printer-Setup.exe` و`Sandala-Printer-Setup.exe.blockmap`. ارفعها مع تغييرات الإصدار في دفعة واحدة إلى فرع النشر على GitHub Pages. عند تفعيل الفحص التلقائي، يتحقق التطبيق من قناة التحديث عند التشغيل ثم كل دقيقة.

## تخزين البيانات

قاعدة SQLite تُنشأ تلقائيًا عند أول تشغيل داخل مجلد بيانات التطبيق الخاص بالمستخدم، مع WAL وForeign Keys. لا تُخزن قاعدة البيانات داخل مجلد التثبيت، لذلك تبقى بيانات المستخدم محفوظة عند تحديث البرنامج.

## حالة التنفيذ

- PHASE 1: Electron + React + Vite + TypeScript + SQLite + RTL + Layout + Navigation — مكتملة.
- PHASE 2: الخدمات والتصنيفات وقواعد الأسعار ومحرك التسعير وSeed Data واختباراته — مكتملة.
- PHASE 3: الطلب الجديد وحساباته والعملاء والمدفوعات — المرحلة التالية.

## بيانات PHASE 2

- 7 تصنيفات أساسية.
- 26 خدمة ومنتج أساسي.
- 84 قاعدة تسعير مؤكدة دون استنتاج أسعار للكميات غير المعرفة.
- Seed Data أساسي مستقل عن البيانات التجريبية، يُطبّق مرة واحدة ولا يستبدل تعديلات المستخدم.
- محرك التسعير موجود في `src/shared/pricing` ويستخدم Decimal للحسابات المالية.
- إدارة الخدمات والأسعار متاحة من الواجهة، وجميع العمليات تمر عبر IPC محدود إلى Main Process.
