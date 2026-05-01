/**
 * Istaqim Website - Client-side management
 * Handles data loading, rendering, and client-side translation
 */
(function () {
  'use strict';

  var i18n = {
    ar: {
      home: 'الرئيسية',
      projects: 'المشاريع',
      about: 'من نحن',
      contact: 'تواصل معنا',
      ourProjects: 'مشاريعنا',
      viewAllProjects: 'عرض كافة المشاريع',
      all: 'الكل',
      go: 'إذهب',
      istaqim: 'استقم',
      tagline: 'لتقديم جميع الخدمات التصميمية والديكور',
      aboutTitle: 'من نحن',
      aboutSub: 'رسالتنا و رؤيتنا',
      aboutText: 'استقم فكرة بدأت من شباب طموح في محافظة المفرق، الأردن في سنة ۲۰۱۹. منذ ذلك الحين، اكتسبنا سمعة طيبة كشركة تصميم محلية رائدة في التصميم الداخلي والخارجي و تنسيق المناسبات. نسعى دوما إلى تلبية احتياجات المجتمع المحلي من تصاميم ابداعية وافكار عصرية تحاكي احدث التصاميم العالمية تحت إشراف كادر مميز من المهندسين و الحرفيين و المبرمجين.<br><br>الرسالة: تقديم جميع الخدمات التصميمية بإستخدام أحدث التقنيات و بجودة عالية و بمواصفات عصرية. كما نقدم لكم أيضاً خدمات إستشارية و إشرافية.<br><br>الرؤية: خدمة المجتمع المحلي من خلال توفير ما يلزم لمواكبة أحدث التصاميم. من هنا نبدأ مسيرتنا إلى العالمية بأنامل وسواعد فريق استقم.',
      services: 'خدماتنا',
      servicesText: {
        'تصميم داخلي': ['منازل و شقق و مكاتب', 'عيادات و متاجر و المزيد'],
        'تصميم خارجي': ['مزارع و حدائق', 'مسابح و ملاعب و المزيد'],
        'تنسيق المناسبات': ['خطوبة و زواج و تخرج', 'أعياد ميلاد و ولادة و المزيد'],
        'أعمال يدوية': ['مباخر و تلبيسة و صور', 'مداليات و تعليقات و مطبوعات و المزيد'],
        'تصميم مواقع إلكترونية': []
      },
      contactTitle: 'تواصل معنا',
      address: 'المفرق - شارع جرش، بالقرب من مدرسة المفرق الثانوية للبنات',
      directions: 'الإتجاهات',
      sendEmail: 'أرسل لنا بالإيميل',
      name: 'الإسم',
      email: 'الإيميل',
      subject: 'الموضوع',
      message: 'الرسالة',
      captcha: 'أدخل الرمز',
      captchaHint: 'أدخل الرمز الظاهر أعلاه',
      send: 'إرسال',
      orChat: 'أو دردش',
      visits: 'زيارة',
      projectsCount: 'مشروع',
      recommendations: 'التوصيات',
      whatTheySaid: 'ماذا قالو عنا',
      latestStories: 'آخر القصص',
      whyIstaqimBadge: 'لماذا استقم',
      whyIstaqimTitle: 'لماذا تختار استقم للتصميم؟',
      whyIstaqimSubtitle: 'نحن نقدم تجربة تصميم استثنائية تجمع بين الإبداع والجودة والالتزام بالمواعيد',
      whyCard1Title: 'جودة عالية',
      whyCard1Text: 'نلتزم بأعلى معايير الجودة في كل مشروع. مواد ممتازة وتنفيذ دقيق يضمن نتائج تدوم طويلاً.',
      whyCard2Title: 'إبداع وتصاميم عصرية',
      whyCard2Text: 'فريقنا يواكب أحدث صيحات التصميم العالمية ويقدم حلولاً مبتكرة تناسب ذوقك ومساحتك.',
      whyCard3Title: 'خبرة محلية',
      whyCard3Text: 'جذورنا في المفرق والأردن تعني فهمنا العميق لاحتياجات المجتمع المحلي وتقديم خدمة شخصية.',
      whyCard4Title: 'التزام بالمواعيد',
      whyCard4Text: 'نحترم وقتك. تخطيط دقيق ومتابعة مستمرة لضمان تسليم مشاريعك في الموعد المتفق عليه.',
      whyCard5Title: 'فريق متخصص',
      whyCard5Text: 'مهندسون وحرفيون ومصممون محترفون يعملون معاً لتحويل رؤيتك إلى واقع ملموس.',
      whyCard6Title: 'دعم واستشارة',
      whyCard6Text: 'نقدم استشارات مجانية ومرافقة كاملة من الفكرة الأولى حتى تسليم المشروع النهائي.',
      developedBy: 'تطوير نواتي',
      langSwitchLabel: 'English',
      countries: 'دول',
      webpUnsupported: 'لمعاينة الصور بشكل صحيح، يرجى تحديث متصفحك إلى إصدار يدعم WebP.',
      skipLink: 'انتقل إلى المحتوى الرئيسي',
      login: 'تسجيل الدخول',
      dashboard: 'لوحة التحكم',
      logout: 'تسجيل الخروج',
      welcome: 'مرحباً',
      signInTitle: 'تسجيل الدخول',
      signInSub: 'سجّل دخولك باستخدام حساب Google للوصول إلى لوحة التحكم',
      signInGoogle: 'تسجيل الدخول باستخدام Google',
      authError: 'لم يتم تفعيل حسابك. تواصل مع الإدارة.',
      authErrorTitle: 'لم يتم تفعيل حسابك',
      authErrorDismiss: 'حسناً',
      error404Title: 'الصفحة غير موجودة',
      error404Subtitle: 'عذراً، لم نتمكن من العثور على الصفحة التي تبحث عنها',
      error404Message: 'يبدو أنك انحرفت عن المسار. الصفحة ربما نُقلت أو حُذفت أو أن الرابط غير صحيح.',
      error404Hint: 'يمكنك العودة للصفحة الرئيسية أو تصفح مشاريعنا للعثور على ما تبحث عنه.',
      error404BackHome: 'العودة للرئيسية',
      error404ViewProjects: 'تصفح المشاريع',
      error404Contact: 'تواصل معنا',
      error500Title: 'خطأ في الخادم',
      error500Subtitle: 'عذراً، حدث خطأ غير متوقع. نعمل على إصلاحه.',
      error500Message: 'نواجه مشكلة تقنية مؤقتة. يرجى المحاولة لاحقاً أو التواصل معنا إذا استمرت المشكلة.'
    },
    en: {
      home: 'Home',
      projects: 'Projects',
      about: 'About',
      contact: 'Contact Us',
      ourProjects: 'Our Projects',
      viewAllProjects: 'View All Projects',
      all: 'All',
      go: 'Go',
      istaqim: 'Istaqim',
      tagline: 'To provide all design and decoration services',
      aboutTitle: 'About',
      aboutSub: 'Mission & Vision',
      aboutText: 'Istaqim is a design firm was established in Al-Mafraq city, Jordan in 2019 by a team of young creative local people. Since then, we have earned a reputation as a leading local design firm in interior, exterior, and event planning. Istaqim is dedicated to provide state-of-the-art designs and cope up with modern ideas.<br><br>Mission: Provide the latest fashion trends of interior and exterior designs along with the recent event planning ideas.<br><br>Vision: Be a leading design firm globally by providing necessary design services to the local community as it represents our starting point to deliver our creative ideas to the globe.',
      services: 'Our Services',
      servicesText: {
        'Interior design': ['Houses, apartments, and offices', 'Clinics, stores, etc'],
        'Exterior design': ['Gardens, farms, pools, pitches', 'Sport facilities, pools, pitches, etc'],
        'Event planning': ['Wedding, engagement, and graduation', 'Birthday, baby shower, etc'],
        'Handmade': ['Censers, stands, medals, printings', 'Medals, printings, portraits, etc'],
        'Web design': []
      },
      contactTitle: 'Contact Us',
      address: 'Al-Mafraq - Jarash Street, Near Al-Mafraq Secondary School for Girls',
      directions: 'Directions',
      sendEmail: 'Send us by email',
      name: 'Name',
      email: 'Email',
      subject: 'Subject',
      message: 'Message',
      captcha: 'Enter code',
      captchaHint: 'Enter the code shown above',
      send: 'Send',
      orChat: 'Or chat',
      visits: 'Visits',
      projectsCount: 'Projects',
      skipLink: 'Skip to main content',
      login: 'Login',
      dashboard: 'Dashboard',
      logout: 'Logout',
      welcome: 'Welcome',
      signInTitle: 'Sign In',
      signInSub: 'Sign in with your Google account to access the dashboard',
      signInGoogle: 'Sign in with Google',
      authError: 'Your account is not authorized. Contact the administrator.',
      authErrorTitle: 'Account Not Authorized',
      authErrorDismiss: 'OK',
      error404Title: 'Page Not Found',
      error404Subtitle: 'Sorry, we couldn\'t find the page you\'re looking for',
      error404Message: 'It looks like you\'ve wandered off the path. The page may have been moved, removed, or the link might be incorrect.',
      error404Hint: 'You can return to the homepage or browse our projects to find what you\'re looking for.',
      error404BackHome: 'Back to Home',
      error404ViewProjects: 'Browse Projects',
      error404Contact: 'Contact Us',
      error500Title: 'Server Error',
      error500Subtitle: 'Sorry, an unexpected error occurred. We\'re working to fix it.',
      error500Message: 'We\'re experiencing a temporary technical issue. Please try again later or contact us if the problem persists.',
      recommendations: 'Recommendations',
      whatTheySaid: 'What they said about us',
      latestStories: 'Latest Stories',
      whyIstaqimBadge: 'Why Istaqim',
      whyIstaqimTitle: 'Why Choose Istaqim for Design?',
      whyIstaqimSubtitle: 'We deliver an exceptional design experience that combines creativity, quality, and commitment to deadlines',
      whyCard1Title: 'High Quality',
      whyCard1Text: 'We adhere to the highest quality standards in every project. Premium materials and precise execution ensure lasting results.',
      whyCard2Title: 'Creativity & Modern Designs',
      whyCard2Text: 'Our team keeps up with the latest global design trends and delivers innovative solutions that match your taste and space.',
      whyCard3Title: 'Local Expertise',
      whyCard3Text: 'Our roots in Al-Mafraq and Jordan mean a deep understanding of local community needs and personalized service.',
      whyCard4Title: 'On-Time Delivery',
      whyCard4Text: 'We respect your time. Careful planning and continuous follow-up ensure your projects are delivered as agreed.',
      whyCard5Title: 'Specialized Team',
      whyCard5Text: 'Engineers, craftsmen, and professional designers work together to turn your vision into reality.',
      whyCard6Title: 'Support & Consultation',
      whyCard6Text: 'We offer free consultations and full support from the first idea to the final project delivery.',
      developedBy: 'Developed by Nowaty',
      langSwitchLabel: 'عربي',
      countries: 'Countries',
      webpUnsupported: 'To view images correctly, please update your browser to a version that supports WebP.'
    }
  };

  function checkWebpSupport(callback) {
    var img = new Image();
    img.onload = function () { callback(true); };
    img.onerror = function () { callback(false); };
    img.src = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/v3AgAA=';
  }

  function showWebpBanner() {
    if (localStorage.getItem('istaqm_webp_dismissed')) return;
    var banner = document.createElement('div');
    banner.className = 'webp-banner';
    banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#333;color:#fff;padding:12px 16px;text-align:center;font-size:14px;z-index:9999;display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;';
    banner.innerHTML = '<span>' + i18n[app.lang].webpUnsupported + '</span><button type="button" class="btn btn-sm btn-outline-light">×</button>';
    var btn = banner.querySelector('button');
    btn.onclick = function () { banner.remove(); localStorage.setItem('istaqm_webp_dismissed', '1'); };
    document.body.appendChild(banner);
  }

  var app = {
    lang: 'ar',
    dir: 'rtl',
    data: null,
    stats: null,
    storyPosts: [],
    allStoryItems: []
  };

  function setLanguage(lang) {
    app.lang = lang === 'en' || lang === 'en-us' ? 'en' : 'ar';
    app.dir = app.lang === 'en' ? 'ltr' : 'rtl';

    document.documentElement.lang = app.lang;
    document.documentElement.dir = app.dir;
    document.body.className = app.dir;
    var isErrorPage = document.getElementById('errorCode');
    if (isErrorPage) {
      document.title = (app.lang === 'en' ? 'Page Not Found - Istaqim' : 'استقم - الصفحة غير موجودة');
    } else {
      document.title = app.lang === 'en' ? 'Istaqim - Home' : 'استقم - الرئيسية';
    }
    var meta = document.querySelector('meta[name="description"]');
    if (meta) meta.content = i18n[app.lang].tagline;

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
    if (langBtns) {
      langBtns.forEach(function (langBtn) {
        langBtn.innerHTML = '<i class="bi bi-translate"></i> ' + t.langSwitchLabel;
        langBtn.setAttribute('data-lang', app.lang);
      });
    }

    updateNavAuth();
    updateContent();
  }

  function updateContent() {
    var isEn = app.lang === 'en';
    if (!app.data) return;

    var savedSlideIdx = 0;
    var carouselEl = document.getElementById('carousel-main');
    if (carouselEl) {
      var active = carouselEl.querySelector('.carousel-item.active');
      var items = carouselEl.querySelectorAll('.carousel-item');
      if (active && items.length) savedSlideIdx = Array.prototype.indexOf.call(items, active);
    }
    renderHero();
    if (savedSlideIdx > 0) {
      var newCarousel = document.getElementById('carousel-main');
      if (newCarousel && typeof bootstrap !== 'undefined') {
        var carousel = bootstrap.Carousel.getOrCreateInstance(newCarousel);
        setTimeout(function () { carousel.to(savedSlideIdx); }, 50);
      }
    }

    var aboutText = document.getElementById('aboutText');
    if (aboutText) aboutText.innerHTML = i18n[app.lang].aboutText;

    var servicesText = document.getElementById('servicesText');
    if (servicesText) {
      var data = i18n[app.lang].servicesText;
      var html = '<ul class="services-list list-unstyled">';
      for (var cat in data) {
        html += '<li><i class="bi bi-check-circle-fill text-warning"></i> ' + cat;
        if (data[cat] && data[cat].length > 0) {
          html += '<ul class="list-unstyled ms-3">';
          data[cat].forEach(function (item) {
            html += '<li><i class="bi bi-dot text-warning"></i> ' + item + '</li>';
          });
          html += '</ul>';
        }
        html += '</li>';
      }
      html += '</ul>';
      servicesText.innerHTML = html;
    }

    var slideTitles = document.querySelectorAll('.slideText h1');
    var slides = (app.data.Slides || []).filter(function (s) { return s.Publish === 1; }).sort(function (a, b) { return (a.Order || 0) - (b.Order || 0); });
    slideTitles.forEach(function (el, i) {
      if (slides[i]) el.textContent = isEn ? slides[i].TitleEn : slides[i].TitleAr;
    });

    var storyTitles = document.querySelectorAll('.story .story-title');
    app.storyPosts.forEach(function (sp, i) {
      if (storyTitles[i]) storyTitles[i].textContent = isEn ? sp.post.TitleEn : sp.post.TitleAr;
    });

    var projectTitles = document.querySelectorAll('.project-overlay h2, .project-overlay h4');
    var projectGo = document.querySelectorAll('.project-overlay .go-btn');
    var categories = (app.data.Categories || []).filter(function (c) { return c.Publish === 1; }).sort(function (a, b) { return (a.Order || 0) - (b.Order || 0); });
    var posts = (app.data.Posts || []).filter(function (p) { return p.Publish === 1; });
    var postsByCategory = {};
    categories.forEach(function (c) {
      postsByCategory[c.CategoryID] = posts.filter(function (p) { return p.CategoryID === c.CategoryID; }).length;
    });
    categories.forEach(function (c, i) {
      if (projectTitles[i]) projectTitles[i].textContent = isEn ? c.TitleEn : c.TitleAr;
      if (projectGo[i]) {
        projectGo[i].innerHTML = i18n[app.lang].go + ' <i class="bi bi-arrow-' + (isEn ? 'right' : 'left') + '-circle"></i>';
      }
    });

    var statLabels = document.querySelectorAll('.stat-item b');
    if (statLabels[0]) statLabels[0].textContent = i18n[app.lang].visits;
    if (statLabels[1]) statLabels[1].textContent = i18n[app.lang].projectsCount;
    if (statLabels[2]) statLabels[2].textContent = i18n[app.lang].countries;

    var testimonials = (app.data.Testimonials || []).filter(function (t) { return t.Publish === 1; }).sort(function (a, b) { return (a.Order || 0) - (b.Order || 0); });
    var testimonialContent = document.querySelectorAll('#testimonialCarousel blockquote p');
    var testimonialNames = document.querySelectorAll('#testimonialCarousel blockquote small');
    testimonials.forEach(function (tst, i) {
      if (testimonialContent[i]) testimonialContent[i].innerHTML = ((isEn ? tst.ContentEn : tst.ContentAr) || '').replace(/\n/g, '<br>');
      if (testimonialNames[i]) testimonialNames[i].textContent = isEn ? tst.NameEn : tst.NameAr;
    });

    var recTitle = document.querySelector('#testimonialsSection .section-title');
    if (recTitle) recTitle.textContent = i18n[app.lang].recommendations;
    var recSub = document.querySelector('#testimonialsSection .section-subtitle');
    if (recSub) recSub.textContent = i18n[app.lang].whatTheySaid;

    var storiesHeading = document.querySelector('.stories-heading');
    if (storiesHeading) storiesHeading.textContent = i18n[app.lang].latestStories;

    updateStoryData();
  }

  function updateStoryData() {
    var isEn = app.lang === 'en';
    var popImages = document.querySelectorAll('#storiesData .popImage');
    app.allStoryItems.forEach(function (item, i) {
      if (popImages[i]) {
        popImages[i].setAttribute('data-src', item.src);
        popImages[i].setAttribute('data-title', (isEn ? item.titleEn : item.titleAr) || '');
      }
    });
  }

  function renderHero() {
    var heroEl = document.getElementById('heroSection');
    if (!heroEl || heroEl.classList.contains('hero-error-page')) return;
    var slides = (app.data.Slides || []).filter(function (s) { return s.Publish === 1; }).sort(function (a, b) { return (a.Order || 0) - (b.Order || 0); });
    if (slides.length === 0) return;

    var isEn = app.lang === 'en';
    var html = '<div class="main-slider">';
    html += '<div id="carousel-main" class="carousel fade" data-bs-ride="carousel" data-bs-interval="5000">';
    html += '<ol class="carousel-indicators" role="list" aria-label="' + (isEn ? 'Carousel slides' : 'شرائح العرض') + '">';
    slides.forEach(function (_, i) {
      html += '<li data-bs-target="#carousel-main" data-bs-slide-to="' + i + '" role="button" aria-label="' + (isEn ? 'Slide ' + (i + 1) : 'شريحة ' + (i + 1)) + '"' + (i === 0 ? ' class="active" aria-current="true"' : '') + '></li>';
    });
    html += '</ol><div class="carousel-inner">';
    slides.forEach(function (s, i) {
      var title = isEn ? s.TitleEn : s.TitleAr;
      html += '<div class="carousel-item item' + (i === 0 ? ' active' : '') + '">';
      html += '<div class="img" style="background-image:url(\'/' + s.Image + '\')"></div>';
      html += '<div class="slideText">';
      html += '<div class="display-table"><div class="display-row">';
      html += '<div class="display-cell">';
      html += '<div class="text-wrapper"><h1>' + (title || '') + '</h1></div>';
      html += '</div></div></div></div>';
      html += '</div>';
    });
    html += '</div>';
    html += '<button class="carousel-control-prev" type="button" data-bs-target="#carousel-main" data-bs-slide="prev" aria-label="' + (isEn ? 'Previous slide' : 'الشريحة السابقة') + '"><span class="carousel-control-prev-icon" aria-hidden="true"></span></button>';
    html += '<button class="carousel-control-next" type="button" data-bs-target="#carousel-main" data-bs-slide="next" aria-label="' + (isEn ? 'Next slide' : 'الشريحة التالية') + '"><span class="carousel-control-next-icon" aria-hidden="true"></span></button>';
    html += '</div></div>';

    heroEl.innerHTML = html;
    initHeroCarouselClasses();
  }

  function initHeroCarouselClasses() {
    var carousel = document.getElementById('carousel-main');
    if (!carousel) return;
    var items = carousel.querySelectorAll('.carousel-item');
    function updateClasses() {
      var activeIdx = -1;
      items.forEach(function (it, i) {
        if (it.classList.contains('active')) activeIdx = i;
      });
      if (activeIdx < 0) return;
      items.forEach(function (it, i) {
        it.classList.remove('was', 'then');
        if (i === activeIdx) it.classList.add('active');
        else if (i === (activeIdx - 1 + items.length) % items.length) it.classList.add('was');
        else if (i === (activeIdx + 1) % items.length) it.classList.add('then');
      });
    }
    updateClasses();
    carousel.addEventListener('slid.bs.carousel', updateClasses);
  }

  function renderProjects() {
    var categories = (app.data.Categories || []).filter(function (c) { return c.Publish === 1; }).sort(function (a, b) { return (a.Order || 0) - (b.Order || 0); });

    var isEn = app.lang === 'en';
    var html = '';
    categories.forEach(function (c) {
      var title = isEn ? c.TitleEn : c.TitleAr;
      var count = c.postCount || 0;
      // if image is null or empty, set it to /images/placeholder.jpg
      if (!c.Image || c.Image === '') c.Image = 'images/theme/default-category.jpg';
      html += '<div class="col-6 col-md-3 mb-4"><div class="project-card skeleton" data-category-id="' + c.CategoryID + '"><a href="/projects?category=' + c.CategoryID + '" class="project-link">';
      html += '<div class="project-img" data-src="' + c.Image + '"></div>';
      html += '<div class="project-overlay"><h2 class="text-center">' + title + '</h2>';
      html += '<div class="project-overlay-footer"><span class="project-count"><i class="bi bi-images"></i> ' + count + '</span><span class="go-btn">' + i18n[app.lang].go + ' <i class="bi bi-arrow-' + (isEn ? 'right' : 'left') + '-circle"></i></span></div></div></a></div></div>';
    });

    var grid = document.getElementById('projectsGrid');
    if (grid) grid.innerHTML = html;
    categories.forEach(function (c) {
      var imgUrl = '/' + c.Image;
      var img = new Image();
      img.onload = img.onerror = function () {
        var card = document.querySelector('.project-card[data-category-id="' + c.CategoryID + '"]');
        if (card) {
          card.classList.remove('skeleton');
          var cardImg = card.querySelector('.project-img');
          if (cardImg) cardImg.style.backgroundImage = 'url("' + imgUrl + '")';
        }
      };
      img.src = imgUrl;
    });
  }

  function countTo(el, target, duration, useLocale) {
    if (!el) return;
    var start = 0;
    var startTime = null;
    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var elapsed = timestamp - startTime;
      var progress = Math.min(elapsed / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 2);
      var current = Math.round(start + (target - start) * eased);
      el.textContent = useLocale ? current.toLocaleString() : String(current);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function runStatsCountTo(statsEl) {
    if (!statsEl) return;
    var items = statsEl.querySelectorAll('.stat-item .stat-value[data-target]');
    items.forEach(function (el) {
      var target = parseInt(el.getAttribute('data-target'), 10);
      if (isNaN(target)) return;
      var useLocale = el.getAttribute('data-locale') === '1';
      countTo(el, target, 2000, useLocale);
    });
  }

  function initStatsCountTo() {
    var statsEl = document.getElementById('statsSection');
    if (!statsEl || statsEl.dataset.countToInit) return;
    function triggerCount() {
      statsEl.dataset.countToInit = '1';
      runStatsCountTo(statsEl);
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        triggerCount();
      });
    }, { threshold: 0.2 });
    var rect = statsEl.getBoundingClientRect();
    var inView = rect.top < window.innerHeight && rect.bottom > 0;
    if (inView) triggerCount();
    else observer.observe(statsEl);
  }

  function renderStats() {
    var stats = app.stats || { totalVisits: 0, countryList: [], totalProjects: 0 };
    var projectsCount = stats.totalProjects || 0;
    var totalVisits = stats.totalVisits || 0;
    var totalCountries = stats.totalCountries || 0;
    var isEn = app.lang === 'en';

    var html = '<div class="container"><div class="d-flex flex-column flex-sm-row justify-content-center align-items-center gap-2">';
    html += '<div class="d-flex d-sm-inline-flex"><div class="stat-item"><i class="bi bi-briefcase"></i><span><span class="stat-value" data-target="' + projectsCount + '">0</span><br><b>' + i18n[app.lang].projectsCount + '</b></span></div></div>';
    html += '<div class="d-flex d-sm-inline-flex"><div class="stat-item"><i class="bi bi-people"></i><span><span class="stat-value" data-target="' + totalVisits + '" data-locale="1">0</span><br><b>' + i18n[app.lang].visits + '</b></span></div></div>';
    html += '<div class="d-flex d-sm-inline-flex"><div class="stat-item"><i class="bi bi-globe"></i><span><span class="stat-value" data-target="' + totalCountries + '">0</span><br><b>' + i18n[app.lang].countries + '</b></span></div></div>';
    if (stats.countryList && stats.countryList.length > 0) {
      html += '<div class="stat-item countries-preview d-none"><i class="bi bi-globe"></i><div class="country-flags">';
      stats.countryList.slice(0, 5).forEach(function (c) {
        html += '<span title="' + (isEn ? c.enName : c.arName) + ': ' + c.visitorsCount + '">' + (c.code || '').toUpperCase() + '</span>';
      });
      html += '</div></div>';
    }
    html += '</div></div>';

    var statsEl = document.getElementById('statsSection');
    if (statsEl) {
      statsEl.innerHTML = html;
      delete statsEl.dataset.countToInit;
      initStatsCountTo();
    }
  }

  function renderTestimonials() {
    var testimonials = (app.data.Testimonials || []).filter(function (t) { return t.Publish === 1; }).sort(function (a, b) { return (a.Order || 0) - (b.Order || 0); });
    if (testimonials.length === 0) return;

    var isEn = app.lang === 'en';
    var html = '<div class="container"><h2 class="section-title text-white">' + i18n[app.lang].recommendations + '</h2>';
    html += '<p class="section-subtitle text-light">' + i18n[app.lang].whatTheySaid + '</p>';
    html += '<div id="testimonialCarousel" class="carousel slide" data-bs-ride="carousel"><div class="carousel-inner">';

    testimonials.forEach(function (tst, i) {
      var content = (isEn ? tst.ContentEn : tst.ContentAr) || '';
      var name = (isEn ? tst.NameEn : tst.NameAr) || '';
      html += '<div class="carousel-item' + (i === 0 ? ' active' : '') + '"><blockquote><p>' + content.replace(/\n/g, '<br>') + '</p><small>' + name + '</small></blockquote></div>';
    });

    html += '</div><div class="testimonial-indicators">';
    var n = testimonials.length;
    var idx = function (i) { return ((i % n) + n) % n; };
    for (var k = 0; k < 3; k++) {
      var slideIdx = idx(k - 1);
      var tst = testimonials[slideIdx];
      var tstName = (isEn ? tst.NameEn : tst.NameAr) || '';
      html += '<button type="button" data-bs-target="#testimonialCarousel" data-bs-slide-to="' + slideIdx + '" aria-label="' + (isEn ? 'View testimonial ' + (slideIdx + 1) : 'عرض التوصية ' + (slideIdx + 1)) + (tstName ? ': ' + tstName.replace(/"/g, '&quot;') : '') + '"' + (k === 1 ? ' class="active center" aria-current="true"' : '') + '><img src="/' + tst.Image + '" alt="" role="presentation"></button>';
    }
    html += '</div><button class="carousel-control-prev" type="button" data-bs-target="#testimonialCarousel" data-bs-slide="prev" aria-label="' + (isEn ? 'Previous testimonial' : 'التوصية السابقة') + '"><i class="bi bi-chevron-left" aria-hidden="true"></i></button>';
    html += '<button class="carousel-control-next" type="button" data-bs-target="#testimonialCarousel" data-bs-slide="next" aria-label="' + (isEn ? 'Next testimonial' : 'التوصية التالية') + '"><i class="bi bi-chevron-right" aria-hidden="true"></i></button></div></div>';

    var testimonialsEl = document.getElementById('testimonialsSection');
    if (testimonialsEl) testimonialsEl.innerHTML = html;

    var carousel = document.getElementById('testimonialCarousel');
    if (carousel) {
      var items = carousel.querySelectorAll('.carousel-item');
      var inner = carousel.querySelector('.carousel-inner');
      if (items.length > 0 && inner) {
        function setEqualHeights() {
          carousel.classList.add('measuring-heights');
          var maxH = 0;
          items.forEach(function (it) { maxH = Math.max(maxH, it.offsetHeight); });
          carousel.classList.remove('measuring-heights');
          if (maxH > 0) inner.style.minHeight = maxH + 'px';
        }
        setEqualHeights();
        setTimeout(setEqualHeights, 100);
      }
    }
    if (carousel && n > 0 && typeof bootstrap !== 'undefined') {
      carousel.addEventListener('slid.bs.carousel', function (e) {
        var activeIdx = Array.prototype.indexOf.call(carousel.querySelectorAll('.carousel-item'), carousel.querySelector('.carousel-item.active'));
        if (activeIdx < 0) return;
        var btns = carousel.parentElement.querySelectorAll('.testimonial-indicators button');
        if (btns.length !== 3) return;
        [idx(activeIdx - 1), activeIdx, idx(activeIdx + 1)].forEach(function (slideTo, k) {
          var tst = testimonials[slideTo];
          btns[k].setAttribute('data-bs-slide-to', String(slideTo));
          btns[k].querySelector('img').src = '/' + tst.Image;
          btns[k].classList.toggle('active', k === 1);
          btns[k].classList.toggle('center', k === 1);
        });
      });
    }
  }

  function render() {
    renderHero();
    renderProjects();
    renderStats();
    renderTestimonials();

    var aboutText = document.getElementById('aboutText');
    if (aboutText) aboutText.innerHTML = i18n[app.lang].aboutText;

    var servicesText = document.getElementById('servicesText');
    if (servicesText) {
      var data = i18n[app.lang].servicesText;
      var html = '<ul class="services-list list-unstyled">';
      for (var cat in data) {
        html += '<li><i class="bi bi-check-circle-fill text-warning"></i> ' + cat;
        if (data[cat] && data[cat].length > 0) {
          html += '<ul class="list-unstyled ms-3">';
          data[cat].forEach(function (item) {
            html += '<li><i class="bi bi-dot text-warning"></i> ' + item + '</li>';
          });
          html += '</ul>';
        }
        html += '</li>';
      }
      html += '</ul>';
      servicesText.innerHTML = html;
    }

    var yearEl = document.getElementById('currentYear');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    var loader = document.getElementById('ajaxLoader');
    if (loader) loader.removeAttribute('style');
  }

  function updateNavAuth() {
    var dropdownEl = document.getElementById('navAuthDropdown');
    var loginEls = document.querySelectorAll('.navAuthLogin');
    if (!dropdownEl || loginEls.length === 0) return;
    fetch('/api/me', { credentials: 'include' })
      .then(function (r) {
        if (r.ok) return r.json();
        throw new Error('Not authenticated');
      })
      .then(function (data) {
        var t = i18n[app.lang];
        if (data.user) {
          var firstName = (data.user.name || '').split(/\s+/)[0] || data.user.name || 'User';
          var imgSrc = data.user.picture && data.user.picture.indexOf('/') === 0 ? data.user.picture : (data.user.picture || '');
          dropdownEl.innerHTML = '<div class="dropdown">' +
            '<button class="btn btn-link text-decoration-none dropdown-toggle d-flex align-items-center gap-2 p-0" data-bs-toggle="dropdown" aria-expanded="false">' +
            (imgSrc ? '<img src="' + imgSrc + '" alt="" class="rounded-circle" width="32" height="32" style="object-fit:cover">' : '<span class="rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center" style="width:32px;height:32px;font-size:14px">' + (firstName.charAt(0) || '?') + '</span>') +
            '<span class="text-dark">' + t.welcome + ' ' + firstName + '</span></button>' +
            '<ul class="dropdown-menu dropdown-menu-end">' +
            '<li><a class="dropdown-item" href="/dashboard"><i class="bi bi-speedometer2"></i> ' + t.dashboard + '</a></li>' +
            '<li><a class="dropdown-item" href="/auth/logout"><i class="bi bi-box-arrow-right"></i> ' + t.logout + '</a></li></ul></div>';
          loginEls.forEach(function (el) { el.innerHTML = ''; });
        } else {
          dropdownEl.innerHTML = '';
          loginEls.forEach(function (el) { el.innerHTML = '<button type="button" class="btn btn-login-nav" data-bs-toggle="modal" data-bs-target="#loginModal">' + t.login + '</button>'; });
        }
      })
      .catch(function () {
        dropdownEl.innerHTML = '';
        var t = i18n[app.lang];
        loginEls.forEach(function (el) { el.innerHTML = '<button type="button" class="btn btn-login-nav" data-bs-toggle="modal" data-bs-target="#loginModal">' + t.login + '</button>'; });
      });
  }

  function initLoginModal() {
    var modal = document.getElementById('loginModal');
    var googleBtn = document.getElementById('loginModalGoogleBtn');
    var captchaImg = document.getElementById('loginCaptchaImg');
    var captchaInput = document.getElementById('loginCaptchaInput');
    if (!modal || !googleBtn) return;
    function refreshLoginCaptcha() {
      if (captchaImg) captchaImg.src = '/api/captcha?t=' + Date.now();
      if (captchaInput) captchaInput.value = '';
    }
    modal.addEventListener('show.bs.modal', refreshLoginCaptcha);
    modal.addEventListener('shown.bs.modal', function () {
      if (captchaInput) setTimeout(function () { captchaInput.focus(); }, 100);
    });
    if (captchaImg) captchaImg.addEventListener('click', refreshLoginCaptcha);
    if (captchaInput) {
      captchaInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          googleBtn.click();
        }
      });
    }
    googleBtn.addEventListener('click', function (e) {
      e.preventDefault();
      var val = captchaInput ? captchaInput.value.trim() : '';
      if (!val) {
        alert(app.lang === 'ar' ? 'أدخل الرمز أولاً' : 'Please enter the captcha first.');
        return;
      }
      fetch('/api/verify-login-captcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ captcha: val })
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.ok) {
            window.location.href = '/auth/google';
          } else {
            refreshLoginCaptcha();
            alert(app.lang === 'ar' ? 'الرمز غير صحيح. حاول مرة أخرى.' : 'Invalid captcha. Please try again.');
          }
        })
        .catch(function () {
          refreshLoginCaptcha();
          alert(app.lang === 'ar' ? 'حدث خطأ. حاول مرة أخرى.' : 'An error occurred. Please try again.');
        });
    });
  }

  function init() {
    updateNavAuth();
    initLoginModal();
    var urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('error') === 'unauthorized') {
      var authErrorModal = document.getElementById('authErrorModal');
      if (authErrorModal && typeof bootstrap !== 'undefined') {
        var m = new bootstrap.Modal(authErrorModal);
        m.show();
      } else {
        alert(i18n[app.lang].authError);
      }
      history.replaceState({}, '', window.location.pathname);
    }
    var savedLang = localStorage.getItem('istaqm_lang') || 'ar';
    setLanguage(savedLang);

    var langBtns = document.querySelectorAll('.langSwitch');
    if (langBtns) {
      langBtns.forEach(function (langBtn) {
        langBtn.addEventListener('click', function () {
          var newLang = app.lang === 'en' ? 'ar' : 'en';
          localStorage.setItem('istaqm_lang', newLang);
          setLanguage(newLang);
        });
      });
    }

    fetch('/api/home')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        app.data = data;
        render();
      })
      .catch(function () { app.data = { Categories: [], Slides: [], Testimonials: [] }; render(); });

    fetch('/api/stats')
      .then(function (r) { return r.json(); })
      .then(function (stats) {
        app.stats = stats;
        renderStats();
      })
      .catch(function () {});

    // //hide ajax loader when all requests are done
    // function hideAjaxLoader() {
    //   //remove style attribute from ajaxLoader
    //   if (ajaxLoader) ajaxLoader.removeAttribute('style');
    // }
    // setTimeout(hideAjaxLoader, 100);

    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(function () {
        (navigator.sendBeacon && navigator.sendBeacon('/api/record-visit')) || fetch('/api/record-visit', { method: 'POST', keepalive: true }).catch(function () {});
      }, { timeout: 3000 });
    } else {
      setTimeout(function () {
        (navigator.sendBeacon && navigator.sendBeacon('/api/record-visit')) || fetch('/api/record-visit', { method: 'POST', keepalive: true }).catch(function () {});
      }, 1000);
    }

    checkWebpSupport(function (supported) {
      if (!supported) showWebpBanner();
    });

    var captchaImg = document.getElementById('captchaImg');
    if (captchaImg) {
      captchaImg.addEventListener('click', function () {
        this.src = '/api/captcha?t=' + Date.now();
      });
    }

    var contactForm = document.getElementById('contactForm');
    if (contactForm) {
      contactForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var btn = contactForm.querySelector('button[type="submit"]');
        var origText = btn.textContent;
        btn.disabled = true;
        btn.textContent = app.lang === 'ar' ? 'جاري الإرسال...' : 'Sending...';
        fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: document.getElementById('contactName').value,
            email: document.getElementById('contactEmail').value,
            subject: document.getElementById('contactSubject').value,
            message: document.getElementById('contactMessage').value,
            captcha: document.getElementById('contactCaptcha').value
          })
        })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (data.ok) {
              contactForm.reset();
              document.getElementById('captchaImg').src = '/api/captcha?t=' + Date.now();
              alert(app.lang === 'ar' ? 'تم إرسال رسالتك بنجاح.' : 'Your message was sent successfully.');
            } else {
              document.getElementById('captchaImg').src = '/api/captcha?t=' + Date.now();
              alert(data.error || (app.lang === 'ar' ? 'حدث خطأ. حاول مرة أخرى.' : 'An error occurred. Please try again.'));
            }
          })
          .catch(function () {
            alert(app.lang === 'ar' ? 'حدث خطأ. حاول مرة أخرى.' : 'An error occurred. Please try again.');
          })
          .finally(function () {
            btn.disabled = false;
            btn.textContent = origText;
          });
      });
    }
  }
  //create ajax loader
  var ajaxLoader = document.createElement('div');
  ajaxLoader.id = 'ajaxLoader';
  ajaxLoader.style.display = 'block';
  ajaxLoader.style.opacity = '1';
  document.body.appendChild(ajaxLoader);

  document.addEventListener('DOMContentLoaded', init);
})();
