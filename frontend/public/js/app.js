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
      c.className = 'toast-container position-fixed bottom-0 end-0 p-3';
      document.body.appendChild(c);
    }
    return c;
  }

  const ICONS = {
    success: 'bi-check-circle-fill',
    error: 'bi-x-circle-fill',
    info: 'bi-info-circle-fill',
    warning: 'bi-exclamation-triangle-fill',
  };

  window.showToast = function (message, type = 'info', delay = 3500) {
    try {
      const c = ensureToastContainer();
      const el = document.createElement('div');
      el.className = 'toast toast-' + type;
      el.role = 'alert';
      el.style.setProperty('--toast-delay', delay + 'ms');
      const icon = ICONS[type] || ICONS.info;
      const safe = String(message).replace(/[<&>]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
      el.innerHTML =
        '<div class="toast-body">' +
          '<i class="bi ' + icon + '"></i>' +
          '<span>' + safe + '</span>' +
        '</div>' +
        '<div class="toast-progress"></div>';
      c.appendChild(el);
      const t = new bootstrap.Toast(el, { delay, autohide: true });
      t.show();
      el.addEventListener('hidden.bs.toast', () => el.remove());
    } catch (e) {
      console.error('toast error', e);
    }
  };

  function toUrlEncoded(formData) {
    const params = new URLSearchParams();
    for (const [k, v] of formData.entries()) params.append(k, v);
    return params;
  }

  // ----- submitForm: handler DIRECTO (para modales) -----
  // Se llama desde onsubmit="submitForm(this); return false;"
  window.submitForm = function (form) {
    if (!form) { console.error('submitForm: no form'); return; }
    try {
      submitAjax(form).then(resp => {
        showToast((resp && resp.message) || 'Guardado', 'success');
        const modalEl = form.closest && form.closest('.modal');
        if (modalEl && window.bootstrap) {
          const inst = bootstrap.Modal.getInstance(modalEl);
          if (inst) inst.hide();
        }
        setTimeout(() => window.location.reload(), 700);
      }).catch(err => {
        console.error('submitAjax error', err);
      });
    } catch (e) {
      console.error('submitForm thrown', e);
      showToast('Error al enviar formulario', 'error');
    }
  };

  // ----- submitAjax (interno) -----
  window.submitAjax = function (form) {
    return new Promise((resolve, reject) => {
      try {
        // Usar getAttribute para garantizar string (form.action puede no comportarse como string en algunos browsers)
        const action = form.getAttribute('action') || '';
        if (!action) { showToast('Form sin action', 'error'); reject(new Error('sin action')); return; }
        const sep = action.indexOf('?') >= 0 ? '&' : '?';
        const url = action + sep + 'ajax=1';
        const body = toUrlEncoded(new FormData(form));
        const btn = form.querySelector('button[type="submit"], button:not([type])');
        let originalHtml = '';
        if (btn) { originalHtml = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Guardando...'; }

        fetch(url, {
          method: form.method || 'POST',
          body,
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
        })
          .then(r => r.json().catch(() => ({ ok: r.ok, status: r.status })))
          .then(resp => {
            if (btn) { btn.disabled = false; btn.innerHTML = originalHtml; }
            if (resp && resp.ok) resolve(resp);
            else { showToast((resp && (resp.message || resp.error)) || 'Error', 'error'); reject(resp); }
          })
          .catch(err => {
            if (btn) { btn.disabled = false; btn.innerHTML = originalHtml; }
            showToast('Error de red', 'error');
            reject(err);
          });
      } catch (e) {
        console.error('submitAjax thrown', e);
        reject(e);
      }
    });
  };

  // ----- Delegación para forms INLINE (data-ajax) -----
  document.addEventListener('submit', function (e) {
    const form = e.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (form.dataset.ajax !== 'true') return;
    e.preventDefault();
    submitAjax(form).then(resp => {
      showToast((resp && resp.message) || 'Guardado', 'success');
      setTimeout(() => window.location.reload(), 700);
    }).catch(() => {});
  });

  // ----- Toggle switch -----
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
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
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

  // ----- Delete confirmation -----
  window.confirmDelete = function (url, csrf, message, action) {
    const m = document.getElementById('confirmDeleteModal');
    if (!m) return;
    document.getElementById('confirmDeleteMessage').textContent = message || '¿Eliminar? Esta acción no se puede deshacer.';
    const form = document.getElementById('confirmDeleteForm');
    form.action = url;
    const csrfInput = document.getElementById('confirmDeleteCsrf');
    if (csrfInput) csrfInput.value = csrf;
    const actionInput = document.getElementById('confirmDeleteAction');
    if (actionInput) actionInput.value = action || 'delete';
    if (window.bootstrap) new bootstrap.Modal(m).show();
  };

  // ----- Copy to clipboard (con fallback para HTTP) -----
  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '0';
    ta.setAttribute('readonly', '');
    document.body.appendChild(ta);
    ta.select();
    try {
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok) showToast('Copiado', 'success', 2000);
      else showToast('No se pudo copiar', 'error');
    } catch (e) {
      document.body.removeChild(ta);
      showToast('No se pudo copiar', 'error');
    }
  }

  window.copyText = function (text) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(() => showToast('Copiado', 'success', 2000))
        .catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  };

  // ----- Vista previa de temas (miniaturas + modal) -----
  // Mock del puente MXTunnel para que los temas rendericen en el preview.
  const THEME_SHIM =
    '<script>window.MXTunnel={' +
    'connect:function(){},disconnect:function(){},isConnected:function(){return false},' +
    'getStatus:function(){return "DISCONNECTED"},getConfig:function(){return "{}"},' +
    'getSelectedServer:function(){return ""},applyServer:function(){},' +
    'getAccountUser:function(){return ""},getAccountPass:function(){return ""},' +
    'setAccountUser:function(){},setAccountPass:function(){},update:function(){},' +
    'getLogs:function(){return "[]"},clearLogs:function(){},' +
    'openBattery:function(){},openLanguage:function(){},openDns:function(){},openUdp:function(){},' +
    'openPing:function(){},openHwid:function(){},openRestore:function(){},openExit:function(){},' +
    'restoreDefault:function(){},exitApp:function(){},minimizeApp:function(){},' +
    'enableThemeModals:function(){},getLanguage:function(){return "default"},setLanguage:function(){},' +
    'getDnsConfig:function(){return "{}"},setDnsConfig:function(){},getUdpConfig:function(){return "{}"},' +
    'setUdpConfig:function(){},getPingUrl:function(){return ""},setPingUrl:function(){},' +
    'getShareProxy:function(){return "{\\"enabled\\":false,\\"running\\":false,\\"ip\\":\\"\\",\\"port\\":1081,\\"socks\\":1080}"},' +
    'setShareProxy:function(){},getHwid:function(){return "preview"},getTraffic:function(){return "{\\"rxBytes\\":0,\\"txBytes\\":0}"},' +
    'getPing:function(){return "-1"},copyText:function(){},' +
    'onReady:function(){},setStatusBarColor:function(){}' +
    '};window.mxtunnel={onStatus:function(){},onServerApplied:function(){},onConfigUpdated:function(){},' +
    'onLog:function(){},onToast:function(){},onOpenMenu:function(){}};<\/script>';

  function themePreviewSrc(html) {
    html = html || '';
    const headIdx = html.toLowerCase().indexOf('<head');
    if (headIdx !== -1) {
      const end = html.indexOf('>', headIdx);
      if (end !== -1) return html.slice(0, end + 1) + THEME_SHIM + html.slice(end + 1);
    }
    return THEME_SHIM + html;
  }

  window.renderThemeThumb = function (container, html) {
    if (!container) return;
    container.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.style.background = '#0B0B0B';
    container.appendChild(iframe);

    const W = 480;
    const H = 960;
    // Tomamos el ancho real del contenedor y escalamos proporcionalmente.
    // Sumamos 1px al scale para que el iframe escalado cubra exactamente el
    // ancho del thumb sin dejar franja gris residual a la derecha.
    const cw = container.clientWidth || 240;
    const scale = (cw + 1) / W;
    const height = Math.round(H * scale);
    iframe.style.width = W + 'px';
    iframe.style.height = H + 'px';
    iframe.style.transform = 'scale(' + scale + ')';
    iframe.style.transformOrigin = 'top left';
    iframe.style.position = 'absolute';
    iframe.style.top = '0';
    iframe.style.left = '0';
    iframe.style.border = '0';
    iframe.srcdoc = themePreviewSrc(html);

    const fill = container.classList.contains('theme-thumb-fill');
    if (!fill) {
      // En modo 'no fill' (preview externo), fija la altura exacta
      container.style.height = height + 'px';
    }
    // En modo 'fill' (card), la altura la maneja CSS con flex:1 + min-height
    // y el thumb hace scroll vertical si el iframe escalado excede el espacio.
    container.style.minHeight = Math.max(height, 320) + 'px';
  };
})();
