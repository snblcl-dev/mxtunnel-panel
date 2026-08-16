# MXTunnel Panel

Panel web para gestionar usuarios y servidores de la app **MXTunnel** (VPN Android). Cada usuario recibe un **UUID** (token) que se coloca en la app; la app descarga sus configuraciones desde este panel.

## Stack

- **Backend**: Fastify + Prisma + SQLite + JWT + bcrypt + zod
- **Frontend**: HTML + Bootstrap 5 (Eta como motor de plantillas)
- **TypeScript**

## Requisitos

- Node.js 20+ y npm

## Instalación local

```bash
npm install
cp .env.example .env      # edita los valores
npx prisma db push        # crea/actualiza la BD SQLite
npm run seed              # crea el admin inicial + settings
npm run dev               # http://localhost:3000
```

Credenciales del admin por defecto (cámbialas en `.env` antes de hacer seed):

- Email: `admin@mxtunnel.local`
- Contraseña: `admin123`

## Despliegue en un VPS

```bash
# En el servidor
git clone https://github.com/snblcl-dev/mxtunnel-panel.git
cd mxtunnel-panel
npm install
cp .env.example .env
nano .env                 # configura DATABASE_URL, JWT y CSRF
npx prisma db push
npx prisma generate
npm run seed
npm run build
pm2 start ecosystem.config.js
pm2 save
```

Luego ponlo detrás de **nginx** (proxy inverso) con HTTPS. Ejemplo:

```nginx
server {
  server_name panel.tudominio.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## Variables de entorno (`.env`)

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Ruta SQLite, ej: `file:./dev.db` |
| `PORT` | Puerto del servidor (por defecto 3000) |
| `JWT_SECRET_KEY` | Secreto para tokens de acceso |
| `JWT_SECRET_REFRESH` | Secreto para tokens de refresco |
| `CSRF_SECRET` | Secreto para tokens CSRF |
| `ADMIN_USERNAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Admin inicial (solo los usa el seed) |

> **Importante:** cambia los valores por defecto de `JWT_SECRET_KEY`, `JWT_SECRET_REFRESH` y `CSRF_SECRET` en producción.

## API que consume la app

- `GET /api/config?token=<uuid>` → `{ version, categories, servers }`
- `GET /api/version?token=<uuid>` → `{ version }`

`<uuid>` es el `id` del usuario (visible en el panel → Usuarios).

## Flujo de uso

1. Entra al panel e inicia sesión como admin.
2. Crea un **usuario** (recibe su UUID automáticamente).
3. Entra a **Configurar** y crea **categorías** y **servidores**.
4. Copia el UUID y ponlo en la app MXTunnel junto con la URL del panel.
