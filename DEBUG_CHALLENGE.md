# Debug Challenge System

## Problema: "Opponent is not online"

### Cambios Realizados

1. **Backend - Socket.IO**
   - Agregado logging extensivo en `handleSendChallenge()`
   - Conversión de `opponentId` a string para comparación
   - Logging de usuarios conectados con tipos de datos

2. **Frontend - challenge.js**
   - Conversión de IDs a string antes de enviar
   - Logging de datos antes de emit
   - Verificación de conexión de socket

### Pasos para Debuggear

1. **Reinicia los servidores**
   ```cmd
   .\start-servers.bat
   ```

2. **Abre dos navegadores:**
   - Navegador normal: Usuario A
   - Modo incógnito: Usuario B
   - Asegúrate que son amigos

3. **Usuario A - Abre DevTools Console**
   - Ve a `http://localhost:5000/pages/challenge.html`
   - Abre Console (F12)
   - Busca logs que digan: `[CHALLENGE]`

4. **Usuario B - Abre DevTools Console**
   - Ve a `http://localhost:5000/pages/challenge.html`
   - Abre Console (F12)
   - Busca logs que digan: `[CHALLENGE]`

5. **Backend Terminal**
   - Observa logs que empiezan con `[SOCKET]`
   - Deberías ver:
     ```
     [SOCKET] User [username] connected with socket [socketId]
     [SOCKET] User ID: [id] (type: string)
     [SOCKET] Total connected users: 2
     ```

### Qué Buscar

#### En Backend Terminal al conectar:
```
[SOCKET] User usuario1 connected with socket xyz123
[SOCKET] User ID: 67451234... (type: string)
[SOCKET] Total connected users: 1

[SOCKET] User usuario2 connected with socket abc456
[SOCKET] User ID: 67459876... (type: string)
[SOCKET] Total connected users: 2
```

#### En Frontend Console (Usuario A):
```
[CHALLENGE] Cleaning up old games...
[CHALLENGE] Old games cleaned up
[CHALLENGE] Connected to server
[CHALLENGE] API Response: {...}
[CHALLENGE] Parsed friends: [...]
[CHALLENGE] Friends count: 1
[CHALLENGE] displayPlayers called with: [...]
[CHALLENGE] Processing player: {id: "...", username: "usuario2", ...}
```

#### Al enviar challenge (Usuario A):
```
[CHALLENGE] Opening modal for player: {id: "...", username: "usuario2"}
[CHALLENGE] Sending challenge to: {id: "...", username: "usuario2"}
[CHALLENGE] Challenge sent: {success: true, game: {...}}
[CHALLENGE] Game ID: 674a1234...
[CHALLENGE] Opponent ID: 674b5678...
[CHALLENGE] Socket connected: true
[CHALLENGE] Emitting send_challenge: {gameId: "...", opponentId: "..."}
```

#### En Backend al recibir challenge:
```
[SOCKET] Send challenge request: {gameId: "...", opponentId: "...", sender: "..."}
[SOCKET] OpponentId type: string
[SOCKET] Connected users: ["674a1234...", "674b5678..."]
[SOCKET] Looking for opponent: 674b5678...
[SOCKET] Opponent lookup result: {socketId: "...", username: "usuario2", ...}
[SOCKET] Sending challenge_received to socket abc456
[SOCKET] Challenge sent from usuario1 to usuario2
```

#### En Frontend (Usuario B):
```
[CHALLENGE] Challenge received: {gameId: "...", challengerId: "...", challenger: {...}}
```

### Problemas Comunes

1. **Connected users: []**
   - Los sockets no se están conectando
   - Revisar autenticación en handshake
   - Verificar token en sessionStorage

2. **OpponentId no coincide**
   - IDs en formato diferente (ObjectId vs String)
   - Verificar estructura de datos de amigos

3. **Socket connected: false**
   - Socket.IO no se inicializó correctamente
   - Revisar URL de conexión (http://localhost:3000)
   - Verificar token de autenticación

### Si sigue fallando

Comparte:
1. Logs de Backend terminal (líneas con [SOCKET])
2. Logs de Frontend console Usuario A (líneas con [CHALLENGE])
3. Logs de Frontend console Usuario B (líneas con [CHALLENGE])
