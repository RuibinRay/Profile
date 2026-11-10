/*
 * places.js — the provinces, states and cities in each country, and the photos that belong to them.
 *
 *  RJY.regions  loads data/regions/<CODE>.js (provinces/states + a city gazetteer, from Natural Earth)
 *               only when a country is opened, and matches names like "Shenyang", "沈阳", "Boston",
 *               "Gyeonggi" or "MA" to the right province/state and city.
 *  RJY.photos   finds photos uploaded to assets/photos/<COUNTRY>/<place>/ in the GitHub repository, so
 *               new photos appear without editing any code. It asks GitHub for the list of files once,
 *               keeps it for 10 minutes, and falls back to the photos listed in data/travel.js.
 *  RJY.places   merges both: the places listed in data/travel.js plus any photo folders found.
 */
(function () {
  'use strict';
  var RJY = window.RJY, SITE = window.SITE;

  /* ---------- names ---------- */
  function norm(s) {
    return String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/&/g, ' and ').replace(/['’`]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  }
  var GENERIC = /\b(province|provincia|prov|sheng|shi|state|prefecture|region|municipality|autonomous|special|administrative|teukbyeolsi|gwangyeoksi|teukbyeoljachido|jachido|do|city|metropolitan|capital|district|zizhiqu|of|de)\b/g;
  function core(s) { return norm(s).replace(GENERIC, ' ').replace(/\s+/g, ' ').trim(); }
  function slug(s) { return norm(s).replace(/\s+/g, '-'); }
  function titleCase(s) { return String(s).replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/(^|\s)(\p{Ll})/gu, function (m, a, b) { return a + b.toUpperCase(); }); }

  /* ---------- provinces / states / cities ---------- */
  var cache = {};
  function prepare(code, d) {
    var G = window.RJYGeo;
    var fc = G.feature(d.t, d.t.objects.r);
    var regions = fc.features.map(function (f, i) {
      var names = [f.properties.n].concat(f.properties.a || []);
      return { i: i, name: f.properties.n, kind: f.properties.k || '', feature: f, keys: names.map(norm), cores: names.map(core) };
    });
    var cities = (d.c || []).map(function (c) {
      return { name: c[0], lon: c[1], lat: c[2], region: c[3], rank: c[4], keys: [c[0]].concat(c[5] || []).map(norm) };
    });
    return { code: code, fc: fc, regions: regions, cities: cities };
  }
  RJY.regions = {
    load: function (code) {
      if (cache[code]) return cache[code];
      var ready = window.RJY_REGIONS && window.RJY_REGIONS[code];
      if (ready && window.RJYGeo) return (cache[code] = Promise.resolve(prepare(code, ready)));
      cache[code] = new Promise(function (resolve) {
        var sc = document.createElement('script');
        sc.src = 'data/regions/' + code + '.js';
        sc.async = true;
        sc.onload = function () {
          var d = window.RJY_REGIONS && window.RJY_REGIONS[code];
          try { resolve(d && window.RJYGeo ? prepare(code, d) : null); } catch (e) { resolve(null); }
        };
        sc.onerror = function () { resolve(null); };
        document.head.appendChild(sc);
      });
      return cache[code];
    },
    findRegion: function (R, name) {
      var k = norm(name), c = core(name), i;
      if (!R || !k) return null;
      for (i = 0; i < R.regions.length; i++) if (R.regions[i].keys[0] === k) return R.regions[i];
      for (i = 0; i < R.regions.length; i++) {
        var r = R.regions[i], at = r.keys.indexOf(k);
        if (at > 0 && (k.length > 3 || String(name).trim().length <= 3)) return r;
      }
      if (c && c.length > 2) for (i = 0; i < R.regions.length; i++) if (R.regions[i].cores.indexOf(c) !== -1) return R.regions[i];
      return null;
    },
    findCity: function (R, name, regionIndex) {
      var k = norm(name);
      if (!R || !k) return null;
      var hits = R.cities.filter(function (c) { return c.keys.indexOf(k) !== -1; });
      if (regionIndex != null) { var inside = hits.filter(function (c) { return c.region === regionIndex; }); if (inside.length) hits = inside; }
      hits.sort(function (a, b) { return a.rank - b.rank; });
      return hits[0] || null;
    },
    regionAt: function (R, lonlat) {
      if (!R) return null;
      for (var i = 0; i < R.regions.length; i++) if (window.RJYGeo.geoContains(R.regions[i].feature, lonlat)) return R.regions[i];
      return null;
    },
    // A place → { region, city, coords [lon, lat], isRegion }
    resolve: function (R, place) {
      var out = { region: null, city: null, coords: null, isRegion: false };
      if (!R) return out;
      var reg = place.region ? this.findRegion(R, place.region) : null;
      if (place.coords && place.coords.length === 2) {
        out.coords = [+place.coords[1], +place.coords[0]];
        if (!reg) reg = this.regionAt(R, out.coords);
      } else if (place.type !== 'region') {
        var city = this.findCity(R, place.name, reg ? reg.i : null);
        if (city) { out.city = city; out.coords = [city.lon, city.lat]; if (!reg) reg = R.regions[city.region] || null; }
      }
      if (!out.coords) {
        var asRegion = this.findRegion(R, place.name);
        if (asRegion && (!reg || place.type === 'region')) { reg = asRegion; out.isRegion = true; }
        else if (asRegion && asRegion === reg) out.isRegion = true;
      }
      out.region = reg;
      return out;
    }
  };

  /* ---------- photos uploaded to assets/photos/ ---------- */
  var IMG = /\.(jpe?g|png|webp|gif|avif)$/i;
  var CACHE_KEY = 'rjy-photo-files-v1', TTL = 10 * 60 * 1000;
  var files = null, loading = null, codeIndex = null, indexed = null;

  function countryCodeFor(folder) {
    if (!codeIndex) {
      codeIndex = {};
      (RJY.allCountryCodes || []).forEach(function (a3) {
        codeIndex[a3.toLowerCase()] = a3;
        var a2 = RJY.countryA2(a3); if (a2) codeIndex[a2.toLowerCase()] = a3;
        codeIndex[slug(RJY.countryName(a3))] = a3;
      });
      // a few everyday names
      codeIndex['usa'] = 'USA'; codeIndex['us'] = 'USA'; codeIndex['united-states-of-america'] = 'USA';
      codeIndex['korea'] = 'KOR'; codeIndex['south-korea'] = 'KOR'; codeIndex['uk'] = 'GBR'; codeIndex['england'] = 'GBR';
    }
    return codeIndex[String(folder).toLowerCase()] || codeIndex[slug(folder)] || null;
  }
  function dateFrom(name) {
    var m = /(?:^|[^0-9])((?:19|20)\d{2})[-_.]?(0[1-9]|1[0-2])[-_.]?(0[1-9]|[12]\d|3[01])(?![0-9])/.exec(name);
    return m ? m[1] + '-' + m[2] + '-' + m[3] : '';
  }
  function captionFrom(name) {
    var s = name.replace(/\.[^.]+$/, '')
      .replace(/^(IMG|DSC[NF]?|PXL|MVIMG|VID|PHOTO|IMAGE|Screenshot|WhatsApp Image|DJI|GOPR|P)(?=[\s_-]*\d)/i, '')
      .replace(/(19|20)\d{2}[-_.]?\d{2}[-_.]?\d{2}([-_ T.]?\d{2}[-_.]?\d{2}([-_.]?\d{2})?)?/g, ' ')
      .replace(/\bat\s+\d{1,2}[.:]\d{2}([.:]\d{2})?(\s*[AP]M)?\b/gi, ' ')       // "… at 9.10.11 PM"
      .replace(/[_-]+/g, ' ').replace(/\b\d+\b/g, ' ')
      .replace(/(^|\s)[.,:;()]+(?=\s|$)/g, ' ').replace(/\s+/g, ' ').trim();
    var cjk = /[\p{Script=Han}\p{Script=Hangul}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(s);
    if ((s.match(/\p{L}/gu) || []).length < (cjk ? 1 : 3)) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function srcFor(path) { return path.split('/').map(encodeURIComponent).join('/'); }

  // A list fetched in the last 10 minutes is used straight away, so photos appear on the first render.
  try {
    var saved = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'), M0 = SITE.meta || {};
    if (saved && saved.repo === M0.repo && Date.now() - saved.t < TTL && Array.isArray(saved.files)) files = saved.files;
  } catch (e) {}

  function found(list) {
    files = list;
    try { document.dispatchEvent(new CustomEvent('rjy:photos')); } catch (e) {}
    return list;
  }

  RJY.photos = {
    // Ask GitHub (once) which image files are in assets/photos/.
    load: function () {
      if (loading) return loading;
      var M = SITE.meta || {};
      if (files !== null) return (loading = Promise.resolve(files));
      if (!M.repo || !window.fetch) return (loading = Promise.resolve(found([])));
      loading = fetch('https://api.github.com/repos/' + M.repo + '/git/trees/' + encodeURIComponent(M.branch || 'main') + '?recursive=1', { headers: { Accept: 'application/vnd.github+json' } })
        .then(function (r) { if (!r.ok) throw new Error('GitHub answered ' + r.status); return r.json(); })
        .then(function (j) {
          var list = (j.tree || []).filter(function (e) { return e.type === 'blob' && e.path.indexOf('assets/photos/') === 0 && IMG.test(e.path); }).map(function (e) { return e.path; });
          try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), repo: M.repo, files: list })); } catch (e) {}
          return list;
        })
        .catch(function (err) {
          // e.g. GitHub's limit of 60 requests an hour per network: fall back to the last list seen here
          console.info('Photo folders could not be listed (' + err.message + '). Showing the photos already known.');
          try { var old = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); if (old && old.repo === M.repo && Array.isArray(old.files)) return old.files; } catch (e) {}
          return [];
        })
        .then(found);
      return loading;
    },
    ready: function () { return files !== null; },
    // { CODE: { root: [photos], folders: { slug: { name, photos } } } }
    index: function () {
      if (indexed && indexed.files === files) return indexed.out;
      var out = {};
      (files || []).forEach(function (path) {
        var parts = path.split('/');               // assets / photos / COUNTRY / [place /] file
        if (parts.length < 4) return;
        var code = countryCodeFor(parts[2]);
        if (!code) return;
        var file = parts[parts.length - 1];
        var c = out[code] || (out[code] = { root: [], folders: {} });
        var photo = { src: srcFor(path), file: file, caption: captionFrom(file), date: dateFrom(file), found: true };
        if (parts.length === 4) { c.root.push(photo); return; }
        var folder = parts[3], key = slug(folder);
        var f = c.folders[key] || (c.folders[key] = { name: titleCase(folder), folder: folder, photos: [] });
        f.photos.push(photo);
      });
      Object.keys(out).forEach(function (code) {
        var c = out[code];
        c.root.sort(byDate);
        Object.keys(c.folders).forEach(function (k) { c.folders[k].photos.sort(byDate); });
      });
      indexed = { files: files, out: out };
      return out;
    },
    countriesWithPhotos: function () { return Object.keys(this.index()); }
  };
  function byDate(a, b) {
    if (a.date && b.date && a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.date && !b.date) return -1;
    if (!a.date && b.date) return 1;
    return a.file < b.file ? -1 : a.file > b.file ? 1 : 0;
  }

  /* ---------- places = data/travel.js + photo folders ---------- */
  RJY.places = {
    norm: norm, slug: slug,
    // Every place for a country, each with its photos; plus photos of the country as a whole.
    forCountry: function (country) {
      var code = country.code;
      var listed = (country.places || []).concat((country.cities || []).map(function (c) { return { name: c.name, note: c.note }; }));
      var places = listed.filter(function (p) { return p && RJY.has(p.name); }).map(function (p) {
        return Object.assign({}, p, { photos: (p.photos || []).filter(function (x) { return x && x.src && x.public !== false; }) });
      });
      var found = RJY.photos.index()[code];
      var countryPhotos = (country.photos || []).filter(function (x) { return x && x.src && x.public !== false; });
      // photos listed in data/gallery.js with this country join it too
      ((SITE.gallery && SITE.gallery.photos) || []).forEach(function (x) {
        if (x && x.src && x.public !== false && x.country === code) countryPhotos.push(x);
      });
      if (found) {
        Object.keys(found.folders).forEach(function (key) {
          var f = found.folders[key];
          var match = places.filter(function (p) { return slug(p.name) === key || (p.folder && slug(p.folder) === key); })[0];
          if (match) match.photos = match.photos.concat(f.photos);
          else places.push({ name: f.name, folder: f.folder, photos: f.photos.slice(), discovered: true });
        });
        countryPhotos = countryPhotos.concat(found.root);
      }
      return { places: places, photos: countryPhotos };
    },
    folderFor: function (code, place) { return 'assets/photos/' + code + '/' + (place ? slug(place.folder || place.name) + '/' : ''); }
  };

  // Start listing photos once the page has settled (they also matter for the gallery and the map stats).
  function kick() { RJY.photos.load(); }
  if (document.readyState === 'complete') setTimeout(kick, 1200);
  else window.addEventListener('load', function () { setTimeout(kick, 1200); });
})();
