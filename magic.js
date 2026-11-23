// Header video and moving lights, ported from woz.lol and kept light.
// Everything pauses while off screen or in a hidden tab, and none of it starts
// when the visitor asks for reduced motion or data saving.
(function () {
  var hero = document.querySelector('.hero');
  var band = document.querySelector('.web-section');
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    (navigator.connection && navigator.connection.saveData);
  if (calm || !('IntersectionObserver' in window)) return;

  var heroVisible = false;
  var bandVisible = false;

  // Button pulse in the hero only runs while the hero is on screen
  function setHeroLive() { if (hero) hero.classList.toggle('is-live', heroVisible && !document.hidden); }

  // ---- Header video: three clips from woz.lol, one at a time, cross fading every 5.5 seconds
  var clips = [
    'https://woz.lol/wp-content/themes/wozlol/assets/video/header-1.mp4',
    'https://woz.lol/wp-content/themes/wozlol/assets/video/header-2.mp4',
    'https://woz.lol/wp-content/themes/wozlol/assets/video/header-3.mp4'
  ];
  var poster = 'https://woz.lol/wp-content/themes/wozlol/assets/images/woz-header-poster.jpg';
  var videos = [];
  var current = -1;
  var timer = null;

  function start(i) {
    var v = videos[i];
    if (!v.getAttribute('src')) v.src = v.dataset.src;
    v.currentTime = 0;
    var p = v.play();
    if (p && p.catch) p.catch(function () {});
    var onPlaying = function () {
      v.removeEventListener('playing', onPlaying);
      var old = current;
      current = i;
      v.classList.add('is-on');
      if (old >= 0 && old !== i) {
        videos[old].classList.remove('is-on');
        setTimeout(function () { if (current !== old) videos[old].pause(); }, 800);
      }
      if (!timer) timer = setInterval(next, 5500);
    };
    v.addEventListener('playing', onPlaying);
  }

  function next() {
    if (!heroVisible || document.hidden) return;
    start((current + 1) % videos.length);
  }

  function syncVideo() {
    if (current < 0) return;
    var v = videos[current];
    if (heroVisible && !document.hidden) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    else v.pause();
  }

  if (hero) {
    var wrap = document.createElement('div');
    wrap.className = 'hero-video';
    clips.forEach(function (src, i) {
      var v = document.createElement('video');
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      v.setAttribute('muted', '');
      v.setAttribute('playsinline', '');
      v.setAttribute('aria-hidden', 'true');
      v.setAttribute('poster', poster);
      v.preload = i === 0 ? 'auto' : 'none';
      v.dataset.src = src;
      wrap.appendChild(v);
      videos.push(v);
    });
    hero.insertBefore(wrap, hero.firstChild);
    start(0);
    new IntersectionObserver(function (e) {
      heroVisible = e[0].isIntersecting;
      setHeroLive();
      syncVideo();
    }).observe(hero);
  }

  // ---- Fabric band lights: six spotlights drift on slow cycles of 37 to 83 seconds, painted from a timer
  if (band) {
    // start %, end % and seconds to get there (it then comes back), the first 8 are the teal and magenta lights, the last 4 the two shades
    var P = [[18,70,43],[40,75,59],[78,22,47],[60,30,61],[48,88,37],[30,70,53],[62,15,41],[75,35,67],[35,75,71],[55,30,79],[85,20,73],[35,70,83]];
    var STEP = 80, t0 = performance.now(), tick_t = 0, due = 0, late = [], stopped = false;
    var at = function (i, t) {
      var p = P[i];
      return (p[0] + (p[1] - p[0]) * (0.5 - 0.5 * Math.cos(Math.PI * t / (p[2] * 1000)))).toFixed(1) + '%';
    };
    var paint = function (t) {
      var v = [];
      for (var i = 0; i < 12; i++) v.push(at(i, t));
      band.style.setProperty('--woz-lights',
        'radial-gradient(circle 300px at ' + v[8] + ' ' + v[9] + ',rgba(0,0,0,.34),rgba(0,0,0,0) 100%),' +
        'radial-gradient(circle 260px at ' + v[10] + ' ' + v[11] + ',rgba(0,0,0,.3),rgba(0,0,0,0) 100%),' +
        'radial-gradient(circle 330px at ' + v[0] + ' ' + v[1] + ',rgba(0,225,200,.34),rgba(0,225,200,.14) 50%,rgba(0,225,200,0) 100%),' +
        'radial-gradient(circle 360px at ' + v[2] + ' ' + v[3] + ',rgba(255,45,190,.34),rgba(255,45,190,.14) 50%,rgba(255,45,190,0) 100%),' +
        'radial-gradient(circle 200px at ' + v[4] + ' ' + v[5] + ',rgba(255,45,190,.26),rgba(255,45,190,0) 100%),' +
        'radial-gradient(circle 220px at ' + v[6] + ' ' + v[7] + ',rgba(0,225,200,.26),rgba(0,225,200,0) 100%)');
    };
    var go = function () {
      if (!tick_t && !stopped && bandVisible && !document.hidden) {
        due = performance.now() + STEP;
        tick_t = setTimeout(tick, STEP);
      }
    };
    var tick = function () {
      tick_t = 0;
      if (stopped || !bandVisible || document.hidden) return;
      var now = performance.now();
      // A busy machine fires the timer late. If the median is over 60 ms late, stand down and leave the lights resting.
      if (now - t0 > 2500 && late.length < 40) {
        late.push(now - due);
        if (late.length === 40) {
          late.sort(function (a, b) { return a - b; });
          if (late[20] > 60) { stopped = true; return; }
        }
      }
      paint(now - t0);
      due = now + STEP;
      tick_t = setTimeout(tick, STEP);
    };
    new IntersectionObserver(function (e) {
      bandVisible = e[0].isIntersecting;
      if (bandVisible) go();
    }, { rootMargin: '100px 0px' }).observe(band);
    document.addEventListener('visibilitychange', go);
  }

  document.addEventListener('visibilitychange', function () { setHeroLive(); syncVideo(); });
})();

// Button lean toward the cursor, quick stretch on entering and a different wobble on leaving. Copied from woz.lol. Two additions: the selector also takes the web card buttons, and the clickable images are wrapped so they move the same way.
(function () {
    if (!window.Element || !Element.prototype.animate) return;
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    function rnd(min, max) { return min + Math.random() * (max - min); }
    function clamp(v) { return Math.max(-1, Math.min(1, v)); }

    // Pose of a button leaning toward the cursor, k is the strength (1 is the held pose)
    function pose(dx, dy, k) {
        return 'translate(' + (dx * 5 * k).toFixed(2) + 'px,' + (dy * 3 * k).toFixed(2) + 'px)'
            + ' rotate(' + (dx * 4 * k).toFixed(2) + 'deg)'
            + ' skewX(' + (-dx * 5 * k).toFixed(2) + 'deg)'
            + ' scale(' + (1 + 0.06 * k + Math.abs(dx) * 0.05 * k).toFixed(3) + ',' + (1 - 0.04 * k).toFixed(3) + ')';
    }

    // The small clickable images move like the buttons, the big ones stay still. Each one sits in a still wrapper that holds the hover while the picture leans.
    document.querySelectorAll('.project-row .project-image, .screen-visual, .web-shot, .solution-photo').forEach(function (el) {
        var holder = document.createElement('span');
        holder.className = 'lift-wrap';
        el.parentNode.insertBefore(holder, el);
        holder.appendChild(el);
    });

    document.querySelectorAll('.header-buttons-wrapper .woz-btn, .lift-wrap').forEach(function (wrap) {
        var a = wrap.classList.contains('lift-wrap') ? wrap.firstElementChild : wrap.querySelector('a.button, a.web-btn');
        if (!a) return;
        var dx = 0, dy = 0, anim = null, frame = 0, lastSide = 1;

        a.style.transition = 'transform 110ms ease-out, background-color 0.2s linear, box-shadow 0.2s linear';

        function offset(e) {
            var r = wrap.getBoundingClientRect();
            dx = clamp((e.clientX - (r.left + r.width / 2)) / (r.width / 2));
            dy = clamp((e.clientY - (r.top + r.height / 2)) / (r.height / 2));
            if (Math.abs(dx) > 0.05) lastSide = dx > 0 ? 1 : -1;
        }

        function play(keyframes, duration) {
            if (anim) anim.cancel();
            anim = a.animate(keyframes, { duration: duration, fill: 'none' });
        }

        wrap.addEventListener('pointerenter', function (e) {
            offset(e);
            var from = getComputedStyle(a).transform;
            var hold = pose(dx, dy, 1);
            // One smooth motion: a gentle push toward the cursor, then it eases into the held lean, no rebound
            play([
                { transform: from, offset: 0, easing: 'cubic-bezier(.25,.8,.35,1)' },
                { transform: pose(dx, dy, rnd(1.25, 1.5)), offset: rnd(0.42, 0.5), easing: 'ease-in-out' },
                { transform: hold, offset: 1 }
            ], rnd(480, 560));
            a.style.transform = hold;
        });

        wrap.addEventListener('pointermove', function (e) {
            offset(e);
            if (frame) return;
            frame = requestAnimationFrame(function () {
                frame = 0;
                a.style.transform = pose(dx, dy, 1);
            });
        });

        wrap.addEventListener('pointerleave', function () {
            var from = getComputedStyle(a).transform;
            a.style.transform = '';
            // The game's wobble, shorter, kicked back away from the side the cursor left on, different every time
            var strength = rnd(0.8, 1.15);
            var sign = (lastSide > 0 ? -1 : 1) * (Math.random() < 0.8 ? 1 : -1);
            var steps = [[0.85, 1.25, -12], [1.3, 0.75, 8], [0.8, 1.2, -6], [1.15, 0.85, 4], [0.92, 1.08, -2], [1.05, 0.95, 1]];
            var kf = steps.map(function (st, i) {
                return {
                    transform: 'scale(' + (1 + (st[0] - 1) * strength * rnd(0.85, 1.15)).toFixed(3) + ','
                        + (1 + (st[1] - 1) * strength * rnd(0.85, 1.15)).toFixed(3) + ') rotate('
                        + (st[2] * sign * strength * rnd(0.8, 1.2)).toFixed(2) + 'deg)',
                    offset: Math.min(0.95, Math.max(0.06, (i + 1) / (steps.length + 1) + rnd(-0.03, 0.03))),
                    easing: 'ease-in-out'
                };
            }).sort(function (x, y) { return x.offset - y.offset; });
            kf.unshift({ transform: from, offset: 0, easing: 'ease-out' });
            kf.push({ transform: 'none', offset: 1 });
            play(kf, rnd(760, 980));
        });
    });
})();
