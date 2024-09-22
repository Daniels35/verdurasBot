require("dotenv").config();
const axios = require("axios");
const fs = require("fs");
const { downloadMediaMessage } = require("@adiwajshing/baileys");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffmpeg = require("fluent-ffmpeg");
ffmpeg.setFfmpegPath(ffmpegPath);

const openaiApiKey = process.env.OPENAI_API_KEY;

const voiceToText = async (path) => {
    if (!fs.existsSync(path)) {
        throw new Error("No se encuentra el archivo");
    }
    try {
        console.log("Leyendo archivo para transcripción:", path);

        const file = fs.createReadStream(path);
        const response = await axios.post("https://api.openai.com/v1/audio/transcriptions", 
        {
            file: file,
            model: "whisper-1"
        }, 
        {
            headers: {
                'Authorization': `Bearer ${openaiApiKey}`,
                'Content-Type': 'multipart/form-data'
            }
        });

        const transcription = response.data.text;
        console.log("Transcripción recibida:", transcription);
        return transcription;
    } catch (err) {
        console.log("Error en voiceToText:", err.response ? err.response.data : err.message);
        return "ERROR";
    }
};

const convertOggMp3 = async (inputStream, outStream) => {
    return new Promise((resolve, reject) => {
        ffmpeg(inputStream)
            .audioQuality(96)
            .toFormat("mp3")
            .save(outStream)
            .on("progress", (p) => console.log(`Progreso de conversión: ${JSON.stringify(p)}`))
            .on("end", () => {
                console.log("Conversión a MP3 completada");
                resolve(true);
            })
            .on("error", (err) => {
                console.log("Error en convertOggMp3:", err);
                reject(err);
            });
    });
};

const transcribeAudio = async (ctx) => {
    try {
        console.log("Descargando el mensaje de audio");
        const buffer = await downloadMediaMessage(ctx, "buffer");
        console.log("Mensaje de audio descargado");
        
        const pathTmpOgg = `${process.cwd()}/tmp/voice-note-${Date.now()}.ogg`;
        const pathTmpMp3 = `${process.cwd()}/tmp/voice-note-${Date.now()}.mp3`;
        
        await fs.writeFileSync(pathTmpOgg, buffer);
        console.log("Audio guardado como OGG temporal:", pathTmpOgg);
        
        await convertOggMp3(pathTmpOgg, pathTmpMp3);
        console.log("Audio convertido a MP3:", pathTmpMp3);
        
        const transcription = await voiceToText(pathTmpMp3);
        console.log("Transcripción recibida:", transcription);
        
        // Temporalmente no eliminar archivos para verificar el audio
        fs.unlink(pathTmpMp3, (error) => {
            if (error) throw error;
            console.log("Archivo MP3 temporal eliminado:", pathTmpMp3);
        });
        
        fs.unlink(pathTmpOgg, (error) => {
            if (error) throw error;
            console.log("Archivo OGG temporal eliminado:", pathTmpOgg);
        });
        
        return transcription;
    } catch (error) {
        console.error("Error al transcribir audio:", error);
        throw error;
    }
};

module.exports = { transcribeAudio };
