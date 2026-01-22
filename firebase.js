import admin from "firebase-admin";
import { readFileSync } from "fs";
import { join } from "path";

let db;

try {
    const serviceAccountPath = join(process.cwd(), "serviceAccountKey.json");
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    }
    db = admin.firestore();
    console.log("✅ Firebase Admin initialized successfully");
} catch (error) {
    console.error("❌ Firebase Admin failed to initialize. Make sure 'serviceAccountKey.json' exists in the root.");
    console.error("⚠️ Error detail:", error.message);

    // Fallback or dummy db object to prevent crashes on routes
    db = {
        collection: () => ({
            add: async () => { console.warn("⚠️ Firebase not initialized: add() ignored"); return { id: "offline-id" }; },
            doc: () => ({
                set: async () => { console.warn("⚠️ Firebase not initialized: set() ignored"); return { success: false }; }
            })
        })
    };
}

export { db };
