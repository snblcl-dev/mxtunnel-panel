# Contrato de Temas MXTunnel (WebView)

Cómo crear un **tema 100% personalizable** para la app MXTunnel. El tema es un **archivo HTML** (CSS/JS inline) que la app renderiza en un WebView y que se comunica con el núcleo nativo mediante el puente `MXTunnel`.

## Cómo se carga

1. La app obtiene el tema en `GET /api/theme?token=<uuid>` (tema activo del usuario, si no el global, si no `null`).
2. Si el panel devuelve tema → se guarda y se carga. Si no → se usa el **tema por defecto embebido** en la APK.
3. La app carga el HTML en un WebView con `loadDataWithBaseURL`. **Recursos externos permitidos: solo por `https://` y de CDNs/dominios confiables** — fuentes (Google Fonts), iconos (Bootstrap Icons, Font Awesome…) e imágenes. **Todo el CSS y el JS debe ir inline** (no se permite `<link rel="stylesheet">` propio ni `<script src>`).
4. Se vuelve a cargar cuando cambia `themeVersion` (en `Actualizar` o al abrir la app si hubo cambios).

## ⚠️ Requisitos obligatorios del tema

El tema **DEBE** hacer dos cosas al terminar de inicializarse:

1. **Handshake** (obligatorio): llamar a `MXTunnel.onReady()`.
   Si la app no recibe `onReady` en ~3 s, asume que el tema es inválido/incompatible y **cae al tema por defecto** (nunca deja una pantalla rota/blanca).

```js
try { MXTunnel.onReady(); } catch(e) {}
```

2. **Color de barra de estado** (recomendado): llamar a `MXTunnel.setStatusBarColor('#RRGGBB')` con el color de fondo de tu tema, para que el área del notch coincida. 

```js
try { MXTunnel.setStatusBarColor('#0B1220'); } catch(e) {}
```

## API del puente (`window.MXTunnel`)

### Acciones (void)

| Método | Descripción |
|---|---|
| `connect()` | Inicia la VPN (valida la cuenta si el servidor la requiere). |
| `disconnect()` | Detiene la VPN. |
| `applyServer(id)` | Aplica el servidor con ese `id` de la config. |
| `update()` | Descarga config + tema del panel (igual que "Actualizar"). |
| `clearLogs()` | Limpia el registro. |
| `setAccountUser(user)` / `setAccountPass(pass)` | Guarda credenciales de cuenta. |
| `setStatusBarColor('#hex')` | Cambia el color de la barra de estado. |
| `enableThemeModals()` | **Opt-in obligatorio** para que el tema renderice los modales del menú (ver "Modales del menú"). |
| `openBattery()` | Abre **directo** la pantalla de batería del sistema de Android. **No se personaliza.** |
| `openLanguage()` / `openDns()` / `openUdp()` / `openPing()` / `openHwid()` / `openRestore()` / `openExit()` | Si el tema llamó `enableThemeModals()`, disparan `onOpenMenu` para que el tema abra su modal. Si no, usan el diálogo nativo (retrocompatibilidad). |
| `setLanguage(code)` | Guarda idioma (`default`/`en`/`pt`/`fr`) y recrea la app. |
| `setDnsConfig(json)` | Guarda DNS `{ primary, secondary }` (valida IPs; si el túnel está activo avisa y no guarda). |
| `setUdpConfig(json)` | Guarda `{ udpResolver }`. |
| `setPingUrl(url)` | Guarda la URL/host de ping. |
| `setShareProxy(enabled)` | Activa/desactiva el **proxy compartido** (comparte el túnel con dispositivos del hotspot). Con `true` y el túnel conectado arranca el proxy HTTP en el puerto 1081; con `false` lo detiene. |
| `copyText(text)` | Copia texto al portapapeles nativo (más fiable que `navigator.clipboard`). |
| `minimizeApp()` | Minimiza la app (equivale al botón home). |
| `restoreDefault()` | Borra todos los datos de la app **sin confirmación** (el tema la hace). |
| `exitApp()` | Cierra la app **sin confirmación** (el tema la hace). |
| `checkUser()` | Consulta la cuenta actual en el servidor SSH activo (usuario + `deviceId`) usando la **URL Check User** configurada en el servidor (`urlCheckUser`, p. ej. `http://IP:2052`). El GET lo hace la app de forma nativa. Resultado por eventos `onCheckUserStarted` / `onCheckUserResult` / `onCheckUserError` (ver "Eventos" y "Modal personalizado de CheckUser"). Regla de diálogo nativo: si el tema **no** define `onCheckUserResult`, la app muestra el diálogo nativo en éxito; en **errores** lo muestra **siempre**. También se dispara automáticamente al conectar (si el servidor trae URL). |
| `onReady()` | **Handshake obligatorio.** |

### El menú y sus opciones

Las opciones del menú (Idioma, DNS, UDPGW, Ping, Batería, HWID, Compartir proxy, Restablecer datos, Salir) se lanzan desde el tema llamando a los métodos `openXxx` del puente. **Ya no existe la opción "Ajustes"**: las configuraciones generales de la app se controlan desde el panel (ver "Ajustes de la app (controlados por el panel)").

```js
document.querySelectorAll('#menuModal .m-item').forEach(function(el){
  el.addEventListener('click', function(){
    $('menuModal').classList.remove('open');
    var a = this.dataset.act;
    var map = {
      language: 'openLanguage', dns: 'openDns',
      udp: 'openUdp', ping: 'openPing', battery: 'openBattery',
      hwid: 'openHwid', restore: 'openRestore', exit: 'openExit'
    };
    var m = map[a];
    try {
      if (m && MXTunnel[m]) MXTunnel[m]();   // ← SIEMPRE llamar directo sobre MXTunnel
      else toast('Opción no disponible');
    } catch (err) {
      toast('Error: ' + (err && err.message ? err.message : 'opción'));
    }
  });
});
```

Nota: `restore` y `exit` usan `openRestore()`/`openExit()` (disparan el modal). `restoreDefault()`/`exitApp()` son las **acciones finales** que el tema llama desde el botón de confirmación del modal.

### Modales del menú (personalizados por el tema)

Con `enableThemeModals()` el tema se encarga de pintar los diálogos de Idioma, DNS, UDPGW, Ping, HWID, Restablecer y Salir con sus propios estilos. Batería sigue siendo nativa (y "Ajustes" ya no existe).

1. Al iniciar el tema, llama `try { MXTunnel.enableThemeModals(); } catch(e){}`.
2. Implementa `window.mxtunnel.onOpenMenu(option)` — recibe `language | dns | udp | ping | hwid | restore | exit`:
   - Abre tu modal (reutiliza `.overlay`/`.sheet`).
   - Carga los valores con los getters y guarda con los setters.
3. Ejemplo mínimo de Idioma:

```js
window.mxtunnel = {
  /* ... */
  onOpenMenu: function(opt){
    if (opt === 'language') cargarIdioma();
    /* ... */
  }
};
function cargarIdioma(){
  var act = 'default';
  try { act = MXTunnel.getLanguage() || 'default'; } catch(e){}
  var opciones = { default:'Español', en:'English', pt:'Português', fr:'Français' };
  var html = '';
  Object.keys(opciones).forEach(function(k){
    html += '<div class="r-item'+(k===act?' sel':'')+'" data-lang="'+k+'">'+opciones[k]+'</div>';
  });
  document.getElementById('langList').innerHTML = html;
  document.querySelectorAll('#langList .r-item').forEach(function(el){
    el.addEventListener('click', function(){
      document.getElementById('langModal').classList.remove('open');
      try { MXTunnel.setLanguage(this.dataset.lang); } catch(e){}
    });
  });
  document.getElementById('langModal').classList.add('open');
}
```

**Regla obligatoria:** los métodos del puente deben invocarse **siempre como `MXTunnel.metodo(...)`** (con el objeto `MXTunnel` como receptor). No los guardes en variables y llames por separado:

```js
// ❌ INCORRECTO — falla en varios WebViews de Android
var f = MXTunnel.openLanguage;
f();

// ❌ INCORRECTO — referencia desligada, el método pierde el enlace al puente
var map = { language: MXTunnel.openLanguage };
if (map[a]) map[a]();

// ✅ CORRECTO — el método queda enlazado a MXTunnel
var map = { language: 'openLanguage' };
if (map[a] && MXTunnel[map[a]]) MXTunnel[map[a]]();
```

En Android WebView, los métodos inyectados por `addJavascriptInterface` no son fiables como referencias sueltas: al llamarlos desligados el navegador puede devolver `undefined` o lanzar un error silencioso. Resultado típico: **el menú se cierra pero la opción no abre**.

### Sección de cuenta (ocultar si el servidor trae credenciales)

Cuando el servidor activo viene con `sshUser` y `sshPass` desde el panel, la app **no requiere** que el usuario escriba usuario/contraseña. El tema debe **ocultar la tarjeta de cuenta** en ese caso (si la muestra, el usuario confundido llena campos que no se usan).

Usa `getSelectedServer()` (devuelve el JSON del servidor activo o `""`) para comprobarlo:

```html
<div class="card" id="cardAcct">
  <div class="lbl">Cuenta</div>
  <input class="input" id="inUser" placeholder="Usuario" autocomplete="off">
  <input class="input" id="inPass" type="password" placeholder="Contraseña" autocomplete="off">
</div>
```

```js
function actualizarCuenta(){
  var card=document.getElementById('cardAcct'); if(!card) return;
  var has=false;
  try{
    var s=JSON.parse(MXTunnel.getSelectedServer()||'null');
    has=!!(s&&s.sshUser&&s.sshPass);
  }catch(e){}
  card.style.display=has?'none':'';
}
```

**Llamarla al iniciar, en `onServerApplied` y en `onConfigUpdated`**:

```js
window.mxtunnel={
  onStatus:function(st){ /* ... */ },
  onServerApplied:function(name){ /* ... */ actualizarCuenta(); },
  onConfigUpdated:function(){ /* ... */ actualizarCuenta(); },
  /* ... */
};
// init
actualizarCuenta();
```

Si el servidor no trae credenciales (la tarjeta queda visible), los campos se guardan con `setAccountUser`/`setAccountPass` y la app los usa al conectar.

### Compartir túnel por proxy (hotspot sin root)

El tema puede exponer el túnel a otros dispositivos (hotspot o LAN) **sin root**: la app abre un **proxy HTTP** en `0.0.0.0:1081` que reenvía cada conexión por el SOCKS5 local del túnel (`127.0.0.1:1080`). El otro dispositivo solo debe poner `IP:1081` como proxy en los **ajustes WiFi** (Android e iOS lo soportan de forma nativa).

Flujo recomendado en el tema (item del menú "Compartir proxy"):

```js
// 1. Leer estado + IP
var info = JSON.parse(MXTunnel.getShareProxy() || '{}');
// info = { enabled:false, running:false, ip:"192.168.43.1", port:1081, socks:1080 }

// 2. Activar / desactivar
MXTunnel.setShareProxy(true);   // con el túnel conectado arranca el proxy
MXTunnel.setShareProxy(false);  // lo detiene
```

Notas:
- `running` es `true` solo si el túnel está conectado **y** el proxy está escuchando. Si `enabled` es `true` pero `running` es `false`, conviene avisar "conecta el túnel primero".
- `ip` se detecta automáticamente de la interfaz del hotspot/LAN (típicamente `192.168.43.1` o `192.168.x.1`).
- Funciona para túneles **SSH** (directo/SSL/proxy/slowdns). En modo V2Ray/UDP el puerto SOCKS local puede diferir y no se garantiza.
- El proxy HTTP soporta `CONNECT` (HTTPS) y peticiones HTTP en forma absoluta.

### Ajustes de la app (controlados por el panel)

Las configuraciones generales de la app (Compresión de datos, Motor Socks, Mostrar/ocultar logs, Activación de CPU/wakelock, Vibrar, Ping automático, Subred de anclaje, Desactivar delay SSH y Tiempo de ping) ya **no se cambian en la app**: se controlan desde el panel en **Usuario → Aplicación → pestaña "Ajustes de la app"** (o con el botón "Restablecer a por defecto").

- La pantalla nativa de Ajustes quedó **vacía** por eso, y el menú del tema **no debe** ofrecer una opción "Ajustes" (`openSettings` ya no existe en el puente).
- Al guardar en el panel, `config_version` sube y la app aplica los valores en la siguiente sincronización (al abrir la app o con "Actualizar").
- El tema **no necesita** hacer nada con estos ajustes: solo debe ocultar la tarjeta de cuenta cuando el servidor trae credenciales (ver abajo).

### Getters (devuelven string)

| Método | Devuelve |
|---|---|
| `getConfig()` | JSON string `{ version, themeVersion, categories[], servers[] }`. |
| `getSelectedServer()` | JSON string del servidor activo, o `""`. |
| `getAccountUser()` / `getAccountPass()` | Credenciales guardadas. |
| `getLogs()` | JSON string (array de líneas de log). |
| `getStatus()` | Estado actual (`CONNECTED`, `CONNECTING`, …). |
| `isConnected()` | `true`/`false`. |
| `getLanguage()` | Código de idioma actual (`default`/`en`/`pt`/`fr`). |
| `getDnsConfig()` | JSON `{ dnsSelected, primary, secondary, tunnelActive }`. |
| `getUdpConfig()` | JSON `{ udpResolver }`. |
| `getPingUrl()` | URL/host de ping actual. |
| `getHwid()` | ID del dispositivo. |
| `getTraffic()` | JSON `{ rxBytes, txBytes }` con el **total acumulado de la app** (bytes descargados/subidos desde que abrió la app). Es **monotónico** (siempre crece): la app lo acumula internamente de forma fiable aunque el sistema no reporte bien el tráfico por UID, y **no se reinicia al reconectar**. El tema calcula la **velocidad** restando dos lecturas con el tiempo entre ellas (patrón: guardar `lastBytesD/lastBytesU/lastTs` y en cada tick `speed = (bytes - lastBytes)/dt`). Vale `0` si el sistema no reporta. |
| `getPing()` | Latencia del último ping del túnel en ms (entero), o `-1` si no hay ping todavía / no aplica. Solo se actualiza mientras el túnel SSH está conectado (el pinger corre con el intervalo configurado). Usa `-1`/`--` para "sin dato". |
| `getShareProxy()` | JSON `{ enabled, running, ip, port, socks }` del proxy compartido. `ip` es la IP del teléfono en el hotspot/LAN (vacía si no se detecta), `port` es 1081 y `socks` el puerto SOCKS local (1080). |

### Formato de `getConfig()`

```json
{
  "version": 3,
  "themeVersion": 2,
  "categories": [ { "id": 1, "name": "USA", "color": "#818CF8", "sorter": 0 } ],
  "servers": [
    {
      "id": 1,
      "name": "US-1",
      "description": "",
      "category_id": 1,
      "sorter": 0,
      "tunnelType": 5,
      "sshServer": "host.example.com",
      "sshPort": "22",
      "sshUser": "root",
      "sshPass": "secret",
      "customSNI": "com.google.com",
      "proxyPayload": "CONNECT [host_port] [protocol][crlf][crlf]",
      "usarDefaultPayload": true,
      "proxyIp": "",
      "proxyPort": "",
      "localPort": "1080",
      "dnsForward": true,
      "dnsResolver1": "",
      "dnsResolver2": "",
      "udpForward": true,
      "udpResolver": "127.0.0.1:7300",
      "udpServer": "",
      "udpAuth": "",
      "udpObfs": "",
      "udpDown": "",
      "udpUp": "",
      "udpBuffer": "",
      "udpPort": "",
      "udpSni": "",
      "udpVersion": "",
      "udpLineInput": "",
      "configLineInput": "",
      "v2rayjson": "",
      "enhanced": true
    }
  ]
}
```

## Eventos (nativo → JS)

Define en tu tema el objeto global `window.mxtunnel` con los callbacks que necesites:

```js
window.mxtunnel = {
  onStatus: function(state){ /* CONNECTED | DISCONNECTED | CONNECTING | AUTH | AUTH_FAILED | NO_NETWORK | WAITING_PERMISSION */ },
  onServerApplied: function(name){ /* nombre del servidor aplicado */ },
  onConfigUpdated: function(){ /* config/tema actualizados */ },
  onLog: function(){ /* hay logs nuevos; recárgalos con getLogs() */ },
  onToast: function(msg){ /* mensaje de la app */ },
  onCheckUserStarted: function(){ /* checkuser en curso: muestra "VERIFICANDO…" y deshabilita el botón */ },
  onCheckUserResult: function(json){ /* resultado del checkuser */ },
  onCheckUserError: function(msg){ /* error del checkuser */ }
};
```

- `WAITING_PERMISSION`: la app está pidiendo el **permiso de VPN** al sistema (primera conexión). Muestra un aviso al usuario (p. ej. "Acepta la solicitud de VPN de Android") para que acepte el diálogo del sistema; también llega un `onToast` con el mensaje. Cuando acepta o cancela, se recibe un nuevo `onStatus`.
- **CheckUser**: `checkUser()` usa el usuario de la cuenta (campo Usuario de la pestaña Cuenta) y el `deviceId` del dispositivo, y llama `GET <urlCheckUser>/check/<usuario>?deviceId=<id>`. `onCheckUserResult` recibe el **JSON del servidor SSH** (parseado con `JSON.parse`):
  ```json
  { "username": "tucuenta", "expiration_date": "24/08/2026", "expiration_days": 15, "limit_connections": 2, "count_connections": 1 }
  ```
  El tema puede mostrar `expiration_date`, `expiration_days` ("X días restantes" / "VENCIDA") y `count_connections`/`limit_connections`. Si el tema **no** define `onCheckUserResult`, la app muestra un diálogo nativo (así que puedes omitir la UI y solo tener el botón que llama `checkUser()`, o incluso dejar que se dispare solo al conectar).

### Modal personalizado de CheckUser (cómo hacerlo bien)

El checkuser tiene un **diálogo nativo de respaldo** que la app muestra automáticamente cuando el tema **no** lo maneja. La regla exacta es:

- **Si NO defines `onCheckUserResult`** → la app muestra el diálogo nativo con el resultado (o el error). No necesitas hacer nada más; hasta puedes dejar que se dispare solo al conectar.
- **Si SÍ defines `onCheckUserResult`** → la app entiende que "el tema se encarga" y **suprime el diálogo nativo** en el caso de éxito. El tema es **100% responsable** de mostrar algo visible.
- **Errores (`onCheckUserError`)** → la app muestra el diálogo nativo **siempre**, aunque el tema tenga handlers (así un error nunca queda en silencio).

⚠️ **El conflicto a evitar (por qué antes no salía ni el nativo ni el personalizado):** si defines `onCheckUserResult` pero tu handler **solo actualiza la tarjeta de Cuenta** (o hace algo poco visible) y no abre ningún modal, la app suprime el nativo (porque "el tema lo maneja") y el usuario **no ve nada destacado**: ni diálogo nativo ni modal del tema. Para hacerlo bien, los tres eventos deben trabajar juntos:

1. `onCheckUserStarted` → **abre tu modal en estado de carga** ("Verificando…" + spinner) y deshabilita el botón Verificar.
2. `onCheckUserResult(json)` → rellena tu modal con los datos (`username`, `expiration_date`, `expiration_days`, `limit_connections`, `count_connections`) y muéstralo (cambia el título a p. ej. "INFO. DEL USUARIO", estado verde/rojo).
3. `onCheckUserError(msg)` → muestra el error dentro de tu modal (título "ERROR DE VERIFICACIÓN", valores en rojo) y un toast.

Ejemplo mínimo correcto:

```js
function abrirChkModal(){ /* añade .open a tu overlay + spinner */ }
function llenarChkModal(d){ /* rellena campos y muestra el resultado */ }
function errorChkModal(m){ /* muestra el error */ }

window.mxtunnel = {
  onCheckUserStarted: function(){
    if($('btnVerify')){ $('btnVerify').disabled = true; }
    abrirChkModal();
  },
  onCheckUserResult: function(json){
    var d = JSON.parse(json);
    llenarChkModal(d);
    if($('btnVerify')){ $('btnVerify').disabled = false; }
  },
  onCheckUserError: function(msg){
    errorChkModal(msg || 'Error de verificación');
    if($('btnVerify')){ $('btnVerify').disabled = false; }
  }
};
```

Reglas de oro:
- **Todo o nada**: si defines `onCheckUserResult`, define también `onCheckUserStarted` y `onCheckUserError` y que **siempre** haya feedback visible (modal o toast). Nunca definas el handler y "no hagas nada visible" — te quedas sin nativo y sin personalizado.
- Envuelve el cuerpo del handler en `try/catch`: si algo falla dentro, muestra un toast y el estado ERROR (nunca fallar en silencio).
- Referencia funcional: `temas/nexus.html` (modal flotante estilo LUVPN con spinner, filas Usuario/Vencimiento/Conexiones/Estado y botón "Entendido").

## Reglas de seguridad

- JS inline permitido; **no** se permite cargar JS externo.
- **Recursos externos solo por `https://` y de CDNs/dominios confiables** (fuentes e iconos de Google Fonts / Bootstrap Icons / Font Awesome, e imágenes). Evita dominios no verificados; todo lo que sea lógica va inline.
- El puente está restringido a los métodos de esta tabla (no hay acceso a archivos/red del dispositivo).
- Usa `viewport` con `user-scalable=no` y diseño para `max-width: 480px` centrado.

## ⚠️ Fondo oscuro / evita el destello blanco

Para evitar un destello blanco al volver de segundo plano, **incluye en tu tema**:

```html
<meta name="color-scheme" content="dark">
<body style="background:#0B1220">  <!-- usa tu color de fondo -->
```

Y al inicio de tu script llama `MXTunnel.setStatusBarColor('#0B1220')` con ese mismo color (fija la barra de estado en Android ≤14 y el fondo de la ventana, evitando el destello).

### La app pinta detrás de la barra de estado (edge-to-edge)

La app dibuja el WebView **detrás** de la barra de estado y de la barra de navegación, e **inyecta automáticamente** el alto de ambas como padding del contenedor `.app`. Esto significa:

- Puedes usar **toda la pantalla** libremente: fondos con **degradados**, patrones, colores sólidos… se ven **continuos detrás de la barra de estado** en Android 15+ (sin franja sólida cortada).
- **No** necesitas poner un color sólido en la barra ni usar `env(safe-area-inset-top/bottom)`: la app lo maneja por ti.
- Para que tu fondo (degradado o de punta a punta) se extienda también detrás de la barra, el contenedor raíz debe cubrir todo el viewport:

```css
html,body{height:100%;overflow:hidden;background:#0B1220}   /* o un degradado */
.app{position:fixed;inset:0;max-width:480px;margin:0 auto;display:flex;flex-direction:column;overflow:hidden}
```

#### Barra de navegación inferior: usa la clase `.bottom-nav`

Si tu tema tiene una barra de navegación inferior, el contenedor **DEBE** usar la clase **`.bottom-nav`**: la app la sube automáticamente para que quede por encima de la barra de gestos/navegación del sistema (le suma el inset inferior a su `bottom`).

```css
.bottom-nav{position:absolute;left:14px;right:14px;bottom:14px;display:flex;justify-content:space-around;z-index:50}
```

- Usa `position:absolute` con un valor de `bottom` (p. ej. `14px`): la app incrementa ese `bottom` con el alto real de la barra de navegación.
- El `.app` ya recibe `padding-bottom` automático, así que el contenido desplazable no queda oculto detrás de la barra de gestos; deja además un `padding-bottom` propio en tu zona de scroll para despejar la `.bottom-nav`.
- **No** uses `env(safe-area-inset-bottom)` ni un `bottom` fijo basado en insets: la app lo ajusta por ti.

> ⚠️ **No** uses `env(safe-area-inset-top/bottom)` en tu tema ni rellenes la barra con un color sólido: la app ya inyecta el padding del notch/barra de estado y de navegación. `setStatusBarColor('#RRGGBB')` se mantiene **recomendado** solo para fijar el color base (Android ≤14) y el fondo de la ventana.

## Ejemplo

Copia el archivo `temas/ejemplo-tema.html` como base, cambia la paleta en `:root` y el contenido, súbelo en el panel (Admin → Aplicación → tema global, o Usuario → Aplicación → tus temas) y dale **Actualizar** en la app.
