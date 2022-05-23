const TelegramBot = require("node-telegram-bot-api");
const config = require("./config.bot");
const helper = require("./utils/helper");
const bot = new TelegramBot(config.Token, { polling: true });
const db = require("./database/Repository");

// Delete
let remindes = [];
const reminderQueue = new Map();
//

// Process "/start" command
bot.onText(/\/start/, (msg) => {
  const answer = config.commands.start.msg;
  db.getAllWorkplacesWithoutUser(helper.getUserId(msg))
    .then((workplaces) => {
      // Если для пользователя доступны workplaces для подписки
      if (workplaces?.length) {
        bot
          .sendMessage(helper.getChaitId(msg), answer.default.text, {
            reply_markup: {
              inline_keyboard: workplaces
                .filter((wplace) => wplace?.name && wplace?.id)
                .map((wplace) => [
                  helper.getInlineKeyboardButton(wplace.name, wplace.id),
                ]),
            },
          })
          .then((msg) => console.log(msg));
      } else {
        bot
          .sendSticker(helper.getChaitId(msg), answer.noOption.stickerId)
          .then((msg) => {
            bot.sendMessage(helper.getChaitId(msg), answer.noOption.text);
          });
      }
    })
    .catch((err) => console.log(err));
});

bot.onText(/\/myworkplaces/, (msg) => {
  const answers = config.commands.myworkplaces.msg;
  db.getAllWorkplacesForUser(helper.getUserId(msg)).then((workplaces) => {
    if (workplaces.length)
      bot.sendMessage(
        helper.getChaitId(msg),
        answers.default.text +
          workplaces.map((workplace) => "\n - *" + workplace.name + "*"),
        {
          parse_mode: "Markdown",
        }
      );
    else {
      bot
        .sendSticker(helper.getChaitId(msg), answers.noWorkplaces.stickerId)
        .then((msg) => {
          bot.sendMessage(helper.getChaitId(msg), answers.noWorkplaces.text);
        });
    }
  });
});

// bot.onText(/remind (.+) (.+)/, (msg, match) => {
//   const chatId = msg.chat.id;
//   const label = match[1];
//   const time = match[2];
//   console.log(label);
//   bot.setChatStickerSet(helper.getChaitId(msg), "HotCherry");
//   remindes.push(new Reminder(chatId, "Dafka", label, time, { label: true }));
//   remindes.push(new Reminder(chatId, "Dafka", label, time, { label: false }));
//   bot.sendMessage(chatId, "Будет сделано");
// });

bot.onText(/delete/, (msg, match) => {
  db.delWorkplaces();
});

bot.onText(/test/, (msg) => {
  Test();
});

bot.onText(/\/help/, (msg) => {
  bot.sendMessage(helper.getChaitId(msg), config.commands.help.description, {
    parse_mode: "Markdown",
  });
});

// Обработчик нажатий на callback кнопки
bot.on("callback_query", (query) => {
  const keyboard = { reply_markup: null, pressedButton: null };
  keyboard.reply_markup = {
    inline_keyboard: helper.getInlineKeyboard(query).map((row) =>
      row.filter((btn) => {
        if (btn.callback_data !== query.data) return btn;
        else keyboard.pressedButton = btn;
      })
    ),
  };

  // Обрабатываем ответ на вопрос для подписи на workplaces
  switch (query.message.text) {
    // Обрабатываем ответ на команду start
    case config.commands.start.msg.default.text: {
      const answer = config.commands.start.msg;

      // Показываем прогресс обработки нажатия
      bot.sendChatAction(query.message.chat.id, "typing");
      //Проверяем подписан ли пользователь на workplaces
      db.isWorkplaceUser(helper.getUserId(query), query.data)
        .then((result) => {
          // подписан на выбранный workplace
          if (result) {
            bot.answerCallbackQuery(query.id, {
              text: answer.subscribe.already + keyboard.pressedButton.text,
              show_alert: true,
            });
          } else {
            //Подписываем на событие
            db.setWorkplaceForUser(helper.getUserId(query), query.data).then(
              () => {
                bot.answerCallbackQuery(query.id, {
                  text: answer.subscribe.ready + keyboard.pressedButton.text,
                });
                bot.sendMessage(
                  query.message.chat.id,
                  answer.subscribe.already + keyboard.pressedButton.text
                );
              }
            );
          }
          bot
            .editMessageReplyMarkup(keyboard.reply_markup, {
              message_id: query.message.message_id,
              chat_id: query.message.chat.id,
            })
            .then((res) => {
              if (!res?.reply_markup)
                bot.deleteMessage(res.chat.id, res.message_id);
            });
        })
        .catch((err) => console.log(err));

      break;
    }
    default: {
      reminderQueue.forEach((value) => {
        //Проверяем наличие вопроса в планировщике
        if (value.reminder.label === query.message.text) {
          // Проверяем устарел ли вопрос, на который отвечают
          if (query.message.date < value.time) {
            bot
              .editMessageReplyMarkup(
                {
                  inline_keyboard: [[]],
                },
                {
                  message_id: query.message.message_id,
                  chat_id: query.message.chat.id,
                }
              )
              .then(() => {
                bot
                  .sendSticker(
                    query.message.chat.id,
                    config.commands.other.msg.default.stickerId
                  )
                  .then(() => {
                    bot.sendMessage(
                      query.message.chat.id,
                      config.commands.other.msg.default.text,
                      {
                        reply_to_message_id: query.message.message_id,
                      }
                    );
                  });
              });
          } else {
            db.setAnswerToReminder(
              value.reminder.id,
              value.reminder.label,
              query.data,
              Date.now(),
              query.from.id
            ).then(() => {
              bot.editMessageText(`${query.message.text}: *${query.data}*`, {
                chat_id: query.message.chat.id,
                message_id: query.message.message_id,
                parse_mode: "Markdown",
                reply_markup: {
                  inline_keyboard: [[]],
                },
              });
            });
          }
        }
      });

      if (!reminderQueue.size) {
        bot
          .editMessageReplyMarkup(
            {
              inline_keyboard: [[]],
            },
            {
              message_id: query.message.message_id,
              chat_id: query.message.chat.id,
            }
          )
          .then(() => {
            bot
              .sendSticker(
                query.message.chat.id,
                config.commands.other.msg.default.stickerId
              )
              .then(() => {
                bot.sendMessage(
                  query.message.chat.id,
                  config.commands.other.msg.default.text,
                  {
                    reply_to_message_id: query.message.message_id,
                  }
                );
              });
          });
      }

      break;
    }
  }
});

(function taskManager() {
  // The time after which we will poll the server for new reminders
  const timePolling = config.timePolling; // In ms

  setInterval(() => {
    // Get current time in Minutes
    const curDate = new Date();
    const curTime = curDate.getHours() * 60 + curDate.getMinutes();
    // We go through the list of reminders and process the actual ones
    db.getAllUpToDateReminder(curTime).then((reminders) => {
      if (reminders.length) {
        // Очищаем очередь запалнированных задач
        reminderQueue.forEach((value) => {
          clearTimeout(value.timerId);
        });

        reminders.forEach((reminder) => {
          // Time after which the reminder will work
          let delay = (reminder.time - curTime) * 60 * 1000;

          // Adding a Reminder to the Run Queue
          reminderQueue.set(reminder.id, {
            time: Math.floor(Date.now() / 1000 + delay - 60000),
            reminder: reminder,
            timerId: setTimeout(() => {
              db.getUserIdsForWorkplace(reminder.workplaceId).then((users) => {
                users.forEach((userId) => {
                  // Sending a reminder to each user
                  bot
                    .sendMessage(String(userId), reminder.label, {
                      reply_markup: {
                        inline_keyboard: [
                          reminder.options.map((option) => ({
                            text: option,
                            callback_data: option,
                          })),
                        ],
                      },
                    })
                    .then(() => {
                      console.log(
                        "Отправил сообщение",
                        delay,
                        reminderQueue.get(reminder.id)
                      );
                    });
                  //
                });
              });
            }, delay),
          });
          console.log("Заполнил планировщик", curTime, reminderQueue);
          //

          //
        });
      }
    });
  }, timePolling);
})();

function callReminder(reminder) {
  db.getUserIdsForWorkplace(reminder.workplaceId).then((users) => {
    users.forEach((userId) => {
      // Sending a reminder to each user
      bot
        .sendMessage(String(userId), reminder.label, {
          reply_markup: {
            inline_keyboard: [
              reminder.options.map((option) => ({
                text: option,
                callback_data: option,
              })),
            ],
          },
        })
        .then(() => {
          console.log(
            "Отправил сообщение",
            delay,
            reminderQueue.get(reminder.id)
          );
        });
      //
    });
  });
}

// 1. Если есть в reminderQueri и date query < date reminder
//default

// let count = 0;
// function callReminder(reminder) {
//   console.log("3. Получаем список пользовтелей для напоминания", ++count);
//   // We get a list of users, you need to send a reminder
//   db.getUserIdsForWorkplace(reminder.workplaceId).then((users) => {
//     console.log(users.length, users);
//     users.forEach((userId) => {
//       console.log(
//         "4. каждому пользователю отправляем напоминание",
//         reminder.id,
//         reminder.label,
//         userId
//       );
//       // Sending a reminder to each user
//       bot.sendMessage(String(userId), reminder.label, {
//         reply_markup: {
//           inline_keyboard: [
//             reminder.options.map((option) => ({
//               text: option,
//               callback_data: option,
//             })),
//           ],
//         },
//       });
//     });
//   });

// bot.on("callback_query", (query) => {
//   console.log("Обрабатываем ответ на напоминание");
//   if (query.message.text === reminder.label) {
//     console.log("Ответили на напоминание ", reminder.label);
//     db.setAnswerToReminder(
//       reminder.id,
//       reminder.label,
//       query.data,
//       Date.now(),
//       query.from.id
//     ).then(() => {
//       console.log("Пытаюсь отредактировать сообщение ответа", reminder.id);
//       bot.editMessageText(`${query.message.text}: *${query.data}*`, {
//         chat_id: query.message.chat.id,
//         message_id: query.message.message_id,
//         parse_mode: "Markdown",
//         reply_markup: {
//           inline_keyboard: [[]],
//         },
//       });
//       console.log(" Ответ получили, давайте удалием напоминание из очереди");
//       delete reminderQueue[reminder.id];
//       if (reminderQueue[reminder.id]) {
//         delete reminderQueue[reminder.id];
//       }
//       console.log("Удалили", reminderQueue);
//     });
//   }
// });
// }
