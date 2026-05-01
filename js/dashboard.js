/**
 * Istaqim Dashboard - Admin panel for database management
 */
(function () {
  'use strict';

  var user = null;
  var categories = [];
  var cities = [];
  var slides = [];
  var testimonials = [];
  var users = [];
  var posts = [];
  var postsCurrentPage = 1;
  var loadingView = document.getElementById('loadingView');

  function fetchOptions() {
    return { credentials: 'include' };
  }

  function showToast(type, message) {
    type = type || 'info';
    var icons = { success: 'bi-check-circle-fill', danger: 'bi-exclamation-triangle-fill', warning: 'bi-exclamation-circle-fill', info: 'bi-info-circle-fill' };
    var bg = { success: 'bg-success', danger: 'bg-danger', warning: 'bg-warning', info: 'bg-info' };
    var container = document.getElementById('toastContainer');
    if (!container) return;
    var toastEl = document.createElement('div');
    toastEl.className = 'toast align-items-center text-bg-' + type + ' border-0';
    toastEl.setAttribute('role', 'alert');
    toastEl.innerHTML = '<div class="d-flex"><div class="toast-body"><i class="bi ' + (icons[type] || icons.info) + ' me-2"></i>' + (message || '') + '</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>';
    container.appendChild(toastEl);
    var toast = new bootstrap.Toast(toastEl, { autohide: true, delay: 4000 });
    toast.show();
    toastEl.addEventListener('hidden.bs.toast', function () { toastEl.remove(); });
  }

  function showConfirm(opts, onConfirm) {
    if (typeof opts === 'string') opts = { message: opts };
    var modal = document.getElementById('confirmModal');
    var titleEl = modal ? modal.querySelector('#confirmModalLabel') : null;
    var bodyEl = document.getElementById('confirmModalBody');
    var btnEl = document.getElementById('confirmModalBtn');
    if (!modal || !bodyEl || !btnEl) return;
    titleEl.textContent = opts.title || 'Confirm';
    bodyEl.textContent = opts.message || 'Are you sure?';
    btnEl.textContent = opts.confirmText || 'Confirm';
    btnEl.className = 'btn ' + (opts.confirmClass || 'btn-primary');
    var bsModal = bootstrap.Modal.getOrCreateInstance(modal);
    var handler = function () {
      btnEl.removeEventListener('click', handler);
      bsModal.hide();
      if (typeof onConfirm === 'function') onConfirm();
    };
    btnEl.addEventListener('click', handler);
    bsModal.show();
  }

  function updateHeaderUser() {
    var nameEl = document.getElementById('userName');
    var avatarEl = document.getElementById('userAvatar');
    if (nameEl) nameEl.textContent = (user && (user.name || '').split(/\s+/)[0]) || (user && user.email) || 'User';
    if (avatarEl && user) {
      var pic = user.picture;
      if (pic) {
        avatarEl.src = (pic.startsWith('http') || pic.startsWith('/')) ? pic : '/' + pic.replace(/^\/+/, '');
        avatarEl.alt = user.name || '';
        avatarEl.style.display = '';
      }
    }
  }

  function showPage(pageId) {
    document.querySelectorAll('.page-content').forEach(function (el) { el.classList.add('d-none'); });
    document.querySelectorAll('.sidebar .nav-link').forEach(function (el) { el.classList.remove('active'); });
    var pageEl = document.getElementById(pageId + 'Page');
    var linkEl = document.querySelector('.sidebar .nav-link[data-page="' + pageId + '"]');
    if (pageEl) pageEl.classList.remove('d-none');
    if (linkEl) linkEl.classList.add('active');
    var headerNavItems = document.querySelectorAll('.main-navbar .nav-item');
    headerNavItems.forEach(function (li) {
      var a = li.querySelector('a[data-page]');
      var targetPage = pageId === 'profile' ? 'profile' : 'stats';
      li.classList.toggle('active', a && a.getAttribute('data-page') === targetPage);
    });
  }

  var categoryImageState = { originalPath: '', pendingFile: null, removed: false };
  var projectImageState = { originalPath: '', pendingFile: null, removed: false };
  var projectGalleryState = { items: [], toDelete: [] };

  function dropdownActions(id, type, opts) {
    opts = opts || {};
    var html = '<div class="dropdown">' +
      '<button class="btn btn-sm btn-light dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false"><i class="bi bi-three-dots-vertical"></i></button>' +
      '<ul class="dropdown-menu">' +
      '<li><a class="dropdown-item" href="#" data-action="edit" data-id="' + id + '" data-type="' + type + '"><i class="bi bi-pencil me-2"></i>Edit</a></li>';
    html += '<li><a class="dropdown-item text-danger" href="#" data-action="delete" data-id="' + id + '" data-type="' + type + '"><i class="bi bi-trash me-2"></i>Delete</a></li>' +
      '</ul></div>';
    return html;
  }

  function handleTableAction(e) {
    var a = e.target.closest('a[data-action][data-id][data-type]');
    if (!a) return;
    e.preventDefault();
    var id = parseInt(a.getAttribute('data-id'), 10);
    var type = a.getAttribute('data-type');
    var action = a.getAttribute('data-action');
    if (action === 'delete') {
      showConfirm({
        title: 'Delete ' + type.charAt(0).toUpperCase() + type.slice(1),
        message: 'Are you sure you want to delete this ' + type + '?',
        confirmText: 'Delete',
        confirmClass: 'btn-danger'
      }, function () {
        if (type === 'post') deletePost(id);
        else if (type === 'category') deleteCategory(id);
        else if (type === 'city') deleteCity(id);
        else if (type === 'slide') deleteSlide(id);
        else if (type === 'testimonial') deleteTestimonial(id);
        else if (type === 'user') deleteUser(id);
        else showToast('warning', 'Edit/Delete for ' + type + ' coming soon');
      });
    } else if (action === 'edit') {
      if (type === 'category') openCategoryModal(id);
      else if (type === 'city') openCityModal(id);
      else if (type === 'post') openProjectModal(id);
      else if (type === 'slide') openSlideModal(id);
      else if (type === 'testimonial') openTestimonialModal(id);
      else if (type === 'user') openUserModal(id);
      else showToast('info', 'Edit coming soon');
    }
  }

  function renderPagination(containerId, page, totalPages, onPage) {
    var nav = document.getElementById(containerId);
    if (!nav) return;
    if (totalPages <= 1) { nav.innerHTML = ''; return; }
    var html = '<ul class="pagination pagination-bar justify-content-center mb-0">';
    html += '<li class="page-item' + (page <= 1 ? ' disabled' : '') + '"><a class="page-link" href="#" data-page="' + (page - 1) + '" aria-label="Previous"><i class="bi bi-chevron-left"></i></a></li>';
    var start = Math.max(1, page - 2);
    var end = Math.min(totalPages, page + 2);
    if (start > 1) {
      html += '<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>';
      if (start > 2) html += '<li class="page-item disabled"><span class="page-link page-ellipsis">...</span></li>';
    }
    for (var i = start; i <= end; i++) {
      html += '<li class="page-item' + (i === page ? ' active' : '') + '"><a class="page-link" href="#" data-page="' + i + '">' + i + '</a></li>';
    }
    if (end < totalPages) {
      if (end < totalPages - 1) html += '<li class="page-item disabled"><span class="page-link page-ellipsis">...</span></li>';
      html += '<li class="page-item"><a class="page-link" href="#" data-page="' + totalPages + '">' + totalPages + '</a></li>';
    }
    html += '<li class="page-item' + (page >= totalPages ? ' disabled' : '') + '"><a class="page-link" href="#" data-page="' + (page + 1) + '" aria-label="Next"><i class="bi bi-chevron-right"></i></a></li>';
    html += '</ul>';
    nav.innerHTML = html;
    nav.querySelectorAll('a[data-page]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        if (this.closest('.page-item.disabled')) return;
        onPage(parseInt(this.getAttribute('data-page'), 10));
      });
    });
  }

  function loadStats(countryPage) {
    countryPage = countryPage || 1;
    loadingView.classList.add('show');
    fetch('/api/dashboard/stats?countryPage=' + countryPage + '&countryPageSize=20', fetchOptions())
      .then(function (r) { return r.json(); })
      .then(function (data) {
        document.getElementById('statProjects').textContent = (data.totalProjects || 0).toLocaleString();
        document.getElementById('statVisits').textContent = (data.totalVisits || 0).toLocaleString();
        document.getElementById('statCountries').textContent = (data.totalCountries || 0).toLocaleString();
        document.getElementById('statProjectsImages').textContent = (data.totalProjectsImages || 0).toLocaleString();
        document.getElementById('statCategories').textContent = (data.totalCategories || 0).toLocaleString();
        document.getElementById('statCities').textContent = (data.totalCities || 0).toLocaleString();
        document.getElementById('statSlides').textContent = (data.totalSlides || 0).toLocaleString();
        document.getElementById('statTestimonials').textContent = (data.totalTestimonials || 0).toLocaleString();
        document.getElementById('statUsers').textContent = (data.totalUsers || 0).toLocaleString();
        document.getElementById('statFolderSize').textContent = (data.folderSize || 0).toLocaleString();
        var tbody = document.getElementById('statsCountriesTable');
        var list = data.countryList || [];
        tbody.innerHTML = list.map(function (c) {
          return '<tr><td>' + (c.enName || '-') + '</td><td>' + (c.visitorsCount || 0).toLocaleString() + '</td></tr>';
        }).join('') || '<tr><td colspan="2" class="text-muted">No data</td></tr>';
        renderPagination('statsCountriesPagination', data.page || 1, data.totalPages || 1, loadStats);
        loadingView.classList.remove('show');
      }).catch(function () {
        loadingView.classList.remove('show');
      });
  }

  function loadCategories() {
    loadingView.classList.add('show');
    fetch('/api/dashboard/categories', fetchOptions())
      .then(function (r) { return r.json(); })
      .then(function (data) {
        categories = data.items || [];
        var tbody = document.getElementById('categoriesTable');
        tbody.innerHTML = categories.map(function (c) {
          var img = c.Image ? '<img src="/' + c.Image + '" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:6px">' : '-';
          return '<tr data-id="' + c.CategoryID + '" class="draggable-row">' +
            '<td class="drag-handle text-muted" draggable="true"><i class="bi bi-grip-vertical"></i></td>' +
            '<td>' + dropdownActions(c.CategoryID, 'category') + '</td>' +
            '<td>' + c.CategoryID + '</td><td>' + img + '</td><td>' + (c.TitleEn || '-') + '</td><td>' + (c.TitleAr || '-') + '</td>' +
            '<td>' + (c.Publish ? 'Yes' : 'No') + '</td></tr>';
        }).join('') || '<tr><td colspan="7" class="text-muted">No categories</td></tr>';
        initTableDragDrop('categoriesTable', '/api/dashboard/categories/reorder', loadCategories, 'Categories order updated.');
        loadingView.classList.remove('show');
      }).catch(function () {
        loadingView.classList.remove('show');
      });
  }

  function initTableDragDrop(tbodyId, reorderUrl, reloadFn, successMessage) {
    var tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    var rows = tbody.querySelectorAll('tr.draggable-row');
    if (rows.length < 2) return;
    var draggedRow = null;
    var scrollContainer = tbody.closest('.main-content') || tbody.closest('.table-responsive') || tbody.closest('.table-card') || document.body;
    var scrollInterval = null;
    var lastClientY = 0;
    var dragReadyTime = 0; /* drag delay: ready 120ms after pointerdown */

    var placeholder = null;
    var colCount = (tbody.querySelector('tr.draggable-row') && tbody.querySelector('tr.draggable-row').cells.length) || 7;

    function clearDragOver() {
      tbody.querySelectorAll('tr.draggable-row').forEach(function (r) { r.classList.remove('drag-over'); });
      removePlaceholder();
    }

    function removePlaceholder() {
      if (placeholder && placeholder.parentNode) {
        placeholder.parentNode.removeChild(placeholder);
        placeholder = null;
      }
    }

    function createPlaceholder() {
      if (placeholder) return placeholder;
      var tr = document.createElement('tr');
      tr.className = 'drop-placeholder';
      tr.setAttribute('data-placeholder', '1');
      var td = document.createElement('td');
      td.colSpan = colCount;
      tr.appendChild(td);
      placeholder = tr;
      return tr;
    }

    function insertPlaceholderBefore(refRow) {
      var ph = createPlaceholder();
      if (ph.parentNode) ph.parentNode.removeChild(ph);
      tbody.insertBefore(ph, refRow);
    }

    function insertPlaceholderAfter(refRow) {
      var ph = createPlaceholder();
      if (ph.parentNode) ph.parentNode.removeChild(ph);
      var next = refRow.nextElementSibling;
      if (next) tbody.insertBefore(ph, next);
      else tbody.appendChild(ph);
    }

    function createDragGhost(row) {
      var ghost = row.cloneNode(true);
      ghost.classList.add('dragging');
      ghost.style.cssText = 'position:absolute;top:-9999px;left:-9999px;opacity:0.7;pointer-events:none;width:' + row.offsetWidth + 'px;box-shadow:0 12px 32px rgba(0,0,0,0.25)';
      ghost.querySelectorAll('.dropdown').forEach(function (d) { d.remove(); });
      document.body.appendChild(ghost);
      return ghost;
    }

    function startAutoScroll(clientY) {
      lastClientY = clientY;
      if (scrollInterval) return;
      var edgeSize = 40;
      scrollInterval = setInterval(function () {
        if (!draggedRow) { clearInterval(scrollInterval); scrollInterval = null; return; }
        var rect = scrollContainer.getBoundingClientRect();
        var scrollTop = scrollContainer.scrollTop || 0;
        var maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
        if (lastClientY < rect.top + edgeSize && scrollTop > 0) {
          scrollContainer.scrollTop = Math.max(0, scrollTop - 8);
        } else if (lastClientY > rect.bottom - edgeSize && scrollTop < maxScroll) {
          scrollContainer.scrollTop = Math.min(maxScroll, scrollTop + 8);
        }
      }, 16);
    }

    function stopAutoScroll() {
      if (scrollInterval) { clearInterval(scrollInterval); scrollInterval = null; }
    }

    function handlePointerDown(e) {
      if (!e.target.closest('.drag-handle')) return;
      dragReadyTime = Date.now() + 120;
    }

    function handleDragStart(e) {
      if (!e.target.closest('.drag-handle')) return;
      if (Date.now() < dragReadyTime) {
        e.preventDefault();
        return;
      }
      draggedRow = e.target.closest('tr.draggable-row');
      if (draggedRow) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedRow.getAttribute('data-id'));
        try {
          var ghost = createDragGhost(draggedRow);
          e.dataTransfer.setDragImage(ghost, 0, 0);
          setTimeout(function () { if (ghost.parentNode) ghost.parentNode.removeChild(ghost); }, 0);
        } catch (err) { /* fallback to default */ }
        draggedRow.classList.add('dragging');
        draggedRow.setAttribute('aria-grabbed', 'true');
        document.body.classList.add('dragging-active');
      }
    }

    function handleDragEnd(e) {
      if (draggedRow) {
        draggedRow.classList.remove('dragging');
        draggedRow.setAttribute('aria-grabbed', 'false');
      }
      document.body.classList.remove('dragging-active');
      clearDragOver();
      stopAutoScroll();
      draggedRow = null;
    }

    function handleDragOver(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      lastClientY = e.clientY;
      startAutoScroll(e.clientY);
      if (!draggedRow) return;
      var overPlaceholder = e.target.closest('tr.drop-placeholder');
      if (overPlaceholder) return; /* placeholder stays, preventDefault already called */
      var target = e.target.closest('tr.draggable-row');
      if (!target || target === draggedRow) {
        removePlaceholder();
        return;
      }
      tbody.querySelectorAll('tr.draggable-row').forEach(function (r) { r.classList.remove('drag-over'); });
      var rect = target.getBoundingClientRect();
      var mid = rect.top + rect.height / 2;
      if (e.clientY < mid) {
        insertPlaceholderBefore(target);
      } else {
        insertPlaceholderAfter(target);
      }
    }

    function handleDragLeave(e) {
      var related = e.relatedTarget;
      if (!related || !tbody.contains(related)) {
        removePlaceholder();
        tbody.querySelectorAll('tr.draggable-row').forEach(function (r) { r.classList.remove('drag-over'); });
      }
    }

    function handleDrop(e) {
      e.preventDefault();
      stopAutoScroll();
      if (!draggedRow) return;
      var dropTarget = e.target.closest('tr');
      var insertRef = null;
      if (dropTarget && dropTarget.classList.contains('drop-placeholder')) {
        insertRef = dropTarget;
      } else if (placeholder && placeholder.parentNode) {
        insertRef = placeholder;
      } else {
        var target = e.target.closest('tr.draggable-row');
        if (target && target !== draggedRow) {
          var rect = target.getBoundingClientRect();
          insertRef = e.clientY < rect.top + rect.height / 2 ? target : target.nextElementSibling;
        }
      }
      tbody.querySelectorAll('tr.draggable-row').forEach(function (r) { r.classList.remove('drag-over'); });
      if (insertRef) {
        tbody.insertBefore(draggedRow, insertRef);
        removePlaceholder();
        var allRows = Array.from(tbody.querySelectorAll('tr.draggable-row'));
        var newOrder = allRows.map(function (r) { return parseInt(r.getAttribute('data-id'), 10); });
        loadingView.classList.add('show');
        fetch(reorderUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ order: newOrder })
        }).then(function (r) { return r.json(); })
          .then(function () {
            if (reloadFn) reloadFn();
            if (successMessage) showToast('success', successMessage);
          })
          .catch(function () {
            if (reloadFn) reloadFn();
            showToast('danger', 'Failed to update order.');
          })
          .finally(function () { loadingView.classList.remove('show'); });
      } else {
        removePlaceholder();
      }
    }

    rows.forEach(function (row) {
      var handle = row.querySelector('.drag-handle');
      if (handle) {
        handle.setAttribute('role', 'button');
        handle.setAttribute('aria-label', 'Drag to reorder');
        handle.setAttribute('tabindex', '0');
      }
      row.setAttribute('aria-grabbed', 'false');
    });

    var handlers = tbody._dragDropHandlers;
    if (handlers) {
      tbody.removeEventListener('pointerdown', handlers.pointerdown);
      tbody.removeEventListener('dragstart', handlers.dragstart);
      tbody.removeEventListener('dragend', handlers.dragend);
      tbody.removeEventListener('dragover', handlers.dragover);
      tbody.removeEventListener('dragleave', handlers.dragleave);
      tbody.removeEventListener('drop', handlers.drop);
    }
    handlers = { pointerdown: handlePointerDown, dragstart: handleDragStart, dragend: handleDragEnd, dragover: handleDragOver, dragleave: handleDragLeave, drop: handleDrop };
    tbody._dragDropHandlers = handlers;
    tbody.addEventListener('pointerdown', handlePointerDown);
    tbody.addEventListener('dragstart', handleDragStart);
    tbody.addEventListener('dragend', handleDragEnd);
    tbody.addEventListener('dragover', handleDragOver);
    tbody.addEventListener('dragleave', handleDragLeave);
    tbody.addEventListener('drop', handleDrop);
  }

  function openCategoryModal(id) {
    var modal = document.getElementById('categoryModal');
    var titleEl = document.getElementById('categoryModalTitle');
    var idEl = document.getElementById('categoryId');
    var imageEl = document.getElementById('categoryImage');
    var imagePreview = document.getElementById('categoryImagePreview');
    var imageImg = document.getElementById('categoryImageImg');
    var imageInput = document.getElementById('categoryImageInput');
    var imageRemove = document.getElementById('categoryImageRemove');
    var titleEnEl = document.getElementById('categoryTitleEn');
    var titleArEl = document.getElementById('categoryTitleAr');
    var publishEl = document.getElementById('categoryPublish');
    if (!modal) return;
    idEl.value = id ? id : '';
    imageInput.value = '';
    categoryImageState.pendingFile = null;
    categoryImageState.removed = false;
    if (imageImg && imageImg.src && imageImg.src.startsWith('blob:')) URL.revokeObjectURL(imageImg.src);
    if (id) {
      var c = categories.find(function (x) { return x.CategoryID === id; });
      if (c) {
        titleEl.textContent = 'Edit Category';
        titleEnEl.value = c.TitleEn || '';
        titleArEl.value = c.TitleAr || '';
        publishEl.checked = c.Publish === 1;
        categoryImageState.originalPath = c.Image || '';
        if (c.Image) {
          imageEl.value = c.Image;
          imageImg.src = '/' + c.Image;
          imagePreview.style.display = 'block';
          imageRemove.style.display = 'inline-block';
        } else {
          imageEl.value = '';
          imagePreview.style.display = 'none';
          imageRemove.style.display = 'none';
        }
      }
    } else {
      titleEl.textContent = 'Add Category';
      titleEnEl.value = '';
      titleArEl.value = '';
      publishEl.checked = true;
      categoryImageState.originalPath = '';
      imageEl.value = '';
      imagePreview.style.display = 'none';
      imageRemove.style.display = 'none';
    }
    if (typeof bootstrap !== 'undefined') {
      var m = new bootstrap.Modal(modal);
      m.show();
    }
  }

  function saveCategory() {
    var idEl = document.getElementById('categoryId');
    var titleEnEl = document.getElementById('categoryTitleEn');
    var titleArEl = document.getElementById('categoryTitleAr');
    var publishEl = document.getElementById('categoryPublish');
    var id = idEl ? parseInt(idEl.value, 10) : 0;
    var isAdd = !id;
    var titleEn = titleEnEl ? titleEnEl.value.trim() : '';
    var titleAr = titleArEl ? titleArEl.value.trim() : '';
    if (!titleEn) {
      showToast('warning', 'Title (En) is required.');
      return;
    }
    if (!titleAr) {
      showToast('warning', 'Title (Ar) is required.');
      return;
    }
    var imageRequired = isAdd || categoryImageState.removed;
    if (imageRequired && !categoryImageState.pendingFile) {
      showToast('warning', 'Image is required. Please select an image.');
      return;
    }
    var body = { TitleEn: titleEn, TitleAr: titleAr, Publish: publishEl ? publishEl.checked : true };
    var doSave = function (imagePath) {
      if (imagePath !== undefined) body.Image = imagePath;
      else if (categoryImageState.removed && !categoryImageState.pendingFile) body.Image = null;
      else if (!isAdd && !categoryImageState.removed) body.Image = categoryImageState.originalPath || null;
      var url = id ? '/api/dashboard/categories/' + id : '/api/dashboard/categories';
      var method = id ? 'PUT' : 'POST';
      loadingView.classList.add('show');
      fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      }).then(function (r) { return r.json(); })
        .then(function () {
          var modal = document.getElementById('categoryModal');
          if (modal && typeof bootstrap !== 'undefined') bootstrap.Modal.getInstance(modal).hide();
          loadCategories();
          showToast('success', isAdd ? 'Category added successfully.' : 'Category updated successfully.');
        })
        .catch(function () { loadingView.classList.remove('show'); showToast('danger', 'Failed to save category.'); });
    };
    if (categoryImageState.pendingFile) {
      var fd = new FormData();
      fd.append('image', categoryImageState.pendingFile);
      loadingView.classList.add('show');
      fetch('/api/dashboard/categories/upload', {
        method: 'POST',
        credentials: 'include',
        body: fd
      }).then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.path) {
            doSave(data.path);
          } else {
            showToast('danger', data.error || 'Upload failed');
          }
        })
        .catch(function () { showToast('danger', 'Upload failed'); })
        .finally(function () { loadingView.classList.remove('show'); });
    } else {
      doSave();
    }
  }

  function deleteCategory(id) {
    loadingView.classList.add('show');
    fetch('/api/dashboard/categories/' + id, { method: 'DELETE', credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function () {
        loadCategories();
        showToast('success', 'Category deleted successfully.');
      })
      .catch(function () { loadingView.classList.remove('show'); showToast('danger', 'Failed to delete category.'); });
  }

  function loadCities() {
    loadingView.classList.add('show');
    fetch('/api/dashboard/cities', fetchOptions())
      .then(function (r) { return r.json(); })
      .then(function (data) {
        cities = data.items || [];
        var tbody = document.getElementById('citiesTable');
        tbody.innerHTML = cities.map(function (c) {
          return '<tr data-id="' + c.CityID + '" class="draggable-row">' +
            '<td class="drag-handle text-muted" draggable="true"><i class="bi bi-grip-vertical"></i></td>' +
            '<td>' + dropdownActions(c.CityID, 'city') + '</td>' +
            '<td>' + c.CityID + '</td><td>' + (c.TitleEn || '-') + '</td><td>' + (c.TitleAr || '-') + '</td>' +
            '<td>' + (c.parentName || '-') + '</td><td>' + (c.Publish ? 'Yes' : 'No') + '</td></tr>';
        }).join('') || '<tr><td colspan="7" class="text-muted">No cities</td></tr>';
        initTableDragDrop('citiesTable', '/api/dashboard/cities/reorder', loadCities, 'Cities order updated.');
        loadingView.classList.remove('show');
      }).catch(function () {
        loadingView.classList.remove('show');
      });
  }

  function openCityModal(id) {
    var modal = document.getElementById('cityModal');
    var titleEl = document.getElementById('cityModalTitle');
    var idEl = document.getElementById('cityId');
    var titleEnEl = document.getElementById('cityTitleEn');
    var titleArEl = document.getElementById('cityTitleAr');
    var parentEl = document.getElementById('cityParentId');
    var publishEl = document.getElementById('cityPublish');
    if (!modal) return;
    idEl.value = id ? id : '';
    var excludeId = id ? parseInt(id, 10) : null;
    parentEl.innerHTML = '<option value="">— None (top level) —</option>' +
      cities.filter(function (c) { return c.CityID !== excludeId; }).map(function (c) {
        return '<option value="' + c.CityID + '">' + (c.TitleEn || c.TitleAr || c.CityID) + '</option>';
      }).join('');
    if (id) {
      var c = cities.find(function (x) { return x.CityID === id; });
      if (c) {
        titleEl.textContent = 'Edit City';
        titleEnEl.value = c.TitleEn || '';
        titleArEl.value = c.TitleAr || '';
        publishEl.checked = c.Publish === 1;
        parentEl.value = c.ParentID != null ? c.ParentID : '';
      }
    } else {
      titleEl.textContent = 'Add City';
      titleEnEl.value = '';
      titleArEl.value = '';
      publishEl.checked = true;
      parentEl.value = '';
    }
    if (typeof bootstrap !== 'undefined') {
      var m = new bootstrap.Modal(modal);
      m.show();
    }
  }

  function saveCity() {
    var idEl = document.getElementById('cityId');
    var titleEnEl = document.getElementById('cityTitleEn');
    var titleArEl = document.getElementById('cityTitleAr');
    var parentEl = document.getElementById('cityParentId');
    var publishEl = document.getElementById('cityPublish');
    var id = idEl ? parseInt(idEl.value, 10) : 0;
    var isAdd = !id;
    var titleEn = titleEnEl ? titleEnEl.value.trim() : '';
    var titleAr = titleArEl ? titleArEl.value.trim() : '';
    if (!titleEn) {
      showToast('warning', 'Title (En) is required.');
      return;
    }
    if (!titleAr) {
      showToast('warning', 'Title (Ar) is required.');
      return;
    }
    var parentId = parentEl && parentEl.value ? parentEl.value : '';
    var body = { TitleEn: titleEn, TitleAr: titleAr, ParentID: parentId || null, Publish: publishEl ? publishEl.checked : true };
    var url = id ? '/api/dashboard/cities/' + id : '/api/dashboard/cities';
    var method = id ? 'PUT' : 'POST';
    loadingView.classList.add('show');
    fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) {
          loadingView.classList.remove('show');
          showToast('danger', data.error);
          return;
        }
        var modal = document.getElementById('cityModal');
        if (modal && typeof bootstrap !== 'undefined') bootstrap.Modal.getInstance(modal).hide();
        loadCities();
        showToast('success', isAdd ? 'City added successfully.' : 'City updated successfully.');
      })
      .catch(function () { loadingView.classList.remove('show'); showToast('danger', 'Failed to save city.'); });
  }

  function deleteCity(id) {
    loadingView.classList.add('show');
    fetch('/api/dashboard/cities/' + id, { method: 'DELETE', credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) {
          loadingView.classList.remove('show');
          showToast('danger', data.error);
          return;
        }
        loadCities();
        showToast('success', 'City deleted successfully.');
      })
      .catch(function () { loadingView.classList.remove('show'); showToast('danger', 'Failed to delete city.'); });
  }

  function loadPosts(page) {
    loadingView.classList.add('show');
    page = page || 1;
    postsCurrentPage = page;
    var searchEl = document.getElementById('postsSearch');
    var catEl = document.getElementById('postsCategoryFilter');
    var cityEl = document.getElementById('postsCityFilter');
    var search = searchEl ? searchEl.value.trim() : '';
    var categoryID = catEl && catEl.value ? catEl.value : '';
    var cityID = cityEl && cityEl.value ? cityEl.value : '';
    var qs = 'page=' + page + '&pageSize=20';
    if (search) qs += '&search=' + encodeURIComponent(search);
    if (categoryID) qs += '&categoryID=' + encodeURIComponent(categoryID);
    if (cityID) qs += '&cityID=' + encodeURIComponent(cityID);
    fetch('/api/dashboard/posts?' + qs, fetchOptions())
      .then(function (r) { return r.json(); })
      .then(function (data) {
        posts = data.items || [];
        var tbody = document.getElementById('postsTable');
        tbody.innerHTML = posts.map(function (p) {
          var imgSrc = p.ImageThumb || p.Image;
          var img = imgSrc ? '<img src="/' + imgSrc + '" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:6px">' : '-';
          var galleries = p.galleries || [];
          var imgCount = galleries.filter(function (g) { return g.Image && !g.YTube && !g.Video; }).length;
          var vidCount = galleries.filter(function (g) { return g.YTube || g.Video; }).length;
          var galleryCell = '<span class="me-2"><i class="bi bi-images text-primary"></i> ' + imgCount + '</span><span><i class="bi bi-play-btn text-danger"></i> ' + vidCount + '</span>';
          var desc = (p.DescriptionEn || p.DescriptionAr || '-');
          desc = desc.length > 50 ? desc.slice(0, 50) + '…' : desc;
          return '<tr data-id="' + p.PostID + '" class="draggable-row">' +
            '<td class="drag-handle text-muted" draggable="true"><i class="bi bi-grip-vertical"></i></td>' +
            '<td>' + dropdownActions(p.PostID, 'post') + '</td>' +
            '<td>' + p.PostID + '</td><td>' + img + '</td><td>' + (p.TitleEn || p.TitleAr || '-') + '</td>' +
            '<td class="text-muted small">' + desc + '</td>' +
            '<td>' + galleryCell + '</td>' +
            '<td>' + (p.categoryName || '-') + '</td><td>' + (p.cityName || '-') + '</td>' +
            '<td>' + (p.Publish ? 'Yes' : 'No') + '</td></tr>';
        }).join('') || '<tr><td colspan="10" class="text-muted">No projects</td></tr>';
        if (posts.length >= 2) {
          initTableDragDrop('postsTable', '/api/dashboard/posts/reorder', function () { loadPosts(postsCurrentPage); }, 'Projects order updated.');
        }
        renderPagination('postsPagination', data.page || 1, data.totalPages || 1, loadPosts);
        loadingView.classList.remove('show');
      }).catch(function () {
        loadingView.classList.remove('show');
      });
  }

  function deletePost(id) {
    loadingView.classList.add('show');
    fetch('/api/dashboard/posts/' + id, { method: 'DELETE', credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function () {
        loadPosts(postsCurrentPage);
        showToast('success', 'Project deleted successfully.');
      })
      .catch(function () { loadingView.classList.remove('show'); showToast('danger', 'Failed to delete project.'); });
  }

  function galleryThumbPath(imagePath) {
    if (!imagePath) return '';
    return imagePath.replace(/\/gallery\/([^/]+)$/, '/gallery/thumbs/$1');
  }

  function youtubeVideoId(url) {
    if (!url || typeof url !== 'string') return '';
    var m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : '';
  }

  var videoExtRe = /\.(mp4|webm|ogg|mov|avi|mkv|wmv|3gp)$/i;

  function getGalleryItemThumb(item) {
    var vid = youtubeVideoId(item.YTube || item.ytubeUrl || '');
    if (vid && !item.path) return 'https://img.youtube.com/vi/' + vid + '/mqdefault.jpg';
    if (item.path && !videoExtRe.test(item.path)) {
      var thumb = galleryThumbPath(item.path);
      return thumb ? '/' + thumb : '/' + item.path;
    }
    if (item.videoPath || item.videoFile) {
      if (item.thumbUrl) return item.thumbUrl;
      if (item.videoPath) {
        var thumbPath = galleryThumbPath(item.videoPath.replace(/\.[^.]+$/, '.webp'));
        return thumbPath ? '/' + thumbPath : null;
      }
      return null;
    }
    if (item.url && item.url.startsWith('blob:')) return item.url;
    if (vid) return 'https://img.youtube.com/vi/' + vid + '/mqdefault.jpg';
    return '';
  }

  function getGalleryItemSource(item) {
    var vid = youtubeVideoId(item.YTube || item.ytubeUrl || '');
    if (vid) return { type: 'youtube', videoId: vid };
    if (item.videoPath) return { type: 'video', src: '/' + item.videoPath };
    if (item.path && !videoExtRe.test(item.path)) return { type: 'image', src: '/' + item.path };
    if (item.path && videoExtRe.test(item.path)) return { type: 'video', src: '/' + item.path };
    if (item.url && item.url.startsWith('blob:')) {
      if (item.isVideo) return { type: 'video', src: item.url };
      return { type: 'image', src: item.url };
    }
    return { type: 'image', src: '' };
  }

  var galleryViewerState = { items: [], index: 0, modal: null, youtubePlayer: null };

  function loadYouTubeAPI() {
    return new Promise(function (resolve) {
      if (typeof YT !== 'undefined' && YT.Player) {
        resolve();
        return;
      }
      var tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      var first = document.getElementsByTagName('script')[0];
      first.parentNode.insertBefore(tag, first);
      window.onYouTubeIframeAPIReady = resolve;
    });
  }

  function openGalleryViewer(items, startIndex) {
    galleryViewerState.items = items || [];
    galleryViewerState.index = Math.max(0, Math.min(startIndex || 0, items.length - 1));
    var modal = document.getElementById('galleryViewerModal');
    if (!modal) return;
    galleryViewerState.modal = modal;
    modal.classList.add('show');
    modal.focus();
    renderGalleryViewerContent();
    updateGalleryViewerCounter();
    var closeBtn = modal.querySelector('.gallery-viewer-close');
    var prevBtn = modal.querySelector('.gallery-viewer-prev');
    var nextBtn = modal.querySelector('.gallery-viewer-next');
    var contentEl = modal.querySelector('.gallery-viewer-content');
    var DRAG_CLOSE_THRESHOLD = 100;
    var mousedown = false, startX, startY, moveX, moveY;

    function onClose() {
      modal.classList.remove('show');
      modal.classList.remove('dragging');
      if (contentEl) {
        contentEl.style.transition = '';
        contentEl.style.transform = '';
        contentEl.style.opacity = '';
      }
      var vidEl = modal.querySelector('.gallery-viewer-media video');
      if (vidEl) {
        vidEl.pause();
        vidEl.src = '';
        vidEl.load();
      }
      if (galleryViewerState.youtubePlayer) {
        try { galleryViewerState.youtubePlayer.destroy && galleryViewerState.youtubePlayer.destroy(); } catch (e) {}
        galleryViewerState.youtubePlayer = null;
      }
      var mediaEl = modal.querySelector('.gallery-viewer-media');
      if (mediaEl) mediaEl.innerHTML = '';
      document.removeEventListener('keydown', onKey);
      modal.removeEventListener('mousedown', onMouseDown);
      modal.removeEventListener('touchstart', onMouseDown);
      modal.removeEventListener('mouseup', onMouseUp);
      modal.removeEventListener('touchend', onMouseUp);
      modal.removeEventListener('touchcancel', onMouseUp);
      modal.removeEventListener('mousemove', onMouseMove);
      modal.removeEventListener('touchmove', onMouseMove);
      modal.removeEventListener('click', onBackdropClick);
    }
    function onBackdropClick(e) { if (e.target === modal) onClose(); }
    modal.addEventListener('click', onBackdropClick);
    function onKey(e) {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    }
    function goPrev() { galleryViewerState.index = Math.max(0, galleryViewerState.index - 1); renderGalleryViewerContent(true); updateGalleryViewerCounter(); }
    function goNext() { galleryViewerState.index = Math.min(galleryViewerState.items.length - 1, galleryViewerState.index + 1); renderGalleryViewerContent(true); updateGalleryViewerCounter(); }

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
      if (galleryViewerState.youtubePlayer && galleryViewerState.youtubePlayer.pauseVideo) {
        galleryViewerState.youtubePlayer.pauseVideo();
      }
      var vidEl = modal.querySelector('.gallery-viewer-media video');
      if (vidEl) vidEl.pause();
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
      modal.classList.remove('dragging');
      if (d > DRAG_CLOSE_THRESHOLD) {
        onClose();
      } else {
        resetDragTransform();
        if (galleryViewerState.youtubePlayer && galleryViewerState.youtubePlayer.playVideo) {
          galleryViewerState.youtubePlayer.playVideo();
        }
        var vidEl = modal.querySelector('.gallery-viewer-media video');
        if (vidEl) vidEl.play();
      }
    }
    function onMouseMove(e) {
      e.preventDefault();
      if (mousedown) {
        moveX = e.clientX || (e.touches && e.touches[0].clientX);
        moveY = e.clientY || (e.touches && e.touches[0].clientY);
        var d = Math.sqrt(Math.pow(moveX - startX, 2) + Math.pow(moveY - startY, 2));
        modal.classList.add('dragging');
        applyDragTransform(d);
      }
    }

    if (closeBtn) closeBtn.onclick = onClose;
    if (prevBtn) prevBtn.onclick = goPrev;
    if (nextBtn) nextBtn.onclick = goNext;
    document.addEventListener('keydown', onKey);
    modal.addEventListener('mousedown', onMouseDown);
    modal.addEventListener('touchstart', onMouseDown, { passive: false });
    modal.addEventListener('mouseup', onMouseUp);
    modal.addEventListener('touchend', onMouseUp);
    modal.addEventListener('touchcancel', onMouseUp);
    modal.addEventListener('mousemove', onMouseMove);
    modal.addEventListener('touchmove', onMouseMove, { passive: false });
  }

  function updateGalleryViewerCounter() {
    var counterEl = document.getElementById('galleryViewerCounter');
    if (!counterEl) return;
    var items = galleryViewerState.items;
    var idx = galleryViewerState.index;
    if (items.length === 0) { counterEl.textContent = ''; return; }
    counterEl.textContent = (idx + 1) + ' of ' + items.length;
  }

  function renderGalleryViewerContent(withEffect) {
    var modal = galleryViewerState.modal;
    var items = galleryViewerState.items;
    var idx = galleryViewerState.index;
    var mediaEl = modal ? modal.querySelector('.gallery-viewer-media') : null;
    if (!mediaEl || !items.length) return;
    var item = items[idx];
    var src = getGalleryItemSource(item);
    var content = modal.querySelector('.gallery-viewer-content');
    if (content && withEffect) {
      content.style.opacity = '0';
      content.style.transform = 'scale(0.95)';
    }
    if (galleryViewerState.youtubePlayer) {
      try { galleryViewerState.youtubePlayer.destroy && galleryViewerState.youtubePlayer.destroy(); } catch (e) {}
      galleryViewerState.youtubePlayer = null;
    }
    mediaEl.innerHTML = '';
    if (src.type === 'youtube') {
      loadYouTubeAPI().then(function () {
        var divYTB = document.createElement('div');
        divYTB.className = 'embed-youtube';
        divYTB.id = 'gallery-viewer-youtube-' + Date.now();
        mediaEl.appendChild(divYTB);
        galleryViewerState.youtubePlayer = new YT.Player(divYTB.id, {
          videoId: src.videoId,
          playerVars: {
            autoplay: 1, mute: 0, controls: 1, fs: 1,
            modestbranding: 1, showinfo: 0, rel: 0
          },
          events: {
            onReady: function () {
              if (galleryViewerState.youtubePlayer && galleryViewerState.youtubePlayer.playVideo) {
                galleryViewerState.youtubePlayer.playVideo();
              }
            }
          }
        });
      });
    } else if (src.src) {
      if (src.type === 'video') {
        var vid = document.createElement('video');
        vid.src = src.src;
        vid.controls = true;
        vid.autoplay = true;
        vid.playsInline = true;
        mediaEl.appendChild(vid);
      } else {
        var img = document.createElement('img');
        img.src = src.src;
        img.alt = '';
        mediaEl.appendChild(img);
      }
    }
    if (content && withEffect) {
      requestAnimationFrame(function () {
        content.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
        content.style.opacity = '1';
        content.style.transform = 'scale(1)';
      });
    }
  }

  function openYoutubeModal(itemIndex, onSave) {
    var modal = document.getElementById('galleryYoutubeModal');
    var input = document.getElementById('galleryYoutubeUrlInput');
    var saveBtn = document.getElementById('galleryYoutubeSaveBtn');
    if (!modal || !input || !saveBtn) return;
    var it = itemIndex != null ? projectGalleryState.items[itemIndex] : null;
    input.value = (it && (it.YTube || it.ytubeUrl || '')) || '';
    var bsModal = bootstrap.Modal.getOrCreateInstance(modal);
    var handler = function () {
      var url = input.value.trim();
      if (url && !youtubeVideoId(url)) {
        showToast('warning', 'Invalid YouTube URL.');
        return;
      }
      if (!it && !url) {
        showToast('warning', 'YouTube URL is required when adding.');
        return;
      }
      saveBtn.removeEventListener('click', handler);
      modal.removeEventListener('hidden.bs.modal', onHidden);
      bsModal.hide();
      if (it) {
        var hadYoutubeUrl = !!youtubeVideoId(it.YTube || it.ytubeUrl);
        it.YTube = url || null;
        it.ytubeUrl = (it.path || it.file || it.videoPath || it.videoFile) ? null : (url || null);
        if (it.path && !url) {
          it._clearedYtube = true;
        } else if (it.path && !hadYoutubeUrl && url) {
          it._keepExistingImage = true;
        } else if (hadYoutubeUrl && url) {
          delete it.path;
        }
        if (!it.GalleryID && !url && !it.path && !it.file && !it.videoPath && !it.videoFile) {
          projectGalleryState.items.splice(itemIndex, 1);
        }
      } else if (url) {
        projectGalleryState.items.push({ ytubeUrl: url, YTube: url, id: 'p' + Date.now() });
      }
      if (typeof onSave === 'function') onSave();
    };
    var onHidden = function () {
      saveBtn.removeEventListener('click', handler);
      modal.removeEventListener('hidden.bs.modal', onHidden);
    };
    saveBtn.addEventListener('click', handler);
    modal.addEventListener('hidden.bs.modal', onHidden, { once: false });
    bsModal.show();
    setTimeout(function () { input.focus(); }, 300);
  }

  function openVideoModal(onSave) {
    var modal = document.getElementById('galleryVideoModal');
    var videoInput = document.getElementById('galleryVideoFileInput');
    var thumbInput = document.getElementById('galleryVideoThumbInput');
    var saveBtn = document.getElementById('galleryVideoSaveBtn');
    if (!modal || !videoInput || !thumbInput || !saveBtn) return;
    videoInput.value = '';
    thumbInput.value = '';
    var bsModal = bootstrap.Modal.getOrCreateInstance(modal);
    var handler = function () {
      var videoFile = videoInput.files && videoInput.files[0];
      var thumbFile = thumbInput.files && thumbInput.files[0];
      if (!videoFile || !videoFile.type.startsWith('video/')) {
        showToast('warning', 'Please select a video file.');
        return;
      }
      if (!thumbFile || !thumbFile.type.startsWith('image/')) {
        showToast('warning', 'Please select a thumbnail image for the video.');
        return;
      }
      saveBtn.removeEventListener('click', handler);
      modal.removeEventListener('hidden.bs.modal', onHidden);
      bsModal.hide();
      projectGalleryState.items.push({
        videoFile: videoFile,
        thumbFile: thumbFile,
        url: URL.createObjectURL(videoFile),
        thumbUrl: URL.createObjectURL(thumbFile),
        isVideo: true,
        id: 'p' + Date.now()
      });
      if (typeof onSave === 'function') onSave();
    };
    var onHidden = function () {
      saveBtn.removeEventListener('click', handler);
      modal.removeEventListener('hidden.bs.modal', onHidden);
    };
    saveBtn.addEventListener('click', handler);
    modal.addEventListener('hidden.bs.modal', onHidden, { once: false });
    bsModal.show();
  }

  function renderProjectGalleryGrid() {
    var grid = document.getElementById('projectGalleryGrid');
    if (!grid) return;
    var items = projectGalleryState.items;
    grid.innerHTML = items.map(function (item, idx) {
      var thumbSrc = getGalleryItemThumb(item);
      var isYTubeOnly = !item.path && !item.file && !item.videoPath && !item.videoFile && (item.YTube || item.ytubeUrl);
      var isYoutubeVideo = !!youtubeVideoId(item.YTube || item.ytubeUrl);
      var isVideo = !!item.videoPath || !!item.videoFile;
      var hasYtube = !!(item.YTube || item.ytubeUrl);
      var showYtubeEdit = !item.videoPath && !item.videoFile;
      var id = item.GalleryID || item.id || 'p' + idx;
      var playIconClass = isYoutubeVideo ? 'bi bi-play-circle-fill position-absolute text-danger' : 'bi bi-play-circle-fill position-absolute text-white';
      var playIconStyle = 'font-size:2rem;opacity:0.9';
      var thumbHtml = '';
      if (isYTubeOnly && thumbSrc) {
        thumbHtml = '<div class="gallery-thumb-wrap"><img src="' + thumbSrc + '" alt=""><i class="' + playIconClass + '" style="' + playIconStyle + '"></i></div>';
      } else if (isVideo && thumbSrc) {
        thumbHtml = '<div class="gallery-thumb-wrap"><img src="' + thumbSrc + '" alt=""><i class="bi bi-play-circle-fill position-absolute text-white" style="' + playIconStyle + '"></i></div>';
      } else if (isVideo) {
        thumbHtml = '<div class="gallery-thumb-wrap"><i class="bi bi-camera-video-fill text-white-50" style="font-size:2rem"></i></div>';
      } else if (thumbSrc) {
        var mainSrc = item.path ? '/' + item.path : '';
        var fallback = mainSrc ? ' onerror="this.src=\'' + mainSrc + '\'"' : '';
        thumbHtml = isYoutubeVideo ? '<div class="gallery-thumb-wrap"><img src="' + thumbSrc + '" alt=""' + fallback + '><i class="' + playIconClass + '" style="' + playIconStyle + '"></i></div>' : '<img src="' + thumbSrc + '" alt=""' + fallback + '>';
      } else {
        thumbHtml = '<div class="gallery-thumb-wrap"><i class="bi bi-image text-white-50" style="font-size:1.5rem"></i></div>';
      }
      var ytubeEditClass = 'gallery-ytube-edit' + (hasYtube ? ' has-ytube' : '');
      var ytubeEditBtn = showYtubeEdit ? '<button type="button" class="' + ytubeEditClass + '" aria-label="Edit YouTube" title="' + (hasYtube ? 'Edit' : 'Add') + ' YouTube URL"><i class="bi bi-pencil-square"></i></button>' : '';
      return '<div class="col-4 col-md-3 gallery-item" data-id="' + id + '" data-index="' + idx + '" draggable="true">' +
        '<button type="button" class="gallery-view" aria-label="View"><i class="bi bi-eye"></i></button>' +
        '<button type="button" class="gallery-delete" aria-label="Delete"><i class="bi bi-x"></i></button>' +
        ytubeEditBtn +
        thumbHtml +
        '</div>';
    }).join('');
    grid.querySelectorAll('.gallery-delete').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var el = btn.closest('.gallery-item');
        var idx = parseInt(el.getAttribute('data-index'), 10);
        var it = projectGalleryState.items[idx];
        if (it && it.GalleryID) projectGalleryState.toDelete.push(it.GalleryID);
        projectGalleryState.items.splice(idx, 1);
        if (it && it.url && it.url.startsWith('blob:')) URL.revokeObjectURL(it.url);
        if (it && it.thumbUrl && it.thumbUrl.startsWith('blob:')) URL.revokeObjectURL(it.thumbUrl);
        renderProjectGalleryGrid();
      });
    });
    grid.querySelectorAll('.gallery-view').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var idx = parseInt(btn.closest('.gallery-item').getAttribute('data-index'), 10);
        var src = getGalleryItemSource(projectGalleryState.items[idx]);
        if (!src.src && !src.videoId) return;
        var viewerItems = projectGalleryState.items.filter(function (it) {
          var s = getGalleryItemSource(it);
          return s.src || s.videoId;
        });
        var viewerIdx = viewerItems.indexOf(projectGalleryState.items[idx]);
        if (viewerIdx < 0) viewerIdx = 0;
        openGalleryViewer(viewerItems, viewerIdx);
      });
    });
    grid.querySelectorAll('.gallery-ytube-edit').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var idx = parseInt(btn.closest('.gallery-item').getAttribute('data-index'), 10);
        openYoutubeModal(idx, function () { renderProjectGalleryGrid(); });
      });
    });
    initGalleryGridSortable();
  }

  function initGalleryGridSortable() {
    var grid = document.getElementById('projectGalleryGrid');
    if (!grid || grid.querySelectorAll('.gallery-item').length < 2) return;
    var items = grid.querySelectorAll('.gallery-item');
    items.forEach(function (el) {
      el.draggable = true;
      el.addEventListener('dragstart', function (e) {
        e.dataTransfer.setData('text/plain', el.getAttribute('data-index'));
        el.classList.add('dragging');
      });
      el.addEventListener('dragend', function () { el.classList.remove('dragging'); });
      el.addEventListener('dragover', function (e) {
        e.preventDefault();
        var dragging = grid.querySelector('.dragging');
        if (dragging && dragging !== el) el.classList.add('drag-over');
      });
      el.addEventListener('dragleave', function () { el.classList.remove('drag-over'); });
      el.addEventListener('drop', function (e) {
        e.preventDefault();
        el.classList.remove('drag-over');
        var fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
        var toIdx = parseInt(el.getAttribute('data-index'), 10);
        if (fromIdx === toIdx) return;
        var arr = projectGalleryState.items;
        var moved = arr.splice(fromIdx, 1)[0];
        arr.splice(toIdx, 0, moved);
        renderProjectGalleryGrid();
      });
    });
  }

  function openProjectModal(id) {
    var modal = document.getElementById('projectModal');
    var titleEl = document.getElementById('projectModalTitle');
    var idEl = document.getElementById('projectId');
    var imgPreview = document.getElementById('projectImagePreview');
    var imgImg = document.getElementById('projectImageImg');
    var imgInput = document.getElementById('projectImageInput');
    var titleEnEl = document.getElementById('projectTitleEn');
    var titleArEl = document.getElementById('projectTitleAr');
    var descEnEl = document.getElementById('projectDescriptionEn');
    var descArEl = document.getElementById('projectDescriptionAr');
    var categoryEl = document.getElementById('projectCategoryId');
    var cityEl = document.getElementById('projectCityId');
    var publishEl = document.getElementById('projectPublish');
    var galleryInput = document.getElementById('projectGalleryInput');
    if (!modal) return;
    idEl.value = id ? id : '';
    imgInput.value = '';
    galleryInput.value = '';
    projectGalleryState.items.forEach(function (it) {
      if (it.url && it.url.startsWith('blob:')) URL.revokeObjectURL(it.url);
      if (it.thumbUrl && it.thumbUrl.startsWith('blob:')) URL.revokeObjectURL(it.thumbUrl);
    });
    projectImageState.originalPath = '';
    projectImageState.pendingFile = null;
    projectImageState.removed = false;
    projectGalleryState.items = [];
    projectGalleryState.toDelete = [];
    categoryEl.innerHTML = '<option value="">— Select —</option>' + categories.map(function (c) {
      return '<option value="' + c.CategoryID + '">' + (c.TitleEn || c.TitleAr || c.CategoryID) + '</option>';
    }).join('');
    cityEl.innerHTML = '<option value="">— Select —</option>' + cities.map(function (c) {
      return '<option value="' + c.CityID + '">' + (c.TitleEn || c.TitleAr || c.CityID) + '</option>';
    }).join('');
    if (id) {
      var p = posts.find(function (x) { return x.PostID === id; });
      if (p) {
        titleEl.textContent = 'Edit Project';
        titleEnEl.value = p.TitleEn || '';
        titleArEl.value = p.TitleAr || '';
        if (descEnEl) descEnEl.value = p.DescriptionEn || '';
        if (descArEl) descArEl.value = p.DescriptionAr || '';
        categoryEl.value = p.CategoryID != null ? p.CategoryID : '';
        cityEl.value = p.CityID != null ? p.CityID : '';
        publishEl.checked = p.Publish === 1;
        projectImageState.originalPath = p.Image || '';
        if (p.Image) {
          imgImg.src = '/' + p.Image;
          imgPreview.style.display = 'block';
        } else imgPreview.style.display = 'none';
        (p.galleries || []).forEach(function (g) {
          var isYoutubeUrl = g.YTube && /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w\-]+)/i.test(g.YTube);
          var isYtubeVideoPath = g.YTube && !isYoutubeUrl && /\.(mp4|webm|ogg|mov|avi|mkv|wmv|3gp)$/i.test(g.YTube);
          var isImageVideoPath = g.Image && /\.(mp4|webm|ogg|mov|avi|mkv|wmv|3gp)$/i.test(g.Image);
          var vidPath = g.Video || (isYtubeVideoPath ? g.YTube : null) || (isImageVideoPath ? g.Image : null);
          var imgPath = !isImageVideoPath ? g.Image : null;
          projectGalleryState.items.push({
            GalleryID: g.GalleryID,
            path: imgPath,
            videoPath: vidPath,
            YTube: isYoutubeUrl ? g.YTube : null
          });
        });
      }
    } else {
      titleEl.textContent = 'Add Project';
      titleEnEl.value = '';
      titleArEl.value = '';
      if (descEnEl) descEnEl.value = '';
      if (descArEl) descArEl.value = '';
      categoryEl.value = '';
      cityEl.value = '';
      publishEl.checked = true;
      imgPreview.style.display = 'none';
    }
    renderProjectGalleryGrid();
    if (typeof bootstrap !== 'undefined') {
      var m = new bootstrap.Modal(modal);
      m.show();
    }
  }

  function saveProject() {
    var idEl = document.getElementById('projectId');
    var titleEnEl = document.getElementById('projectTitleEn');
    var titleArEl = document.getElementById('projectTitleAr');
    var descEnEl = document.getElementById('projectDescriptionEn');
    var descArEl = document.getElementById('projectDescriptionAr');
    var categoryEl = document.getElementById('projectCategoryId');
    var cityEl = document.getElementById('projectCityId');
    var publishEl = document.getElementById('projectPublish');
    var imgInput = document.getElementById('projectImageInput');
    var id = idEl ? parseInt(idEl.value, 10) : 0;
    var isAdd = !id;
    var titleEn = titleEnEl ? titleEnEl.value.trim() : '';
    var titleAr = titleArEl ? titleArEl.value.trim() : '';
    var descEn = descEnEl ? descEnEl.value.trim() : '';
    var descAr = descArEl ? descArEl.value.trim() : '';
    if (!titleEn) {
      showToast('warning', 'Title (En) is required.');
      return;
    }
    if (!titleAr) {
      showToast('warning', 'Title (Ar) is required.');
      return;
    }
    var hasImage = projectImageState.originalPath || projectImageState.pendingFile;
    if (!hasImage) {
      showToast('warning', 'Project image is required.');
      return;
    }
    if (!categoryEl || !categoryEl.value) {
      showToast('warning', 'Please select a category.');
      return;
    }
    if (!cityEl || !cityEl.value) {
      showToast('warning', 'Please select a city.');
      return;
    }
    loadingView.classList.add('show');
    var doAfterPost = function (postId) {
      var initialGalleryIds = new Set(projectGalleryState.items.filter(function (x) { return x.GalleryID; }).map(function (x) { return x.GalleryID; }));
      var pending = projectGalleryState.items.filter(function (i) { return i.file; });
      var pendingVideo = projectGalleryState.items.filter(function (i) { return i.videoFile; });
      var pendingYtube = projectGalleryState.items.filter(function (i) { return (i.ytubeUrl || i.YTube) && !i.GalleryID && !i.file; });
      var toDelete = projectGalleryState.toDelete || [];
      var finish = function () {
        loadingView.classList.remove('show');
        var modal = document.getElementById('projectModal');
        if (modal && typeof bootstrap !== 'undefined') bootstrap.Modal.getInstance(modal).hide();
        loadPosts(isAdd ? 1 : postsCurrentPage);
        showToast('success', isAdd ? 'Project added successfully.' : 'Project updated successfully.');
      };
      var runDeletes = function (idx, cb) {
        if (idx >= toDelete.length) return cb();
        fetch('/api/dashboard/galleries/' + toDelete[idx], { method: 'DELETE', credentials: 'include' })
          .then(function () { runDeletes(idx + 1, cb); })
          .catch(function () { runDeletes(idx + 1, cb); });
      };
      var runUploads = function (idx, cb) {
        if (idx >= pending.length) return cb();
        var fd = new FormData();
        fd.append('image', pending[idx].file);
        fetch('/api/dashboard/posts/' + postId + '/gallery/upload', {
          method: 'POST', credentials: 'include', body: fd
        }).then(function (r) { return r.json(); })
          .then(function (data) {
            if (data.item) {
              var it = projectGalleryState.items.find(function (x) { return x.file === pending[idx].file; });
              if (it) it.GalleryID = data.item.GalleryID;
            }
            runUploads(idx + 1, cb);
          })
          .catch(function () { runUploads(idx + 1, cb); });
      };
      var runVideoUploads = function (idx, cb) {
        if (idx >= pendingVideo.length) return cb();
        var it = pendingVideo[idx];
        if (!it.thumbFile) {
          showToast('warning', 'Thumbnail image required for video. Skipping.');
          return runVideoUploads(idx + 1, cb);
        }
        var fd = new FormData();
        fd.append('video', it.videoFile);
        fd.append('image', it.thumbFile);
        fetch('/api/dashboard/posts/' + postId + '/gallery/video', {
          method: 'POST', credentials: 'include', body: fd
        }).then(function (r) { return r.json(); })
          .then(function (data) {
            if (data.item) {
              var orig = projectGalleryState.items.find(function (x) { return x.videoFile === it.videoFile; });
              if (orig) { orig.GalleryID = data.item.GalleryID; orig.videoPath = data.item.YTube; orig.path = data.item.Image; delete orig.videoFile; delete orig.thumbFile; if (orig.url) URL.revokeObjectURL(orig.url); delete orig.url; if (orig.thumbUrl) URL.revokeObjectURL(orig.thumbUrl); delete orig.thumbUrl; }
              renderProjectGalleryGrid();
            }
            runVideoUploads(idx + 1, cb);
          })
          .catch(function () { showToast('danger', 'Video upload failed. Please ensure both video and thumbnail image are selected.'); runVideoUploads(idx + 1, cb); });
      };
      var runYoutubeAdds = function (idx, cb) {
        if (idx >= pendingYtube.length) return cb();
        var it = pendingYtube[idx];
        var url = (it.ytubeUrl || it.YTube || '').trim();
        if (!url) return runYoutubeAdds(idx + 1, cb);
        fetch('/api/dashboard/posts/' + postId + '/gallery/youtube', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ url: url })
        }).then(function (r) { return r.json(); })
          .then(function (data) {
            if (data.item) {
              var orig = projectGalleryState.items.find(function (x) { return x === it; });
              if (orig) { orig.GalleryID = data.item.GalleryID; if (data.item.Image) orig.path = data.item.Image; }
            }
            runYoutubeAdds(idx + 1, cb);
          })
          .catch(function () { runYoutubeAdds(idx + 1, cb); });
      };
      var runYtubePatches = function (idx, cb) {
        var withGid = projectGalleryState.items.filter(function (x) {
          return x.GalleryID && initialGalleryIds.has(x.GalleryID) && (youtubeVideoId(x.YTube || x.ytubeUrl) || x._clearedYtube);
        });
        if (idx >= withGid.length) return cb();
        var it = withGid[idx];
        var body = { YTube: it._clearedYtube ? null : (it.YTube || it.ytubeUrl || null) };
        if (it._keepExistingImage) { body.keepExistingImage = true; delete it._keepExistingImage; }
        if (it._clearedYtube) delete it._clearedYtube;
        fetch('/api/dashboard/galleries/' + it.GalleryID, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify(body)
        }).then(function (r) { return r.json(); }).then(function (data) {
          if (data.item && data.item.Image && it) it.path = data.item.Image;
          runYtubePatches(idx + 1, cb);
        }).catch(function () { runYtubePatches(idx + 1, cb); });
      };
      var doReorder = function () {
        var order = projectGalleryState.items.filter(function (x) { return x.GalleryID; }).map(function (x) { return x.GalleryID; });
        if (order.length > 1) {
          fetch('/api/dashboard/posts/' + postId + '/gallery/reorder', {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ order: order })
          }).then(finish).catch(finish);
        } else finish();
      };
      runDeletes(0, function () {
        runUploads(0, function () {
          runVideoUploads(0, function () {
            runYoutubeAdds(0, function () {
              runYtubePatches(0, doReorder);
            });
          });
        });
      });
    };
    if (isAdd && projectImageState.pendingFile) {
      var fd = new FormData();
      fd.append('TitleEn', titleEn);
      fd.append('TitleAr', titleAr);
      fd.append('DescriptionEn', descEn);
      fd.append('DescriptionAr', descAr);
      fd.append('CategoryID', categoryEl.value || '');
      fd.append('CityID', cityEl.value || '');
      fd.append('Publish', publishEl.checked);
      fd.append('image', projectImageState.pendingFile);
      fetch('/api/dashboard/posts', { method: 'POST', credentials: 'include', body: fd })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.error) { loadingView.classList.remove('show'); showToast('danger', data.error); return; }
          doAfterPost(data.item.PostID);
        })
        .catch(function () { loadingView.classList.remove('show'); showToast('danger', 'Failed to create project.'); });
    } else if (!isAdd) {
      var fd = new FormData();
      fd.append('TitleEn', titleEn);
      fd.append('TitleAr', titleAr);
      fd.append('DescriptionEn', descEn);
      fd.append('DescriptionAr', descAr);
      fd.append('CategoryID', categoryEl.value || '');
      fd.append('CityID', cityEl.value || '');
      fd.append('Publish', publishEl.checked);
      if (projectImageState.pendingFile) fd.append('image', projectImageState.pendingFile);
      fetch('/api/dashboard/posts/' + id, { method: 'PUT', credentials: 'include', body: fd })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.error) { loadingView.classList.remove('show'); showToast('danger', data.error); return; }
          doAfterPost(id);
        })
        .catch(function () { loadingView.classList.remove('show'); showToast('danger', 'Failed to update project.'); });
    } else {
      loadingView.classList.remove('show');
      showToast('danger', 'Project image is required.');
    }
  }

  var slideImageState = { originalPath: '', pendingFile: null, removed: false };
  var testimonialImageState = { originalPath: '', pendingFile: null, removed: false };
  var userImageState = { originalPath: '', pendingFile: null, removed: false };
  var profileImageState = { originalPath: '', pendingFile: null, removed: false };

  function loadSlides() {
    loadingView.classList.add('show');
    fetch('/api/dashboard/slides', fetchOptions())
      .then(function (r) { return r.json(); })
      .then(function (data) {
        slides = data.items || [];
        var tbody = document.getElementById('slidesTable');
        tbody.innerHTML = slides.map(function (s) {
          var img = s.Image ? '<img src="/' + s.Image + '" alt="" style="height:40px;object-fit:cover;border-radius:6px">' : '-';
          return '<tr data-id="' + s.SlideID + '" class="draggable-row">' +
            '<td class="drag-handle text-muted" draggable="true"><i class="bi bi-grip-vertical"></i></td>' +
            '<td>' + dropdownActions(s.SlideID, 'slide') + '</td>' +
            '<td>' + s.SlideID + '</td><td>' + img + '</td><td>' + (s.TitleEn || '-') + '</td><td>' + (s.TitleAr || '-') + '</td>' +
            '<td>' + (s.Order || 0) + '</td><td>' + (s.Publish ? 'Yes' : 'No') + '</td></tr>';
        }).join('') || '<tr><td colspan="8" class="text-muted">No slides</td></tr>';
        if (slides.length >= 2) {
          initTableDragDrop('slidesTable', '/api/dashboard/slides/reorder', loadSlides, 'Slides order updated.');
        }
        loadingView.classList.remove('show');
      }).catch(function () {
        loadingView.classList.remove('show');
      });
  }

  function openSlideModal(id) {
    var modal = document.getElementById('slideModal');
    var titleEl = document.getElementById('slideModalTitle');
    var idEl = document.getElementById('slideId');
    var imgPreview = document.getElementById('slideImagePreview');
    var imgImg = document.getElementById('slideImageImg');
    var imgInput = document.getElementById('slideImageInput');
    var titleEnEl = document.getElementById('slideTitleEn');
    var titleArEl = document.getElementById('slideTitleAr');
    var publishEl = document.getElementById('slidePublish');
    if (!modal) return;
    idEl.value = id ? id : '';
    imgInput.value = '';
    slideImageState.originalPath = '';
    slideImageState.pendingFile = null;
    slideImageState.removed = false;
    if (id) {
      var s = slides.find(function (x) { return x.SlideID === id; });
      if (s) {
        titleEl.textContent = 'Edit Slide';
        titleEnEl.value = s.TitleEn || '';
        titleArEl.value = s.TitleAr || '';
        publishEl.checked = s.Publish === 1;
        slideImageState.originalPath = s.Image || '';
        if (s.Image) {
          imgImg.src = '/' + s.Image;
          imgPreview.style.display = 'block';
        } else imgPreview.style.display = 'none';
      }
    } else {
      titleEl.textContent = 'Add Slide';
      titleEnEl.value = '';
      titleArEl.value = '';
      publishEl.checked = true;
      imgPreview.style.display = 'none';
    }
    if (typeof bootstrap !== 'undefined') {
      var m = new bootstrap.Modal(modal);
      m.show();
    }
  }

  function saveSlide() {
    var idEl = document.getElementById('slideId');
    var titleEnEl = document.getElementById('slideTitleEn');
    var titleArEl = document.getElementById('slideTitleAr');
    var publishEl = document.getElementById('slidePublish');
    var imgInput = document.getElementById('slideImageInput');
    var id = idEl ? parseInt(idEl.value, 10) : 0;
    var isAdd = !id;
    var titleEn = titleEnEl ? titleEnEl.value.trim() : '';
    var titleAr = titleArEl ? titleArEl.value.trim() : '';
    var hasImage = slideImageState.originalPath || slideImageState.pendingFile;
    if (!hasImage) {
      showToast('warning', 'Slide image is required.');
      return;
    }
    loadingView.classList.add('show');
    var fd = new FormData();
    fd.append('TitleEn', titleEn);
    fd.append('TitleAr', titleAr);
    fd.append('Publish', publishEl ? publishEl.checked : true);
    if (slideImageState.pendingFile) fd.append('image', slideImageState.pendingFile);
    var url = id ? '/api/dashboard/slides/' + id : '/api/dashboard/slides';
    var method = id ? 'PUT' : 'POST';
    fetch(url, { method: method, credentials: 'include', body: fd })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) {
          loadingView.classList.remove('show');
          showToast('danger', data.error);
          return;
        }
        var modal = document.getElementById('slideModal');
        if (modal && typeof bootstrap !== 'undefined') bootstrap.Modal.getInstance(modal).hide();
        loadSlides();
        showToast('success', isAdd ? 'Slide added successfully.' : 'Slide updated successfully.');
        loadingView.classList.remove('show');
      })
      .catch(function () {
        loadingView.classList.remove('show');
        showToast('danger', 'Failed to save slide.');
      });
  }

  function deleteSlide(id) {
    loadingView.classList.add('show');
    fetch('/api/dashboard/slides/' + id, { method: 'DELETE', credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function () {
        loadSlides();
        showToast('success', 'Slide deleted successfully.');
      })
      .catch(function () { loadingView.classList.remove('show'); showToast('danger', 'Failed to delete slide.'); });
  }

  function loadTestimonials() {
    loadingView.classList.add('show');
    fetch('/api/dashboard/testimonials', fetchOptions())
      .then(function (r) { return r.json(); })
      .then(function (data) {
        testimonials = data.items || [];
        var tbody = document.getElementById('testimonialsTable');
        tbody.innerHTML = testimonials.map(function (t) {
          var img = t.Image ? '<img src="/' + t.Image + '" alt="" style="height:40px;max-width:60px;object-fit:cover;border-radius:6px">' : '-';
          var content = (t.ContentEn || t.ContentAr || '-');
          content = content.length > 60 ? content.slice(0, 60) + '...' : content;
          return '<tr data-id="' + t.TID + '" class="draggable-row">' +
            '<td class="drag-handle text-muted" draggable="true"><i class="bi bi-grip-vertical"></i></td>' +
            '<td>' + dropdownActions(t.TID, 'testimonial') + '</td>' +
            '<td>' + t.TID + '</td><td>' + img + '</td><td>' + (t.NameEn || '-') + '</td><td>' + content + '</td>' +
            '<td>' + (t.Order || 0) + '</td><td>' + (t.Publish ? 'Yes' : 'No') + '</td></tr>';
        }).join('') || '<tr><td colspan="8" class="text-muted">No testimonials</td></tr>';
        if (testimonials.length >= 2) {
          initTableDragDrop('testimonialsTable', '/api/dashboard/testimonials/reorder', loadTestimonials, 'Testimonials order updated.');
        }
        loadingView.classList.remove('show');
      }).catch(function () {
        loadingView.classList.remove('show');
      });
  }

  function openTestimonialModal(id) {
    var modal = document.getElementById('testimonialModal');
    var titleEl = document.getElementById('testimonialModalTitle');
    var idEl = document.getElementById('testimonialId');
    var imgPreview = document.getElementById('testimonialImagePreview');
    var imgImg = document.getElementById('testimonialImageImg');
    var imgInput = document.getElementById('testimonialImageInput');
    var nameEnEl = document.getElementById('testimonialNameEn');
    var nameArEl = document.getElementById('testimonialNameAr');
    var contentEnEl = document.getElementById('testimonialContentEn');
    var contentArEl = document.getElementById('testimonialContentAr');
    var publishEl = document.getElementById('testimonialPublish');
    if (!modal) return;
    idEl.value = id ? id : '';
    imgInput.value = '';
    testimonialImageState.originalPath = '';
    testimonialImageState.pendingFile = null;
    testimonialImageState.removed = false;
    if (id) {
      var t = testimonials.find(function (x) { return x.TID === id; });
      if (t) {
        titleEl.textContent = 'Edit Testimonial';
        nameEnEl.value = t.NameEn || '';
        nameArEl.value = t.NameAr || '';
        contentEnEl.value = t.ContentEn || '';
        contentArEl.value = t.ContentAr || '';
        publishEl.checked = t.Publish === 1;
        testimonialImageState.originalPath = t.Image || '';
        if (t.Image) {
          imgImg.src = '/' + t.Image;
          imgPreview.style.display = 'block';
        } else imgPreview.style.display = 'none';
      }
    } else {
      titleEl.textContent = 'Add Testimonial';
      nameEnEl.value = '';
      nameArEl.value = '';
      contentEnEl.value = '';
      contentArEl.value = '';
      publishEl.checked = true;
      imgPreview.style.display = 'none';
    }
    if (typeof bootstrap !== 'undefined') {
      var m = new bootstrap.Modal(modal);
      m.show();
    }
  }

  function saveTestimonial() {
    var idEl = document.getElementById('testimonialId');
    var nameEnEl = document.getElementById('testimonialNameEn');
    var nameArEl = document.getElementById('testimonialNameAr');
    var contentEnEl = document.getElementById('testimonialContentEn');
    var contentArEl = document.getElementById('testimonialContentAr');
    var publishEl = document.getElementById('testimonialPublish');
    var imgInput = document.getElementById('testimonialImageInput');
    var id = idEl ? parseInt(idEl.value, 10) : 0;
    var isAdd = !id;
    var nameEn = nameEnEl ? nameEnEl.value.trim() : '';
    var nameAr = nameArEl ? nameArEl.value.trim() : '';
    var contentEn = contentEnEl ? contentEnEl.value.trim() : '';
    var contentAr = contentArEl ? contentArEl.value.trim() : '';
    var hasImage = testimonialImageState.originalPath || testimonialImageState.pendingFile;
    if (!hasImage) {
      showToast('warning', 'Testimonial image is required.');
      return;
    }
    if (!nameEn) { showToast('warning', 'Name (En) is required.'); return; }
    if (!nameAr) { showToast('warning', 'Name (Ar) is required.'); return; }
    if (!contentEn) { showToast('warning', 'Content (En) is required.'); return; }
    if (!contentAr) { showToast('warning', 'Content (Ar) is required.'); return; }
    loadingView.classList.add('show');
    var fd = new FormData();
    fd.append('NameEn', nameEn);
    fd.append('NameAr', nameAr);
    fd.append('ContentEn', contentEn);
    fd.append('ContentAr', contentAr);
    fd.append('Publish', publishEl ? publishEl.checked : true);
    if (testimonialImageState.pendingFile) fd.append('image', testimonialImageState.pendingFile);
    var url = id ? '/api/dashboard/testimonials/' + id : '/api/dashboard/testimonials';
    var method = id ? 'PUT' : 'POST';
    fetch(url, { method: method, credentials: 'include', body: fd })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) {
          loadingView.classList.remove('show');
          showToast('danger', data.error);
          return;
        }
        var modal = document.getElementById('testimonialModal');
        if (modal && typeof bootstrap !== 'undefined') bootstrap.Modal.getInstance(modal).hide();
        loadTestimonials();
        showToast('success', isAdd ? 'Testimonial added successfully.' : 'Testimonial updated successfully.');
        loadingView.classList.remove('show');
      })
      .catch(function () {
        loadingView.classList.remove('show');
        showToast('danger', 'Failed to save testimonial.');
      });
  }

  function deleteTestimonial(id) {
    loadingView.classList.add('show');
    fetch('/api/dashboard/testimonials/' + id, { method: 'DELETE', credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function () {
        loadTestimonials();
        showToast('success', 'Testimonial deleted successfully.');
      })
      .catch(function () { loadingView.classList.remove('show'); showToast('danger', 'Failed to delete testimonial.'); });
  }

  function loadUsers() {
    loadingView.classList.add('show');
    fetch('/api/dashboard/users', fetchOptions())
      .then(function (r) { return r.json(); })
      .then(function (data) {
        users = data.items || [];
        var tbody = document.getElementById('usersTable');
        var isAdmin = (user && (user.role || '').toLowerCase() === 'admin');
        tbody.innerHTML = users.map(function (u) {
          var img = u.Image ? '<img src="/' + u.Image + '" alt="" style="height:40px;max-width:60px;object-fit:cover;border-radius:6px">' : '-';
          var actions = isAdmin ? dropdownActions(u.UserID, 'user') : '';
          return '<tr data-id="' + u.UserID + '" class="draggable-row">' +
            '<td class="drag-handle text-muted" draggable="true"><i class="bi bi-grip-vertical"></i></td>' +
            '<td>' + actions + '</td>' +
            '<td>' + u.UserID + '</td><td>' + img + '</td><td>' + (u.Name || '-') + '</td><td>' + (u.Username || '-') + '</td><td>' + (u.Email || '-') + '</td><td>' + (u.Role || '-') + '</td></tr>';
        }).join('') || '<tr><td colspan="8" class="text-muted">No users</td></tr>';
        if (users.length >= 2 && isAdmin) {
          initTableDragDrop('usersTable', '/api/dashboard/users/reorder', loadUsers, 'Users order updated.');
        }
        var addBtn = document.getElementById('userAddBtn');
        if (addBtn) addBtn.style.display = isAdmin ? '' : 'none';
        loadingView.classList.remove('show');
      }).catch(function () {
        loadingView.classList.remove('show');
      });
  }

  function openUserModal(id) {
    var modal = document.getElementById('userModal');
    var titleEl = document.getElementById('userModalTitle');
    var idEl = document.getElementById('userId');
    var imgPreview = document.getElementById('userImagePreview');
    var imgImg = document.getElementById('userImageImg');
    var imgInput = document.getElementById('userImageInput');
    var nameEl = document.getElementById('userName');
    var usernameEl = document.getElementById('userUsername');
    var emailEl = document.getElementById('userEmail');
    var roleEl = document.getElementById('userRole');
    if (!modal) return;
    idEl.value = id ? id : '';
    imgInput.value = '';
    userImageState.originalPath = '';
    userImageState.pendingFile = null;
    userImageState.removed = false;
    if (id) {
      var u = users.find(function (x) { return x.UserID === id; });
      if (u) {
        titleEl.textContent = 'Edit User';
        nameEl.value = u.Name || '';
        usernameEl.value = u.Username || '';
        emailEl.value = u.Email || '';
        roleEl.value = (u.Role || '').toLowerCase();
        userImageState.originalPath = u.Image || '';
        if (u.Image) {
          imgImg.src = '/' + u.Image;
          imgPreview.style.display = 'block';
        } else imgPreview.style.display = 'none';
      }
    } else {
      titleEl.textContent = 'Add User';
      nameEl.value = '';
      usernameEl.value = '';
      emailEl.value = '';
      roleEl.value = '';
      imgPreview.style.display = 'none';
    }
    if (typeof bootstrap !== 'undefined') {
      var m = new bootstrap.Modal(modal);
      m.show();
    }
  }

  function saveUser() {
    var idEl = document.getElementById('userId');
    var nameEl = document.getElementById('userName');
    var usernameEl = document.getElementById('userUsername');
    var emailEl = document.getElementById('userEmail');
    var roleEl = document.getElementById('userRole');
    var id = idEl ? parseInt(idEl.value, 10) : 0;
    var isAdd = !id;
    var name = nameEl ? nameEl.value.trim() : '';
    var username = usernameEl ? usernameEl.value.trim() : '';
    var email = emailEl ? emailEl.value.trim() : '';
    var role = roleEl ? (roleEl.value || '').toLowerCase() : '';
    var hasImage = userImageState.originalPath || userImageState.pendingFile;
    if (!hasImage) { showToast('warning', 'User image is required.'); return; }
    if (!name) { showToast('warning', 'Name is required.'); return; }
    if (!username) { showToast('warning', 'Username is required.'); return; }
    if (!email) { showToast('warning', 'Email is required.'); return; }
    if (role !== 'admin' && role !== 'editor') { showToast('warning', 'Role must be admin or editor.'); return; }
    loadingView.classList.add('show');
    var fd = new FormData();
    fd.append('Name', name);
    fd.append('Username', username);
    fd.append('Email', email);
    fd.append('Role', role);
    if (userImageState.pendingFile) fd.append('image', userImageState.pendingFile);
    var url = id ? '/api/dashboard/users/' + id : '/api/dashboard/users';
    var method = id ? 'PUT' : 'POST';
    fetch(url, { method: method, credentials: 'include', body: fd })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) {
          loadingView.classList.remove('show');
          showToast('danger', data.error);
          return;
        }
        var modal = document.getElementById('userModal');
        if (modal && typeof bootstrap !== 'undefined') bootstrap.Modal.getInstance(modal).hide();
        loadUsers();
        showToast('success', isAdd ? 'User added successfully.' : 'User updated successfully.');
        loadingView.classList.remove('show');
      })
      .catch(function () {
        loadingView.classList.remove('show');
        showToast('danger', 'Failed to save user.');
      });
  }

  function deleteUser(id) {
    loadingView.classList.add('show');
    fetch('/api/dashboard/users/' + id, { method: 'DELETE', credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) { loadingView.classList.remove('show'); showToast('danger', data.error); return; }
        loadUsers();
        showToast('success', 'User deleted successfully.');
      })
      .catch(function () { loadingView.classList.remove('show'); showToast('danger', 'Failed to delete user.'); });
  }

  function loadProfile() {
    if (!user) return;
    var isAdmin = (user.role || '').toLowerCase() === 'admin';
    document.getElementById('profileNameInput').value = user.name || '';
    document.getElementById('profileEmailInput').value = user.email || '';
    var emailInput = document.getElementById('profileEmailInput');
    var roleSelect = document.getElementById('profileRoleSelect');
    var roleInput = document.getElementById('profileRoleInput');
    var emailHint = document.getElementById('profileEmailHint');
    var roleHint = document.getElementById('profileRoleHint');
    if (isAdmin) {
      emailInput.readOnly = false;
      emailInput.removeAttribute('readonly');
      roleSelect.style.display = 'block';
      roleInput.style.display = 'none';
      roleSelect.value = (user.role || '').toLowerCase();
      if (emailHint) emailHint.textContent = 'Admin can change email.';
      if (roleHint) roleHint.textContent = 'Admin can change role.';
    } else {
      emailInput.readOnly = true;
      emailInput.setAttribute('readonly', 'readonly');
      roleSelect.style.display = 'none';
      roleInput.style.display = 'block';
      roleInput.value = user.role || '—';
      if (emailHint) emailHint.textContent = 'Only admin can change email.';
      if (roleHint) roleHint.textContent = 'Only admin can change role.';
    }
    profileImageState.originalPath = (user.picture || '').replace(/^\//, '');
    profileImageState.pendingFile = null;
    var img = document.getElementById('profileImage');
    var imgPreview = document.getElementById('profileImageImg');
    if (user.picture) {
      var pic = user.picture.startsWith('/') ? user.picture : '/' + user.picture;
      img.src = pic;
      if (imgPreview) imgPreview.src = pic;
      if (img) img.alt = user.name || 'Profile';
    } else {
      img.src = '/images/theme/istaqm-128.png';
      if (imgPreview) imgPreview.src = '/images/theme/istaqm-128.png';
    }
    var profileImageInput = document.getElementById('profileImageInput');
    if (profileImageInput) profileImageInput.value = '';
  }

  function saveProfile(e) {
    if (e) e.preventDefault();
    var nameEl = document.getElementById('profileNameInput');
    var emailEl = document.getElementById('profileEmailInput');
    var roleSelect = document.getElementById('profileRoleSelect');
    var name = nameEl ? nameEl.value.trim() : '';
    var isAdmin = (user && (user.role || '').toLowerCase() === 'admin');
    if (!name) { showToast('warning', 'Name is required.'); return; }
    var hasImage = profileImageState.originalPath || profileImageState.pendingFile;
    if (!hasImage) { showToast('warning', 'Profile image is required.'); return; }
    loadingView.classList.add('show');
    var fd = new FormData();
    fd.append('Name', name);
    if (isAdmin) {
      fd.append('Email', emailEl ? emailEl.value.trim() : '');
      fd.append('Role', roleSelect ? (roleSelect.value || '') : '');
    }
    if (profileImageState.pendingFile) fd.append('image', profileImageState.pendingFile);
    fetch('/api/dashboard/profile', { method: 'PUT', credentials: 'include', body: fd })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) {
          loadingView.classList.remove('show');
          showToast('danger', data.error);
          return;
        }
        if (data.user) {
          user = data.user;
          updateHeaderUser();
        }
        loadProfile();
        showToast('success', 'Profile updated successfully.');
        loadingView.classList.remove('show');
      })
      .catch(function () {
        loadingView.classList.remove('show');
        showToast('danger', 'Failed to update profile.');
      });
  }

  function navigateTo(page) {
    showPage(page);
    if (page === 'stats') loadStats();
    else if (page === 'categories') loadCategories();
    else if (page === 'cities') loadCities();
    else if (page === 'posts') {
      loadingView.classList.add('show');
      Promise.all([
        fetch('/api/dashboard/categories', fetchOptions()).then(function (r) { return r.json(); }).then(function (d) { categories = d.items || []; }),
        fetch('/api/dashboard/cities', fetchOptions()).then(function (r) { return r.json(); }).then(function (d) { cities = d.items || []; })
      ]).then(function () {
        var catEl = document.getElementById('postsCategoryFilter');
        var cityEl = document.getElementById('postsCityFilter');
        if (catEl) {
          var catVal = catEl.value;
          catEl.innerHTML = '<option value="">All categories</option>' + (categories || []).map(function (c) {
            return '<option value="' + c.CategoryID + '">' + (c.TitleEn || c.TitleAr || c.CategoryID) + '</option>';
          }).join('');
          catEl.value = catVal;
        }
        if (cityEl) {
          var cityVal = cityEl.value;
          cityEl.innerHTML = '<option value="">All cities</option>' + (cities || []).map(function (c) {
            return '<option value="' + c.CityID + '">' + (c.TitleEn || c.TitleAr || c.CityID) + '</option>';
          }).join('');
          cityEl.value = cityVal;
        }
        loadPosts();
      }).catch(function () { loadingView.classList.remove('show'); });
    }
    else if (page === 'slides') loadSlides();
    else if (page === 'testimonials') loadTestimonials();
    else if (page === 'users') loadUsers();
    else if (page === 'profile') loadProfile();
  }

  function showAjaxLoader() {
    var ajaxLoader = document.getElementById('ajaxLoader');
    if (ajaxLoader) ajaxLoader.style.display = 'block';
  }

  function hideAjaxLoader() {
    var ajaxLoader = document.getElementById('ajaxLoader');
    if (ajaxLoader) ajaxLoader.removeAttribute('style');
  }

  function init() {
    var urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('error') === 'unauthorized') {
      var errEl = document.getElementById('loginError');
      if (errEl) { errEl.classList.remove('d-none'); }
      history.replaceState({}, '', window.location.pathname);
    }

    fetch('/api/me', fetchOptions())
      .then(function (r) {
        if (r.ok) return r.json();
        throw new Error('Not authenticated');
      })
      .then(function (data) {
        if (data.user) {
          user = data.user;
          document.getElementById('dashboardView').classList.remove('d-none');
          updateHeaderUser();
          navigateTo('stats');

          document.getElementById('dashboardView').addEventListener('click', function (e) {
            var a = e.target.closest('a[data-page]');
            if (a && !a.closest('nav[id$="Pagination"]')) {
              e.preventDefault();
              navigateTo(a.getAttribute('data-page'));
            }
          });

          var sidebar = document.getElementById('sidebar');
          var overlay = document.getElementById('sidebarOverlay');
          document.getElementById('sidebarToggle').addEventListener('click', function () {
            //sidebar.classList.toggle('show');
            document.body.classList.toggle('toggle-sidebar');
            if (overlay) overlay.classList.toggle('show', sidebar.classList.contains('show'));
          });
          if (overlay) overlay.addEventListener('click', function () {
            //sidebar.classList.remove('show');
            document.body.classList.remove('toggle-sidebar');
            overlay.classList.remove('show');
          });
          //window resize event
          window.addEventListener('resize', function () {
            if (window.innerWidth > 991) {
              document.body.classList.remove('toggle-sidebar');
            }
          });

          document.getElementById('mainContent').addEventListener('click', handleTableAction);

          var addBtn = document.getElementById('categoryAddBtn');
          if (addBtn) addBtn.addEventListener('click', function () { openCategoryModal(); });
          var saveBtn = document.getElementById('categorySaveBtn');
          if (saveBtn) saveBtn.addEventListener('click', saveCategory);
          var cityAddBtn = document.getElementById('cityAddBtn');
          if (cityAddBtn) cityAddBtn.addEventListener('click', function () { openCityModal(); });
          var citySaveBtn = document.getElementById('citySaveBtn');
          if (citySaveBtn) citySaveBtn.addEventListener('click', saveCity);
          var slideAddBtn = document.getElementById('slideAddBtn');
          if (slideAddBtn) slideAddBtn.addEventListener('click', function () { openSlideModal(); });
          var slideSaveBtn = document.getElementById('slideSaveBtn');
          if (slideSaveBtn) slideSaveBtn.addEventListener('click', saveSlide);
          var testimonialAddBtn = document.getElementById('testimonialAddBtn');
          if (testimonialAddBtn) testimonialAddBtn.addEventListener('click', function () { openTestimonialModal(); });
          var testimonialSaveBtn = document.getElementById('testimonialSaveBtn');
          if (testimonialSaveBtn) testimonialSaveBtn.addEventListener('click', saveTestimonial);
          var userAddBtn = document.getElementById('userAddBtn');
          if (userAddBtn) userAddBtn.addEventListener('click', function () { openUserModal(); });
          var userSaveBtn = document.getElementById('userSaveBtn');
          if (userSaveBtn) userSaveBtn.addEventListener('click', saveUser);
          var slideImageInput = document.getElementById('slideImageInput');
          if (slideImageInput) slideImageInput.addEventListener('change', function () {
            var file = this.files && this.files[0];
            if (!file) return;
            var img = document.getElementById('slideImageImg');
            if (img && img.src && img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
            slideImageState.pendingFile = file;
            slideImageState.removed = false;
            var preview = document.getElementById('slideImagePreview');
            var url = URL.createObjectURL(file);
            if (img) img.src = url;
            if (preview) preview.style.display = 'block';
          });
          var testimonialImageInput = document.getElementById('testimonialImageInput');
          if (testimonialImageInput) testimonialImageInput.addEventListener('change', function () {
            var file = this.files && this.files[0];
            if (!file) return;
            var img = document.getElementById('testimonialImageImg');
            if (img && img.src && img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
            testimonialImageState.pendingFile = file;
            testimonialImageState.removed = false;
            var preview = document.getElementById('testimonialImagePreview');
            var url = URL.createObjectURL(file);
            if (img) img.src = url;
            if (preview) preview.style.display = 'block';
          });
          var userImageInput = document.getElementById('userImageInput');
          if (userImageInput) userImageInput.addEventListener('change', function () {
            var file = this.files && this.files[0];
            if (!file) return;
            var img = document.getElementById('userImageImg');
            if (img && img.src && img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
            userImageState.pendingFile = file;
            userImageState.removed = false;
            var preview = document.getElementById('userImagePreview');
            var url = URL.createObjectURL(file);
            if (img) img.src = url;
            if (preview) preview.style.display = 'block';
          });
          var profileForm = document.getElementById('profileForm');
          if (profileForm) profileForm.addEventListener('submit', saveProfile);
          var profileImageInput = document.getElementById('profileImageInput');
          if (profileImageInput) profileImageInput.addEventListener('change', function () {
            var file = this.files && this.files[0];
            if (!file) return;
            var img = document.getElementById('profileImageImg');
            if (img && img.src && img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
            profileImageState.pendingFile = file;
            profileImageState.removed = false;
            var url = URL.createObjectURL(file);
            if (img) img.src = url;
            var bigImg = document.getElementById('profileImage');
            if (bigImg) bigImg.src = url;
          });
          var projectAddBtn = document.getElementById('projectAddBtn');
          if (projectAddBtn) projectAddBtn.addEventListener('click', function () { openProjectModal(); });
          var projectSaveBtn = document.getElementById('projectSaveBtn');
          if (projectSaveBtn) projectSaveBtn.addEventListener('click', saveProject);
          var projectImageInput = document.getElementById('projectImageInput');
          if (projectImageInput) projectImageInput.addEventListener('change', function () {
            var file = this.files && this.files[0];
            if (!file) return;
            var img = document.getElementById('projectImageImg');
            if (img && img.src && img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
            projectImageState.pendingFile = file;
            projectImageState.removed = false;
            var preview = document.getElementById('projectImagePreview');
            var url = URL.createObjectURL(file);
            if (img) img.src = url;
            if (preview) preview.style.display = 'block';
          });
          var projectGalleryInput = document.getElementById('projectGalleryInput');
          if (projectGalleryInput) projectGalleryInput.addEventListener('change', function () {
            var files = this.files;
            if (!files || files.length === 0) return;
            for (var i = 0; i < files.length; i++) {
              var f = files[i];
              if (!f.type || !f.type.startsWith('image/')) continue;
              projectGalleryState.items.push({ file: f, url: URL.createObjectURL(f), id: 'p' + Date.now() + i });
            }
            this.value = '';
            renderProjectGalleryGrid();
          });
          var projectGalleryAddYoutube = document.getElementById('projectGalleryAddYoutube');
          if (projectGalleryAddYoutube) projectGalleryAddYoutube.addEventListener('click', function () {
            openYoutubeModal(null, function () { renderProjectGalleryGrid(); });
          });
          var projectGalleryAddVideo = document.getElementById('projectGalleryAddVideo');
          if (projectGalleryAddVideo) projectGalleryAddVideo.addEventListener('click', function () {
            openVideoModal(function () { renderProjectGalleryGrid(); });
          });
          var postsSearchDebounce;
          var postsSearchEl = document.getElementById('postsSearch');
          if (postsSearchEl) postsSearchEl.addEventListener('input', function () {
            clearTimeout(postsSearchDebounce);
            postsSearchDebounce = setTimeout(function () { loadPosts(1); }, 300);
          });
          var postsCatFilter = document.getElementById('postsCategoryFilter');
          if (postsCatFilter) postsCatFilter.addEventListener('change', function () { loadPosts(1); });
          var postsCityFilter = document.getElementById('postsCityFilter');
          if (postsCityFilter) postsCityFilter.addEventListener('change', function () { loadPosts(1); });
          // Nested modal z-index: when Add YouTube/Video opens inside Edit Project
          function fixNestedModalZIndex() {
            var backdrops = document.querySelectorAll('.modal-backdrop');
            var modals = document.querySelectorAll('.modal.show');
            backdrops.forEach(function (el, i) {
              el.style.zIndex = 1050 + i * 10;
            });
            modals.forEach(function (el, i) {
              el.style.zIndex = 1055 + i * 10;
            });
          }
          document.addEventListener('shown.bs.modal', fixNestedModalZIndex);
          document.addEventListener('hidden.bs.modal', fixNestedModalZIndex);
          var imageInput = document.getElementById('categoryImageInput');
          if (imageInput) imageInput.addEventListener('change', function () {
            var file = this.files && this.files[0];
            if (!file) return;
            var img = document.getElementById('categoryImageImg');
            if (img && img.src && img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
            categoryImageState.pendingFile = file;
            categoryImageState.removed = false;
            var preview = document.getElementById('categoryImagePreview');
            var removeBtn = document.getElementById('categoryImageRemove');
            var url = URL.createObjectURL(file);
            if (img) img.src = url;
            if (preview) preview.style.display = 'block';
            if (removeBtn) removeBtn.style.display = 'inline-block';
          });
          var imageRemove = document.getElementById('categoryImageRemove');
          if (imageRemove) imageRemove.addEventListener('click', function () {
            var preview = document.getElementById('categoryImagePreview');
            var img = document.getElementById('categoryImageImg');
            var input = document.getElementById('categoryImageInput');
            var hadImage = categoryImageState.originalPath || categoryImageState.pendingFile;
            categoryImageState.pendingFile = null;
            categoryImageState.removed = !!hadImage;
            if (img && img.src && img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
            if (img) img.src = '';
            if (preview) preview.style.display = 'none';
            this.style.display = 'none';
            if (input) input.value = '';
          });
        }
        hideAjaxLoader();
      })
      .catch(function () {
        hideAjaxLoader();
      });
  }
  //create ajax loader
  var ajaxLoader = document.createElement('div');
  ajaxLoader.id = 'ajaxLoader';
  ajaxLoader.style.display = 'block';
  ajaxLoader.style.opacity = '1';
  document.body.appendChild(ajaxLoader);

  document.addEventListener('DOMContentLoaded', init);
})();
