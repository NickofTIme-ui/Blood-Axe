// node-fs-shim.js — Just enough of node:fs for logic-test.js to run in a browser
// (tests/browser.html): readFileSync of a project file, fetched synchronously.
export function readFileSync(url) {
  const req = new XMLHttpRequest();
  req.open('GET', String(url), false);
  req.send();
  if (req.status !== 200) throw new Error(`could not read ${url} (${req.status})`);
  return req.responseText;
}
