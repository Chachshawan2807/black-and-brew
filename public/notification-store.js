/** Shared IndexedDB notification list for service worker + client sync. */

(function notificationStore(global) {
  const DB_NAME = 'bb-notifications-v1';
  const STORE_NAME = 'notifications';
  const LIST_KEY = 'list';
  const MAX = 50;

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

  function getList(db) {
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

  function setList(db, list) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE_NAME, 'readwrite');
      var store = tx.objectStore(STORE_NAME);
      var request = store.put(list, LIST_KEY);
      request.onsuccess = function () {
        resolve();
      };
      request.onerror = function () {
        reject(request.error);
      };
    });
  }

  function countUnread(list) {
    var count = 0;
    for (var i = 0; i < list.length; i++) {
      if (!list[i].read) count += 1;
    }
    return count;
  }

  function prepend(list, notification) {
    var deduped = [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].logId !== notification.logId) deduped.push(list[i]);
    }
    var next = [notification].concat(deduped).slice(0, MAX);
    return next;
  }

  async function prependNotification(notification) {
    var db = await openDb();
    try {
      var list = await getList(db);
      var next = prepend(list, notification);
      await setList(db, next);
      return { notifications: next, unreadCount: countUnread(next) };
    } finally {
      db.close();
    }
  }

  async function saveNotifications(list) {
    var db = await openDb();
    try {
      await setList(db, list.slice(0, MAX));
      return countUnread(list);
    } finally {
      db.close();
    }
  }

  async function getUnreadCount() {
    var db = await openDb();
    try {
      var list = await getList(db);
      return countUnread(list);
    } finally {
      db.close();
    }
  }

  global.BBNotificationStore = {
    prependNotification: prependNotification,
    saveNotifications: saveNotifications,
    countUnread: countUnread,
    getUnreadCount: getUnreadCount,
  };
})(self);
