// StartupIntro.js — Once per page launch: the UFO Technologies logo, then the opening
// cinematic, which crossfades into the title screen. "The Battle" starts on the boot stomp,
// 12.33 s into the cinematic (core/Music.js startTitleTheme), and the title screen carries it
// on. The track is loaded while the film rolls, so it does not start late.
// Browsers block sound until the player first presses a key or clicks. Then the logo waits
// on PRESS ANY KEY (a controller button does not count for the browser, so it rolls the logo
// silently with an optional button to restart with sound). The cinematic itself is silent. Escape, the button or
// controller B skips the current clip; a failed or stalled clip never blocks the game.
//
// playStartupIntro() resolves when the logo is done, so Phaser can load during the
// cinematic; introFinished resolves when the cinematic hands over (BootScene waits for it
// before starting the title screen).

import { cancelTitleTheme, prepareTitleTheme, scheduleTitleTheme, startTitleTheme } from './Music.js';

// Seconds into the cinematic: the boot shot cuts in at 12.0 and the front boot's sole hits
// the ground on frame 296 (12.33 s); the dust follows at 12.6. The track's first beat is at
// 0 s. Its start is booked on the audio clock in the last second before the stomp; failing
// that, it is started a frame early (a plain <audio> takes a moment to sound).
const STOMP_AT = 12.33;
const BOOK_WITHIN = 1;
const THEME_LEAD = 0.05;
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
  const gate = document.getElementById('intro-start');
  const silent = new URLSearchParams(location.search).has('mute');

  return new Promise((logoDone) => {
    let clip = 0;
    let video = clips[0];
    let finished = false;
    let released = false;
    let waitingForPlay = false;
    let themeStarted = false;
    let themeBooked = false;
    let gated = false; // waiting on PRESS ANY KEY
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
      theme(); // skipped before then: the title still gets its music
      video.pause(); // hold the last frame for the crossfade
      sound.hidden = true;
      skip.disabled = true;
      gate.hidden = true;
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
      gated = false;
      gate.hidden = true;
      status.textContent = '';
      waitingForPlay = false;
      lastTime = 0;
      lastProgress = performance.now();
      logoDone();
      prepareTitleTheme(); // download it now, so it is ready on the stomp
      video.muted = true;
      video.play().catch((e) => { if (e.name !== 'AbortError') finish(); }); // (a background tab pauses it; it resumes on return)
    };

    // The first key or click: play the logo with sound. (It must start inside the press, or
    // the browser blocks the sound again.)
    const ungate = (withSound) => {
      gated = false;
      waitingForPlay = false;
      gate.hidden = true;
      lastProgress = performance.now();
      video.muted = silent || !withSound;
      video.play().catch(() => {
        video.muted = true;
        video.play().catch(() => next());
      });
      if (!withSound && !silent) {
        sound.hidden = false;
        status.textContent = 'Sound is off. Play with sound to hear the intro.';
      }
    };

    listen(window, 'keydown', (event) => {
      heldKeys.add(event.code);
      if (gated && event.code !== 'Escape') {
        event.preventDefault();
        if (!event.repeat) ungate(true);
        return;
      }
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
      if (gated && event.target !== skip) { ungate(true); return; }
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
    const unbook = () => { // the film stalled before the stomp: book it again once it moves
      if (!themeBooked || themeStarted) return;
      cancelTitleTheme();
      themeBooked = false;
    };
    if (clips[1]) { listen(clips[1], 'waiting', unbook); listen(clips[1], 'pause', unbook); }
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
        else if (gated && controllers.some((p) => p.buttons?.some(pressed))) ungate(false);
        padB = b;
        if (clip === 1 && !themeStarted) {
          const left = STOMP_AT - video.currentTime;
          if (!themeBooked && left > THEME_LEAD && left < BOOK_WITHIN && !video.paused && video.readyState >= 3) {
            themeBooked = scheduleTitleTheme(left / video.playbackRate);
          }
          if (left <= (themeBooked ? 0 : THEME_LEAD)) theme();
        }
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
        gated = true;
        waitingForPlay = true; // (the stall watchdog waits too)
        gate.hidden = false;
      }
    })();
  });
}
