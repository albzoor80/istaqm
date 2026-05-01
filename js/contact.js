/**
 * Istaqim Contact Page - Professional contact & location
 */
(function () {
  'use strict';

  var i18n = {
    ar: {
      home: 'الرئيسية',
      projects: 'المشاريع',
      about: 'من نحن',
      contact: 'تواصل معنا',
      istaqim: 'استقم',
      developedBy: 'تطوير نواتي',
      langSwitchLabel: 'English',
      name: 'الإسم',
      email: 'الإيميل',
      subject: 'الموضوع',
      message: 'الرسالة',
      captcha: 'أدخل الرمز',
      send: 'إرسال',
      orChat: 'أو دردش',
      contactBadge: 'نحن هنا لمساعدتك',
      contactPageTitle: 'تواصل معنا — نستمع لأفكارك ونحوّلها إلى واقع',
      contactIntroLead: 'استشارة مجانية، رد سريع، وفريق جاهز لتحويل رؤيتك إلى مشروع تصميم استثنائي. تواصل معنا بأي طريقة تناسبك.',
      callUs: 'اتصل بنا',
      callHint: 'اضغط للاتصال مباشرة',
      emailUs: 'راسلنا',
      emailHint: 'نرد خلال 24 ساعة',
      whatsapp: 'واتساب',
      chatHint: 'دردش معنا فوراً',
      hours: 'ساعات العمل',
      hoursValue: 'مفتوح حتى 8 مساءً',
      hoursHint: 'الأحد - الخميس',
      visitUs: 'زيارتنا',
      locationTitle: 'عنواننا',
      address: 'شارع الأمير حسن، المفرق، الأردن 25110',
      ratingText: '5.0 — 100% يوصون بنا',
      directions: 'الإتجاهات',
      followUs: 'تابعنا على',
      sendMessage: 'أرسل لنا رسالة',
      sendMessageHint: 'املأ النموذج وسنتواصل معك في أقرب وقت'
    },
    en: {
      home: 'Home',
      projects: 'Projects',
      about: 'About',
      contact: 'Contact Us',
      istaqim: 'Istaqim',
      developedBy: 'Developed by Nowaty',
      langSwitchLabel: 'عربي',
      name: 'Name',
      email: 'Email',
      subject: 'Subject',
      message: 'Message',
      captcha: 'Enter code',
      send: 'Send',
      orChat: 'Or chat',
      contactBadge: 'We\'re Here to Help',
      contactPageTitle: 'Contact Us — We Listen to Your Ideas and Turn Them Into Reality',
      contactIntroLead: 'Free consultation, quick response, and a team ready to turn your vision into an exceptional design project. Reach us any way that suits you.',
      callUs: 'Call Us',
      callHint: 'Tap to call directly',
      emailUs: 'Email Us',
      emailHint: 'We reply within 24 hours',
      whatsapp: 'WhatsApp',
      chatHint: 'Chat with us instantly',
      hours: 'Working Hours',
      hoursValue: 'Open until 8 PM',
      hoursHint: 'Sunday - Thursday',
      visitUs: 'Visit Us',
      locationTitle: 'Our Address',
      address: 'Prince Hasan St, Mafraq, Jordan 25110',
      ratingText: '5.0 — 100% recommend',
      directions: 'Directions',
      followUs: 'Follow Us',
      sendMessage: 'Send Us a Message',
      sendMessageHint: 'Fill out the form and we\'ll get back to you soon'
    }
  };

  var app = { lang: 'ar', dir: 'rtl' };

  function setLanguage(lang) {
    app.lang = lang === 'en' || lang === 'en-us' ? 'en' : 'ar';
    app.dir = app.lang === 'en' ? 'ltr' : 'rtl';
    document.documentElement.lang = app.lang;
    document.documentElement.dir = app.dir;
    document.body.className = app.dir;
    document.title = app.lang === 'en' ? 'Istaqim - Contact Us' : 'استقم - تواصل معنا';
    var t = i18n[app.lang];
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (t[key]) el.textContent = t[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-placeholder');
      if (t[key]) el.placeholder = t[key];
    });
    var langBtns = document.querySelectorAll('.langSwitch');
    if (langBtns) langBtns.forEach(function (b) { b.innerHTML = '<i class="bi bi-translate"></i> ' + t.langSwitchLabel; });
  }

  function init() {
    var savedLang = localStorage.getItem('istaqm_lang') || 'ar';
    setLanguage(savedLang);

    document.querySelectorAll('.langSwitch').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var newLang = app.lang === 'en' ? 'ar' : 'en';
        localStorage.setItem('istaqm_lang', newLang);
        setLanguage(newLang);
      });
    });

    document.getElementById('currentYear').textContent = new Date().getFullYear();

    // setTimeout(function () {
    //   var loader = document.getElementById('ajaxLoader');
    //   if (loader) loader.removeAttribute('style');
    // }, 100);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
