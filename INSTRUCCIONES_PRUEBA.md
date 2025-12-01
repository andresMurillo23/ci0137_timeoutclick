# Testing Instructions - TimeoutClick System

## Start the Servers

### Opción 1 - Script Automático (Recomendado):
```bash
start.bat
```

### Opción 2 - Manual:

**Terminal 1 - Backend:**
```bash
cd backend
node server.js
```

**Terminal 2 - Frontend:**
```bash
cd frontend
node server.js
```

## Database Status

**MONGODB CONNECTED**: System running with local MongoDB.

- Data persists in MongoDB
- Test user already created
- SIMPLIFIED authentication system: Now uses tokens in sessionStorage (no cookies)

## Recent Changes - Simplified Authentication

**NEW AUTHENTICATION SYSTEM**:
- Cookies removed: Now uses Authorization header with token
- SessionStorage: Token saved in browser sessionStorage
- Simpler: Only bcrypt for passwords + token in sessionStorage
- No session dependencies: No more express-session or MongoStore

## Test Credentials

**Usuario Existente:**
- Username/Email: `testuser` o `test@timeoutclick.com`
- Password: `test123`

## How to Test the System

### Step 1: Acceder al Login
1. Abrir navegador en: `http://localhost:5000/pages/login.html`
2. Hacer login con las credenciales de arriba: `testuser` / `test123`
3. **NOTA**: Abre las DevTools (F12) y ve a la pestaña "Application" > "Session Storage" para ver el token guardado

### Step 2: Verificar que Funciona
Después de hacer login deberías:
- ✅ Ver el token en sessionStorage (key: `authToken`)
- ✅ Ser redirigido a `homeLogged.html`
- ✅ El botón NO debe quedarse pegado en "LOGGING IN..."

### Step 3: (Opcional) Registrar Más Usuarios
Si deseas crear más usuarios:
- Ve a: `http://localhost:5000/pages/register.html`
- Username: tu elección (3-20 caracteres)
- Email: tu elección (formato válido)
- Password: mínimo 6 caracteres
- **IMPORTANTE**: El registro también te dará un token automáticamente

## Immediate Next Steps

1. **Implementar página de agregar amigos** para poder desafiar usuarios
2. **Opcional**: Conectar MongoDB local para persistir datos
3. **Probar el juego** en tiempo real entre dos usuarios

## System URLs

- **Home**: http://localhost:5000
- **Register**: http://localhost:5000/pages/register.html  
- **Login**: http://localhost:5000/pages/login.html
- **Home Logged**: http://localhost:5000/pages/homeLogged.html
- **Add Friend**: http://localhost:5000/pages/addFriend.html (por implementar)

## Debugging - Detailed Logs Enabled

**IMPORTANTE**: Ahora hay logs MUY DETALLADOS en consola. Abre DevTools (F12) ANTES de hacer login.

### Qué deberías ver en la consola al hacer login:

**FRONTEND (Consola del navegador):**
```
🔵 [AUTH-MANAGER] Iniciando login para: testuser
🌐 [API-CLIENT] Request a /auth/login, token: NO TOKEN
🌐 [API-CLIENT] Headers: {Content-Type: 'application/json', ...}
🔵 [AUTH-MANAGER] Respuesta recibida: {success: true, token: '...', user: {...}}
🔵 [AUTH-MANAGER] Token recibido: [el token]
🔵 [AUTH-MANAGER] User recibido: {username: 'testuser', ...}
✅ [AUTH-MANAGER] Token guardado en sessionStorage: [el token]
✅ [AUTH-MANAGER] Login completado exitosamente
```

**BACKEND (Terminal donde corre el backend):**
```
🔑 [LOGIN] Intentando login...
🔑 [LOGIN] Identifier: testuser
🔑 [LOGIN] Usuario encontrado: testuser
🔑 [LOGIN] Password válido: true
✅ [LOGIN] Token generado: [token]...
✅ [LOGIN] UserId: [id]
✅ [LOGIN] Enviando respuesta: {success: true, ...}
```

### Si ves el 401 en /api/auth/me:

Busca estos logs en la consola:
```
🔄 [AUTH-MANAGER] Inicializando estado de autenticación...
🔄 [AUTH-MANAGER] Token en storage: [token]...
🌐 [API-CLIENT] Request a /auth/me, token: [token]...
🔒 [AUTH-MIDDLEWARE] Verificando autenticación
🔒 [AUTH-MIDDLEWARE] Authorization header: Bearer [token]
```

**COPIA Y PEGA TODO LO QUE VES EN LA CONSOLA** si sigue fallando

---

## ✅ SERVIDORES CORRIENDO

- ✅ Backend: http://localhost:3000 (verificado con logs de prueba)
- ✅ Frontend: http://localhost:5000

**El backend SÍ responde** - lo probamos y devuelve el token correctamente.

**Ahora prueba de nuevo el login** en: http://localhost:5000/pages/login.html

Deberías ver MUCHOS MÁS logs en la consola del navegador incluyendo:
- `🌐 [API-CLIENT] Haciendo fetch a: /api/auth/login`
- `🌐 [API-CLIENT] Response recibido: 200 OK`
- `✅ [API-CLIENT] JSON parseado: {success: true, token: '...', user: {...}}`

Si no ves esos logs o si dice error, copia TODO y pégalo aquí.

## Current Limitations

- **Database**: MongoDB working correctly
- **Friends system**: Missing page to add friends
- **Quick Match**: Not implemented - only challenges between friends