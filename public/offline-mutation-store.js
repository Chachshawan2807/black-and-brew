/** Shared IndexedDB offline mutation queue for service worker + client sync. */

(function offlineMutationStore(global) {
  const DB_NAME = 'bb-offline-mutations-v1';
  const STORE_NAME = 'mutations';
  const LIST_KEY = 'queue';

  function openDb() {
    return new Promise(function (resolve, reject) {
      var request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = function () {
        var db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = function () {
        resolve(request.result);
      };
      request.onerror = function () {
        reject(request.error);
      };
    });
  }

  function readQueue(db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE_NAME, 'readonly');
      var store = tx.objectStore(STORE_NAME);
      var request = store.get(LIST_KEY);
      request.onsuccess = function () {
        var value = request.result;
        resolve(Array.isArray(value) ? value : []);
      };
      request.onerror = function () {
        reject(request.error);
      };
    });
  }

  function writeQueue(db, queue) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE_NAME, 'readwrite');
      var store = tx.objectStore(STORE_NAME);
      var request = store.put(queue, LIST_KEY);
      request.onsuccess = function () {
        resolve();
      };
      request.onerror = function () {
        reject(request.error);
      };
    });
  }

  async function peekMutation() {
    var db = await openDb();
    try {
      var queue = await readQueue(db);
      return queue.length > 0 ? queue[0] : null;
    } finally {
      db.close();
    }
  }

  async function removeMutation(id) {
    var db = await openDb();
    try {
      var queue = await readQueue(db);
      await writeQueue(
        db,
        queue.filter(function (entry) {
          return entry.id !== id;
        }),
      );
    } finally {
      db.close();
    }
  }

  async function listMutations() {
    var db = await openDb();
    try {
      return await readQueue(db);
    } finally {
      db.close();
    }
  }

  global.BBOfflineMutationStore = {
    peekMutation: peekMutation,
    removeMutation: removeMutation,
    listMutations: listMutations,
  };
})(self);
