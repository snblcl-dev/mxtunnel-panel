/* ============================================
   MXTunnel Panel — App JS (toasts, AJAX, modals)
   ============================================ */

(function () {
  'use strict';

  // ----- Toast -----
  function ensureToastContainer() {
    let c = document.querySelector('.toast-container');
    if (!c) {
      c = document.createElement('div');
      c.className = 'toast-container position-fixed top-0 end-0 p-3';
      document.body.appendChild(c);
    }
    return c;
  }

  const ICONS = { success: 'bi-check-circle-fill', error: 'bi-x-circle-fill', info: 'bi-info-circle-fill' };

  window.showToast = function (message, type = 'info', delay = 3500) {
    const c = ensureToastContainer();
    const id = 'toast-' + Date.now();
    const el = document.createElement('div');
    el.className = 'toast toast-' + type + ' fade-in';
    el.id = id;
    el.role = 'alert';
    el.innerHTML = '<div class="toast-body"><i class="bi ' + ICONS[type] + '"></i><span>' + message + '</span></div>';
    c.appendChild(el);
    const t = new bootstrap.Toast(el, { delay, autohide: true });
    t.show();
    el.addEventListener('hidden.bs.toast', () => el.remove());
  };

  // ----- Build urlencoded body from FormData -----
  function toUrlEncoded(formData) {
    const params = new URLSearchParams();
    for (const [k, v] of formData.entries()) params.append(k, v);
    return params;
  }

  // ----- AJAX form submit -----
  window.submitAjax = function (form, opts = {}) {
    return new Promise((resolve, reject) => {
      const url = form.action + (form.action.includes('?') ? '&' : '?') + 'ajax=1';
      const body = toUrlEncoded(new FormData(form));
      const btn = form.querySelector('button[type="submit"]');
      let originalHtml = '';
      if (btn) { originalHtml = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Guardando...'; }

      fetch(url, {
        method: form.method || 'POST',
        body,
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })
        .then(r => r.json().catch(() => ({ ok: r.ok, status: r.status })))
        .then(resp => {
          if (btn) { btn.disabled = false; btn.innerHTML = originalHtml; }
          if (resp && resp.ok) {
            resolve(resp);
          } else {
            const msg = (resp && (resp.message || resp.error)) || 'Error';
            showToast(msg, 'error');
            reject(resp);
          }
        })
        .catch(err => {
          if (btn) { btn.disabled = false; btn.innerHTML = originalHtml; }
          showToast('Error de red', 'error');
          reject(err);
        });
    });
  };

  // ----- Bind all forms with data-ajax="true" -----
  document.addEventListener('submit', function (e) {
    const form = e.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (form.dataset.ajax !== 'true') return;

    e.preventDefault();
    submitAjax(form).then(resp => {
      showToast((resp && resp.message) || 'Guardado', 'success');
      const modalEl = form.closest('.modal');
      if (modalEl) {
        const m = bootstrap.Modal.getInstance(modalEl);
        if (m) m.hide();
      }
      setTimeout(() => window.location.reload(), 700);
    }).catch(() => {});
  });

  // ----- Toggle switch (AJAX) -----
  document.addEventListener('change', function (e) {
    const t = e.target;
    if (!(t instanceof HTMLInputElement)) return;
    if (!t.classList.contains('js-ajax-toggle')) return;

    const url = t.dataset.url;
    const original = t.checked;
    t.disabled = true;

    const params = new URLSearchParams();
    params.append('action', t.dataset.action || 'toggle');
    params.append('_csrf', t.dataset.csrf);

    fetch(url + (url.includes('?') ? '&' : '?') + 'ajax=1', {
      method: 'POST',
      body: params,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
      .then(r => r.json())
      .then(resp => {
        t.disabled = false;
        if (resp && resp.ok) {
          showToast(resp.message || 'Actualizado', 'success', 2000);
          const badge = document.querySelector('[data-status-badge="' + t.dataset.targetId + '"]');
          if (badge) {
            const newStatus = original ? t.dataset.activeLabel : t.dataset.inactiveLabel;
            badge.textContent = newStatus;
            badge.className = 'badge ' + (original ? 'bg-success' : 'bg-secondary');
          }
        } else {
          t.checked = !original;
          t.disabled = false;
          showToast((resp && resp.message) || 'Error', 'error');
        }
      })
      .catch(() => {
        t.checked = !original;
        t.disabled = false;
        showToast('Error de red', 'error');
      });
  });

  // ----- Delete with confirmation modal -----
  window.confirmDelete = function (url, csrf, message) {
    const m = document.getElementById('confirmDeleteModal');
    if (!m) return;
    document.getElementById('confirmDeleteMessage').textContent = message || '¿Eliminar? Esta acción no se puede deshacer.';
    const form = document.getElementById('confirmDeleteForm');
    form.action = url;
    const csrfInput = document.getElementById('confirmDeleteCsrf');
    if (csrfInput) csrfInput.value = csrf;

    const modal = new bootstrap.Modal(m);
    modal.show();
  };

  // ----- Copy to clipboard -----
  window.copyText = function (text) {
    navigator.clipboard.writeText(text).then(() => showToast('Copiado', 'success', 2000));
  };
})();
