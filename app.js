const {
  createBot,
  createProvider,
  createFlow,
  addKeyword,
  EVENTS,
} = require('@bot-whatsapp/bot');
const QRPortalWeb = require('@bot-whatsapp/portal');
const BaileysProvider = require('@bot-whatsapp/provider/baileys');
const MockAdapter = require('@bot-whatsapp/database/mock');
const { chat, transcribeAudio } = require('./scripts/chatgpt');
const fs = require('fs');

const userContexts = {};

// Archivo para persistir los precios
const pricesFile = './prices.json';

// Al inicio del programa, cargar los precios desde el archivo
let prices = {};
if (fs.existsSync(pricesFile)) {
  prices = JSON.parse(fs.readFileSync(pricesFile));
} else {
  prices = {
    lentejas: 5000,
    garbanzos: 6000,
    frijoles: 7000,
    arroz: 3000,
  };
  fs.writeFileSync(pricesFile, JSON.stringify(prices));
}

// Función para guardar los precios en el archivo
const savePrices = () => {
  fs.writeFileSync(pricesFile, JSON.stringify(prices));
};

// Función para obtener el prompt actualizado con los precios
const getPrompt = () => {
  return `Eres un asistente virtual para una legumbrería. Tu objetivo es ayudar a los clientes proporcionando información sobre los productos disponibles, precios actuales y realizando ventas. Los productos y precios actuales son:

${Object.entries(prices)
    .map(([product, price]) => `- ${product}: ${price} COP por kilogramo`)
    .join('\n')}

Si un cliente pregunta por los precios, proporciona la información actualizada. Si el número "573206449915" te solicita cambiar los precios o agregar nuevos productos, actualiza los precios o agrega los productos según sus indicaciones. Siempre responde de manera amable y profesional.`;
};

// Función para manejar mensajes de texto
const handleUserMessage = async (ctx, ctxFn) => {
  const userId = ctx.from;
  const text = ctx.body.trim().toLowerCase();

  console.log(`ID del usuario: ${userId}`);
  console.log(`Mensaje del usuario: ${text}`);

  // Inicializar el contexto de mensajes si no existe
  if (!userContexts[userId]) {
    const prompt = getPrompt();
    userContexts[userId] = [{ role: 'system', content: prompt }];
    console.log(`Contexto inicializado para el usuario ${userId}`);
  } else {
    // Actualizar el prompt en cada mensaje para reflejar los cambios en precios
    userContexts[userId][0].content = getPrompt();
  }

  // Verificar si el usuario es el administrador que puede cambiar precios o agregar productos
  const adminNumber = '573206449915';
  if (userId === adminNumber) {
    if (text.startsWith('cambiar precio de')) {
      const priceChangeRegex = /cambiar precio de (.+) a (\d+)/;
      const match = text.match(priceChangeRegex);

      if (match) {
        const [, product, newPrice] = match;
        const productKey = product.trim().toLowerCase();
        if (prices.hasOwnProperty(productKey)) {
          prices[productKey] = parseInt(newPrice);
          savePrices();
          // Actualizar el prompt en el contexto del usuario
          userContexts[userId][0].content = getPrompt();
          console.log(`Precio de ${productKey} actualizado a ${newPrice} COP`);
          await ctxFn.flowDynamic(
            `El precio de ${productKey} ha sido actualizado a ${newPrice} COP.`
          );
          return;
        } else {
          await ctxFn.flowDynamic(
            `El producto ${productKey} no existe en la lista. Puedes agregarlo usando "Agregar producto [producto] con precio [precio]".`
          );
          return;
        }
      } else {
        await ctxFn.flowDynamic(
          'Formato incorrecto. Usa: "Cambiar precio de [producto] a [nuevo precio]"'
        );
        return;
      }
    } else if (text.startsWith('agregar producto')) {
      const addProductRegex = /agregar producto (.+) con precio (\d+)/;
      const match = text.match(addProductRegex);

      if (match) {
        const [, product, price] = match;
        const productKey = product.trim().toLowerCase();
        if (!prices.hasOwnProperty(productKey)) {
          prices[productKey] = parseInt(price);
          savePrices();
          // Actualizar el prompt en el contexto del usuario
          userContexts[userId][0].content = getPrompt();
          console.log(`Producto ${productKey} agregado con precio ${price} COP`);
          await ctxFn.flowDynamic(
            `El producto ${productKey} ha sido agregado con un precio de ${price} COP.`
          );
          return;
        } else {
          await ctxFn.flowDynamic(
            `El producto ${productKey} ya existe. Puedes cambiar su precio usando "Cambiar precio de [producto] a [nuevo precio]".`
          );
          return;
        }
      } else {
        await ctxFn.flowDynamic(
          'Formato incorrecto. Usa: "Agregar producto [producto] con precio [precio]"'
        );
        return;
      }
    }
  }

  try {
    // Añadir el mensaje del usuario al contexto
    userContexts[userId].push({ role: 'user', content: text });
    console.log(
      `Contexto actualizado para el usuario ${userId}:`,
      userContexts[userId]
    );

    // Obtener la respuesta de ChatGPT
    const response = await chat(userContexts[userId][0].content, userContexts[userId]);

    // Añadir la respuesta del bot al contexto
    userContexts[userId].push({ role: 'assistant', content: response });
    console.log(
      `Respuesta del bot añadida al contexto del usuario ${userId}:`,
      response
    );

    // Enviar la respuesta al usuario
    console.log('Respuesta del bot:', response);
    await ctxFn.flowDynamic(response);
  } catch (error) {
    console.error('Error al obtener respuesta de ChatGPT:', error);
    await ctxFn.flowDynamic(
      'Lo siento, hubo un error al procesar tu solicitud.'
    );
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
    const userId = ctx.from;

    // Inicializar el contexto de mensajes si no existe
    if (!userContexts[userId]) {
      const prompt = getPrompt();
      userContexts[userId] = [{ role: 'system', content: prompt }];
      console.log(`Contexto inicializado para el usuario ${userId}`);
    } else {
      // Actualizar el prompt en cada mensaje para reflejar los cambios en precios
      userContexts[userId][0].content = getPrompt();
    }

    // Verificar si el usuario es el administrador que puede cambiar precios o agregar productos
    const adminNumber = '573206449915';
    if (userId === adminNumber) {
      const text = transcription.trim().toLowerCase();

      if (text.startsWith('cambiar precio de')) {
        const priceChangeRegex = /cambiar precio de (.+) a (\d+)/;
        const match = text.match(priceChangeRegex);

        if (match) {
          const [, product, newPrice] = match;
          const productKey = product.trim().toLowerCase();
          if (prices.hasOwnProperty(productKey)) {
            prices[productKey] = parseInt(newPrice);
            savePrices();
            // Actualizar el prompt en el contexto del usuario
            userContexts[userId][0].content = getPrompt();
            console.log(`Precio de ${productKey} actualizado a ${newPrice} COP`);
            await ctxFn.flowDynamic(
              `El precio de ${productKey} ha sido actualizado a ${newPrice} COP.`
            );
            return;
          } else {
            await ctxFn.flowDynamic(
              `El producto ${productKey} no existe en la lista. Puedes agregarlo usando "Agregar producto [producto] con precio [precio]".`
            );
            return;
          }
        } else {
          await ctxFn.flowDynamic(
            'Formato incorrecto. Usa: "Cambiar precio de [producto] a [nuevo precio]"'
          );
          return;
        }
      } else if (text.startsWith('agregar producto')) {
        const addProductRegex = /agregar producto (.+) con precio (\d+)/;
        const match = text.match(addProductRegex);

        if (match) {
          const [, product, price] = match;
          const productKey = product.trim().toLowerCase();
          if (!prices.hasOwnProperty(productKey)) {
            prices[productKey] = parseInt(price);
            savePrices();
            // Actualizar el prompt en el contexto del usuario
            userContexts[userId][0].content = getPrompt();
            console.log(`Producto ${productKey} agregado con precio ${price} COP`);
            await ctxFn.flowDynamic(
              `El producto ${productKey} ha sido agregado con un precio de ${price} COP.`
            );
            return;
          } else {
            await ctxFn.flowDynamic(
              `El producto ${productKey} ya existe. Puedes cambiar su precio usando "Cambiar precio de [producto] a [nuevo precio]".`
            );
            return;
          }
        } else {
          await ctxFn.flowDynamic(
            'Formato incorrecto. Usa: "Agregar producto [producto] con precio [precio]"'
          );
          return;
        }
      }
    }

    // Añadir el mensaje del usuario al contexto
    userContexts[userId].push({ role: 'user', content: transcription });
    console.log(`Contexto actualizado para el usuario ${userId}:`, userContexts[userId]);

    // Obtener la respuesta de ChatGPT
    const response = await chat(userContexts[userId][0].content, userContexts[userId]);

    // Añadir la respuesta del bot al contexto
    userContexts[userId].push({ role: 'assistant', content: response });
    console.log(`Respuesta del bot añadida al contexto del usuario ${userId}:`, response);

    // Enviar la respuesta al usuario
    console.log('Respuesta del bot:', response);
    await ctxFn.flowDynamic(response);
  } catch (error) {
    console.error('Error al transcribir la nota de voz:', error);
    await ctxFn.flowDynamic('Lo siento, hubo un error al procesar la nota de voz.');
  }
};

// Definición del flujo principal
const flowPrincipal = addKeyword([EVENTS.WELCOME, EVENTS.MESSAGE])
  .addAction(handleUserMessage);

// Definición del flujo para notas de voz
const flowVoice = addKeyword([EVENTS.VOICE_NOTE])
  .addAction(handleVoiceNote);

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
