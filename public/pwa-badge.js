/** Shared home-screen badge helper for service worker (importScripts). */

(function pwaBadge(global) {
  function clampCount(count) {
    return Math.max(0, Math.min(99, Math.floor(Number(count) || 0)));
  }

  async function applyAppBadgeCount(count) {
    var nav = global.navigator;
    if (!nav || !nav.setAppBadge) return false;
    var safe = clampCount(count);
    try {
      if (safe > 0) {
        await nav.setAppBadge(safe);
      } else if (nav.clearAppBadge) {
        await nav.clearAppBadge();
      } else {
        await nav.setAppBadge(0);
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  global.BBAppBadge = {
    clampCount: clampCount,
    applyAppBadgeCount: applyAppBadgeCount,
  };
})(self);
