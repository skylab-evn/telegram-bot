/**
 * Конструктор для создания книги
 * @constructor
 * @param {string} id - remider id
 * @param {string} workPlaceId - work place id
 * @param {Number} time - reminder time in minutes. E.g. 19:40 = 19*60+40
 * @param {String} label - reminder title
 * @param {Array<String>} options - reminder response options
 */

module.exports = class Reminder {
  id;
  workplaceId;
  time;
  label;
  options;

  constructor(id, workplaceId, label, time, options) {
    this.id = id;
    this.workplaceId = workplaceId;
    this.label = label;
    this.time = time;
    this.options = options;
  }

  static reminderConverter = {
    // toFirestore: (reminder) => {
    //   return {
    //     name: workplace.name,
    //   };
    // },
    fromFirestore: (snapshot, options) => {
      const data = snapshot.data(options);
      return new Reminder(
        snapshot.id,
        data.workplaceId,
        data.label,
        data.time,
        data.options
      );
    },
  };
};
