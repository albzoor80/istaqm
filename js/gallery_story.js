/**
 * Istaqim Gallery Story - Facebook-style story viewer
 * Supports images, videos, and YouTube embeds
 * Vanilla JS with optional jQuery compatibility
 */
(function (global) {
  'use strict';

  function isImageUrl(url) {
    if (!url) return false;
    var ext = url.split('.').pop().toLowerCase().split('?')[0];
    return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].indexOf(ext) >= 0;
  }

  function isYouTubeURL(url) {
    return /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w\-]+)/i.test(url);
  }

  function getYouTubeVideoId(url) {
    var m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w\-]+)/i);
    return m ? m[1] : null;
  }

  function loadYouTubeAPI() {
    return new Promise(function (resolve) {
      if (global.YT && global.YT.Player) {
        resolve();
        return;
      }
      var tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      var first = document.getElementsByTagName('script')[0];
      first.parentNode.insertBefore(tag, first);
      global.onYouTubeIframeAPIReady = resolve;
    });
  }

  function fbHistory(postsWrap, startIndex) {
    startIndex = startIndex || 0;
    var wrap = typeof postsWrap === 'string' ? document.querySelector(postsWrap) :
      (postsWrap && postsWrap.jquery ? postsWrap[0] : postsWrap);
    if (!wrap) return;

    var links = wrap.querySelectorAll ? wrap.querySelectorAll('a.popImage') : [];
    if (typeof postsWrap !== 'string' && postsWrap && postsWrap.jquery) {
      links = postsWrap.find('a.popImage').toArray();
    }
    var allStories = [];
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      var src = a.getAttribute ? a.getAttribute('data-src') : a.dataset.src;
      var title = a.getAttribute ? a.getAttribute('data-title') : a.dataset.title || '';
      var description = a.getAttribute ? a.getAttribute('data-description') : a.dataset.description || '';
      var img = isImageUrl(src);
      allStories.push({
        id: i,
        title: title || '',
        description: description || '',
        imageUrl: img ? src : '',
        videoUrl: !img ? (src || '') : ''
      });
    }
    if (allStories.length === 0) return;

    var storiesFullView = document.querySelector('.stories-full-view');
    if (!storiesFullView) return;
    var getShareUrl = function() {
      var postId = wrap.getAttribute ? wrap.getAttribute('data-post-id') : null;
      return postId ? (window.location.origin + '/projects#p' + postId) : window.location.href;
    }
    var shareBtns = storiesFullView.querySelector('.share_btns');
    if (shareBtns) {
      var enc = encodeURIComponent(getShareUrl());
      var messenger = shareBtns.querySelector('[data-share-direct="messenger"]');
      var whatsapp = shareBtns.querySelector('[data-share-direct="whatsapp"]');
      var email = shareBtns.querySelector('[data-share-direct="email"]');
      if (messenger) messenger.href = 'https://m.me/106071017456792?text=' + enc;
      if (whatsapp) whatsapp.href = 'https://wa.me/962798051005?text=' + enc;
      if (email) email.href = 'mailto:istaqim.design@gmail.com?subject=' + encodeURIComponent('Check this out') + '&body=' + enc;
      if (!shareBtns._shareDropdownBound) {
        shareBtns._shareDropdownBound = true;
        shareBtns.addEventListener('click', function (e) {
          var item = e.target.closest('[data-share-via]');
          if (!item) return;
          e.preventDefault();
          var enc2 = encodeURIComponent(getShareUrl());
          var via = item.getAttribute('data-share-via');
          var shareUrl2;
          if (via === 'facebook') shareUrl2 = 'https://www.facebook.com/sharer/sharer.php?u=' + enc2;
          else if (via === 'messenger') shareUrl2 = 'fb-messenger://share/?link=' + enc2;
          else if (via === 'x') shareUrl2 = 'https://x.com/intent/tweet?url=' + enc2;
          else if (via === 'whatsapp') shareUrl2 = 'https://wa.me/?text=' + enc2;
          else if (via === 'email') shareUrl2 = 'mailto:?subject=' + encodeURIComponent('Check this out') + '&body=' + enc2;
          if (shareUrl2) window.open(shareUrl2, '_blank', 'noopener,noreferrer');
        });
      }
    }

    var closeBtn = storiesFullView.querySelector('.close-btn');
    var pausePlayBtn = storiesFullView.querySelector('.pause-play-btn');
    var storyDiv = storiesFullView.querySelector('.story');
    var indicators = storyDiv ? storyDiv.querySelector('.indicators') : null;
    var storyTitleEl = storyDiv ? storyDiv.querySelector('.title') : null;
    var nextFull = storiesFullView.querySelector('.next');
    var previousFull = storiesFullView.querySelector('.previous');
    var nextBtnFull = storiesFullView.querySelector('.next .next-btn, .next-btn');
    var prevBtnFull = storiesFullView.querySelector('.previous .previous-btn, .previous-btn');

    var overlay = storiesFullView.querySelector('.video-overlay');
    var contentEl = storiesFullView.querySelector('.content');
    var descPanel = storiesFullView.querySelector('.story-description-panel');
    var descTitleEl = descPanel ? descPanel.querySelector('.story-description-title') : null;
    var descTextEl = descPanel ? descPanel.querySelector('.story-description-text') : null;
    var currentActive = Math.min(startIndex, allStories.length - 1);
    var DRAG_CLOSE_THRESHOLD = 100;
    var imgDuration = 5000;
    var imgTimeStep = 50;
    var isEnded = false;
    var youtubePlayer = null;
    var ytbInterval = null;
    var imgInterval = null;
    var mousedown = false, startX, startY, moveX, moveY;
    var isPaused = false;

    function toggleFullscreen(isExit) {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      } else if (typeof isExit === 'undefined') {
        if (storiesFullView.requestFullscreen) storiesFullView.requestFullscreen();
        else if (storiesFullView.webkitRequestFullscreen) storiesFullView.webkitRequestFullscreen();
      }
    }

    function removePopObj() {
      var items = storyDiv.querySelectorAll('video, img, iframe, .embed-youtube');
      items.forEach(function (el) { el.remove(); });
      if (ytbInterval) {
        clearInterval(ytbInterval);
        ytbInterval = null;
      }
      if (youtubePlayer) {
        try { youtubePlayer.destroy && youtubePlayer.destroy(); } catch (e) {}
        youtubePlayer = null;
      }
      if (imgInterval) {
        clearInterval(imgInterval);
        imgInterval = null;
      }
      isEnded = false;
    }

    function updateProgress(idx, pct) {
      if (!indicators) return;
      var divs = indicators.querySelectorAll('div');
      if (divs[idx]) {
        var span = divs[idx].querySelector('span');
        if (span) span.style.width = pct + '%';
      }
    }

    function handleVideoEnd() {
      isEnded = true;
      if (nextFull) nextFull.click();
    }

    function trackImgProgress() {
      if (isPaused) return;
      imgInterval = setInterval(function () {
        if (isPaused) return;
        var img = storyDiv.querySelector('img');
        if (img && img.getAttribute('data-running') === 'true') {
          var t = parseFloat(img.getAttribute('data-time') || '0') + (imgTimeStep / imgDuration * 100);
          img.setAttribute('data-time', t);
          if (t >= 100) handleVideoEnd();
          else updateProgress(currentActive, Math.min(Math.round(t), 100));
        }
      }, imgTimeStep);
    }

    function doPause() {
      isPaused = true;
      if (ytbInterval) { clearInterval(ytbInterval); ytbInterval = null; }
      if (imgInterval) { clearInterval(imgInterval); imgInterval = null; }
      var vid = storyDiv.querySelector('video');
      var img = storyDiv.querySelector('img');
      if (vid) vid.pause();
      else if (youtubePlayer && youtubePlayer.pauseVideo) youtubePlayer.pauseVideo();
      else if (img) img.setAttribute('data-running', 'false');
      if (pausePlayBtn) {
        var icon = pausePlayBtn.querySelector('i');
        if (icon) { icon.className = 'bi bi-play-fill'; }
        pausePlayBtn.title = 'Play';
      }
    }

    function doResume() {
      isPaused = false;
      var vid = storyDiv.querySelector('video');
      var img = storyDiv.querySelector('img');
      if (vid) vid.play();
      else if (youtubePlayer && youtubePlayer.playVideo) youtubePlayer.playVideo();
      else if (img) {
        img.setAttribute('data-running', 'true');
        trackImgProgress();
      }
      if (pausePlayBtn) {
        var icon = pausePlayBtn.querySelector('i');
        if (icon) { icon.className = 'bi bi-pause-fill'; }
        pausePlayBtn.title = 'Pause';
      }
    }

    function updateFullView() {
      updateProgress(currentActive, 0);
      var cur = allStories[currentActive];
      var hasVideo = cur.videoUrl && cur.videoUrl.trim() !== '';
      removePopObj();

      if (hasVideo) {
        var vidUrl = cur.videoUrl;
        if (isYouTubeURL(vidUrl)) {
          loadYouTubeAPI().then(function () {
            var yid = getYouTubeVideoId(vidUrl);
            var divYTB = document.createElement('div');
            divYTB.className = 'embed-youtube';
            divYTB.id = 'youtube-video';
            storyDiv.appendChild(divYTB);
            youtubePlayer = new global.YT.Player('youtube-video', {
              videoId: yid,
              playerVars: {
                autoplay: 1, mute: 1, controls: 0, fs: 0, loop: 0,
                modestbranding: 1, showinfo: 0, rel: 0
              },
              events: {
                onReady: function () {
                  if (youtubePlayer.setPlaybackQuality) youtubePlayer.setPlaybackQuality('hd720');
                  if (youtubePlayer.unMute) youtubePlayer.unMute();
                  if (youtubePlayer.setVolume) youtubePlayer.setVolume(100);
                  if (isPaused) {
                    if (youtubePlayer.pauseVideo) youtubePlayer.pauseVideo();
                  } else {
                    if (youtubePlayer.playVideo) youtubePlayer.playVideo();
                  }
                },
                onStateChange: function (e) {
                  if (e.data === global.YT.PlayerState.PLAYING) {
                    if (isPaused) return;
                    updateProgress(currentActive, 0);
                    ytbInterval = setInterval(function () {
                      if (isPaused || !youtubePlayer) return;
                      if (youtubePlayer.getCurrentTime) {
                        var ct = youtubePlayer.getCurrentTime();
                        var dur = youtubePlayer.getDuration();
                        updateProgress(currentActive, Math.round((ct / dur) * 100));
                      }
                    }, 500);
                  } else if (e.data === global.YT.PlayerState.ENDED) {
                    clearInterval(ytbInterval);
                    handleVideoEnd();
                  }
                }
              }
            });
          });
        } else {
          var vid = document.createElement('video');
          vid.autoplay = !isPaused;
          vid.playsInline = true;
          vid.src = vidUrl;
          storyDiv.appendChild(vid);
          vid.addEventListener('ended', handleVideoEnd);
          vid.addEventListener('timeupdate', function (e) {
            if (isPaused) return;
            var t = e.target;
            if (t.duration) updateProgress(currentActive, Math.round((t.currentTime / t.duration) * 100));
          });
        }
      } else {
        var img = document.createElement('img');
        img.src = cur.imageUrl;
        img.setAttribute('data-time', '0');
        img.setAttribute('data-running', isPaused ? 'false' : 'true');
        storyDiv.appendChild(img);
        var preload = new Image();
        preload.onload = preload.onerror = function () { if (!isPaused) trackImgProgress(); };
        preload.src = cur.imageUrl;
      }

      var hasDesc = (cur.description || '').trim() !== '';
      var hasTitle = (cur.title || '').trim() !== '';
      var showPanel = hasDesc;
      if (storyTitleEl) {
        storyTitleEl.textContent = cur.title || '';
        storyTitleEl.style.display = (!showPanel && hasTitle) ? 'block' : 'none';
      }
      if (descPanel) {
        descPanel.style.display = showPanel ? 'flex' : 'none';
        if (contentEl) contentEl.classList.toggle('has-description-panel', showPanel);
        if (showPanel) {
          if (descTitleEl) {
            descTitleEl.textContent = cur.title || '';
            descTitleEl.style.display = hasTitle ? 'block' : 'none';
          }
          if (descTextEl) {
            descTextEl.textContent = cur.description || '';
            descTextEl.style.display = hasDesc ? 'block' : 'none';
            descTextEl.dir = document.documentElement.dir || 'ltr';
          }
        }
      }

      if (nextBtnFull) {
        nextBtnFull.classList.add('active');
        if (currentActive >= allStories.length - 1) nextBtnFull.classList.remove('active');
      }
      if (prevBtnFull) {
        prevBtnFull.classList.add('active');
        if (currentActive <= 0) prevBtnFull.classList.remove('active');
      }
    }

    function showFullView() {
      if (!indicators) return;
      isPaused = false;
      overlay.classList.remove('dragging');
      if (contentEl) {
        contentEl.style.transform = '';
        contentEl.style.opacity = '';
      }
      indicators.innerHTML = allStories.map(function () {
        return '<div><span></span></div>';
      }).join('');
      indicators.style.gridTemplateColumns = 'repeat(' + allStories.length + ', 1fr)';

      currentActive = Math.min(startIndex, allStories.length - 1);
      updateFullView();
      if (pausePlayBtn) {
        var icon = pausePlayBtn.querySelector('i');
        if (icon) icon.className = 'bi bi-pause-fill';
        pausePlayBtn.title = 'Pause';
      }
      storiesFullView.classList.add('active');
      toggleFullscreen();
    }

    function handleClose() {
      overlay.classList.remove('dragging');
      if (contentEl) {
        contentEl.style.transition = '';
        contentEl.style.transform = '';
        contentEl.style.opacity = '';
        contentEl.classList.remove('has-description-panel');
      }
      toggleFullscreen(1);
      storiesFullView.classList.remove('active');
      removePopObj();
      if (indicators) indicators.innerHTML = '';
      overlay.removeEventListener('mousedown', onMouseDown);
      overlay.removeEventListener('touchstart', onMouseDown);
      overlay.removeEventListener('mouseup', onMouseUp);
      overlay.removeEventListener('touchend', onMouseUp);
      overlay.removeEventListener('touchcancel', onMouseUp);
      overlay.removeEventListener('mousemove', onMouseMove);
      overlay.removeEventListener('touchmove', onMouseMove);
      if (nextFull) nextFull.removeEventListener('click', onNext);
      if (previousFull) previousFull.removeEventListener('click', onPrev);
      document.removeEventListener('keydown', onKey);
      closeBtn.removeEventListener('click', handleClose);
      if (pausePlayBtn) pausePlayBtn.removeEventListener('click', onPausePlayClick);
    }

    function onPausePlayClick() {
      isPaused = !isPaused;
      if (isPaused) doPause();
      else doResume();
    }

    function onNext() {
      if (currentActive >= allStories.length - 1) {
        handleClose();
        return;
      }
      updateProgress(currentActive, 100);
      currentActive++;
      updateFullView();
    }

    function onPrev() {
      if (currentActive <= 0) return;
      updateProgress(currentActive, 0);
      currentActive--;
      updateFullView();
    }

    function onKey(e) {
      if (e.key === 'ArrowLeft') previousFull && previousFull.click();
      else if (e.key === 'ArrowRight') nextFull && nextFull.click();
    }

    function applyDragTransform(d) {
      if (!contentEl) return;
      var t = Math.min(d / DRAG_CLOSE_THRESHOLD, 1);
      var scale = 1 - t * 0.25;
      var opacity = 1 - t * 0.5;
      contentEl.style.transform = 'scale(' + scale + ')';
      contentEl.style.opacity = String(opacity);
    }

    function resetDragTransform() {
      if (!contentEl) return;
      contentEl.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease-out';
      contentEl.style.transform = 'scale(1)';
      contentEl.style.opacity = '1';
      contentEl.addEventListener('transitionend', function onEnd() {
        contentEl.removeEventListener('transitionend', onEnd);
        contentEl.style.transition = '';
      }, { once: true });
    }

    function onMouseDown(e) {
      e.preventDefault();
      mousedown = true;
      startX = e.clientX || (e.touches && e.touches[0].clientX);
      startY = e.clientY || (e.touches && e.touches[0].clientY);
      if (contentEl) contentEl.style.transition = 'none';
      if (ytbInterval) { clearInterval(ytbInterval); ytbInterval = null; }
      var vid = storyDiv.querySelector('video');
      var img = storyDiv.querySelector('img');
      if (vid) vid.pause();
      else if (youtubePlayer && youtubePlayer.pauseVideo) youtubePlayer.pauseVideo();
      else if (img) img.setAttribute('data-running', 'false');
    }

    function onMouseUp(e) {
      e.preventDefault();
      var d = 0;
      if (mousedown) {
        var upX = e.clientX || (e.changedTouches && e.changedTouches[0].clientX);
        var upY = e.clientY || (e.changedTouches && e.changedTouches[0].clientY);
        d = Math.sqrt(Math.pow(upX - startX, 2) + Math.pow(upY - startY, 2));
      }
      mousedown = false;
      overlay.classList.remove('dragging');
      if (d > DRAG_CLOSE_THRESHOLD) {
        handleClose();
      } else {
        resetDragTransform();
        if (!isPaused) {
          var vid = storyDiv.querySelector('video');
          var img = storyDiv.querySelector('img');
          if (vid) vid.play();
          else if (youtubePlayer && youtubePlayer.playVideo) youtubePlayer.playVideo();
          else if (img) img.setAttribute('data-running', 'true');
        }
      }
    }

    function onMouseMove(e) {
      e.preventDefault();
      if (mousedown) {
        moveX = e.clientX || (e.touches && e.touches[0].clientX);
        moveY = e.clientY || (e.touches && e.touches[0].clientY);
        var d = Math.sqrt(Math.pow(moveX - startX, 2) + Math.pow(moveY - startY, 2));
        overlay.classList.add('dragging');
        applyDragTransform(d);
      }
    }

    overlay.addEventListener('mousedown', onMouseDown);
    overlay.addEventListener('touchstart', onMouseDown);
    overlay.addEventListener('mouseup', onMouseUp);
    overlay.addEventListener('touchend', onMouseUp);
    overlay.addEventListener('touchcancel', onMouseUp);
    overlay.addEventListener('mousemove', onMouseMove);
    overlay.addEventListener('touchmove', onMouseMove);
    if (nextFull) nextFull.addEventListener('click', onNext);
    if (previousFull) previousFull.addEventListener('click', onPrev);
    document.addEventListener('keydown', onKey);
    closeBtn.addEventListener('click', handleClose);
    if (pausePlayBtn) pausePlayBtn.addEventListener('click', onPausePlayClick);

    showFullView();
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { fbHistory: fbHistory };
  } else {
    global.fbHistory = fbHistory;
  }
})(typeof window !== 'undefined' ? window : global);
