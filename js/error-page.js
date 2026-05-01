/**
 * Istaqim Error Page (404, 500) - Handles error display and code from URL
 */
(function () {
  'use strict';

  var i18n500 = {
    ar: { title: 'خطأ في الخادم', subtitle: 'عذراً، حدث خطأ غير متوقع. نعمل على إصلاحه.', message: 'نواجه مشكلة تقنية مؤقتة. يرجى المحاولة لاحقاً أو التواصل معنا إذا استمرت المشكلة.', ctaTitle: 'جاهزون لبدء مشروعك؟', ctaText: 'تواصل معنا اليوم واستشارة مجانية. فريقنا جاهز لتحويل رؤيتك إلى واقع ملموس.' },
    en: { title: 'Server Error', subtitle: 'Sorry, an unexpected error occurred. We\'re working to fix it.', message: 'We\'re experiencing a temporary technical issue. Please try again later or contact us if the problem persists.', ctaTitle: 'Ready to start your project?', ctaText: 'Contact us today for a free consultation. Our team is ready to turn your vision into reality.' }
  };

  function init() {
    var codeEl = document.getElementById('errorCode');
    var urlParams = new URLSearchParams(window.location.search);
    var code = urlParams.get('code') || '404';
    if (codeEl) codeEl.textContent = code;

    var yearEl = document.getElementById('currentYear');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    if (code === '500') {
      var lang = (document.documentElement.lang || 'ar').indexOf('en') >= 0 ? 'en' : 'ar';
      var t = i18n500[lang] || i18n500.en;
      var titleEl = document.querySelector('.hero-error-content h1');
      var subEl = document.querySelector('.hero-error-lead');
      var msgEl = document.querySelector('.error-content-section h2');
      if (titleEl) titleEl.textContent = t.title;
      if (subEl) subEl.textContent = t.subtitle;
      if (msgEl) msgEl.textContent = t.message;
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
