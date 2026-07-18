import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// Save one completed test result under the signed-in user's own subcollection:
//   users/{uid}/results/{autoId}
export async function saveResult(uid, data) {
  const ref = collection(db, "users", uid, "results");
  return addDoc(ref, {
    ...data,
    createdAt: serverTimestamp(),
  });
}

// Fetch a user's full history, newest first.
export async function fetchHistory(uid) {
  const ref = collection(db, "users", uid, "results");
  const q = query(ref, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Delete one result from the signed-in user's history.
export async function deleteResult(uid, resultId) {
  return deleteDoc(doc(db, "users", uid, "results", resultId));
}

// Turn a raw Firebase error into a clear, actionable message for the UI.
export function describeFirestoreError(e) {
  const code = e?.code || "";
  if (code === "permission-denied") {
    return "Permission denied by Firestore. Publish the rules from firestore.rules in the Firebase console (Firestore → Rules), and make sure you are signed in.";
  }
  if (code === "unavailable") {
    return "Could not reach Firestore. Check your internet connection and that the Firestore database has been created.";
  }
  if (code === "failed-precondition") {
    return "Firestore needs a moment to set up (or an index is building). Try again shortly.";
  }
  return e?.message || "Something went wrong while loading your data.";
}
