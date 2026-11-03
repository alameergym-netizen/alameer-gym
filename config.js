// ⚙️ إعدادات تطبيق الأمير جيم — هذا الملف الوحيد اللي بتعدّله وقت التشغيل.

export const CONFIG = {
  // رقم الإصدار: زيده مع كل تحديث (مثلاً 2.0.1) عشان الأجهزة تعرف إنه في تحديث جديد.
  version: '2.0.1',

  // 1) الصق هون القيم اللي بيعطيك إياها Firebase
  //    (Project settings ← Your apps ← SDK setup and configuration ← Config)
  //    طالما apiKey فاضي، التطبيق بيشتغل «نسخة تجربة» والبيانات بتنحفظ على الجهاز بس.
  firebase: {
    apiKey: 'AIzaSyCsgMZSmL1LKMJefpTWOB4gCA-6waSJFMo',
    authDomain: 'alameer-gym.firebaseapp.com',
    projectId: 'alameer-gym',
    storageBucket: 'alameer-gym.firebasestorage.app',
    messagingSenderId: '232463452977',
    appId: '1:232463452977:web:5336081e788ba3eba3be10'
  },

  // 2) المفتاح العام للإشعارات (لازم يطابق VAPID_PUBLIC_KEY بإعدادات GitHub)
  vapidPublicKey: 'BOtW_0WCHfM9kJVYztxeKFQo8k9hWqR9WmqQ1SGzhE2UFmFEBC_GbDRJXD5XMQEJDkAcaFj8sG4dmmWzGlCnv2s',

  // نهاية أسماء مستخدمين الموظفين (jihad ← jihad@alameer.gym). ما بتحتاج تغيّرها.
  staffDomain: 'alameer.gym',

  // نسخة مكتبة Firebase
  firebaseSdk: '10.14.1'
};
