const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function run() {
  const doc = await db.collection('reservations').doc('uF6VVMy5o2X5db9KgnVc').get();
  const data = doc.data();
  console.log('startTime type:', typeof data.startTime, data.startTime.constructor.name);
  console.log('startTime value:', data.startTime);
  process.exit(0);
}
run();
