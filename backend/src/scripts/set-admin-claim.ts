/**
 * Script to set admin custom claim for a Firebase user
 * Usage: npm run set-admin-claim -- <email>
 */

import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

async function setAdminClaim(email: string): Promise<void> {
  try {
    // Get user by email
    const user = await admin.auth().getUserByEmail(email);
    console.log(`Found user: ${user.uid} (${user.email})`);
    
    // Set custom claims
    await admin.auth().setCustomUserClaims(user.uid, {
      role: 'admin',
    });
    
    console.log(`Successfully set admin role for ${email}`);
    console.log('Note: The user needs to sign out and sign in again for the new claims to take effect.');
    
    // Verify the claims were set
    const updatedUser = await admin.auth().getUser(user.uid);
    console.log('Current custom claims:', updatedUser.customClaims);
  } catch (error) {
    console.error('Error setting admin claim:', error);
    throw error;
  }
}

async function listAdmins(): Promise<void> {
  try {
    console.log('Listing users with admin role...\n');
    
    const listUsersResult = await admin.auth().listUsers(1000);
    const admins = listUsersResult.users.filter(
      user => user.customClaims?.role === 'admin'
    );
    
    if (admins.length === 0) {
      console.log('No admin users found.');
    } else {
      console.log('Admin users:');
      admins.forEach(user => {
        console.log(`  - ${user.email} (${user.uid})`);
      });
    }
  } catch (error) {
    console.error('Error listing admins:', error);
    throw error;
  }
}

async function removeAdminClaim(email: string): Promise<void> {
  try {
    const user = await admin.auth().getUserByEmail(email);
    console.log(`Found user: ${user.uid} (${user.email})`);
    
    // Remove admin role
    await admin.auth().setCustomUserClaims(user.uid, {
      role: 'user',
    });
    
    console.log(`Successfully removed admin role from ${email}`);
  } catch (error) {
    console.error('Error removing admin claim:', error);
    throw error;
  }
}

// Main execution
const args = process.argv.slice(2);
const command = args[0];
const email = args[1];

if (command === 'list') {
  listAdmins()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else if (command === 'remove' && email) {
  removeAdminClaim(email)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else if (command && !email) {
  // If only one argument, treat it as email for setting admin
  setAdminClaim(command)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else if (email) {
  setAdminClaim(email)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else {
  console.log(`
Firebase Admin Claim Management Script

Usage:
  npm run set-admin-claim -- <email>           Set admin role for user
  npm run set-admin-claim -- list              List all admin users
  npm run set-admin-claim -- remove <email>    Remove admin role from user

Examples:
  npm run set-admin-claim -- admin@example.com
  npm run set-admin-claim -- list
  npm run set-admin-claim -- remove user@example.com
`);
  process.exit(0);
}
