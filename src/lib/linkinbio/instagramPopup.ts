export interface InstagramPopupResult { status: 'ok' | 'error' | 'cancelled'; key?: string; reason?: string }

export const INSTAGRAM_POPUP_FEATURES = 'width=480,height=640';

let superseded: (() => void) | null = null;

/**
 * Runs the Instagram login in a pre-opened pop-up window and waits for it to report back.
 * The pop-up is a named window, so a retry reuses the one still open: the newer wait replaces the
 * older one, and one login reports to one caller only.
 */
export function waitForInstagramPopup(popup: Window, url: string): Promise<InstagramPopupResult> {
  superseded?.();
  return new Promise((resolve) => {
    let done = false;
    const finish = (r: InstagramPopupResult, close = true) => {
      if (done) return;
      done = true;
      if (superseded === supersede) superseded = null;
      window.removeEventListener('message', onMessage);
      clearInterval(timer);
      if (close) try { if (!popup.closed) popup.close(); } catch { /* ignore */ }
      resolve(r);
    };
    const supersede = () => finish({ status: 'cancelled' }, false);
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== popup) return;
      const d = e.data as { type?: string; status?: string; key?: string; reason?: string };
      if (d?.type !== 'instagram-connect') return;
      if (d.status === 'ok') finish(d.key ? { status: 'ok', key: d.key } : { status: 'ok' });
      else finish({ status: 'error', reason: d.reason || '' });
    };
    superseded = supersede;
    const timer = setInterval(() => { if (popup.closed) finish({ status: 'cancelled' }); }, 500);
    window.addEventListener('message', onMessage);
    popup.location.href = url;
    // A pop-up that opens behind the editor looks like nothing happened.
    try { popup.focus(); } catch { /* ignore */ }
  });
}
