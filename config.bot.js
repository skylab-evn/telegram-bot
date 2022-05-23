module.exports = {
  Token: "5330623239:AAFxo5FYfQoXjU7Bd8LzRCL_bcvB6YIkT6Y",
  timePolling: "1000",
  BotCommands: [
    { command: "/start", description: "subscribe to workplace" },
    { command: "/myworkplaces", description: "get a list of your workplaces" },
    { command: "/remind", description: "create a reminder" },
    { command: "/delete", description: "delete a list workplaces" },
    { command: "/help", description: "get help" },
  ],
  commands: {
    start: {
        msg:{
            default:{
                text: "Select the workplace you want to subscribe to"
            },
            noOption:{
                text: "There are currently no workplaces you can subscribe to",
                stickerId: "CAACAgIAAxkBAAEBFNlie6jWNC2LEgUOOiwFvZEPHXSGjQACegADwZxgDNBgXYlUQrz-JAQ"
            },
            subscribe: {
                already: "You are already following ",
                ready: "You subscribed to"
            }
        }
    },
    help: {
      description: `Here is what I can do:\n \n/start - subscribe to workplace\n\n/myworkplaces - get a list of your workplaces \n\n/help - get help`,
    },
    remind: {
      description: "",
    },
    myworkplaces: {
      msg: {
        default: {
          text: "Workplaces you are subscribed to",
        },
        noWorkplaces: {
          text: "You are not subscribed to Workplaces",
          stickerId:
            "CAACAgIAAxkBAAEBFNVie59KJFVXNeybEfQSBpEV7iXxaAACfAADwZxgDLi9T-Ocp50SJAQ",
        },
      },
    },
    other: {
      msg: {
        default: {
          text: "Ты не ответил на вопрос вовремя. \nЗа тобой уже выехали",
          stickerId: "CAACAgIAAxkBAAEBFPNifO7FSzIxlKMn6P_c5EtX8tlO-wAC9gADVp29CvfbTiFAPqWKJAQ"
        }
      }
    }
  },
};
