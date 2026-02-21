const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function run() {
  const snapshot = await db.collection('reservations').get();
  const batch = db.batch();
  let count = 0;

  snapshot.forEach(doc => {
    const data = doc.data();
    const updates = {};
    let needsUpdate = false;

    if (typeof data.startTime === 'string') {
      updates.startTime = admin.firestore.Timestamp.fromDate(new Date(data.startTime));
      needsUpdate = true;
    }
    if (typeof data.endTime === 'string') {
      updates.endTime = admin.firestore.Timestamp.fromDate(new Date(data.endTime));
      needsUpdate = true;
    }

    if (needsUpdate) {
      batch.update(doc.ref, updates);
      count++;
    }
  });

  if (count > 0) {
    await batch.commit();
    console.log(`Updated ${count} reservations to use Timestamps.`);
  } else {
    console.log('No reservations needed updating.');
  }
}
run().then(() => process.exit(0)).catch(console.error);
