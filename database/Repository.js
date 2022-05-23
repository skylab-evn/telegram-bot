const {
  initializeApp,
  applicationDefault,
  cert,
} = require("firebase-admin/app");
const {
  getFirestore,
  Timestamp,
  FieldValue,
} = require("firebase-admin/firestore");
const Reminder = require("../model/Reminder");
const Workplace = require("../model/Workplace");
const serviceAccount = require("../serviceAccountKey.json");
const AnswerToReminder = require("../model/AnswerToReminder");

initializeApp({
  credential: cert(serviceAccount),
});
db = getFirestore();

class Repository {
  workplaceRef;
  constructor() {
    this.workplaceRef = db.collection("workplaces");
  }

  // =================Worplace API======================

  /**
   * This method returns all workplaces that the user is not subscribed to.
   * @param {String} userId
   * @returns {Promise<Workplace>}
   */
  async getAllWorkplacesWithoutUser(userId) {
    // Get all workplace ids subscribed to by the user
    let user_workplace = await db
      .collection("user_workplace")
      .where("userId", "==", String(userId))
      .get();

    // Get all workplaces
    const workplaces = await db
      .collection("workplaces")
      .withConverter(Workplace.workplaceConverter)
      .get();

    // Check if the user's workplaceId is included in the general list of workplaces
    return await workplaces.docs
      .filter(
        (doc) =>
          // If the worplace exists and the user is not subscribed to it, then we return an array of workspaces.
          doc.exists &&
          !user_workplace.docs.filter(
            (_doc) => _doc.data().workplaceId === doc.id
          ).length
      )
      .map((doc) => doc.data());
  }

  /**
   * This method returns all workplaces that the user is subscribed to.
   * @param {String} userId
   * @returns {Promise<Workplace>}
   */

  async getAllWorkplacesForUser(userId) {
    // Get all workplace ids subscribed to by the user
    let user_workplace = await db
      .collection("user_workplace")
      .where("userId", "==", String(userId))
      .get();

    // Get all workplaces for the user
    let workplaces = await Promise.all(
      user_workplace.docs
        .filter((doc) => doc.exists)
        .map((doc) =>
          db
            .collection("workplaces")
            .withConverter(Workplace.workplaceConverter)
            .doc(doc.data().workplaceId)
            .get()
        )
    );
    //Return the user workplaces
    return workplaces.filter((doc) => doc.exists).map((doc) => doc.data());
  }
  /**
   * This method adds a record to the database that the user subscribed to the workplace
   * @param {String} userId
   * @param {String} workplaceId
   */
  async setWorkplaceForUser(userId, workplaceId) {
    const user_workplaceRef = db.doc(`user_workplace/${userId}_${workplaceId}`);
    await user_workplaceRef.set({ userId, workplaceId });
  }

  /**
   * This method checks if the user is subscribed to the workplace
   * @param {String} userId
   * @param {String} workplaceId
   * @returns
   */
  async isWorkplaceUser(userId, workplaceId) {
    let user_workplace = await db
      .collection("user_workplace")
      .doc(`${userId}_${workplaceId}`)
      .get();
    return (
      user_workplace.exists &&
      user_workplace.data().userId === userId &&
      user_workplace.data().workplaceId
    );
  }

  /**
   * This method delete all subscription from DB
   */
  async delWorkplaces() {
    const workRef = await db.collection("user_workplace").get();
    workRef.docs.forEach((doc) => {
      console.log(doc.ref.delete());
    });
  }

  async getUserIdsForWorkplace(workplaceId) {
    const user_workplaceRef = await db
      .collection("user_workplace")
      .where("workplaceId", "==", workplaceId)
      .get();

    return user_workplaceRef.docs
      .filter((user_workplace) => user_workplace.exists)
      .map((user_workplace) => user_workplace.data().userId);
  }

  // ================= Reminder API ====================
  /**
   * This method returns all reminders that are yet to be completed.
   * @param {Number} time -time after which reminders should be completed
   * @returns {Promise<Array<Reminder>}
   */
  async getAllUpToDateReminder(time) {
    // Get all up-to-date reminders
    const reminderRef = await db
      .collection("reminders")
      .withConverter(Reminder.reminderConverter)
      .where("time", ">", time)
      .get();

    return reminderRef.docs
      .filter((reminder) => reminder.exists)
      .map((reminder) => reminder.data());
  }

  // ============== Answer to Reminder API ===============
/**
 * This method of saving to the database is the user's response to reminder
 * @param {AnswerToReminder} answer 
 */
  async setAnswerToReminder(reminderId, reminderLabel, answer, createdAt, memberId) {
    const answerToReminder = new AnswerToReminder(null, reminderId, reminderLabel, answer, createdAt, memberId);

      db.collection("answer_to_reminder")
        .withConverter(AnswerToReminder.AnswerToReminderConverter)
        .add(answerToReminder);
  }
}

module.exports = new Repository();
