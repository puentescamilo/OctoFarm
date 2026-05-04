module.exports = {
  async up(db, client) {
    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        const dbCollection = db.collection('printers');
        await dbCollection.updateMany(
          { printerType: { $exists: false } },
          { $set: { printerType: 'OCTOPRINT' } }
        );
      });
    } finally {
      await session.endSession();
    }
  },

  async down(db, client) {
    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        const dbCollection = db.collection('printers');
        await dbCollection.updateMany({}, { $unset: { printerType: '' } });
      });
    } finally {
      await session.endSession();
    }
  },
};
