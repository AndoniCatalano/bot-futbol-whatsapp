const express = require('express');
const fetch = require('node-fetch');
const cron = require('node-cron');
const twilio = require('twilio');

// ==========================================
// CONFIGURACIÓN ⚙️
// ==========================================
const NUMERO_VIEJO = 'whatsapp:+5492234559974'; 
const API_KEY_FOOTBALL = '815403c4cb90a5a0f40be90970d79c48';

// Tus datos oficiales de Twilio extraídos de tu captura:
const TWILIO_ACCOUNT_SID = 'ACf42cc126a9cb565948d3246009ce65c9'; 
const TWILIO_AUTH_TOKEN = 'ee42db1552ae32f8af6a22816138223a'; // 👈 ¡Token cargado!
const TWILIO_NUMERO_WHATSAPP = 'whatsapp:+14155238886';
// ==========================================

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// Servidor Express básico exigido por Render
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('OK'));
app.listen(PORT);

// Función principal que consulta el fixture y calcula los 20 minutos antes
async function programarAlertasDelDia() {
    try {
        const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
        const url = `https://v3.football.api-sports.io/fixtures?league=1&season=2026&date=${hoy}`;
        
        const respuesta = await fetch(url, {
            method: 'GET',
            headers: {
                'x-apisports-key': API_KEY_FOOTBALL
            }
        });
        
        const datos = await respuesta.json();
        if (!datos.response || datos.response.length === 0) return;

        datos.response.forEach(partido => {
            const equipo1 = partido.teams.home.name;
            const equipo2 = partido.teams.away.name;
            
            const horaInicioPartido = new Date(partido.fixture.date).getTime();
            const tiempoAlerta = horaInicioPartido - (20 * 60 * 1000);
            const ahora = Date.now();

            if (tiempoAlerta > ahora) {
                const tiempoRestante = tiempoAlerta - ahora;

                setTimeout(async () => {
                    const horaFormateada = new Date(partido.fixture.date).toLocaleTimeString('es-AR', {
                        timeZone: 'America/Argentina/Buenos_Aires',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    });

                    // FORMATO ESTRICTO REQUERIDO: "Partido: hora equipo1 vs equipo2"
                    const textoMensaje = `Partido: ${horaFormateada} ${equipo1} vs ${equipo2}`;

                    try {
                        await client.messages.create({
                            from: TWILIO_NUMERO_WHATSAPP,
                            to: NUMERO_VIEJO,
                            body: textoMensaje
                        });
                        console.log(`Mensaje enviado: ${textoMensaje}`);
                    } catch (err) {
                        console.error('Error Twilio:', err);
                    }

                }, tiempoRestante);
            }
        });

    } catch (error) {
        console.error('Error API Fútbol:', error);
    }
}

// Corre de manera automática todas las noches a las 00:05 AM de Argentina
cron.schedule('5 0 * * *', () => {
    programarAlertasDelDia();
}, {
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires"
});

// =================================================================
// SECCIÓN DE PRUEBA (Borrala o comentala después de testear)
// =================================================================
async function testMandarMensajeInmediato() {
    try {
        await client.messages.create({
            from: TWILIO_NUMERO_WHATSAPP,
            to: NUMERO_VIEJO,
            body: "Hola Javier, este es un mensaje de prueba. ¡Andoni programó el bot con éxito!"
        });
        console.log("¡Mensaje de prueba enviado correctamente!");
    } catch (err) {
        console.error("Error en el test de Twilio:", err);
    }
}

// Ejecutamos el test al arrancar el servidor
testMandarMensajeInmediato();

// Dejamos corriendo también la carga de partidos por las dudas
programarAlertasDelDia();