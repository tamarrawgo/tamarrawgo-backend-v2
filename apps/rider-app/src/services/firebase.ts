import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, push, onChildAdded, off, remove } from 'firebase/database';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyCnb-i5yFMt-_PQBv6iqmPE2im_ygkL_Lk',
  authDomain: 'tamarrawgov2.firebaseapp.com',
  databaseURL: 'https://tamarrawgov2-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'tamarrawgov2',
  storageBucket: 'tamarrawgov2.firebasestorage.app',
  messagingSenderId: '963988729685',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(app);

// ── Phone Auth (via @react-native-firebase/auth) ─────────────────────────────
// Module-level confirmation result so verify-otp screen can confirm without
// re-triggering the OTP send (same pattern as pending-docs singleton).
let _pendingConfirmation: FirebaseAuthTypes.ConfirmationResult | null = null;

export const sendPhoneOtp = async (phone: string): Promise<void> => {
  _pendingConfirmation = await auth().signInWithPhoneNumber(phone);
};

export const confirmPhoneOtp = async (code: string): Promise<string> => {
  if (!_pendingConfirmation) throw new Error('No pending verification. Please tap Resend.');
  const result = await _pendingConfirmation.confirm(code);
  if (!result?.user) throw new Error('Verification failed. Please try again.');
  const idToken = await result.user.getIdToken();
  _pendingConfirmation = null;
  return idToken;
};

export const resendPhoneOtp = async (phone: string): Promise<void> => {
  _pendingConfirmation = await auth().signInWithPhoneNumber(phone);
};

// ── Realtime Database (chat) ──────────────────────────────────────────────────
export const sendChatMessage = async (bookingId: string, message: {
  senderId: string;
  senderRole: string;
  message: string;
}) => {
  const chatRef = ref(db, `chats/${bookingId}`);
  await push(chatRef, { ...message, timestamp: Date.now() });
};

export const listenToChat = (
  bookingId: string,
  onMessage: (msg: { id: string; senderId: string; senderRole: string; message: string; timestamp: number }) => void
) => {
  const chatRef = ref(db, `chats/${bookingId}`);
  onChildAdded(chatRef, (snapshot) => {
    const data = snapshot.val();
    if (data) onMessage({ id: snapshot.key!, ...data });
  });
  return () => off(chatRef, 'child_added');
};

export const deleteChatSession = async (bookingId: string) => {
  try { await remove(ref(db, `chats/${bookingId}`)); } catch {}
};
