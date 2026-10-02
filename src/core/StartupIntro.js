// StartupIntro.js — The approved studio movie, once per page launch before Phaser.
// Browsers may block audible autoplay: try sound, then play silently with an optional
// button to restart with sound. Escape, a button, or controller B can skip safely.

export function playStartupIntro() {
  const root = document.getElementById('studio-intro');
  if (!root) return Promise.resolve();
  const video = document.getElementById('intro-video');
  const sound = document.getElementById('intro-sound');
  const skip = document.getElementById('intro-skip');
  const status = document.getElementById('intro-status');
  const silent = new URLSearchParams(location.search).has('mute');

  return new Promise((resolve) => {
    let finished = false;
    let released = false;
    let waitingForPlay = false;
    let lastTime = 0;
    let lastProgress = performance.now();
    let releaseAfter = 0;
    let raf;
    const heldKeys = new Set();
    const heldPointers = new Set();
    const listeners = [];
    const listen = (target, type, fn) => {
      target.addEventListener(type, fn, true);
      listeners.push(() => target.removeEventListener(type, fn, true));
    };
    const pads = () => {
      try { return Array.from(navigator.getGamepads?.() ?? []).filter((p) => p?.connected); }
      catch { return []; } // embedding pages can disallow gamepads
    };
    const pressed = (button) => button?.pressed || (button?.value ?? 0) > 0.5;

    const release = () => {
      if (released) return;
      released = true;
      cancelAnimationFrame(raf);
      listeners.forEach((off) => off());
      video.removeAttribute('src');
      video.load();
      root.remove();
      resolve();
    };
    const finish = () => {
      if (finished) return;
      finished = true;
      video.pause();
      video.muted = true;
      sound.hidden = true;
      skip.disabled = true;
      skip.blur();
      // Keep swallowing input until the skip gesture is released. A held button must
      // not also select a hero when the title screen creates its input manager.
      releaseAfter = performance.now() + 150;
    };
    listen(window, 'keydown', (event) => {
      heldKeys.add(event.code);
      if (finished || event.code === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.code === 'Escape') finish();
      }
    });
    listen(window, 'keyup', (event) => {
      heldKeys.delete(event.code);
      if (finished) { event.preventDefault(); event.stopImmediatePropagation(); }
    });
    listen(window, 'pointerdown', (event) => { heldPointers.add(event.pointerId); });
    const pointerUp = (event) => { heldPointers.delete(event.pointerId); };
    listen(window, 'pointerup', pointerUp);
    listen(window, 'pointercancel', pointerUp);
    listen(window, 'blur', () => { heldKeys.clear(); heldPointers.clear(); });
    listen(skip, 'click', (event) => { event.preventDefault(); event.stopPropagation(); finish(); });
    listen(video, 'ended', finish);
    listen(video, 'error', finish); // missing/unsupported media should never block the game

    listen(sound, 'click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (finished) return;
      waitingForPlay = false;
      video.muted = silent;
      video.currentTime = 0; // hear the complete sting after explicitly enabling sound
      lastTime = 0;
      lastProgress = performance.now();
      try {
        await video.play();
        if (finished) { video.pause(); return; }
        sound.hidden = true;
        status.textContent = '';
      } catch {
        if (!finished) finish();
      }
    });

    const tick = () => {
      const now = performance.now();
      const controllers = pads();
      if (finished) {
        const padHeld = controllers.some((p) => p.buttons?.some(pressed));
        if (now >= releaseAfter && !heldKeys.size && !heldPointers.size && !padHeld) { release(); return; }
      } else {
        if (controllers.some((p) => pressed(p.buttons?.[1]))) finish(); // standard B / Circle
        if (document.hidden || waitingForPlay || video.currentTime !== lastTime) lastProgress = now;
        lastTime = video.currentTime;
        if (now - lastProgress > 15000) finish(); // a failed download cannot trap startup
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    (async () => {
      video.muted = silent;
      try {
        await video.play();
        if (finished) video.pause();
      } catch (error) {
        if (finished) return;
        if (error.name !== 'NotAllowedError') { finish(); return; }
        video.muted = true;
        try {
          await video.play();
          if (finished) { video.pause(); return; }
          if (!silent) {
            sound.hidden = false;
            status.textContent = 'Sound is off. Play with sound to hear the intro.';
          }
        } catch (mutedError) {
          if (finished) return;
          if (mutedError.name !== 'NotAllowedError') { finish(); return; }
          waitingForPlay = true;
          sound.hidden = false;
          sound.textContent = silent ? 'Play intro' : 'Play with sound';
          status.textContent = 'Press Play to begin, or skip to the game.';
        }
      }
    })();
  });
}
