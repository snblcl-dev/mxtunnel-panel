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
        // Si el backend pide redirigir (p. ej. login limpio tras cambiar
        // contraseña), se hace la redirección en lugar de recargar.
        if (resp && resp.redirect) {
          setTimeout(() => { window.location.href = resp.redirect; }, 600);
          return;
        }
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
      if (resp && resp.redirect) {
        setTimeout(() => { window.location.href = resp.redirect; }, 600);
        return;
      }
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
    // Usar el token fresco renderizado en la página (hidden _csrf global) en
    // lugar del pasado por URL: si la cookie CSRF rotó (p. ej. tras cambiar
    // password/sesión), el de la URL queda desincronizado y daba "CSRF inválido".
    let freshCsrf = csrf;
    const pageCsrf = document.querySelector('input[name="_csrf"]');
    if (pageCsrf && pageCsrf.value) freshCsrf = pageCsrf.value;
    if (csrfInput) csrfInput.value = freshCsrf;
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

    const W = 480;
    const H = 960;

    // Funcion reutilizable: mide el ancho real del thumb y aplica la escala
    // exacta al iframe. Se llama tanto en el primer frame como en cada
    // resize del thumb (cambio de viewport, sidebar, etc).
    const apply = function () {
      const cw = container.clientWidth || 240;
      const scale = cw / W;
      const height = Math.round(H * scale);
      const fill = container.classList.contains('theme-thumb-fill');
      if (!fill) container.style.height = height + 'px';

      // El iframe ya esta en el DOM desde la primera llamada; reaplicamos
      // estilos si existen, o creamos uno nuevo si es el primer render.
      let iframe = container.querySelector('iframe');
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.setAttribute('sandbox', 'allow-scripts');
        iframe.style.background = '#0B0B0B';
        iframe.style.position = 'absolute';
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.style.border = '0';
        iframe.style.transformOrigin = 'top left';
        container.appendChild(iframe);
      }
      iframe.style.width = W + 'px';
      iframe.style.height = H + 'px';
      iframe.style.transform = 'scale(' + scale + ')';
      // Capamos la altura visible del thumb para que las cards no queden
      // excesivamente largas. El tema se navega con scroll interno.
      const visibleH = Math.min(Math.round(H * scale), 380);
      container.style.minHeight = visibleH + 'px';
    };

    // Primer render: aplicamos en el siguiente frame para que el thumb ya
    // tenga su ancho definitivo (importante dentro de rows flex de Bootstrap
    // donde el ancho real se calcula tras aplicar gutters).
    requestAnimationFrame(function () {
      apply();
      // Despues de aplicar estilos, cargamos el contenido del iframe.
      const iframe = container.querySelector('iframe');
      if (iframe && !iframe.srcdoc) iframe.srcdoc = themePreviewSrc(html);
      // Si el contenedor ya tenia srcdoc previo, lo reescribimos.
      else if (iframe) iframe.srcdoc = themePreviewSrc(html);
    });

    // Reaplicar en resize para que el iframe siga cubriendo el thumb tras
    // cambios de viewport o de la sidebar.
    if (!container._resizeObs) {
      const ro = new ResizeObserver(apply);
      ro.observe(container);
      container._resizeObs = ro;
    }
  };

  // Mapeo tunnel_type (numerico) -> nombre legible. Tambien esta disponible
  // en el server-side (src/config/render-config.ts); aqui se expone para el JS
  // del navegador (formularios dinamicos, modales, etc.).
  window.TUNNEL_TYPES = {
    1: 'SSH Directo',
    2: 'SSH Proxy',
    3: 'SSH SSL',
    4: 'SSL Payload',
    5: 'SlowDNS',
    6: 'SSL RP',
    7: 'SSH',
    8: 'RE',
    9: 'UDP',
    10: 'V2Ray',
    12: 'DNSTT + V2Ray',
  };
  window.tunnelTypeName = function (n) {
    return window.TUNNEL_TYPES[n] || ('Tipo ' + n);
  };

  // ----- Sidebar móvil: botón hamburguesa + overlay (solo si hay sidebar) -----
  function initMobileSidebar() {
    var sidebar = document.querySelector('.app-sidebar');
    if (!sidebar) return;
    if (document.querySelector('.sidebar-toggle')) return;

    // .app-layout tiene z-index:1 y crea su propio contexto de apilamiento.
    // Si el toggle/backdrop se añaden a body, z-index 99/110 > .app-layout(1)
    // y quedarían ENCIMA del sidebar (que vive dentro de .app-layout).
    // Hay que inyectarlos dentro de .app-layout para que compartan contexto.
    var appLayout = document.querySelector('.app-layout');
    if (!appLayout) return;

    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'sidebar-toggle';
    toggle.setAttribute('aria-label', 'Abrir menú');
    toggle.innerHTML = '<i class="bi bi-list"></i>';

    var backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';

    appLayout.appendChild(toggle);
    appLayout.appendChild(backdrop);

    var open = function () {
      sidebar.classList.add('show');
      backdrop.classList.add('show');
      toggle.classList.add('hidden');
    };
    var close = function () {
      sidebar.classList.remove('show');
      backdrop.classList.remove('show');
      toggle.classList.remove('hidden');
    };

    toggle.addEventListener('click', open);
    backdrop.addEventListener('click', close);

    sidebar.querySelectorAll('.nav-link').forEach(function (a) {
      a.addEventListener('click', close);
    });
    sidebar.querySelectorAll('.btn-close-sidebar').forEach(function (b) {
      b.addEventListener('click', close);
    });

    // Auto-cerrar al pasar a layout desktop
    var mq = window.matchMedia('(min-width: 992px)');
    var onChange = function (e) { if (e.matches) close(); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileSidebar);
  } else {
    initMobileSidebar();
  }
})();
