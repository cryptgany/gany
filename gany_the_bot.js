// Will analyze the market
require('dotenv').config();
var bittrex = require('node.bittrex.api');

const TelegramBot = require('node-telegram-bot-api');
const token = process.env.GANY_KEY;

const gany_the_bot = new TelegramBot(token, {polling: true});

this.chats = [];
// this.chats.push(parseInt(process.env.WARNINGS_GROUP)); // disable for testing
this.chats.push(parseInt(process.env.PERSONAL_CHANNEL))

gany_the_bot.onText(/\/dudeimking/, (msg, match) => {
  // Subscribers
  const chatId = msg.chat.id;
  const resp = match[1]; // the captured "whatever"
  if (this.chats.includes(msg.chat.id)) {
    gany_the_bot.sendMessage(chatId, "You are already subscribed");
  } else {
    this.chats.push(chatId);
    gany_the_bot.sendMessage(chatId, "Hello stranger. " + chatId + " subscribed.");
  }
});

// gany_the_bot.on('message', (msg) => {
//   console.log("MESSAGE RECEIVED FROM " + msg.chat.id + ": " + msg);
//   // TO IMPLEMENT IN FUTURE
//   // send a message to the chat acknowledging receipt of their message
//   // gany_the_bot.sendMessage(chatId, 'Received your message');
// });

function broadcast_message(text) {
  this.chats.forEach(function(chat_id) {
    gany_the_bot.sendMessage(chat_id, text).catch((error) => {
      console.log(error.code);  // => 'ETELEGRAM'
      console.log(error.response.body); // => { ok: false, error_code: 400, description: 'Bad Request: chat not found' }
    });
  });
}
