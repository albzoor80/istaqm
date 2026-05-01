/**
 * Istaqim About Page - Professional company profile
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
      sendEmail: 'أرسل لنا بالإيميل',
      name: 'الإسم',
      email: 'الإيميل',
      subject: 'الموضوع',
      message: 'الرسالة',
      captcha: 'أدخل الرمز',
      send: 'إرسال',
      orChat: 'أو دردش',
      aboutBadge: 'منذ 2019',
      aboutPageTitle: 'استقم — رؤية تصميمية تُحوّل الأفكار إلى واقع',
      aboutIntroLead: 'شركة تصميم وديكور رائدة في الأردن، نقدم حلولاً إبداعية في التصميم الداخلي والخارجي وتنسيق المناسبات، مع التزامنا بالجودة والابتكار.',
      ourStory: 'قصتنا',
      storyTitle: 'من المفرق إلى العالمية',
      storyText: 'انطلقت استقم في عام 2019 من قلب محافظة المفرق، الأردن، كفكرة طموحة من شباب مبدع يؤمن بقوة التصميم في تحويل المساحات وتجربة الحياة. بدأنا بفريق صغير وثقة كبيرة، وها نحن اليوم نُعد من الشركات الرائدة في مجال التصميم الداخلي والخارجي وتنسيق المناسبات في المنطقة.<br><br>نعمل تحت إشراف كادر مميز من المهندسين والحرفيين والمصممين، ونواكب أحدث التصاميم العالمية لنقدم لكم تصاميم عصرية تحاكي أحدث الصيحات مع الحفاظ على الهوية المحلية.',
      statYear: '2019',
      statYearLabel: 'سنة التأسيس',
      statProjects: '100+',
      statProjectsLabel: 'مشروع منجز',
      statTeam: '15+',
      statTeamLabel: 'خبير ومصمم',
      missionTitle: 'رسالتنا',
      missionText: 'تقديم جميع الخدمات التصميمية والديكورية باستخدام أحدث التقنيات وبجودة عالية ومواصفات عصرية. نقدم أيضاً خدمات استشارية وإشرافية متكاملة لضمان تنفيذ مشاريعكم بأعلى المعايير.',
      visionTitle: 'رؤيتنا',
      visionText: 'خدمة المجتمع المحلي من خلال توفير ما يلزم لمواكبة أحدث التصاميم العالمية. نبدأ من المفرق والأردن كمنطلق، ونسير نحو العالمية بأنامل وسواعد فريق استقم المبدع.',
      ourServices: 'خدماتنا',
      servicesHeading: 'ما نقدمه لكم',
      service1Title: 'التصميم الداخلي',
      service1Desc: 'منازل، شقق، مكاتب، عيادات، متاجر وأكثر',
      service2Title: 'التصميم الخارجي',
      service2Desc: 'مزارع، حدائق، مسابح، ملاعب ومنشآت رياضية',
      service3Title: 'تنسيق المناسبات',
      service3Desc: 'خطوبة، زواج، تخرج، أعياد ميلاد واستقبال مولود',
      service4Title: 'أعمال يدوية',
      service4Desc: 'مباخر، تلبيسة، صور، مداليات ومطبوعات',
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
      ctaTitle: 'جاهزون لبدء مشروعك؟',
      ctaText: 'تواصل معنا اليوم واستشارة مجانية. فريقنا جاهز لتحويل رؤيتك إلى واقع ملموس.',
      viewAllProjects: 'عرض كافة المشاريع'
    },
    en: {
      home: 'Home',
      projects: 'Projects',
      about: 'About',
      contact: 'Contact Us',
      istaqim: 'Istaqim',
      developedBy: 'Developed by Nowaty',
      langSwitchLabel: 'عربي',
      sendEmail: 'Send us by email',
      name: 'Name',
      email: 'Email',
      subject: 'Subject',
      message: 'Message',
      captcha: 'Enter code',
      send: 'Send',
      orChat: 'Or chat',
      aboutBadge: 'Since 2019',
      aboutPageTitle: 'Istaqim — A Design Vision That Turns Ideas Into Reality',
      aboutIntroLead: 'A leading design and decoration company in Jordan, we deliver creative solutions in interior, exterior, and event planning—committed to quality and innovation.',
      ourStory: 'Our Story',
      storyTitle: 'From Al-Mafraq to the World',
      storyText: 'Istaqim was founded in 2019 in Al-Mafraq, Jordan, as an ambitious vision of young creatives who believe in the power of design to transform spaces and life experiences. We started with a small team and big confidence—today we are among the leading firms in interior design, exterior design, and event planning in the region.<br><br>We work under the supervision of a distinguished team of engineers, craftsmen, and designers, keeping pace with the latest global design trends to deliver modern designs that match international standards while honoring local identity.',
      statYear: '2019',
      statYearLabel: 'Year Founded',
      statProjects: '100+',
      statProjectsLabel: 'Projects Delivered',
      statTeam: '15+',
      statTeamLabel: 'Experts & Designers',
      missionTitle: 'Our Mission',
      missionText: 'To provide all design and decoration services using the latest technologies, with high quality and modern specifications. We also offer comprehensive consulting and supervision services to ensure your projects are executed to the highest standards.',
      visionTitle: 'Our Vision',
      visionText: 'To serve the local community by providing what it takes to keep pace with the latest global designs. We start from Al-Mafraq and Jordan as our launchpad, and march toward the world with the hands and arms of the creative Istaqim team.',
      ourServices: 'Our Services',
      servicesHeading: 'What We Offer',
      service1Title: 'Interior Design',
      service1Desc: 'Houses, apartments, offices, clinics, stores, and more',
      service2Title: 'Exterior Design',
      service2Desc: 'Farms, gardens, pools, pitches, and sports facilities',
      service3Title: 'Event Planning',
      service3Desc: 'Engagement, wedding, graduation, birthdays, baby showers',
      service4Title: 'Handmade',
      service4Desc: 'Censers, stands, portraits, medals, and printings',
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
      ctaTitle: 'Ready to Start Your Project?',
      ctaText: 'Contact us today for a free consultation. Our team is ready to turn your vision into reality.',
      viewAllProjects: 'View All Projects'
    }
  };

  var app = { lang: 'ar', dir: 'rtl' };

  function setLanguage(lang) {
    app.lang = lang === 'en' || lang === 'en-us' ? 'en' : 'ar';
    app.dir = app.lang === 'en' ? 'ltr' : 'rtl';
    document.documentElement.lang = app.lang;
    document.documentElement.dir = app.dir;
    document.body.className = app.dir;
    document.title = app.lang === 'en' ? 'Istaqim - About Us' : 'استقم - من نحن';
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
    render();
  }

  function render() {
    var t = i18n[app.lang];
    var storyEl = document.getElementById('aboutStoryText');
    if (storyEl) storyEl.innerHTML = t.storyText;

    var missionEl = document.getElementById('missionText');
    if (missionEl) missionEl.textContent = t.missionText;

    var visionEl = document.getElementById('visionText');
    if (visionEl) visionEl.textContent = t.visionText;

    renderServices();
    renderWhyCards();
  }

  function renderServices() {
    var t = i18n[app.lang];
    var services = [
      { icon: 'bi-house-door', title: t.service1Title, desc: t.service1Desc },
      { icon: 'bi-tree', title: t.service2Title, desc: t.service2Desc },
      { icon: 'bi-balloon-heart', title: t.service3Title, desc: t.service3Desc },
      { icon: 'bi-brush', title: t.service4Title, desc: t.service4Desc }
    ];
    var html = '';
    services.forEach(function (s) {
      html += '<div class="col-md-6 col-lg-3"><div class="about-service-card">';
      html += '<div class="about-service-icon"><i class="bi ' + s.icon + '"></i></div>';
      html += '<h4>' + s.title + '</h4>';
      html += '<p>' + s.desc + '</p>';
      html += '</div></div>';
    });
    var grid = document.getElementById('aboutServicesGrid');
    if (grid) grid.innerHTML = html;
  }

  function renderWhyCards() {
    var t = i18n[app.lang];
    var cards = [
      { icon: 'bi-award', title: t.whyCard1Title, text: t.whyCard1Text },
      { icon: 'bi-palette', title: t.whyCard2Title, text: t.whyCard2Text },
      { icon: 'bi-geo-alt', title: t.whyCard3Title, text: t.whyCard3Text },
      { icon: 'bi-clock-history', title: t.whyCard4Title, text: t.whyCard4Text },
      { icon: 'bi-people', title: t.whyCard5Title, text: t.whyCard5Text },
      { icon: 'bi-headset', title: t.whyCard6Title, text: t.whyCard6Text }
    ];
    var html = '';
    cards.forEach(function (c) {
      html += '<div class="col-md-6 col-lg-4"><div class="about-why-card">';
      html += '<div class="about-why-icon"><i class="bi ' + c.icon + '"></i></div>';
      html += '<h3>' + c.title + '</h3>';
      html += '<p>' + c.text + '</p>';
      html += '</div></div>';
    });
    var grid = document.getElementById('aboutWhyGrid');
    if (grid) grid.innerHTML = html;
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
