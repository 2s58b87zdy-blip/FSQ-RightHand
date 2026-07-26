import fs from 'node:fs';

const [inputFile, outputFile] = process.argv.slice(2);
if (!inputFile || !outputFile) {
  console.error('Usage: node scripts/generate-world-map.mjs <natural-earth.geojson> <output.svg>');
  process.exit(1);
}

const geojson = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
const width = 1000;
const height = 500;
const project = ([longitude, latitude]) => [
  ((Number(longitude) + 180) / 360) * width,
  ((90 - Number(latitude)) / 180) * height
];
const number = value => Number(value.toFixed(1));
const escapeXml = value => String(value || '')
  .replaceAll('&', '&amp;').replaceAll('"', '&quot;')
  .replaceAll('<', '&lt;').replaceAll('>', '&gt;');

function ringPath(ring) {
  return ring.map((point, index) => {
    const [x, y] = project(point);
    return `${index ? 'L' : 'M'}${number(x)} ${number(y)}`;
  }).join('') + 'Z';
}

function geometryPaths(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') return [geometry.coordinates.map(ringPath).join('')];
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.map(polygon => polygon.map(ringPath).join(''));
  }
  return [];
}

const continentClass = value => String(value || 'Other')
  .toLowerCase().replaceAll(' ', '-').replace(/[^a-z-]/g, '');

const countries = geojson.features.flatMap(feature => {
  const name = feature.properties?.ADMIN || feature.properties?.NAME || 'Country';
  const continent = continentClass(feature.properties?.CONTINENT);
  return geometryPaths(feature.geometry).map(path =>
    `<path class="country ${continent}" data-country="${escapeXml(name)}" d="${path}"/>`
  );
}).join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
<title>Natural Earth world map</title>
<desc>Geographic country outlines derived from Natural Earth public-domain 1:110m data.</desc>
<defs>
  <linearGradient id="countryFill" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0d6b8f"/><stop offset="1" stop-color="#083752"/></linearGradient>
  <filter id="countryGlow"><feGaussianBlur stdDeviation="2.2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
<g fill="url(#countryFill)" stroke="#279ac2" stroke-width=".55" stroke-linejoin="round" fill-rule="evenodd" opacity=".92" filter="url(#countryGlow)">
${countries}
</g>
</svg>`;

fs.writeFileSync(outputFile, svg, 'utf8');
console.log(`Generated ${outputFile} with ${geojson.features.length} Natural Earth features.`);
