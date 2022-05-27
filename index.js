const TelegramBot = require("node-telegram-bot-api");
const config = require("./config.bot");
const helper = require("./utils/helper");
const bot = new TelegramBot(config.Token, { polling: true });
const db = require("./database/Repository");

const reminderQueue = new Map();

// Process "/start" command
bot.onText(/\/start/, async (msg) => {
  const answer = config.commands.start.msg;
  let workplaces = await db.getAllWorkplacesWithoutUser(helper.getUserId(msg));
  workplaces = workplaces.filter((wplace) => wplace.name && wplace.id);
  // Если для пользователя доступны workplaces для подписки
  if (workplaces?.length) {
    bot.sendMessage(helper.getChaitId(msg), answer.default.text, {
      reply_markup: {
        inline_keyboard: workplaces
          .map((wplace) => [
            helper.getInlineKeyboardButton(wplace.name, wplace.id),
          ])
          .concat([[config.commands.start.msg.default.btn]]),
      },
    });
  } else {
    bot
      .sendSticker(helper.getChaitId(msg), answer.noOption.stickerId)
      .then((msg) => {
        bot.sendMessage(helper.getChaitId(msg), answer.noOption.text);
      });
  }
});

bot.onText(/\/myworkplaces/, async (msg) => {
  const answers = config.commands.myworkplaces.msg;
  const workplaces = await db.getAllWorkplacesForUser(helper.getUserId(msg));
  if (workplaces?.length)
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

bot.onText(/\/help/, (msg) => {
  bot.sendMessage(helper.getChaitId(msg), config.commands.help.description, {
    parse_mode: "Markdown",
  });
});

bot.onText(/\/time/, (msg) => {
  bot.sendMessage(helper.getChaitId(msg), "Time: " + new Date());
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

      if (query.data === config.commands.start.msg.default.btn.callback_data) {
        bot.deleteMessage(query.message.chat.id, query.message.message_id);
        break;
      }
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
            db.setWorkplaceForUser(helper.getUserId(query), query.data)
              .then(() => {
                bot.answerCallbackQuery(query.id, {
                  text: answer.subscribe.ready + keyboard.pressedButton.text,
                });
                bot.sendMessage(
                  query.message.chat.id,
                  answer.subscribe.already + keyboard.pressedButton.text
                );
              })
              .catch((err) => console.log(err));
          }
          bot
            .editMessageReplyMarkup(keyboard.reply_markup, {
              message_id: query.message.message_id,
              chat_id: query.message.chat.id,
            })
            .then((res) => {
              if (
                !res?.reply_markup ||
                (res.reply_markup.inline_keyboard.length === 1 &&
                  res.reply_markup.inline_keyboard[0][0].text ===
                    config.commands.start.msg.default.btn.text)
              )
                bot.deleteMessage(res.chat.id, res.message_id);
            });
        })
        .catch((err) => console.log(err));

      break;
    }
    default: {
      if (
        reminderQueue.has(query.message.text) &&
        reminderQueue.get(query.message.text).time < query.message.date
      ) {
        const value = reminderQueue.get(query.message.text);
        db.setAnswerToReminder(
          value.reminder.id,
          value.reminder.label,
          query.data,
          Date.now(),
          query.from.id
        )
          .then(() => {
            bot.editMessageText(`${query.message.text}: *${query.data}*`, {
              chat_id: query.message.chat.id,
              message_id: query.message.message_id,
              parse_mode: "Markdown",
              reply_markup: {
                inline_keyboard: [[]],
              },
            });
          })
          .catch((err) => console.log(err));
      } else {
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

(function cronUpdateReminders(
  timeout = config.timePolling,
  updateRemindersQuery = getUpToDateReminders
) {
  console.log("The server has started. Data received");
  updateRemindersQuery();
  setInterval(updateRemindersQuery, timeout);
})();

// Функция получает актуальные данные и обновляет список напоминаний
async function getUpToDateReminders() {
  // Get current time in Minutes
  const curDate = new Date();
  const curTime = curDate.getHours() * 60 + curDate.getMinutes();
  console.log("Getting a list of reminders. Time: ", curTime);

  // We go through the list of reminders and process the actual ones
  const reminders = await db.getAllUpToDateReminder(curTime);

  if (reminders?.length) {
    // Очищаем очередь запланированных задач
    reminderQueue.forEach((value) => {
      if (value?.status) clearTimeout(value?.timerId);
    });

    reminders.forEach((reminder) => cronReminder(reminder, handlerReminder));
  }
}

// Функция добавляет таску для вызова напоминания
async function cronReminder(reminder, hReminder) {
  // Get current time in Minutes
  const curDate = new Date();
  const curTime =
    (curDate.getHours() * 60 + curDate.getMinutes()) * 60 +
    curDate.getSeconds();
  // Time after which the reminder will work
  let delay = (reminder.time * 60 - curTime) * 1000;

  const workplaceName = await db.getWorkplace(reminder.workplaceId);
  reminder.label = workplaceName?.name + ": " + reminder.label;

  if (
    reminderQueue.has(reminder.label) &&
    reminderQueue.get(reminder.label).status
  )
    clearTimeout(reminderQueue.get(reminder.label).timerId);
  // Adding a Reminder to the Run Queue
  reminderQueue.set(reminder.label, {
    time: (Date.parse(curDate) + delay) / 1000,
    reminder: reminder,
    timerId: setTimeout(hReminder, delay, reminder),
    status: true,
  });
}

// Обработчик напоминания
async function handlerReminder(reminder) {
  reminderQueue.get(reminder.label).status = false;
  const users = await db.getUserIdsForWorkplace(reminder.workplaceId);
  if (users?.length) {
    users.forEach((userId) => {
      bot
        .sendSticker(
          String(userId),
          config.commands.remind.msg.queston.stickerId
        )
        .then((msg) => {
          // Sending a reminder to each user
          bot.sendMessage(String(userId), reminder.label, {
            reply_markup: {
              inline_keyboard: [
                reminder.options?.map((option) => ({
                  text: option,
                  callback_data: option,
                })) || [],
              ],
            },
          });
        });
    });
  }
}
