/**
 * Конструктор для создания книги
 * @constructor
 * @param {string} id - answer id
 * @param {string} reminderId - reminder Id
 * @param {string} reminderLabel - reminder label
 * @param {String} answer - answer to reminder
 * @param {string} createdAt - date the response was created
 * @param {string} memberId - id of the user who answered
 */
module.exports = class AnswerToReminder {
  id;
  reminderId;
  reminderLabel;
  answer;
  createdAt;
  memberId;

  constructor(id, reminderId, reminderLabel, answer, createdAt, memberId) {
    this.id = id;
    this.reminderId = reminderId;
    this.reminderLabel = reminderLabel;
    this.answer = answer;
    this.createdAt = createdAt;
    this.memberId = memberId;
  }

  static AnswerToReminderConverter = {
    toFirestore: (answer) => {
      return {
        reminderid: answer.reminderId,
        reminderLabel: answer.reminderLabel,
        answer: answer.answer,
        createdAt: answer.createdAt,
        memberId: answer.memberId,
      };
    },
    fromFirestore: (snapshot, options) => {
      const data = snapshot.data(options);
      return new Reminder(
        snapshot.id,
        data.reminderId,
        data.reminderLabel,
        data.answer,
        data.createdAt,
        data.memberId
      );
    },
  };
};
