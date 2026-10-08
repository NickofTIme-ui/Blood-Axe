// StartupIntro.js — Once per page launch: the UFO Technologies logo, then the opening
// cinematic, which crossfades into the title screen. "The Battle" starts 7 s into the
// cinematic (core/Music.js startTitleTheme) and the title screen carries it on.
// Browsers may block audible autoplay: the logo tries sound, then plays silently with an
// optional button to restart with sound. The cinematic is silent. Escape, the button or
// controller B skips the current clip; a failed or stalled clip never blocks the game.
//
// playStartupIntro() resolves when the logo is done, so Phaser can load during the
// cinematic; introFinished resolves when the cinematic hands over (BootScene waits for it
// before starting the title screen).

import { startTitleTheme } from './Music.js';

const THEME_AT = 7;   // seconds into the cinematic
const FADE_MS = 1400; // cinematic -> title crossfade (as long as the title's own fade-in)

let handOver;
export const introFinished = new Promise((resolve) => { handOver = resolve; });

export function playStartupIntro() {
  const root = document.getElementById('studio-intro');
  if (!root) { handOver(); return Promise.resolve(); }
  const clips = [document.getElementById('intro-video'), document.getElementById('cinematic-video')];
  const sound = document.getElementById('intro-sound');
  const skip = document.getElementById('intro-skip');
  const status = document.getElementById('intro-status');
  const silent = new URLSearchParams(location.search).has('mute');

  return new Promise((logoDone) => {
    let clip = 0;
    let video = clips[0];
    let finished = false;
    let released = false;
    let waitingForPlay = false;
    let themeStarted = false;
    let padB = false;
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
    const theme = () => { themeStarted = true; startTitleTheme(); };

    const unload = (v) => { v.pause(); v.removeAttribute('src'); v.load(); };
    const release = () => {
      if (released) return;
      released = true;
      cancelAnimationFrame(raf);
      listeners.forEach((off) => off());
      handOver();
      root.style.transition = `opacity ${FADE_MS}ms ease-in-out`;
      root.style.opacity = '0';
      setTimeout(() => { clips.forEach(unload); root.remove(); }, FADE_MS);
    };
    const finish = () => {
      if (finished) return;
      finished = true;
      theme(); // skipped before 7 s: the title still gets its music
      video.pause(); // hold the last frame for the crossfade
      sound.hidden = true;
      skip.disabled = true;
      skip.blur();
      status.textContent = '';
      logoDone(); // (if the logo itself failed)
      // Keep swallowing input until the skip gesture is released. A held button must
      // not also select a hero when the title screen creates its input manager.
      releaseAfter = performance.now() + 150;
    };
    // The logo is over (ended, skipped or failed): start the engine loading and roll the film.
    const next = () => {
      if (finished) return;
      if (clip === 1 || !clips[1]) { finish(); return; }
      unload(video);
      clip = 1;
      video = clips[1];
      clips[0].hidden = true;
      video.hidden = false;
      sound.hidden = true;
      status.textContent = '';
      waitingForPlay = false;
      lastTime = 0;
      lastProgress = performance.now();
      logoDone();
      video.muted = true;
      video.play().catch((e) => { if (e.name !== 'AbortError') finish(); }); // (a background tab pauses it; it resumes on return)
    };

    listen(window, 'keydown', (event) => {
      heldKeys.add(event.code);
      if (finished || event.code === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.code === 'Escape' && !event.repeat) next();
      }
      if (themeStarted) startTitleTheme(); // retries a play the browser blocked
    });
    listen(window, 'keyup', (event) => {
      heldKeys.delete(event.code);
      if (finished) { event.preventDefault(); event.stopImmediatePropagation(); }
    });
    listen(window, 'pointerdown', (event) => {
      heldPointers.add(event.pointerId);
      if (themeStarted) startTitleTheme();
    });
    const pointerUp = (event) => { heldPointers.delete(event.pointerId); };
    listen(window, 'pointerup', pointerUp);
    listen(window, 'pointercancel', pointerUp);
    listen(window, 'blur', () => { heldKeys.clear(); heldPointers.clear(); });
    listen(document, 'visibilitychange', () => {
      if (!document.hidden && !finished && clip === 1 && video.paused) video.play().catch(() => {});
    });
    listen(skip, 'click', (event) => { event.preventDefault(); event.stopPropagation(); next(); });
    for (const v of clips) {
      if (!v) continue;
      listen(v, 'ended', () => { if (v === video) next(); });
      listen(v, 'error', () => { if (v === video) next(); }); // missing/unsupported media
    }

    listen(sound, 'click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (finished || clip !== 0) return;
      waitingForPlay = false;
      video.muted = silent;
      video.currentTime = 0; // hear the complete sting after explicitly enabling sound
      lastTime = 0;
      lastProgress = performance.now();
      try {
        await video.play();
        if (finished || clip !== 0) { video.pause(); return; }
        sound.hidden = true;
        status.textContent = '';
      } catch {
        if (clip === 0) next();
      }
    });

    const tick = () => {
      const now = performance.now();
      const controllers = pads();
      if (finished) {
        const padHeld = controllers.some((p) => p.buttons?.some(pressed));
        if (now >= releaseAfter && !heldKeys.size && !heldPointers.size && !padHeld) { release(); return; }
      } else {
        const b = controllers.some((p) => pressed(p.buttons?.[1])); // standard B / Circle
        if (b && !padB) next();
        padB = b;
        if (clip === 1 && !themeStarted && video.currentTime >= THEME_AT) theme();
        if (document.hidden || waitingForPlay || video.currentTime !== lastTime) lastProgress = now;
        lastTime = video.currentTime;
        if (now - lastProgress > 15000) next(); // a failed download cannot trap startup
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    (async () => {
      video.muted = silent;
      try {
        await video.play();
        if (clip !== 0) clips[0].pause();
      } catch (error) {
        if (clip !== 0) return;
        if (error.name !== 'NotAllowedError') { next(); return; }
        video.muted = true;
        try {
          await video.play();
          if (clip !== 0) { clips[0].pause(); return; }
          if (!silent) {
            sound.hidden = false;
            status.textContent = 'Sound is off. Play with sound to hear the intro.';
          }
        } catch (mutedError) {
          if (clip !== 0) return;
          if (mutedError.name !== 'NotAllowedError') { next(); return; }
          waitingForPlay = true;
          sound.hidden = false;
          sound.textContent = silent ? 'Play intro' : 'Play with sound';
          status.textContent = 'Press Play to begin, or skip to the game.';
        }
      }
    })();
  });
}
