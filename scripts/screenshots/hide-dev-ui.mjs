/** Hide Next.js dev overlays (e.g. "Rendering...") during capture only. */
export async function hideDevOverlays(page) {
  await page.addStyleTag({
    content: `
      nextjs-portal,
      [data-nextjs-dev-tools-button],
      [data-nextjs-dev-tools-menu],
      [data-nextjs-toast],
      #__next-build-watcher {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
    `,
  });

  await page.evaluate(() => {
    document.querySelectorAll('nextjs-portal').forEach((el) => el.remove());

    const hideFixedRenderingBadge = () => {
      for (const el of document.querySelectorAll('body *')) {
        if (el.children.length > 0) continue;
        const text = (el.textContent ?? '').trim();
        if (text !== 'Rendering...' && !/^Rendering\.{0,3}$/.test(text)) continue;
        let node = el;
        for (let i = 0; i < 6 && node; i++) {
          const style = window.getComputedStyle(node);
          if (style.position === 'fixed' || style.position === 'sticky') {
            node.style.setProperty('display', 'none', 'important');
            break;
          }
          node = node.parentElement;
        }
      }
    };

    hideFixedRenderingBadge();
  });
}
