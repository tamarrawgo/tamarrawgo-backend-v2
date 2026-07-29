import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, push, onChildAdded, off, remove } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyDFX2Kma9nfxWaE4dasRR7eIGgo613VOA4',
  authDomain: 'tamarrawgov2.firebaseapp.com',
  databaseURL: 'https://tamarrawgov2-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'tamarrawgov2',
  storageBucket: 'tamarrawgov2.firebasestorage.app',
  messagingSenderId: '963988729685',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(app);

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
