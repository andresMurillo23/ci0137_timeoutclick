# Sistema de Desafíos en Tiempo Real

## Resumen
Se ha implementado un sistema completo de desafíos/invitaciones a duelos en tiempo real usando Socket.IO.

## Flujo Completo

### 1. Enviar Desafío
**Usuario A** (Retador):
1. Va a `/pages/challenge.html`
2. Ve lista de amigos con su estado (online/busy/offline)
3. Hace clic en botón "CHALLENGE" junto a un amigo
4. Aparece modal de confirmación "¿Deseas desafiar a [Usuario]?"
5. Hace clic en "YES"
6. Se crea el juego en la base de datos (POST `/api/games/challenge`)
7. Se emite evento Socket.IO `send_challenge` al oponente
8. El modal cambia a "WAITING FOR PLAYER..." con spinner
9. Puede cancelar con botón "CANCEL"

**Usuario B** (Oponente):
1. Recibe evento Socket.IO `challenge_received`
2. Aparece notificación en la sección "DUEL NOTIFICATIONS"
3. Ve: "[Usuario A] wants to duel! Goal: Xs"
4. Tiene dos botones: "ACCEPT" y "DECLINE"

### 2. Aceptar Desafío
**Usuario B** hace clic en "ACCEPT":
1. Se emite evento Socket.IO `accept_challenge`
2. Backend actualiza el juego a status `active`
3. Backend emite `challenge_accepted` a ambos jugadores
4. Ambos son redirigidos a `/pages/duel.html?gameId=[id]`

### 3. Rechazar Desafío
**Usuario B** hace clic en "DECLINE":
1. Se emite evento Socket.IO `decline_challenge`
2. Backend actualiza el juego a status `cancelled`
3. Backend emite `challenge_declined` al retador
4. Usuario A ve alerta "[Usuario B] declined your challenge"
5. Modal se cierra

### 4. Cancelar Desafío
**Usuario A** hace clic en "CANCEL" mientras espera:
1. Se emite evento Socket.IO `cancel_challenge`
2. Backend actualiza el juego a status `cancelled`
3. Backend emite `challenge_cancelled` al oponente
4. Notificación desaparece del panel de Usuario B

## Archivos Modificados

### Backend
**`backend/socket/index.js`**
- Agregados 4 handlers de eventos:
  - `handleSendChallenge()` - Envía notificación al oponente
  - `handleAcceptChallenge()` - Actualiza juego y redirige a ambos
  - `handleDeclineChallenge()` - Notifica rechazo al retador
  - `handleCancelChallenge()` - Limpia desafío pendiente

### Frontend
**`frontend/public/js/pages/challenge.js`**
- Agregadas funciones:
  - `addChallengeNotification()` - Muestra notificación dinámica
  - `removeChallengeNotification()` - Elimina notificación
  - `handleAcceptChallenge()` - Maneja aceptación
  - `handleDeclineChallenge()` - Maneja rechazo
  - `cancelChallenge()` - Cancela desafío pendiente
- Agregados listeners Socket.IO:
  - `challenge_received` - Recibe invitación
  - `challenge_accepted` - Redirige a duel
  - `challenge_declined` - Muestra alerta
  - `challenge_cancelled` - Limpia notificación
  - `challenge_error` - Maneja errores

**`frontend/public/pages/challenge.html`**
- Removidos todos los ejemplos hardcoded
- Sección "DUEL NOTIFICATIONS" ahora se llena dinámicamente
- Sección "CHALLENGE PLAYER" se llena con amigos reales

**`frontend/public/css/pages/challenge-style.css`**
- Agregados estilos para `.notification-item`
- Animación `slideIn` para notificaciones
- Estilos para `.btn-accept` y `.btn-decline`

## Eventos Socket.IO

### Cliente → Servidor
```javascript
// Enviar desafío
socket.emit('send_challenge', {
  gameId: string,
  opponentId: string
});

// Aceptar desafío
socket.emit('accept_challenge', {
  gameId: string,
  challengerId: string
});

// Rechazar desafío
socket.emit('decline_challenge', {
  gameId: string,
  challengerId: string
});

// Cancelar desafío
socket.emit('cancel_challenge', {
  gameId: string,
  opponentId: string
});
```

### Servidor → Cliente
```javascript
// Notificación de desafío recibido
socket.on('challenge_received', {
  gameId: string,
  challengerId: string,
  challenger: {
    id: string,
    username: string
  },
  goalTime: number,
  timestamp: Date
});

// Desafío aceptado
socket.on('challenge_accepted', {
  gameId: string,
  acceptedBy: string,
  timestamp: Date
});

// Desafío rechazado
socket.on('challenge_declined', {
  gameId: string,
  declinedBy: string,
  timestamp: Date
});

// Desafío cancelado
socket.on('challenge_cancelled', {
  gameId: string,
  cancelledBy: string,
  timestamp: Date
});

// Error en desafío
socket.on('challenge_error', {
  message: string
});
```

## Modelo de Datos

### Game (MongoDB)
```javascript
{
  _id: ObjectId,
  player1: ObjectId, // Usuario que envía desafío
  player2: ObjectId, // Usuario que recibe desafío
  goalTime: Number,  // Tiempo objetivo en segundos
  gameType: 'challenge',
  status: 'waiting' | 'active' | 'cancelled' | 'finished',
  startedAt: Date,
  cancelledAt: Date,
  cancelReason: string,
  createdAt: Date
}
```

## Validaciones

### Backend
- ✅ Verificar que oponente existe y está activo
- ✅ Verificar que ambos son amigos
- ✅ Verificar que retador no está en juego activo
- ✅ Verificar que oponente no está en juego activo
- ✅ Verificar que oponente está conectado (online)
- ✅ No permitir desafiarse a sí mismo

### Frontend
- ✅ Solo mostrar botón "CHALLENGE" para amigos online
- ✅ Prevenir múltiples desafíos simultáneos
- ✅ Validar que socket esté conectado antes de emitir

## Testing

### Para probar el sistema:
1. Abrir dos ventanas/navegadores
2. Iniciar sesión con dos usuarios diferentes que sean amigos
3. En navegador A: ir a `/pages/challenge.html`
4. En navegador B: ir a `/pages/challenge.html`
5. En navegador A: hacer clic en "CHALLENGE" para Usuario B
6. En navegador B: verificar que aparece notificación
7. En navegador B: hacer clic en "ACCEPT"
8. Ambos navegadores deben redirigir a `/pages/duel.html?gameId=[id]`

### Casos de prueba:
- ✅ Enviar y aceptar desafío
- ✅ Enviar y rechazar desafío
- ✅ Enviar y cancelar desafío
- ✅ Usuario offline no recibe notificación
- ✅ Usuario en juego no puede enviar/recibir desafíos
- ✅ No amigos no pueden desafiarse

## Próximos Pasos
1. Implementar timeout automático (ej: 30 segundos)
2. Agregar sonido/notificación visual cuando se recibe desafío
3. Agregar historial de desafíos
4. Implementar sistema de ranking basado en desafíos ganados
