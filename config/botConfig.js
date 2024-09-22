const { createFlow, createProvider } = require('@bot-whatsapp/bot');
const BaileysProvider = require('@bot-whatsapp/provider/baileys');
const MockAdapter = require('@bot-whatsapp/database/mock');
const { flowPrincipal, flowVoice } = require('../scripts/handlers');

// Crear adaptadores
const adapterDB = new MockAdapter();
const adapterFlow = createFlow([flowPrincipal, flowVoice]);
const adapterProvider = createProvider(BaileysProvider);

module.exports = {
  adapterFlow,
  adapterProvider,
  adapterDB,
};