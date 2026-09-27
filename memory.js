// memory.js - baat-cheet yaad rakhna
// Simple JSON file. Chhota rakhte hain: last 20 messages.
// Baad mein isse MongoDB se replace kar sakta hai (tu jaanta hai kaise 😉)

import { readFileSync, writeFileSync, existsSync } from 'fs';

const FILE = './memory.json';
const MAX_MESSAGES = 20;

let history = [];
if (existsSync(FILE)) {
  try {
    history = JSON.parse(readFileSync(FILE, 'utf8'));
  } catch {
    history = [];
  }
}

export function addMessage(role, content) {
  history.push({ role, content });
  if (history.length > MAX_MESSAGES) history = history.slice(-MAX_MESSAGES);
  writeFileSync(FILE, JSON.stringify(history, null, 2));
}

export function getHistory() {
  return history;
}

export function clearMemory() {
  history = [];
  writeFileSync(FILE, '[]');
}
