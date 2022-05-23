module.exports = class Workplace {
  id;
  name;

  constructor(id, name) {
    this.id = id;
    this.name = name;
  }

  // Firestore data converter
  static workplaceConverter = {
    toFirestore: (workplace) => {
      return {
        name: workplace.name,
      };
    },
    fromFirestore: (snapshot, options) => {
      const data = snapshot.data(options);
      return new Workplace(snapshot.id, data.name);
    },
  };
};

