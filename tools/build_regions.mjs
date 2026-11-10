#!/usr/bin/env node
/*
 * build_regions.mjs — generate data/regions/<ISO3>.js: provinces/states + cities for every country.
 *
 * Each file holds a small TopoJSON of the country's first-level divisions (provinces, states,
 * regions…) and a gazetteer of its cities, so the atlas can light up the exact provinces/states
 * and cities listed in data/travel.js (or found as photo folders). The site loads a country's file
 * only when that country is opened.
 *
 * Source data: Natural Earth 1:10m (public domain)
 *   https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson
 *   https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_populated_places.geojson
 *
 * Usage (from the website folder):
 *   npm install --no-save mapshaper d3-geo topojson-server world-countries
 *   node tools/build_regions.mjs <admin1.geojson> <places.geojson> data/regions
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(path.join(process.cwd(), 'package.json'));
const mapshaper = require('mapshaper');
const { geoBounds, geoContains, geoDistance, geoCentroid } = require('d3-geo');
const countries = require('world-countries');

const [adminPath, placesPath, outDir] = process.argv.slice(2);
if (!adminPath || !placesPath || !outDir) {
  console.error('usage: node tools/build_regions.mjs <admin1.geojson> <places.geojson> <outDir>');
  process.exit(1);
}

// ISO alpha-2 -> the alpha-3 codes the site uses (same as data/world.js)
const A2 = {};
countries.forEach(c => { if (c.cca2 && c.cca3) A2[c.cca2] = c.cca3; });
A2.XK = 'XKX';
const toA3 = (iso2, neA3) => A2[iso2] || neA3;

const admin = JSON.parse(fs.readFileSync(adminPath, 'utf8'));
const places = JSON.parse(fs.readFileSync(placesPath, 'utf8'));

const norm = s => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/&/g, ' and ').replace(/['’`]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

function aliasList(primary, values) {
  const seen = new Set(primary.map(norm));
  const out = [];
  values.forEach(v => {
    String(v || '').split('|').forEach(part => {
      const s = part.trim();
      if (!s || s === '-99' || s.length > 60) return;
      const k = norm(s);
      if (!k || seen.has(k)) return;
      seen.add(k); out.push(s);
    });
  });
  return out;
}

// ---- group provinces/states by country ----
const byCountry = new Map();
for (const f of admin.features) {
  const p = f.properties;
  if (!f.geometry) continue;
  const a3 = toA3(p.iso_a2, p.adm0_a3);
  if (!byCountry.has(a3)) byCountry.set(a3, []);
  const name = p.name_en || p.name || p.gn_name || p.woe_name;
  if (!name) continue;
  const iso = p.iso_3166_2 && !String(p.iso_3166_2).includes('~') ? p.iso_3166_2 : '';
  const aliases = aliasList([name], [p.name, p.name_alt, p.woe_name, p.gn_name, p.name_local, p.name_es, p.name_zh, p.name_zht,
    p.name_ko, p.name_ja, p.postal, iso, iso ? iso.split('-')[1] : '']);
  // what the division is called locally: Province, State, Municipality, Metropolitan City, Prefecture…
  const kind = String(p.type_en || '').replace(/\s*\(.*?\)\s*/g, ' ').trim()
    .replace(/(^|[\s-])(\p{Ll})/gu, (m, a, b) => a + b.toUpperCase());
  const props = { n: name, a: aliases };
  if (kind && kind.length <= 40) props.k = kind;
  byCountry.get(a3).push({ type: 'Feature', properties: props, geometry: f.geometry });
}

// ---- cities ----
const citiesBy = new Map();
for (const f of places.features) {
  const q = f.properties;
  const a3 = toA3(q.ISO_A2, q.ADM0_A3);
  // English name when it differs (Shenyang, not "Shenyeng"; Munich, not München); otherwise keep accents
  const name = q.NAME_EN && /^[\p{Script=Latin}\s.'’()-]+$/u.test(q.NAME_EN) && norm(q.NAME_EN) !== norm(q.NAME) ? q.NAME_EN : q.NAME;
  const aliases = aliasList([name], [q.NAME, q.NAMEASCII, q.NAME_EN, q.NAMEALT, q.NAMEPAR, q.MEGANAME, q.NAME_ZH, q.NAME_ZHT, q.NAME_ES, q.NAME_KO]);
  if (!citiesBy.has(a3)) citiesBy.set(a3, []);
  citiesBy.get(a3).push({ name, lon: q.LONGITUDE, lat: q.LATITUDE, rank: q.SCALERANK, adm1: q.ADM1NAME, aliases });
}

fs.mkdirSync(outDir, { recursive: true });
let total = 0, files = 0;
const summary = [];

for (const [a3, feats] of byCountry) {
  if (a3 === 'ATA' || !/^[A-Z0-9]{3,4}$/.test(a3)) continue;
  const fc = { type: 'FeatureCollection', features: feats };
  // scale-aware simplification: detail relative to the country's own size
  const b = geoBounds(fc);
  const diagKm = geoDistance(b[0], b[1]) * 6371 || 50;
  const interval = Math.max(250, Math.min(16000, diagKm * 1000 / 650));
  const minIsland = Math.round(Math.pow(interval * 5, 2));
  const cmd = `-i in.json -simplify interval=${Math.round(interval)} keep-shapes -filter-islands min-area=${minIsland} -o out.json format=topojson quantization=20000`;
  let topo;
  try {
    const out = await mapshaper.applyCommands(cmd, { 'in.json': fc });
    topo = JSON.parse(out['out.json']);
  } catch (err) {
    console.warn('skip', a3, err.message);
    continue;
  }
  const key = Object.keys(topo.objects)[0];
  if (key !== 'r') { topo.objects.r = topo.objects[key]; delete topo.objects[key]; }

  // cities: find the province/state each falls in (full-detail polygons), else nearest by name
  const list = (citiesBy.get(a3) || []).map(c => {
    let idx = feats.findIndex(f => geoContains(f, [c.lon, c.lat]));
    if (idx < 0 && c.adm1) idx = feats.findIndex(f => norm(f.properties.n) === norm(c.adm1) || f.properties.a.some(x => norm(x) === norm(c.adm1)));
    if (idx < 0) {
      let best = -1, bd = Infinity;
      feats.forEach((f, i) => { const d = geoDistance(geoCentroid(f), [c.lon, c.lat]); if (d < bd) { bd = d; best = i; } });
      idx = best;
    }
    const row = [c.name, +c.lon.toFixed(3), +c.lat.toFixed(3), idx, c.rank];
    if (c.aliases.length) row.push(c.aliases);
    return row;
  }).sort((x, y) => x[4] - y[4]);

  const body = JSON.stringify({ t: topo, c: list });
  const js = `/* ${a3}: provinces/states and cities. Natural Earth (public domain), generated by tools/build_regions.mjs — don't edit. */\n` +
    `(window.RJY_REGIONS=window.RJY_REGIONS||{})[${JSON.stringify(a3)}]=${body};\n`;
  fs.writeFileSync(path.join(outDir, a3 + '.js'), js);
  total += js.length; files++;
  summary.push([a3, feats.length, list.length, Math.round(js.length / 1024)]);
}
summary.sort((x, y) => y[3] - x[3]);
console.log(`wrote ${files} files, ${(total / 1024 / 1024).toFixed(2)} MB total`);
console.log('largest:', summary.slice(0, 12).map(s => `${s[0]} ${s[3]}KB (${s[1]} regions, ${s[2]} cities)`).join(', '));
console.log('check:', ['CHN', 'USA', 'CAN', 'KOR', 'CRI'].map(c => { const s = summary.find(x => x[0] === c); return s ? `${c} ${s[3]}KB/${s[1]}r/${s[2]}c` : c + ' missing'; }).join(', '));
