import * as admin from "firebase-admin";
import path from "path";
import fs from "fs";

// サービスアカウントキーのパスを解決
const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  path.join(__dirname, "..", "..", "serviceAccountKey.json");

if (!fs.existsSync(serviceAccountPath)) {
  console.error(
    `Firebase service account key not found at: ${serviceAccountPath}`
  );
  console.error(
    "Please download the service account key from Firebase Console and place it at the path above."
  );
  process.exit(1);
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const serviceAccount = JSON.parse(
  fs.readFileSync(serviceAccountPath, "utf-8")
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const db = admin.firestore();
export default admin;
