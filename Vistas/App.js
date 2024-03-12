const express = require('express');
const bodyParser = require("body-parser");
const mysql = require('mysql2/promise');
const app = express();
const expresssession = require ('express-session');

app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/../Vistas'));

app.use(expresssession({
    secret: 'JPS',
    resave: false,
    saveUninitialized: true,
}))

const db = mysql.createPool({
    host:'localhost',
    user:"root",
    password:"",
    database:"db - manzanas del cuidado"
});

const cerrarConexionDB = async (conexion) => {
    try {
        await conexion.end(); // Cerrar conexión con la base de datos
        console.log("Conexión con la base de datos cerrada correctamente");
    } catch (error) {
        console.error("Error al cerrar la conexión con la base de datos:", error);
    }
};

app.post('/CerrarSesion', async (req, res) => {
    req.session.destroy((error) => {
    try {
        cerrarConexionDB(db);
        res.send('Sesión cerrada exitosamente');
    } catch (error) {
        console.error("Error al cerrar la sesión:", error);
        res.status(500).send('Error al cerrar la sesión');
    }
    })
});

app.post('/Crear', async (req, res) => {
    const {Nombre, TipoDocumento, Documento} = req.body;
    try {
        const [indicador] = await db.query('SELECT * FROM usuarios WHERE Documento=? AND TipoDocumento=?', [Documento, TipoDocumento]);
        if (indicador.length > 0) {
            res.status(409).send(`<script>alert('Ya existe este usuario');window.location.href="Registro.html";</script>`);
        } else {
            await db.query('INSERT INTO usuarios (Nombre, TipoDocumento, Documento, Rol) VALUES (?, ?, ?, "usuario")', [Nombre, TipoDocumento, Documento]);
            res.status(201).send(`<script>alert('Su registro fue completado');window.location.href="Inicio_de_sesion.html";</script>`);
        }
    } catch(error) {
        console.error('Error en el servidor:', error);
        res.status(500).send("<script>alert('Error en el servidor');window.location.href='Inicio_de_sesion.html';</script>");
    }
});

app.post("/Iniciar", async (req, res) => {
    const {TipoDocumento, Documento} = req.body;
    try {
        const [usuario] = await db.query('SELECT * FROM usuarios WHERE Documento=? AND TipoDocumento=?', [Documento, TipoDocumento]);
        if (usuario.length > 0) {
            if (usuario[0].Rol === "Administrador") {
                res.redirect(`/Admin?usuario=${usuario[0].Nombre}`);
            } else {
                res.redirect(`/Bienvenida?usuario=${usuario[0].Nombre}`);
            }
        } else {
            res.status(401).send("<script>alert('No existes en la base de datos');window.location.href='Inicio_de_sesion.html';</script>");
        }
    } catch(error) {
        console.error("Error en el servidor:", error);
        res.status(500).send("<script>alert('Error en el servidor');window.location.href='Inicio_de_sesion.html';</script>");
    }
});

app.get('/Bienvenida', (req, res) => {
    res.sendFile('Usuarios.html', { root: __dirname + '/../Vistas' });
});

app.get('/Admin', (req, res) => {
    res.sendFile('Admin.html', { root: __dirname + '/../Vistas' });
});

app.post('/obtener-servicios-usuario', async (req, res) => {
    try {
        const [serviciosData] = await db.query(`
            SELECT Nombre 
            FROM servicios
        `);
        res.json({ servicios: serviciosData.map(row => row.Nombre) });
    } catch (error) {
        console.log('Error en el servidor:', error);
        res.status(500).send('Error en el servidor');
    }
});

app.post('/guardar-servicios-usuario', async (req, res) => {
    const { usuario, servicios, fecha } = req.body;
    try {
        // Obtener el ID del usuario
        const [usuarioRow] = await db.query('SELECT ID_Usuario FROM usuarios WHERE Nombre = ?', [usuario]);
        const userId = usuarioRow[0].ID_Usuario;

        // Insertar los servicios seleccionados por el usuario junto con la fecha
        for (const servicio of servicios) {
            await db.query('INSERT INTO solicitudes (ID_Usuario, Codigo_servicio, Fecha) VALUES (?, (SELECT Codigo_servicio FROM servicios WHERE Nombre = ?), ?)', [userId, servicio, fecha]);
        }

        res.status(201).send('Servicios guardados correctamente');
    } catch (error) {
        console.error('Error en el servidor:', error);
        res.status(500).send('Error en el servidor');
    }
});

app.post('/obtener-solicitudes-usuario', async (req, res) => {
    const { usuario } = req.body;
    try {
        // Obtener ID del usuario
        const [usuarioRow] = await db.query('SELECT ID_Usuario FROM usuarios WHERE Nombre = ?', [usuario]);
        const userId = usuarioRow[0].ID_Usuario;

        // Obtener solicitudes del usuario
        const [solicitudesData] = await db.query(`
            SELECT s.ID_solicitud, s.Fecha, se.Nombre 
            FROM solicitudes s 
            INNER JOIN servicios se ON s.Codigo_servicio = se.Codigo_servicio 
            WHERE s.ID_Usuario = ?`, [userId]);

        res.json({ solicitudes: solicitudesData });
    } catch (error) {
        console.error('Error en el servidor:', error);
        res.status(500).send('Error en el servidor');
    }
});

// Ruta para borrar una solicitud
app.post('/borrar-solicitud', async (req, res) => {
    const { solicitudId } = req.body;
    try {
        await db.query('DELETE FROM solicitudes WHERE ID_solicitud = ?', [solicitudId]);
        res.status(200).send('Solicitud borrada correctamente');
    } catch (error) {
        console.error('Error en el servidor:', error);
        res.status(500).send('Error en el servidor');
    }
});

app.post('/obtener-manzanas-registradas', async (req, res) => {
    try {
        // Obtener manzanas registradas
        const [manzanasData] = await db.query('SELECT * FROM manzanas');
        res.json({ manzanas: manzanasData });
    } catch (error) {
        console.error('Error en el servidor:', error);
        res.status(500).send('Error en el servidor');
    }
});

app.post('/obtener-servicios-registrados', async (req, res) => {
    try {
        // Obtener servicios registrados
        const [serviciosData] = await db.query('SELECT * FROM servicios');
        res.json({ servicios: serviciosData });
    } catch (error) {
        console.error('Error en el servidor:', error);
        res.status(500).send('Error en el servidor');
    }
});

app.post('/obtener-solicitudes-registradas', async (req, res) => {
    try {
        // Obtener solicitudes registradas
        const [solicitudesData] = await db.query('SELECT * FROM solicitudes');
        res.json({ solicitudes: solicitudesData });
    } catch (error) {
        console.error('Error en el servidor:', error);
        res.status(500).send('Error en el servidor');
    }
});

app.post('/obtener-usuarios-registrados', async (req, res) => {
    try {
        // Obtener usuarios registrados
        const [usuariosData] = await db.query('SELECT * FROM usuarios');
        res.json({ usuarios: usuariosData });
    } catch (error) {
        console.error('Error en el servidor:', error);
        res.status(500).send('Error en el servidor');
    }
});

// Ruta para borrar una manzana
app.post('/borrar-manzana', async (req, res) => {
    const { Codigo_manzana } = req.body;
    try {
        await db.query('DELETE FROM manzanas WHERE Codigo_manzana = ?', [Codigo_manzana]);
        res.status(200).send('Manzana borrada correctamente');
    } catch (error) {
        console.error('Error en el servidor:', error);
        res.status(500).send('Error en el servidor');
    }
});

// Ruta para borrar un servicio
app.post('/borrar-servicio', async (req, res) => {
    const { Codigo_servicio } = req.body;
    try {
        await db.query('DELETE FROM servicios WHERE Codigo_servicio = ?', [Codigo_servicio]);
        res.status(200).send('Servicio borrado correctamente');
    } catch (error) {
        console.error('Error en el servidor:', error);
        res.status(500).send('Error en el servidor');
    }
});

// Ruta para borrar una solicitud
app.post('/borrar-solicitud', async (req, res) => {
    const { ID_solicitud } = req.body;
    try {
        await db.query('DELETE FROM solicitudes WHERE ID_solicitud = ?', [ID_solicitud]);
        res.status(200).send('Solicitud borrada correctamente');
    } catch (error) {
        console.error('Error en el servidor:', error);
        res.status(500).send('Error en el servidor');
    }
});

// Ruta para borrar un usuario
app.post('/borrar-usuario', async (req, res) => {
    const { ID_Usuario } = req.body;
    try {
        await db.query('DELETE FROM usuarios WHERE ID_Usuario = ?', [ID_Usuario]);
        res.status(200).send('Usuario borrado correctamente');
    } catch (error) {
        console.error('Error en el servidor:', error);
        res.status(500).send('Error en el servidor');
    }
});

app.listen(3000, () => {
    console.log("Servidor node escuchando");
});