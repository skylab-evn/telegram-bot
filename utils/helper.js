module.exports = {
  getChaitId: (msg) => String(msg.chat.id),
  getUserId: (msg) => String(msg.from.id),
  getInlineKeyboardButton: (text, callback_data, ...btn) => ({
    text: text,
    callback_data: callback_data,
  }),
  getInlineKeyboard: (query) =>
    query.message.reply_markup.inline_keyboard,
};
