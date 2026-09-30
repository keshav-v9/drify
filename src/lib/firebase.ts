import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported, logEvent, type Analytics } from "firebase/analytics";

// Firebase web config is public by design (safe to ship in client code).
const firebaseConfig = {
  apiKey: "AIzaSyCpBYFSY0uD1aymdAbKiSfFPDDBXNA-Dpk",
  authDomain: "drify-66bc1.firebaseapp.com",
  projectId: "drify-66bc1",
  storageBucket: "drify-66bc1.firebasestorage.app",
  messagingSenderId: "719538505896",
  appId: "1:719538505896:web:6b64750342011798829a9d",
  measurementId: "G-PCYVP1V1TW",
};

export const firebaseApp = initializeApp(firebaseConfig);

let analytics: Analytics | null = null;
const ready = isSupported()
  .then((ok) => {
    if (ok) analytics = getAnalytics(firebaseApp);
  })
  .catch(() => {});

export const trackPageView = (path: string) => {
  ready.then(() => {
    if (analytics) logEvent(analytics, "page_view", { page_path: path });
  });
};
