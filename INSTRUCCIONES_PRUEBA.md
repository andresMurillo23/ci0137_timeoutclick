# 🧪 Instrucciones para Probar el Sistema TimeoutClick

## 🚀 Iniciar los Servidores

### Terminal 1 - Backend:
```bash
cd "e:\UCR\Semestre VIII\Web\rolo\ci0137_timeoutclick\backend"
node server.js
```

### Terminal 2 - Frontend:
```bash
cd "e:\UCR\Semestre VIII\Web\rolo\ci0137_timeoutclick\frontend"
npm start
```

## 🔐 Estado de la Base de Datos

**IMPORTANTE**: El sistema está funcionando **SIN MongoDB** conectada por ahora.

- ✅ **Funciona perfectamente** para desarrollo y pruebas
- ⚠️ **Los datos se guardan en memoria** (se pierden al reiniciar el servidor)
- 🔄 **Cada reinicio del backend** borra todos los usuarios registrados

## 👥 Cómo Probar el Sistema

### Paso 1: Acceder al Sistema
1. Abrir navegador en: `http://localhost:5000`
2. Ir a Register: `http://localhost:5000/pages/register.html`

### Paso 2: Crear Usuarios de Prueba
Registra al menos 2 usuarios para poder jugar:

**Usuario 1:**
- Username: `player1`
- Email: `player1@test.com`
- Password: `123456`

**Usuario 2:**
- Username: `player2`  
- Email: `player2@test.com`
- Password: `123456`

### Paso 3: Hacer Login y Jugar
1. Hacer login con uno de los usuarios
2. **PROBLEMA ACTUAL**: El sistema de amigos requiere que agregues amigos primero
3. **SOLUCIÓN TEMPORAL**: Necesitamos implementar la página de "Add Friends"

## 🔧 Próximos Pasos Inmediatos

1. **Implementar página de agregar amigos** para poder desafiar usuarios
2. **Opcional**: Conectar MongoDB local para persistir datos
3. **Probar el juego** en tiempo real entre dos usuarios

## 🎮 URLs del Sistema

- **Home**: http://localhost:5000
- **Register**: http://localhost:5000/pages/register.html  
- **Login**: http://localhost:5000/pages/login.html
- **Home Logged**: http://localhost:5000/pages/homeLogged.html
- **Add Friend**: http://localhost:5000/pages/addFriend.html (por implementar)

## 🐛 Limitaciones Actuales

- **Sin base de datos**: Datos en memoria únicamente
- **Sin sistema de amigos funcional**: Falta página para agregar amigos
- **Quick Match no implementado**: Solo desafíos entre amigos