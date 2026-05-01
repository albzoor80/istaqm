/**
 * Istaqim Projects Page - Category filter, grid, pagination, story gallery
 */
(function () {
  'use strict';

  var i18n = {
    ar: { home: 'الرئيسية', projects: 'المشاريع', about: 'من نحن', contact: 'تواصل معنا', ourProjects: 'مشاريعنا', all: 'الكل', bannerTagline: 'بكم نرتقي و معكم نستمر!', istaqim: 'استقم', developedBy: 'تطوير نواتي', langSwitchLabel: 'English', prev: 'السابق', next: 'التالي', sendEmail: 'أرسل لنا بالإيميل', name: 'الإسم', email: 'الإيميل', subject: 'الموضوع', message: 'الرسالة', captcha: 'أدخل الرمز', send: 'إرسال', orChat: 'أو دردش', signInTitle: 'تسجيل الدخول', signInSub: 'سجّل دخولك باستخدام حساب Google للوصول إلى لوحة التحكم', signInGoogle: 'تسجيل الدخول باستخدام Google' },
    en: { home: 'Home', projects: 'Projects', about: 'About', contact: 'Contact Us', ourProjects: 'Our Projects', all: 'All', bannerTagline: 'With you we rise and continue!', istaqim: 'Istaqim', developedBy: 'Developed by Nowaty', langSwitchLabel: 'عربي', prev: 'Previous', next: 'Next', sendEmail: 'Send us by email', name: 'Name', email: 'Email', subject: 'Subject', message: 'Message', captcha: 'Enter code', send: 'Send', orChat: 'Or chat', signInTitle: 'Sign In', signInSub: 'Sign in with your Google account to access the dashboard', signInGoogle: 'Sign in with Google' }
  };

  var app = { lang: 'ar', dir: 'rtl', data: null, pageSize: 24, currentPage: 1, currentCategory: 0 };

  function getUrlParam(name) {
    var m = window.location.search.match(new RegExp('[?&]' + name + '=([^&]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }

  function getHashPostId() {
    var hash = window.location.hash || '';
    var m = hash.match(/^#p(\d+)$/i);
    return m ? parseInt(m[1], 10) : null;
  }

  function showAjaxLoader() {
    var loader = document.getElementById('ajaxLoader');
    if (loader) loader.style.display = 'block';
  }
  function hideAjaxLoader() {
    var loader = document.getElementById('ajaxLoader');
    if (loader) loader.removeAttribute('style');
  }

  function setLanguage(lang) {
    app.lang = lang === 'en' || lang === 'en-us' ? 'en' : 'ar';
    app.dir = app.lang === 'en' ? 'ltr' : 'rtl';
    document.documentElement.lang = app.lang;
    document.documentElement.dir = app.dir;
    document.body.className = app.dir;
    document.title = app.lang === 'en' ? 'Istaqim - Projects' : 'استقم - المشاريع';
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

  function getGalleryForPost(postId) {
    var gallery = (app.data.Galleries || app.data.Gallery || []).filter(function (g) { return g.PostID === postId; });
    gallery.sort(function (a, b) { return (a.Order || 0) - (b.Order || 0); });
    return gallery;
  }

  function getCityName(cityId) {
    var cities = app.data.Cities || [];
    var c = cities.find(function (x) { return x.CityID === cityId; });
    return c ? (app.lang === 'en' ? c.TitleEn : c.TitleAr) : '';
  }

  function renderCategoryFilters() {
    var categories = (app.data.Categories || []).filter(function (c) { return c.Publish === 1; }).sort(function (a, b) { return (a.Order || 0) - (b.Order || 0); });
    var isEn = app.lang === 'en';
    var html = '<button type="button" class="btn btn-outline-secondary btn-sm category-btn' + (app.currentCategory === 0 ? ' active' : '') + '" data-id="0">' + i18n[app.lang].all + '</button>';
    categories.forEach(function (c) {
      html += '<button type="button" class="btn btn-outline-secondary btn-sm category-btn' + (app.currentCategory === c.CategoryID ? ' active' : '') + '" data-id="' + c.CategoryID + '">' + (isEn ? c.TitleEn : c.TitleAr) + '</button>';
    });
    document.getElementById('categoryFilters').innerHTML = html;
    document.querySelectorAll('.category-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        app.currentCategory = parseInt(this.getAttribute('data-id'), 10);
        app.currentPage = 1;
        updateUrl();
        fetchProjects();
      });
    });
  }

  function updateUrl() {
    var url = '/projects';
    if (app.currentCategory > 0) url += '?category=' + app.currentCategory;
    if (app.currentPage > 1) url += (url.indexOf('?') >= 0 ? '&' : '?') + 'page=' + app.currentPage;
    var hash = window.location.hash || '';
    if (hash) url += hash;
    window.history.replaceState({}, '', url);
  }

  function fetchProjects() {
    var params = 'category=' + app.currentCategory + '&page=' + app.currentPage + '&pageSize=' + app.pageSize;
    var hashPostId = getHashPostId();
    if (hashPostId) params += '&postId=' + hashPostId;
    showAjaxLoader();
    fetch('/api/projects?' + params)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        app.data = data;
        app.currentPage = data.page || app.currentPage;
        if (hashPostId && data.category !== undefined) app.currentCategory = data.category;
        renderCategoryFilters();
        renderProjects();
        renderPagination();
        updateUrl();
        if (hashPostId) {
          var card = document.querySelector('.project-list-card[data-post-id="' + hashPostId + '"]');
          if (card) setTimeout(function () { card.click(); }, 100);
        }
      })
      .catch(function () {
        app.data = { Categories: [], Posts: [], total: 0, totalPages: 1, Cities: [], Galleries: [] };
        renderCategoryFilters();
        renderProjects();
        renderPagination();
      })
      .finally(function () {
        hideAjaxLoader();
      });
  }

  function isYouTubeURL(url) {
    return /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w\-]+)/i.test(url);
  }

  function renderProjects() {
    var pagePosts = app.data.Posts || [];
    var isEn = app.lang === 'en';
    var html = '';
    pagePosts.forEach(function (post) {
      var gallery = getGalleryForPost(post.PostID);
      var items = []; //[{ src: '/' + post.Image, isVideo: false }];
      gallery.forEach(function (g) {
        if (g.YTube && g.YTube.trim()) {
          var ytube = g.YTube.trim();
          var src = isYouTubeURL(ytube) ? ytube : '/' + ytube;
          items.push({ src: src, isVideo: true });
        } else if (g.Image) {
          items.push({ src: '/' + g.Image, isVideo: false });
        }
      });
      var imgCount = items.filter(function (it) { return it.isVideo === false; }).length;
      var videoCount = items.filter(function (it) { return it.isVideo === true; }).length;
      var cityName = getCityName(post.CityID);
      var       title = (isEn ? post.TitleEn : post.TitleAr) || '';
      var desc = (isEn ? post.DescriptionEn : post.DescriptionAr) || '';
      var cardImgSrc = (post.ImageThumb || post.Image || 'images/theme/default-project.jpg');
      html += '<div class="col-6 col-md-4 col-lg-3"><div class="project-list-card skeleton" data-post-id="' + post.PostID + '">';
      html += '<div class="card-img" data-src="' + cardImgSrc + '"></div>';
      html += '<div class="card-overlay"><h4 class="card-title">' + title.replace(/</g, '&lt;') + '</h4>';
      html += '<div class="card-meta"><span class="location"><i class="bi bi-geo-alt"></i> ' + (cityName || '') + '</span><span><span class="media-count"><i class="bi bi-images"></i> ' + imgCount + '</span>' + (videoCount > 0 ? '<span class="media-count"><i class="bi bi-play-btn"></i> ' + videoCount + '</span>' : '') + '</span></div></div>';
      html += '<div class="project-gallery-data" style="display:none;">';
      items.forEach(function (it) {
        var safeDesc = (desc || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        html += '<a href="javascript:void(0)" class="popImage" data-src="' + it.src.replace(/"/g, '&quot;') + '" data-title="' + (title || '').replace(/"/g, '&quot;') + '" data-description="' + safeDesc + '"></a>';
      });
      html += '</div></div></div>';
    });
    document.getElementById('projectsList').innerHTML = html;

    pagePosts.forEach(function (post) {
      var thumbPath = (post.ImageThumb || post.Image || 'images/theme/default-project.jpg');
      var imgUrl = '/' + thumbPath;
      var img = new Image();
      img.onload = img.onerror = function () {
        var card = document.querySelector('.project-list-card[data-post-id="' + post.PostID + '"]');
        if (card) {
          card.classList.remove('skeleton');
          var cardImg = card.querySelector('.card-img');
          if (cardImg) cardImg.style.backgroundImage = 'url("' + imgUrl + '")';
        }
      };
      img.src = imgUrl;
    });

    document.querySelectorAll('.project-list-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var galleryDiv = this.querySelector('.project-gallery-data');
        if (!galleryDiv) return;
        var storiesData = document.getElementById('storiesData');
        storiesData.innerHTML = '';
        var postId = this.getAttribute('data-post-id');
        if (postId) storiesData.setAttribute('data-post-id', postId);
        var links = galleryDiv.querySelectorAll('a.popImage');
        for (var i = 0; i < links.length; i++) {
          storiesData.appendChild(links[i].cloneNode(true));
        }
        if (typeof fbHistory === 'function') fbHistory('#storiesData', 0);
      });
    });
  }

  function renderPagination() {
    var totalPages = app.data.totalPages || 1;
    var wrap = document.getElementById('paginationWrap');
    if (totalPages <= 1) {
      wrap.innerHTML = '';
      return;
    }
    var isEn = app.lang === 'en';
    var html = '<nav><ul class="pagination justify-content-center">';
    html += '<li class="page-item' + (app.currentPage <= 1 ? ' disabled' : '') + '"><a class="page-link" href="#" data-page="' + (app.currentPage - 1) + '">' + (isEn ? 'Previous' : 'السابق') + '</a></li>';
    for (var i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= app.currentPage - 2 && i <= app.currentPage + 2)) {
        html += '<li class="page-item' + (i === app.currentPage ? ' active' : '') + '"><a class="page-link" href="#" data-page="' + i + '">' + i + '</a></li>';
      } else if (i === app.currentPage - 3 || i === app.currentPage + 3) {
        html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
      }
    }
    html += '<li class="page-item' + (app.currentPage >= totalPages ? ' disabled' : '') + '"><a class="page-link" href="#" data-page="' + (app.currentPage + 1) + '">' + (isEn ? 'Next' : 'التالي') + '</a></li>';
    html += '</ul></nav>';
    wrap.innerHTML = html;
    wrap.querySelectorAll('.page-link[data-page]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var p = parseInt(this.getAttribute('data-page'), 10);
        if (p >= 1 && p <= totalPages) {
          app.currentPage = p;
          updateUrl();
          fetchProjects();
        }
      });
    });
  }

  function init() {
    var savedLang = localStorage.getItem('istaqm_lang') || 'ar';
    setLanguage(savedLang);
    app.currentCategory = parseInt(getUrlParam('category'), 10) || 0;
    app.currentPage = parseInt(getUrlParam('page'), 10) || 1;

    document.querySelectorAll('.langSwitch').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var newLang = app.lang === 'en' ? 'ar' : 'en';
        localStorage.setItem('istaqm_lang', newLang);
        setLanguage(newLang);
        renderCategoryFilters();
        renderProjects();
        renderPagination();
      });
    });

    document.getElementById('currentYear').textContent = new Date().getFullYear();

    var hashPostId = getHashPostId();
    if (hashPostId) {
      app.currentCategory = 0;
      app.currentPage = 1;
    }
    fetchProjects();

    // function hideAjaxLoader() {
    //   if (ajaxLoader) ajaxLoader.removeAttribute('style');
    // }
    // setTimeout(hideAjaxLoader, 10);
  }

  //create ajax loader
  // var ajaxLoader = document.createElement('div');
  // ajaxLoader.id = 'ajaxLoader';
  // ajaxLoader.style.display = 'block';
  // ajaxLoader.style.opacity = '1';
  // document.body.appendChild(ajaxLoader);

  document.addEventListener('DOMContentLoaded', init);
})();
