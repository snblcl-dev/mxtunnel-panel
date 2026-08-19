# Contrato de Temas MXTunnel (WebView)

Cómo crear un **tema 100% personalizable** para la app MXTunnel. El tema es un **archivo HTML** (CSS/JS inline) que la app renderiza en un WebView y que se comunica con el núcleo nativo mediante el puente `MXTunnel`.

## Cómo se carga

1. La app obtiene el tema en `GET /api/theme?token=<uuid>` (tema activo del usuario, si no el global, si no `null`).
2. Si el panel devuelve tema → se guarda y se carga. Si no → se usa el **tema por defecto embebido** en la APK.
3. La app carga el HTML en un WebView con `loadDataWithBaseURL`. **Recursos externos permitidos: solo imágenes por `https://`.** Todo lo demás (CSS/JS) debe ir inline.
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
| `openSettings()` / `openLanguage()` / `openDns()` / `openUdp()` / `openPing()` / `openBattery()` / `openHwid()` | Abre pantallas/acciones del menú. |
| `restoreDefault()` | Restablece datos de la app. |
| `exitApp()` | Sale de la app. |
| `onReady()` | **Handshake obligatorio.** |

### Getters (devuelven string)

| Método | Devuelve |
|---|---|
| `getConfig()` | JSON string `{ version, themeVersion, categories[], servers[] }`. |
| `getSelectedServer()` | JSON string del servidor activo, o `""`. |
| `getAccountUser()` / `getAccountPass()` | Credenciales guardadas. |
| `getLogs()` | JSON string (array de líneas de log). |
| `getStatus()` | Estado actual (`CONNECTED`, `CONNECTING`, …). |
| `isConnected()` | `true`/`false`. |

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
  onStatus: function(state){ /* CONNECTED | DISCONNECTED | CONNECTING | AUTH | AUTH_FAILED | NO_NETWORK */ },
  onServerApplied: function(name){ /* nombre del servidor aplicado */ },
  onConfigUpdated: function(){ /* config/tema actualizados */ },
  onLog: function(){ /* hay logs nuevos; recárgalos con getLogs() */ },
  onToast: function(msg){ /* mensaje de la app */ }
};
```

## Reglas de seguridad

- JS inline permitido; **no** se permite cargar JS externo.
- Imágenes externas solo por `https://` (opcional; también puedes usar SVG inline).
- El puente está restringido a los métodos de esta tabla (no hay acceso a archivos/red del dispositivo).
- Usa `viewport` con `user-scalable=no` y diseño para `max-width: 480px` centrado.

## Ejemplo

Copia el archivo `temas/ejemplo-tema.html` como base, cambia la paleta en `:root` y el contenido, súbelo en el panel (Admin → Aplicación → tema global, o Usuario → Aplicación → tus temas) y dale **Actualizar** en la app.
