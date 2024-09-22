const { addKeyword, EVENTS } = require('@bot-whatsapp/bot');
const { handleUserMessage, handleVoiceNote } = require('./customHandlers');

const flowPrincipal = addKeyword([EVENTS.WELCOME]).addAction(handleUserMessage);
const flowVoice = addKeyword([EVENTS.VOICE_NOTE]).addAction(handleVoiceNote);

module.exports = {
  flowPrincipal,
  flowVoice,
};