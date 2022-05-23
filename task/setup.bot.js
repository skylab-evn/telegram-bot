const TelegramBot = require("node-telegram-bot-api");
const config = require("../config.bot");
const bot = new TelegramBot(config.Token, { polling: true });

bot.setMyCommands(config.BotCommands);