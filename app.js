const {
  createBot,
  createProvider,
  createFlow,
  addKeyword,
  EVENTS,
} = require('@bot-whatsapp/bot');
require('dotenv').config();
const QRPortalWeb = require('@bot-whatsapp/portal');
const BaileysProvider = require('@bot-whatsapp/provider/baileys');
const MockAdapter = require('@bot-whatsapp/database/mock');
const { chat } = require('./scripts/chatgpt');
const { transcribeAudio } = require('./scripts/audioHandler');
const { getPrompt } = require('./prompt/prompt');
const { setCurrentUserId } = require('./user/userContext');

const userContexts = {};

const MAX_CONTEXT_LENGTH = 10;

// Función para manejar mensajes de texto
const handleUserMessage = async (ctx, ctxFn) => {
  const prompt = getPrompt();
  const userId = ctx.from;
  const text = ctx.body;

  console.log(`ID del usuario: ${userId}`);
  console.log(`Mensaje del usuario: ${text}`);

  // Set the current user ID for use in chat.js
  setCurrentUserId(userId);

  if (!userContexts[userId]) {
    userContexts[userId] = [{ role: 'system', content: prompt }];
    console.log(`Contexto inicializado para el usuario ${userId}`);
  }

  try {
    userContexts[userId].push({ role: 'user', content: text });
    console.log(`Contexto actualizado para el usuario ${userId}:`, userContexts[userId]);

    // Mantener solo los últimos 10 mensajes en el contexto
    if (userContexts[userId].length > MAX_CONTEXT_LENGTH) {
      const removedContext = userContexts[userId].splice(0, userContexts[userId].length - MAX_CONTEXT_LENGTH);
      console.log(`Se eliminaron ${removedContext.length} mensajes antiguos del contexto del usuario ${userId}`);
    }

    const response = await chat(prompt, userContexts[userId]);

    userContexts[userId].push({ role: 'assistant', content: response });
    console.log(`Respuesta del bot añadida al contexto del usuario ${userId}:`, response);

    // Mantener solo los últimos 10 mensajes en el contexto
    if (userContexts[userId].length > MAX_CONTEXT_LENGTH) {
      const removedContext = userContexts[userId].splice(0, userContexts[userId].length - MAX_CONTEXT_LENGTH);
      console.log(`Se eliminaron ${removedContext.length} mensajes antiguos del contexto del usuario ${userId}`);
    }

    await ctxFn.flowDynamic(response);
  } catch (error) {
    console.error('Error al obtener respuesta de ChatGPT:', error);
    await ctxFn.flowDynamic('Lo siento, hubo un error al procesar tu solicitud.');
  }
};

// Función para manejar notas de voz
const handleVoiceNote = async (ctx, ctxFn) => {
  try {
    console.log('Recibido evento de nota de voz');
    const audioDuration = ctx.message.audioMessage.seconds;
    const maxDuration = 30;

    if (audioDuration > maxDuration) {
      const responseMessage = `No puedo procesar audios mayores a 30 segundos. Tu audio es de ${audioDuration} segundos. Por favor, envía uno más corto.`;
      await ctxFn.flowDynamic(responseMessage);
      return;
    }

    const transcription = await transcribeAudio(ctx);
    console.log(`Transcripción de audio: ${transcription}`);
    const prompt = getPrompt();
    const userId = ctx.from;

    // Set the current user ID for use in chat.js
    setCurrentUserId(userId);

    if (!userContexts[userId]) {
      userContexts[userId] = [{ role: 'system', content: prompt }];
      console.log(`Contexto inicializado para el usuario ${userId}`);
    }

    userContexts[userId].push({ role: 'user', content: transcription });
    console.log(`Contexto actualizado para el usuario ${userId}:`, userContexts[userId]);

    // Mantener solo los últimos 10 mensajes en el contexto
    if (userContexts[userId].length > MAX_CONTEXT_LENGTH) {
      const removedContext = userContexts[userId].splice(0, userContexts[userId].length - MAX_CONTEXT_LENGTH);
      console.log(`Se eliminaron ${removedContext.length} mensajes antiguos del contexto del usuario ${userId}`);
    }

    const response = await chat(prompt, userContexts[userId]);
    userContexts[userId].push({ role: 'assistant', content: response });
    console.log(`Respuesta del bot añadida al contexto del usuario ${userId}:`, response);

    // Mantener solo los últimos 10 mensajes en el contexto
    if (userContexts[userId].length > MAX_CONTEXT_LENGTH) {
      const removedContext = userContexts[userId].splice(0, userContexts[userId].length - MAX_CONTEXT_LENGTH);
      console.log(`Se eliminaron ${removedContext.length} mensajes antiguos del contexto del usuario ${userId}`);
    }

    await ctxFn.flowDynamic(response);
  } catch (error) {
    console.error('Error al transcribir la nota de voz:', error);
    await ctxFn.flowDynamic('Lo siento, hubo un error al procesar la nota de voz.');
  }
};

// Definición del flujo principal
const flowPrincipal = addKeyword([EVENTS.WELCOME]).addAction(handleUserMessage);

// Definición del flujo para notas de voz
const flowVoice = addKeyword([EVENTS.VOICE_NOTE]).addAction(handleVoiceNote);

// Función principal
const main = async () => {
  const adapterDB = new MockAdapter();
  const adapterFlow = createFlow([flowPrincipal, flowVoice]);
  const adapterProvider = createProvider(BaileysProvider);

  createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  });

  QRPortalWeb();
};

main();