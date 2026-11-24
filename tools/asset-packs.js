// asset-packs.js - inlined into the itch build's index.html by tools/build-release.py.
// Not used when playing from the repo (no window.ASSET_PACKS there).
//
// itch.io refuses an HTML zip with more than 1000 files, so the release build glues the
// ~225 sound effects and the small UI pictures into a few ".pack" files
// (assets/packs/*.pack). This script fetches those packs as soon as the page opens,
// cuts each back into its own file in memory (a blob: URL), and teaches Phaser's
// loader to use that blob when the game asks for the original path, e.g.
// this.load.audio('heroRoll', 'assets/audio/sfx/hero-roll.wav') still just works.
// If a pack can't be fetched, the game falls back to the original path (missing in the
// release, so that one sound or picture is skipped, the same as any missing file).
(function () {
  var packs = window.ASSET_PACKS;
  if (!packs || !window.Phaser) return;
  var blobUrl = {};   // original path -> blob: URL
  var inPack = {};    // original path -> the promise of its pack
  Object.keys(packs).forEach(function (name) {
    var pack = packs[name];
    var ready = fetch(pack.file)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(function (buf) {
        Object.keys(pack.entries).forEach(function (path) {
          var e = pack.entries[path];
          blobUrl[path] = URL.createObjectURL(new Blob([buf.slice(e[0], e[0] + e[1])], { type: e[2] }));
        });
      })
      .catch(function (err) { console.warn('asset pack ' + pack.file + ' failed:', err); });
    Object.keys(pack.entries).forEach(function (path) { inPack[path] = ready; });
  });
  function strip(url) { return url.replace(/^\.\//, ''); }
  function wrap(proto) {
    if (!proto || !Object.prototype.hasOwnProperty.call(proto, 'load')) return;
    var load = proto.load;
    proto.load = function () {
      var file = this;
      var path = typeof file.url === 'string' ? strip((file.loader && file.loader.path || '') + file.url) : null;
      if (!path || !inPack[path]) return load.apply(file, arguments);
      var args = arguments;
      inPack[path].then(function () {
        if (blobUrl[path]) file.url = blobUrl[path];
        load.apply(file, args);
      });
    };
  }
  var L = Phaser.Loader, T = L.FileTypes || {};
  wrap(L.File && L.File.prototype);
  wrap(T.ImageFile && T.ImageFile.prototype);
  wrap(T.AudioFile && T.AudioFile.prototype);
  wrap(T.HTML5AudioFile && T.HTML5AudioFile.prototype);
  window.assetPackUrl = function (path) { return blobUrl[strip(path)] || path; };
})();
