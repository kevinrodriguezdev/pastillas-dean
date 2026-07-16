# Pastillas Perro NFC

PWA para controlar que a tu perro se le dan 2 pastillas al día, una cada 12 horas, usando un tag NFC. Registra cada toma (manual o NFC), muestra cuánto tiempo ha pasado desde la última, y envía una notificación push a la familia si se pasa del horario.

- **Frontend:** Vue 3 + Vite + PWA (`vite-plugin-pwa`).
- **Backend / hosting:** Vercel (Functions en `/api` + Cron Jobs).
- **DB:** Supabase (Postgres).
- **Push:** Web Push estándar con `web-push` + VAPID. **Sin Firebase / Google.**

---

## 1. Requisitos previos

- Node.js **18+** y npm.
- Una cuenta gratis en [Supabase](https://supabase.com).
- Una cuenta gratis en [Vercel](https://vercel.com).
- (Opcional, para NFC en Android) Chrome en Android con NFC.
- (Opcional, para iPhone) Un tag NFC NTAG215 / NTAG216 y un iPhone con iOS 16.4+.

---

## 2. Setup de Supabase

> **Tu proyecto ya está creado:** `https://aabtbwmtnhtzjdzqdvil.supabase.co`. Solo necesitas ejecutar el SQL y obtener las claves.

1. Ve a [supabase.com/dashboard/project/aabtbwmtnhtzjdzqdvil](https://supabase.com/dashboard/project/aabtbwmtnhtzjdzqdvil) (plan Free vale).
2. En la barra lateral, abre **SQL Editor**.
3. Click en **New query**, pega TODO el contenido de [`supabase/schema.sql`](./supabase/schema.sql) y pulsa **Run**.
4. Crea las claves de API en **Project Settings → API**:
   - **Project URL** → ya está rellenado en `.env.example` con `https://aabtbwmtnhtzjdzqdvil.supabase.co`.
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`.
   - **service_role** key (⚠️ secreta) → `SUPABASE_SERVICE_ROLE_KEY`.

---

## 3. Generar las VAPID keys

Las VAPID keys son necesarias para Web Push. Genera un par con el paquete `web-push` (ya está en las dependencias):

```bash
npx web-push generate-vapid-keys
```

La salida será algo como:

```
======================================
Public Key:
BPdMq...xyz
Private Key:
abc123...xyz
======================================
```

Guarda:
- **Public Key** → `VAPID_PUBLIC_KEY` (se expone al cliente vía `/api/vapid-key`).
- **Private Key** → `VAPID_PRIVATE_KEY` (⚠️ solo servidor).

---

## 4. Setup local

```bash
# 1. Instalar dependencias
npm install

# 2. Generar los iconos placeholder (solo la primera vez, o cuando quieras)
npm run gen-icons

# 3. Crear .env.local a partir del ejemplo
cp .env.example .env.local
```

Edita `.env.local` con los valores reales:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_KEY=pon-aqui-una-cadena-larga-y-aleatoria

SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

VAPID_PUBLIC_KEY=BPd...
VAPID_PRIVATE_KEY=abc...
VAPID_SUBJECT=mailto:tu-email@ejemplo.com

API_SECRET_KEY=el-mismo-valor-que-VITE_API_KEY
```

> **Seguridad del `API_SECRET_KEY` / `VITE_API_KEY`:** esta clave se embebe en el bundle JS del frontend, así que NO es un secreto real: cualquiera que abra DevTools puede verla. Funciona como "llave compartida del hogar" para evitar abuso casual y para que el Atajo de iPhone pueda usarla. Si necesitas más seguridad, añade autenticación de usuario más adelante.

```bash
# 4. Arrancar el dev server
npm run dev
```

Abre `http://localhost:5173` y verifica:
- Aparece la pantalla principal.
- El botón "Dar pastilla ahora" registra una toma (verás aparecer la fecha/hora).
- En la pestaña **Historial** aparece la toma.
- Si Chrome en Android y el dispositivo tiene NFC, debería aparecer el panel "Lector NFC".

> En dev el Service Worker está deshabilitado (no hace falta para probar el flujo). El push se prueba una vez desplegado en Vercel con HTTPS.

---

## 5. Desplegar en Vercel

### 5.1 Subir el código

Sube el repo a GitHub / GitLab / Bitbucket y luego en Vercel:

1. **New Project → Import** tu repositorio.
2. Framework preset: **Vite** (lo detecta solo).
3. **Build Command:** `npm run build` (por defecto).
4. **Output Directory:** `dist` (por defecto).

### 5.2 Variables de entorno en Vercel

En **Project Settings → Environment Variables** añade **todas** estas (Production + Preview):

| Variable | Valor | Notas |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` | igual a `SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` | anon key de Supabase |
| `VITE_API_KEY` | tu-secret | mismo valor que `API_SECRET_KEY` |
| `SUPABASE_URL` | `https://xxxx.supabase.co` | |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | ⚠️ service_role, nunca se expone al cliente |
| `VAPID_PUBLIC_KEY` | `BPd...` | generada con `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | `abc...` | ⚠️ solo backend |
| `VAPID_SUBJECT` | `mailto:tu@email.com` | web-push lo requiere |
| `API_SECRET_KEY` | tu-secret | el mismo que `VITE_API_KEY` |

### 5.3 Desplegar

Click **Deploy**. La primera build tardará ~1 min.

Una vez desplegado, abre `https://tu-app.vercel.app` y comprueba:
- Funciona el botón "Dar pastilla ahora".
- Aparece el panel NFC en Android.
- Aparece el banner de permiso de notificaciones.
- Al conceder permiso, se envía la suscripción a `/api/suscribir-push`.

### 5.4 Verificar el cron

El cron está configurado en [`vercel.json`](./vercel.json) para ejecutarse cada hora. Para forzar una ejecución manual (útil en pruebas), visita:

```
https://tu-app.vercel.app/api/recordatorio-cron?key=TU_API_SECRET_KEY
```

La respuesta será un JSON con la acción tomada (`sin-tomas-aun`, `aun-a-tiempo`, `anti-spam`, `sin-suscriptores`, `notificaciones-enviadas`).

> ⚠️ **Plan Free de Vercel:** el cron se ejecuta solo si el proyecto ha recibido tráfico reciente. Si nadie abre la app durante días, Vercel puede hibernar las funciones y el cron no se disparará. Si esto es un problema, puedes usar un servicio gratuito externo (cron-job.org, UptimeRobot) que haga GET a `/api/recordatorio-cron` cada 10-15 minutos para mantener el proyecto activo.

---

## 6. Instalar la PWA

### 6.1 Android (Chrome)

1. Abre la URL desplegada en Chrome.
2. Chrome mostrará un banner "Instalar app" abajo. Toca **Instalar**.
3. También puedes ir a **⋮ menú → Instalar app**.
4. La app aparecerá en el lanzador con su icono. Las notificaciones push funcionarán.

> La Web NFC API solo funciona en Chrome para Android con NFC activado en el sistema.

### 6.2 iPhone (Safari) — OBLIGATORIO para notificaciones

> ⚠️ Safari NO soporta Web Push salvo que la web esté instalada como PWA. Por tanto, en iPhone **es obligatorio hacer estos pasos**, o las notificaciones NO llegarán.

1. Abre la URL desplegada en **Safari** (no en Chrome iOS).
2. Toca el botón **Compartir** (el cuadrado con la flecha hacia arriba).
3. Scroll abajo y elige **"Añadir a pantalla de inicio"**.
4. Dale un nombre (o deja "Pastillas") y toca **Añadir**.
5. Abre la app desde el icono de la pantalla de inicio (no desde Safari).
6. Al abrir, toca **🔔 Activar recordatorios push** y concede el permiso cuando Safari lo pida.
7. iOS requiere iOS 16.4+ para Web Push en PWA.

> **Límite en iOS:** las notificaciones push desde Web Push en PWA tienen algunas restricciones de Apple (límite de pushes, solo en PWA instalada). Funciona bien para este caso de uso.

---

## 7. Configurar el Atajo de iPhone para NFC

Este Atajo hace que al escanear el tag NFC con un iPhone, se envíe automáticamente una petición al backend para registrar la toma.

### 7.1 Materiales

- Un tag NFC **NTAG215** o **NTAG216** (NTAG215 es el más común, vale perfectamente).
- La URL de tu app desplegada, p. ej. `https://pastillas-de-tu-familia.vercel.app`.
- Tu `API_SECRET_KEY`.

### 7.2 Crear el Atajo

1. Abre la app **Atajos** (Shortcuts) en el iPhone.
2. Ve a la pestaña **Automatización** (abajo, icono de reloj con flechas).
3. Toca el **+** arriba a la derecha.
4. Selecciona **NFC** como tipo de automatizador.
5. Toca **Escanear** y acerca el tag NFC al iPhone. Asigna un nombre al tag (ej: "Pastilla perro").
6. Toca **Siguiente**.
7. Toca **Crear automatización** (sin acciones aún).
8. Toca **Añadir acción**.
9. Busca **"Obtener contenido de URL"** (Get Contents of URL) y añádela.
10. Configúrala así:
    - **URL:** `https://TU-APP.vercel.app/api/registrar-toma`
    - Método: toca **Mostrar más** abajo y cambia a **POST**.
    - **Headers** (en "Mostrar más" → pulsa **Añadir nuevo encabezado**):
      - Cabecera 1:
        - Clave: `x-api-key`
        - Valor: `TU_API_SECRET_KEY`
      - Cabecera 2:
        - Clave: `Content-Type`
        - Valor: `application/json`
    - **Cuerpo de la solicitud** (en "Mostrar más" → **Cuerpo de la solicitud** → elige **JSON**):
      ```json
      {"metodo":"nfc"}
      ```
11. Toca **Siguiente**.
12. **MUY IMPORTANTE:** desactiva **"Pedir antes de ejecutar"** (Ask Before Running). Si lo dejas activo, te pedirá confirmación cada vez y no será automático.
13. Toca **Hecho** / **Listo**.

### 7.3 Probarlo

1. Toca el tag NFC con el iPhone.
2. Deberías ver una notificación de iOS: "Automation: Pastilla perro" o el nombre que le hayas puesto al tag.
3. Abre la app web y comprueba en el historial que la toma se ha registrado.

### 7.4 Compartir con la familia

- **El Atajo de Automatización** es por dispositivo (iOS no permite automatizaciones compartidas en iCloud, son locales). Cada persona de la familia debe repetir los pasos 7.2-7.3 en su iPhone.
- El tag NFC físico es el mismo para todos.
- En el Atajo, el header `x-api-key` debe ser el mismo para todos (es la "llave del hogar").

### 7.5 Android equivalente

En Android, **no hace falta Atajo**: abre la app PWA, toca **Activar NFC** y acerca el tag. La app registra automáticamente.

---

## 8. Estructura del proyecto

```
/
├── api/                          Vercel Functions (Node.js ESM)
│   ├── registrar-toma.js         POST: registra una toma (manual|nfc)
│   ├── suscribir-push.js         POST: guarda una PushSubscription
│   ├── recordatorio-cron.js      GET: lo llama Vercel Cron cada hora
│   └── vapid-key.js              GET: devuelve la VAPID public key
├── public/
│   ├── favicon.svg
│   └── icons/                    iconos PWA (generados por script)
├── scripts/
│   └── generate-placeholder-icons.mjs
├── src/
│   ├── components/               PillButton, NfcReader, StatusCard, Toast, BottomNav
│   ├── composables/              useNfc, usePushNotifications, useTomas, useCountdown, useToast
│   ├── lib/supabase.js           cliente @supabase/supabase-js (anon)
│   ├── views/                    HomeView, HistoryView
│   ├── App.vue
│   ├── main.js
│   ├── style.css
│   └── sw.js                     Service Worker (push + notificationclick)
├── supabase/
│   └── schema.sql                SQL para crear las 3 tablas
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── vercel.json                   cron + headers del SW
├── package.json
├── .env.example
└── README.md
```

---

## 9. Variables de entorno (resumen)

| Variable | Dónde se usa | Notas |
|---|---|---|
| `VITE_SUPABASE_URL` | Frontend (cliente Supabase) | mismo valor que `SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY` | Frontend (cliente Supabase) | anon key |
| `VITE_API_KEY` | Frontend (header `x-api-key`) | igual a `API_SECRET_KEY` |
| `SUPABASE_URL` | `/api/*` | |
| `SUPABASE_SERVICE_ROLE_KEY` | `/api/*` | ⚠️ bypassa RLS |
| `VAPID_PUBLIC_KEY` | `/api/*` y expuesta vía `/api/vapid-key` | |
| `VAPID_PRIVATE_KEY` | `/api/*` | ⚠️ solo servidor |
| `VAPID_SUBJECT` | `/api/recordatorio-cron` | web-push lo requiere, ej `mailto:tu@email.com` |
| `API_SECRET_KEY` | `/api/registrar-toma` + trigger manual del cron | comparación timing-safe |

---

## 10. Decisiones de diseño y limitaciones

- **Límite 2 pastillas / 24h:** el endpoint `/api/registrar-toma` rechaza con error `429` si ya hay 2 tomas en las últimas 24 horas. Si necesitas corregir, elimina la toma errónea del historial y vuelve a registrar.
- **Eliminar del historial:** cada fila del historial tiene un icono de papelera. Al pulsarlo pide confirmación y borra la toma. Endpoint: `POST /api/eliminar-toma` con `{ id }` en el body.
- **Notificación al registrar:** cada vez que se registra una toma, se envía push a TODOS los suscriptores (tag `pastilla-registrada`) con la hora exacta. Si tu pareja registra la pastilla, te llega al instante la notificación al móvil.
- **Sin perfiles de usuario:** por simplicidad, no se registra quién dio la pastilla, solo que se dio. Si en el futuro quieres saber quién, añade una tabla `perfiles` y un campo `perfil text` en `tomas` (más selector en la home).
- **Sin caché offline de tomas:** el Service Worker no cachea respuestas de Supabase, así que sin internet la app no mostrará datos antiguos. Esto es deliberado: las tomas deben ser precisas y siempre leer/escribir la fuente de verdad.
- **Vercel Cron en plan Free:** puede hibernar. Si te pasa, usa cron-job.org o UptimeRobot para hacer ping cada 10-15 min a `/api/recordatorio-cron?key=TU_API_SECRET_KEY`.
- **Push en iOS:** requiere iOS 16.4+ y la PWA **obligatoriamente** instalada desde Safari → "Añadir a pantalla de inicio". Safari normal no soporta Web Push.
- **Web NFC:** solo Android/Chrome con NFC físico. En iOS no hay Web NFC, por eso el Atajo es necesario ahí.
- **API key "del hogar":** `API_SECRET_KEY` se embebe en el bundle JS (como `VITE_API_KEY`) y se comparte con la familia para el Atajo de iPhone. No es un secreto fuerte, es una llave compartida para evitar abuso casual.

---

## 11. Comandos útiles

```bash
npm run dev          # dev server (puerto 5173)
npm run build        # build producción a /dist
npm run preview      # sirve /dist localmente
npm run gen-icons    # regenera los iconos placeholder
```
