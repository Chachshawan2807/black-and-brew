/** Shared IndexedDB notification list for service worker + client sync. */

(function notificationStore(global) {
  const DB_NAME = 'bb-notifications-v1';
  const STORE_NAME = 'notifications';
  const LIST_KEY = 'list';
  const UNREAD_TOTAL_KEY = 'unread-total';
  const MAX = 100;

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

  function getValue(db, key) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE_NAME, 'readonly');
      var store = tx.objectStore(STORE_NAME);
      var request = store.get(key);
      request.onsuccess = function () {
        resolve(request.result);
      };
      request.onerror = function () {
        reject(request.error);
      };
    });
  }

  function setValue(db, key, value) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE_NAME, 'readwrite');
      var store = tx.objectStore(STORE_NAME);
      var request = store.put(value, key);
      request.onsuccess = function () {
        resolve();
      };
      request.onerror = function () {
        reject(request.error);
      };
    });
  }

  function getList(db) {
    return getValue(db, LIST_KEY).then(function (value) {
      return Array.isArray(value) ? value : [];
    });
  }

  function setList(db, list) {
    return setValue(db, LIST_KEY, list);
  }

  function getUnreadTotal(db) {
    return getValue(db, UNREAD_TOTAL_KEY).then(function (value) {
      return typeof value === 'number' && isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    });
  }

  function setUnreadTotal(db, count) {
    return setValue(db, UNREAD_TOTAL_KEY, Math.max(0, Math.floor(Number(count) || 0)));
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
    return [notification].concat(deduped).slice(0, MAX);
  }

  function isNewNotification(list, notification) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].logId === notification.logId) return false;
    }
    return true;
  }

  async function prependNotification(notification) {
    var db = await openDb();
    try {
      var list = await getList(db);
      var isNew = isNewNotification(list, notification);
      var next = prepend(list, notification);
      var listUnread = countUnread(next);
      var total = await getUnreadTotal(db);
      if (isNew && !notification.read) {
        total += 1;
      }
      total = Math.max(total, listUnread);
      await setList(db, next);
      await setUnreadTotal(db, total);
      return { notifications: next, unreadCount: total };
    } finally {
      db.close();
    }
  }

  async function saveNotifications(list) {
    var db = await openDb();
    try {
      await setList(db, list.slice(0, MAX));
      var listUnread = countUnread(list);
      var total = await getUnreadTotal(db);
      total = Math.max(total, listUnread);
      await setUnreadTotal(db, total);
      return total;
    } finally {
      db.close();
    }
  }

  async function getUnreadCount() {
    var db = await openDb();
    try {
      var list = await getList(db);
      var total = await getUnreadTotal(db);
      return Math.max(total, countUnread(list));
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
