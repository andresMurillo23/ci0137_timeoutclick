const express = require("express"); 
const path = require("path"); 
var bodyParser = require("body-parser"); 
var multer = require("multer");

const app = express( ); 
app.use(bodyParser.json( )); // application/json 
app.use(bodyParser.urlencoded({ extended: true })); // application/x-www-form-urlencoded 
app.use(multer({ }).any( )); // multipart/form-data 

var directorioEstaticos = path.join( __dirname, "public");
app.use(express.static( directorioEstaticos )); 
console.log("Directorio archivos estáticos de cliente: " + directorioEstaticos); 
const ipServidor = "0.0.0.0"; 
const puertoServidor = 5000; 
const servidor = app.listen(puertoServidor, ipServidor, function ( ) { 
console.log("Servidor corriendo en http://localhost:" + puertoServidor + " …");
});