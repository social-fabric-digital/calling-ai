const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const enPath = path.join(root, 'utils', 'translations', 'en.json');
const ruPath = path.join(root, 'utils', 'translations', 'ru.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function flatten(value, prefix = '', out = {}) {
  if (Array.isArray(value)) {
    out[prefix] = 'array';
    value.forEach((item, index) => flatten(item, `${prefix}[${index}]`, out));
    return out;
  }

  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, next]) => {
      const nested = prefix ? `${prefix}.${key}` : key;
      flatten(next, nested, out);
    });
    return out;
  }

  out[prefix] = typeof value;
  return out;
}

function main() {
  const en = readJson(enPath);
  const ru = readJson(ruPath);

  const enFlat = flatten(en);
  const ruFlat = flatten(ru);

  const enKeys = new Set(Object.keys(enFlat));
  const ruKeys = new Set(Object.keys(ruFlat));

  const missingInRu = [...enKeys].filter((key) => !ruKeys.has(key)).sort();
  const missingInEn = [...ruKeys].filter((key) => !enKeys.has(key)).sort();

  if (missingInRu.length === 0 && missingInEn.length === 0) {
    console.log('i18n parity check passed: en and ru keys match.');
    return;
  }

  console.error('i18n parity check failed.');
  if (missingInRu.length > 0) {
    console.error(`Missing in ru.json (${missingInRu.length}):`);
    missingInRu.forEach((key) => console.error(`  - ${key}`));
  }
  if (missingInEn.length > 0) {
    console.error(`Missing in en.json (${missingInEn.length}):`);
    missingInEn.forEach((key) => console.error(`  - ${key}`));
  }

  process.exit(1);
}

main();
