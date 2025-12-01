const express = require("express"); 
const path = require("path"); 
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express(); 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Proxy API calls to backend - CRITICAL: cookies and sessions
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: false,
  ws: false,
  cookieDomainRewrite: '',
  cookiePathRewrite: '/',
  onProxyReq: (proxyReq, req) => {
    // Preserve all headers including cookies
    if (req.headers.cookie) {
      proxyReq.setHeader('Cookie', req.headers.cookie);
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    // Ensure cookies are properly forwarded to client
    const setCookieHeaders = proxyRes.headers['set-cookie'];
    if (setCookieHeaders) {
      proxyRes.headers['set-cookie'] = setCookieHeaders.map(cookie => {
        // Remove Secure flag for local development
        return cookie.replace(/; Secure/gi, '');
      });
    }
  }
}));

// Proxy Socket.IO to backend
app.use('/socket.io', createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: false,
  ws: true
}));

var directorioEstaticos = path.join( __dirname, "public");
app.use(express.static( directorioEstaticos )); 
console.log("Directorio archivos estáticos de cliente: " + directorioEstaticos); 
const ipServidor = "0.0.0.0"; 
const puertoServidor = 5000; 
const servidor = app.listen(puertoServidor, ipServidor, function ( ) { 
console.log("Servidor corriendo en http://localhost:" + puertoServidor + " …");
console.log("Proxy configurado para backend en puerto 3000");
});