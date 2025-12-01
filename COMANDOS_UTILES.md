# Comandos Utiles - TimeoutClick

## Agregar Usuarios de Prueba

### Opcion 1: Script Node.js (Recomendado)
```bash
cd backend
node scripts/seed-users.js
```

Esto creara 10 usuarios:
- testuser (password: test123)
- andresmimi, rolipoli, isabel, tatsparamo, mariagu, carlos99, luisa_k, juan_g, maria89
- Todos con password: password123

### Opcion 2: Script PowerShell para Verificar Usuarios
```powershell
cd backend
.\scripts\check-users.ps1
```

---

## Comandos MongoDB Directos

### Ver todos los usuarios
```bash
mongosh timeoutclick --eval "db.users.find({}, {username: 1, email: 1, _id: 0}).pretty()"
```

### Contar usuarios
```bash
mongosh timeoutclick --eval "db.users.countDocuments()"
```

### Ver estadisticas de un usuario
```bash
mongosh timeoutclick --eval "db.users.findOne({username: 'testuser'})"
```

### Crear un usuario manualmente
```bash
mongosh timeoutclick
```
```javascript
db.users.insertOne({
  username: "nuevouser",
  email: "nuevo@example.com",
  password: "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIeWIgAnR.", // password123
  profile: {
    firstName: "Nuevo",
    lastName: "Usuario",
    country: "Costa Rica"
  },
  gameStats: {
    gamesPlayed: 0,
    gamesWon: 0,
    totalScore: 0,
    bestTime: null,
    averageTime: null
  },
  settings: {
    notifications: true,
    soundEnabled: true,
    theme: "western"
  },
  isEmailVerified: true,
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date()
})
```

### Eliminar todos los usuarios (CUIDADO)
```bash
mongosh timeoutclick --eval "db.users.deleteMany({})"
```

### Eliminar un usuario especifico
```bash
mongosh timeoutclick --eval "db.users.deleteOne({username: 'nombreusuario'})"
```

---

## Verificar Amistades

### Ver todas las amistades
```bash
mongosh timeoutclick --eval "db.friendships.find().pretty()"
```

### Crear amistad manualmente
```javascript
// Primero obtener los IDs de los usuarios
const user1 = db.users.findOne({username: "testuser"})._id;
const user2 = db.users.findOne({username: "andresmimi"})._id;

// Crear la amistad
db.friendships.insertOne({
  user1: user1,
  user2: user2,
  status: "accepted",
  createdAt: new Date(),
  updatedAt: new Date()
})
```

---

## Verificar Invitaciones

### Ver todas las invitaciones pendientes
```bash
mongosh timeoutclick --eval "db.invitations.find({status: 'pending'}).pretty()"
```

### Limpiar invitaciones
```bash
mongosh timeoutclick --eval "db.invitations.deleteMany({})"
```

---

## Verificar Juegos

### Ver historial de juegos
```bash
mongosh timeoutclick --eval "db.games.find().limit(10).pretty()"
```

### Contar juegos
```bash
mongosh timeoutclick --eval "db.games.countDocuments()"
```

### Crear un juego de prueba
```javascript
const player1 = db.users.findOne({username: "testuser"})._id;
const player2 = db.users.findOne({username: "andresmimi"})._id;

db.games.insertOne({
  player1: player1,
  player2: player2,
  status: "completed",
  goalTime: 4,
  player1Time: 3.98,
  player2Time: 4.15,
  winner: player1,
  createdAt: new Date(),
  completedAt: new Date()
})
```

---

## Actualizar Estadisticas de Usuario

### Dar estadisticas a un usuario
```javascript
db.users.updateOne(
  {username: "testuser"},
  {
    $set: {
      "gameStats.gamesPlayed": 50,
      "gameStats.gamesWon": 30,
      "gameStats.totalScore": 1500,
      "gameStats.bestTime": "2.34",
      "gameStats.averageTime": "3.45"
    }
  }
)
```

---

## Backup y Restore

### Hacer backup de la base de datos
```bash
mongodump --db timeoutclick --out ./backup
```

### Restaurar desde backup
```bash
mongorestore --db timeoutclick ./backup/timeoutclick
```

---

## Comandos Utiles del Sistema

### Ver procesos de Node corriendo
```powershell
Get-Process -Name node | Select-Object Id, ProcessName, StartTime
```

### Detener todos los procesos de Node
```powershell
Stop-Process -Name node -Force
```

### Ver si MongoDB esta corriendo
```powershell
Get-Process -Name mongod
```

### Ver puertos ocupados
```powershell
netstat -ano | findstr :3000
netstat -ano | findstr :5000
```

---

## Probar API con PowerShell

### Login
```powershell
$body = @{
    identifier = "testuser"
    password = "test123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $body -ContentType "application/json"
```

### Buscar usuarios
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/users/search?q=test" -Method GET
```

### Health check
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method GET
```

---

## Iniciar Todo el Sistema

### Opcion 1: Script automatico
```bash
.\start-servers.bat
```

### Opcion 2: Manual
```bash
# Terminal 1
cd backend
node server.js

# Terminal 2
cd frontend
node server.js
```

---

## URLs del Sistema

- Frontend: http://localhost:5000
- Backend API: http://localhost:3000/api
- Health Check: http://localhost:3000/api/health
- Login: http://localhost:5000/pages/login.html
- Register: http://localhost:5000/pages/register.html
- Home Logged: http://localhost:5000/pages/homeLogged.html

---

## Credenciales de Prueba

### Usuario Principal
- Username: testuser
- Email: test@timeoutclick.com
- Password: test123

### Usuarios Adicionales
Todos con password: **password123**
- andresmimi
- rolipoli
- isabel
- tatsparamo
- mariagu
- carlos99
- luisa_k
- juan_g
- maria89
