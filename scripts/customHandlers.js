const { chat } = require('./chatgpt');
const { transcribeAudio } = require('./audioHandler');
const { getPrompt } = require('../prompt/prompt');

const userContexts = {};

// Función para manejar mensajes de texto
const handleUserMessage = async (ctx, ctxFn) => {
  const prompt = getPrompt();  // Llama a la función aquí
  const userId = ctx.from;
  const text = ctx.body;

  console.log(`ID del usuario: ${userId}`);
  console.log(`Mensaje del usuario: ${text}`);

  // Inicializar el contexto de mensajes si no existe
  if (!userContexts[userId]) {
    userContexts[userId] = [{ role: 'system', content: prompt }];
    console.log(`Contexto inicializado para el usuario ${userId}`);
  }

  try {
    // Añadir el mensaje del usuario al contexto
    userContexts[userId].push({ role: 'user', content: text });
    console.log(`Contexto actualizado para el usuario ${userId}:`, userContexts[userId]);

    // Obtener la respuesta de ChatGPT
    const response = await chat(prompt, userContexts[userId]);

    // Añadir la respuesta del bot al contexto
    userContexts[userId].push({ role: 'assistant', content: response });
    console.log(`Respuesta del bot añadida al contexto del usuario ${userId}:`, response);

    // Enviar la respuesta al usuario
    console.log('Respuesta del bot:', response);
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
    const prompt = getPrompt();  // Llama a la función aquí
    const userId = ctx.from;

    if (!userContexts[userId]) {
      userContexts[userId] = [{ role: 'system', content: prompt }];
      console.log(`Contexto inicializado para el usuario ${userId}`);
    }

    userContexts[userId].push({ role: 'user', content: transcription });
    console.log(`Contexto actualizado para el usuario ${userId}:`, userContexts[userId]);

    const response = await chat(prompt, userContexts[userId]);
    userContexts[userId].push({ role: 'assistant', content: response });
    console.log(`Respuesta del bot añadida al contexto del usuario ${userId}:`, response);

    await ctxFn.flowDynamic(response);
  } catch (error) {
    console.error('Error al transcribir la nota de voz:', error);
    await ctxFn.flowDynamic('Lo siento, hubo un error al procesar la nota de voz.');
  }
};

module.exports = {
  handleUserMessage,
  handleVoiceNote,
};