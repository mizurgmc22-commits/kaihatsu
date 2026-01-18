/**
 * SQLite to Firestore Migration Script
 *
 * This script reads data from the SQLite database and migrates it to Firestore.
 * Run with: npx tsx migrate-to-firestore.ts
 */

import "reflect-metadata";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  Timestamp,
} from "firebase/firestore";
import AppDataSource from "./src/data-source";
import { Equipment } from "./src/entity/Equipment";
import { EquipmentCategory } from "./src/entity/EquipmentCategory";
import { Reservation } from "./src/entity/Reservation";

// Firebase configuration (same as frontend)
const firebaseConfig = {
  apiKey: "AIzaSyAcqtL5wqF_aghHFHARDEBEIa_YckuHA8M",
  authDomain: "sazanwiz-app.firebaseapp.com",
  projectId: "sazanwiz-app",
  storageBucket: "sazanwiz-app.firebasestorage.app",
  messagingSenderId: "316947471026",
  appId: "1:316947471026:web:442284b40e204407a3c7ab",
  measurementId: "G-N0T4EFZ045",
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// ID mapping for foreign keys
const categoryIdMap = new Map<number, string>();
const equipmentIdMap = new Map<number, string>();

async function migrateCategories() {
  console.log("\n📁 Migrating categories...");
  const categoryRepo = AppDataSource.getRepository(EquipmentCategory);
  const categories = await categoryRepo.find();

  for (const cat of categories) {
    const docRef = await addDoc(collection(db, "categories"), {
      name: cat.name,
      description: cat.description || "",
      createdAt: Timestamp.fromDate(new Date(cat.createdAt)),
      updatedAt: Timestamp.fromDate(new Date(cat.updatedAt)),
    });
    categoryIdMap.set(cat.id, docRef.id);
    console.log(`  ✓ Category: ${cat.name} -> ${docRef.id}`);
  }
  console.log(`  Total: ${categories.length} categories migrated.`);
}

async function migrateEquipments() {
  console.log("\n🏥 Migrating equipment...");
  const equipmentRepo = AppDataSource.getRepository(Equipment);
  const equipments = await equipmentRepo.find({ relations: ["category"] });

  for (const eq of equipments) {
    const categoryId = eq.category ? categoryIdMap.get(eq.category.id) : null;

    const docRef = await addDoc(collection(db, "equipments"), {
      name: eq.name,
      description: eq.description || "",
      quantity: eq.quantity,
      location: eq.location || "",
      imageUrl: eq.imageUrl || "",
      isActive: eq.isActive,
      isUnlimited: eq.isUnlimited || false,
      isDeleted: eq.isDeleted || false,
      specifications: eq.specifications || {},
      categoryId: categoryId || null,
      createdAt: Timestamp.fromDate(new Date(eq.createdAt)),
      updatedAt: Timestamp.fromDate(new Date(eq.updatedAt)),
    });
    equipmentIdMap.set(eq.id, docRef.id);
    console.log(`  ✓ Equipment: ${eq.name} -> ${docRef.id}`);
  }
  console.log(`  Total: ${equipments.length} equipments migrated.`);
}

async function migrateReservations() {
  console.log("\n📅 Migrating reservations...");
  const reservationRepo = AppDataSource.getRepository(Reservation);
  const reservations = await reservationRepo.find({
    relations: ["equipment", "user"],
  });

  let count = 0;
  for (const res of reservations) {
    const equipmentId = res.equipment
      ? equipmentIdMap.get(res.equipment.id)
      : null;

    await addDoc(collection(db, "reservations"), {
      equipmentId: equipmentId || null,
      customEquipmentName: res.customEquipmentName || "",
      department: res.department,
      applicantName: res.applicantName,
      contactInfo: res.contactInfo,
      startTime: new Date(res.startTime).toISOString(),
      endTime: new Date(res.endTime).toISOString(),
      quantity: res.quantity,
      purpose: res.purpose || "",
      location: res.location || "",
      status: res.status,
      notes: res.notes || "",
      createdAt: Timestamp.fromDate(new Date(res.createdAt)),
      updatedAt: Timestamp.fromDate(new Date(res.updatedAt)),
    });
    count++;
    if (count % 10 === 0) {
      console.log(`  ... ${count} reservations processed`);
    }
  }
  console.log(`  Total: ${reservations.length} reservations migrated.`);
}

async function main() {
  console.log("🚀 Starting SQLite to Firestore migration...");
  console.log("================================================");

  try {
    // Initialize SQLite
    await AppDataSource.initialize();
    console.log("✓ SQLite database connected.");

    // Run migrations
    await migrateCategories();
    await migrateEquipments();
    await migrateReservations();

    console.log("\n================================================");
    console.log("✅ Migration completed successfully!");
    console.log("================================================");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

main();
