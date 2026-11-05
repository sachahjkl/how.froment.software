// Marks in the contents the position being read. Without this script the contents still work, nothing is highlighted.
(function () {
  var toc = document.querySelector(".toc");
  if (!toc) { return; }
  var links = {};
  toc.querySelectorAll('a[href^="#"]').forEach(function (a) { links[a.getAttribute("href").slice(1)] = a; });
  var sections = Array.prototype.slice.call(document.querySelectorAll("section[id]")).filter(function (s) { return links[s.id]; });
  var current = null, pending = false;

  function update() {
    pending = false;
    var line = window.innerHeight * 0.3, found = null;
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].getBoundingClientRect().top > line) { break; }
      found = links[sections[i].id];
    }
    if (found === current) { return; }
    if (current) { current.removeAttribute("aria-current"); }
    current = found;
    if (!current) { return; }
    current.setAttribute("aria-current", "true");
    // the contents scroll on their own on a short window; moved by hand, as scrollIntoView would move the page too
    if (toc.scrollHeight > toc.clientHeight) {
      var a = current.getBoundingClientRect(), box = toc.getBoundingClientRect();
      if (a.top < box.top || a.bottom > box.bottom) { toc.scrollTop += a.top - box.top - box.height / 2; }
    }
  }
  function ask() { if (!pending) { pending = true; requestAnimationFrame(update); } }

  window.addEventListener("scroll", ask, { passive: true });
  window.addEventListener("resize", ask);
  window.addEventListener("load", ask);   // (the diagrams change the height of the page)
  update();
})();
