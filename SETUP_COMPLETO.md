# TimeoutClick - Setup Completed

## System Status

### Active Services
- **MongoDB**: Connected at `localhost:27017`
- **Backend**: Running on `http://localhost:3000`
- **Frontend**: Running on `http://localhost:5000`
- **Socket.IO**: Enabled for real-time gaming

---

## MongoDB Database

### Colecciones Creadas

#### 1. **users** (Usuarios)
- Índices: `email`, `username` (únicos), `gameStats.totalScore`, `lastActive`, `status`
- Validación: username (3-20 chars), email válido, password (min 6 chars)

#### 2. **games** (Juegos)
- Índices: `player1 + status`, `player2 + status`, `status + createdAt`, `gameType + status`, `winner`, `createdAt`
- Almacena: partidas, tiempos, ganadores, estadísticas

#### 3. **gamesessions** (Sesiones de Juego en Tiempo Real)
- Índices: `gameId` (único), `player1SocketId`, `player2SocketId`, `gameState + lastActivity`
- TTL: Auto-elimina sesiones inactivas después de 1 hora
- Maneja: conexiones Socket.IO, estado del juego en tiempo real

#### 4. **friendships** (Amistades)
- Índices: `user1 + user2` (único), `user1 + status`, `user2 + status`, `createdAt`
- Gestiona: relaciones de amistad entre usuarios

#### 5. **invitations** (Invitaciones)
- Índices: `receiver + status`, `sender + status`, `sender + receiver + type`, `expiresAt`
- TTL: Auto-elimina invitaciones expiradas
- Tipos: `friend` (amistad), `game` (juego)

#### 6. **sessions** (Sesiones Express)
- Índice TTL en `expires`
- Almacena: sesiones de usuarios con express-session

---

## 👤 Usuario de Prueba

```
Username: testuser
Password: test123
Email: test@timeoutclick.com
```

---

## 🔧 Correcciones Aplicadas

### Backend
1. ✅ Completado archivo `validation.js` (eliminado código duplicado)
2. ✅ Corregido puerto CORS de 8080 a 5000
3. ✅ Archivo `.env` copiado al directorio backend
4. ✅ Todas las dependencias instaladas

### Frontend  
1. ✅ Corregido `api-client.js` - login usa `identifier` en lugar de `email`
2. ✅ Corregido `api-client.js` - register incluye `confirmPassword`
3. ✅ Actualizado `auth-manager.js` para usar `identifier`
4. ✅ Actualizado `login.js` para usar `identifier`

### Base de Datos
1. ✅ MongoDB inicializado con todas las colecciones
2. ✅ Índices creados para optimizar consultas
3. ✅ Validaciones de esquema implementadas
4. ✅ TTL indexes configurados para auto-limpieza

---

## Startup Commands

### Iniciar MongoDB (si no está corriendo)
```powershell
# Verificar si MongoDB está corriendo
Get-Process mongod -ErrorAction SilentlyContinue

# Si no está corriendo, iniciarlo (requiere instalación de MongoDB)
mongod --dbpath "C:\data\db"
```

### Iniciar Backend
```powershell
cd backend
npm start
```

### Iniciar Frontend
```powershell
cd frontend
node server.js
```

---

## Access URLs

- **Frontend**: http://localhost:5000
- **Backend API**: http://localhost:3000/api
- **Health Check**: http://localhost:3000/api/health
- **Socket.IO**: ws://localhost:3000

---

## 📊 Endpoints API Disponibles

### Autenticación (`/api/auth`)
- `POST /register` - Registrar nuevo usuario
- `POST /login` - Iniciar sesión
- `POST /logout` - Cerrar sesión
- `GET /me` - Obtener usuario actual
- `GET /check` - Verificar estado de autenticación
- `POST /forgot-password` - Solicitar reset de contraseña
- `POST /reset-password` - Resetear contraseña
- `POST /verify-email` - Verificar email

### Usuarios (`/api/users`)
- `GET /search` - Buscar usuarios
- `GET /:id` - Obtener perfil de usuario
- `GET /:id/stats` - Obtener estadísticas de usuario
- `PUT /profile` - Actualizar perfil
- `PUT /settings` - Actualizar configuración
- `POST /avatar` - Subir avatar
- `PUT /password` - Cambiar contraseña
- `DELETE /account` - Eliminar cuenta

### Amigos (`/api/friends`)
- `GET /` - Obtener lista de amigos
- `POST /invitations` - Enviar invitación de amistad
- `GET /invitations/received` - Ver invitaciones recibidas
- `GET /invitations/sent` - Ver invitaciones enviadas
- `PUT /invitations/:id/accept` - Aceptar invitación
- `PUT /invitations/:id/decline` - Rechazar invitación
- `DELETE /invitations/:id` - Cancelar invitación enviada
- `DELETE /:friendId` - Eliminar amigo

### Juegos (`/api/games`)
- `POST /challenge` - Crear desafío de juego
- `GET /history` - Historial de juegos
- `GET /active` - Juego activo actual
- `GET /:gameId` - Detalles de un juego
- `PUT /:gameId/cancel` - Cancelar juego

---

## 🔌 Eventos Socket.IO

### Cliente → Servidor
- `join_game` - Unirse a un juego
- `player_ready` - Jugador listo
- `player_click` - Click del jugador (stop button)
- `leave_game` - Salir del juego
- `ping` - Verificar conexión

### Servidor → Cliente
- `connection_established` - Conexión establecida
- `game_joined` - Unido al juego exitosamente
- `player_connection_update` - Actualización de conexión de jugadores
- `game_countdown_start` - Inicio de cuenta regresiva
- `game_start` - Inicio del juego
- `click_registered` - Click registrado
- `opponent_clicked` - Oponente ha clickeado
- `game_finished` - Juego terminado
- `player_disconnected` - Jugador desconectado
- `error` - Error en el juego

---

## ⚠️ Problemas Conocidos a Resolver

### Alta Prioridad
1. **Eventos Socket.IO** - El frontend usa eventos diferentes a los que el backend emite:
   - Frontend espera: `gameStart`, `goalTimeSet`, `playerClick`, `gameEnd`
   - Backend envía: `game_start`, `game_countdown_start`, `click_registered`, `game_finished`
   - **Acción**: Sincronizar eventos entre frontend y backend

2. **API Client - Endpoints de Amigos** - Algunos endpoints no coinciden:
   - `sendFriendRequest()` usa `/friends/request` (no existe)
   - Debería usar: `POST /api/friends/invitations` con `receiverId`

### Media Prioridad
3. **Multer deprecado** - Actualizar a versión 1.4.4-lts.1
4. **Rate Limiting** - Implementar para prevenir abuso
5. **Helmet.js** - Agregar para headers de seguridad
6. **Logs estructurados** - Implementar Winston o similar

### Baja Prioridad
7. **Console.logs** - Remover en producción
8. **Tests** - Agregar tests unitarios e integración
9. **Documentación API** - Implementar Swagger/OpenAPI

---

## 🎯 Próximos Pasos Recomendados

1. **Probar Login/Register**:
   - Ir a http://localhost:5000
   - Probar registro de nuevo usuario
   - Probar login con `testuser` / `test123`

2. **Verificar MongoDB**:
```powershell
& "C:\Program Files\mongosh\bin\mongosh.exe" mongodb://localhost:27017/timeoutclick
# Dentro de mongosh:
show collections
db.users.find()
```

3. **Corregir Eventos Socket.IO**:
   - Actualizar `frontend/public/js/utils/game-manager.js`
   - Actualizar `frontend/public/js/partials/duel-flow-realtime.js`

4. **Agregar Logs de Debugging**:
   - Verificar que las peticiones lleguen correctamente
   - Monitorear errores de autenticación

---

## 📝 Variables de Entorno (`.env`)

```env
# Base de Datos
MONGODB_URI=mongodb://localhost:27017/timeoutclick
MONGODB_URI_ATLAS=mongodb+srv://username:password@cluster.mongodb.net/timeoutclick
MONGODB_URI_TEST=mongodb://localhost:27017/timeoutclick_test

# Sesiones
SESSION_SECRET=timeoutclick_secret_key_development_only
SESSION_NAME=timeoutclick_session

# Puertos
PORT=3000
FRONTEND_PORT=5000
NODE_ENV=development

# Email (para reset de password)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Uploads
MAX_FILE_SIZE=5000000
UPLOAD_PATH=./uploads
```

---

## 🛠️ Scripts Útiles

### Reinicializar Base de Datos
```powershell
& "C:\Program Files\mongosh\bin\mongosh.exe" mongodb://localhost:27017/timeoutclick backend/scripts/init-db.js
```

### Ver Logs de MongoDB
```powershell
& "C:\Program Files\mongosh\bin\mongosh.exe" mongodb://localhost:27017/timeoutclick
db.users.find().pretty()
db.games.find().pretty()
```

### Limpiar Sesiones Expiradas
```javascript
// En mongosh
db.sessions.deleteMany({ expires: { $lt: new Date() } })
db.gamesessions.deleteMany({ lastActivity: { $lt: new Date(Date.now() - 3600000) } })
```

---

## ✅ Checklist de Funcionalidad

- [x] MongoDB conectado
- [x] Base de datos inicializada
- [x] Backend corriendo
- [x] Frontend corriendo
- [x] Proxy configurado
- [x] Socket.IO habilitado
- [x] Sesiones funcionando
- [ ] Login/Register probado
- [ ] Crear juego probado
- [ ] Sistema de amigos probado
- [ ] Juego en tiempo real probado

---

**¡Todo está listo para comenzar a desarrollar y probar! 🚀**
