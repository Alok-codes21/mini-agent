// tasks/index.js - task registry
// Naya task add karna hai toh:
//   1. tasks/ mein ek file banao (read-site.js jaisi)
//   2. Yahan import karke tasks object mein daal do
// Bas. Bot khud /tasks aur /task <naam> mein dikha dega.

import readSite from './read-site.js';
import yt from './yt.js';

export const tasks = {
  readsite: readSite,
  yt: yt,
  // apne naye tasks yahan add kar
};

export async function runTask(name, input) {
  return tasks[name].run(input);
}
