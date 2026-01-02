const fs = require("fs");
const http = require("http");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ASSET_DIR = path.join(__dirname, "img");

const PRIMARY_FONT_NAME = "Numeric";
const PRIMARY_FONT_PATH = path.join(__dirname, "fonts", "Numeric.ttf");
const FALLBACK_FONT_NAME = "Concert One";
const FALLBACK_FONT_PATH = path.join(__dirname, "fonts", "ConcertOne.ttf");

const ASSET_CACHE = new Map();

const CHARACTER_THEMES = {
  여동생: {
    bar: "#f9d24a",
    barStroke: "#d5a718",
    text: "#f28eb2",
    textStroke: "#d86b94",
    accent: "#f59fb5",
    decor: "hearts"
  },
  누나: {
    bar: "#e1e5ea",
    barStroke: "#b6bdc7",
    text: "#9aa1ac",
    textStroke: "#7d838d",
    accent: "#bcc2cc",
    decor: "flower"
  },
  엄마: {
    bar: "#2f2824",
    barStroke: "#4a3f38",
    text: "#c8a07a",
    textStroke: "#a57852",
    accent: "#c49a71",
    decor: "leaf"
  }
};

const AFFINITY_CHARACTERS = [
  { key: "y1", label: "이서아", image: "여동생", theme: "여동생" },
  { key: "y2", label: "이서혜", image: "누나", theme: "누나" },
  { key: "y3", label: "이서희", image: "엄마", theme: "엄마" }
];

const LAYOUT = {
  width: 1920,
  height: 1080,
  columnWidth: 640,
  barX: 60,
  barY: 130,
  barWidth: 70,
  barHeight: 820,
  imageX: 160,
  imageY: 80,
  imageSize: 480,
  labelX: 160,
  labelY: 760,
  scoreY: 930
};

const PROFILE_LAYOUT = {
  width: 1920,
  height: 1080,
  headerX: 60,
  headerY: 140,
  headerSize: 96,
  columnWidth: 640,
  imageX: 80,
  imageY: 320,
  imageSize: 260,
  relationOffsetX: 24,
  relationOffsetY: 60,
  relationSize: 96,
  statusX: 60,
  statusY: 756,
  statusSize: 96
};

function clampNumber(value, min, max, fallback) {
  const num = Number(value);
  if (Number.isNaN(num)) return fallback;
  return Math.min(Math.max(num, min), max);
}

function parsePercent(value) {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).trim().replace(/%$/, "");
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isNaN(num) ? null : num;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function safeText(value, maxChars, fallback) {
  const trimmed = value === null || value === undefined ? "" : String(value).trim();
  if (!trimmed) {
    return fallback ? escapeXml(fallback) : "";
  }
  if (!maxChars) return escapeXml(trimmed);
  const sliced = Array.from(trimmed).slice(0, maxChars).join("");
  return escapeXml(sliced);
}

function buildImageUrl(baseUrl, filename) {
  const encoded = encodeURIComponent(filename);
  if (!baseUrl) return `/img/${encoded}`;
  const trimmedBase = baseUrl.replace(/\/$/, "");
  return `${trimmedBase}/img/${encoded}`;
}

function loadAssetBase64(filePath) {
  if (ASSET_CACHE.has(filePath)) {
    return ASSET_CACHE.get(filePath);
  }

  try {
    const data = fs.readFileSync(filePath);
    const base64 = data.toString("base64");
    ASSET_CACHE.set(filePath, base64);
    return base64;
  } catch (error) {
    return null;
  }
}

const PRIMARY_FONT_BASE64 = loadAssetBase64(PRIMARY_FONT_PATH);
const FALLBACK_FONT_BASE64 = PRIMARY_FONT_BASE64
  ? null
  : loadAssetBase64(FALLBACK_FONT_PATH);
const FONT_BASE64 = PRIMARY_FONT_BASE64 || FALLBACK_FONT_BASE64;
const FONT_NAME = PRIMARY_FONT_BASE64
  ? PRIMARY_FONT_NAME
  : FALLBACK_FONT_BASE64
    ? FALLBACK_FONT_NAME
    : "";

function getFontFaceStyle() {
  if (!FONT_BASE64 || !FONT_NAME) return "";
  return `<style>
@font-face {
  font-family: '${FONT_NAME}';
  font-style: normal;
  font-weight: 400;
  src: url(data:font/truetype;base64,${FONT_BASE64}) format('truetype');
}
</style>`;
}

function getFontFamily() {
  if (!FONT_NAME) return "'Segoe UI', Arial, sans-serif";
  return `'${FONT_NAME}', 'Segoe UI', Arial, sans-serif`;
}

function getMoodLabel(score) {
  if (score >= 80) return "사랑";
  if (score >= 40) return "호감";
  return "무표정";
}

function readUserFields(params) {
  const values = params.getAll("u");
  const name = values[0] || params.get("u1") || params.get("name");
  const age = values[1] || params.get("u2") || params.get("age");
  const job = values[2] || params.get("u3") || params.get("job");
  return { name, age, job };
}

function getBaseUrl(req) {
  const protoHeader = req.headers["x-forwarded-proto"];
  const hostHeader = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = (protoHeader || "http").split(",")[0].trim();
  const host = (hostHeader || "localhost").split(",")[0].trim();
  return `${proto}://${host}`;
}

function readAffinityParam(params, name, aliases) {
  const keys = [name, ...(aliases || [])];
  for (const key of keys) {
    const value = params.get(key);
    if (value !== null) {
      const parsed = parsePercent(value);
      return clampNumber(parsed, 0, 100, 0);
    }
  }
  return 0;
}

function renderDecorIcon(type, x, y, color) {
  if (type === "hearts") {
    return `
  <g transform="translate(${x} ${y})" fill="${color}">
    <path d="M 0 -12 C -10 -22 -28 -8 -16 8 C -8 22 0 28 0 36 C 0 28 8 22 16 8 C 28 -8 10 -22 0 -12 Z"/>
    <circle cx="-18" cy="22" r="4" opacity="0.6"/>
    <circle cx="18" cy="26" r="5" opacity="0.6"/>
  </g>`;
  }

  if (type === "flower") {
    return `
  <g transform="translate(${x} ${y})" fill="${color}">
    <circle cx="0" cy="-16" r="8"/>
    <circle cx="14" cy="-6" r="8"/>
    <circle cx="12" cy="12" r="8"/>
    <circle cx="-12" cy="12" r="8"/>
    <circle cx="-14" cy="-6" r="8"/>
    <circle cx="0" cy="0" r="6" fill="#ffffff" opacity="0.7"/>
  </g>`;
  }

  return `
  <g transform="translate(${x} ${y})" fill="${color}">
    <path d="M 0 -20 C 12 -18 22 -6 12 8 C 6 18 2 24 0 32 C -2 24 -6 18 -12 8 C -22 -6 -12 -18 0 -20 Z"/>
    <rect x="-12" y="32" width="24" height="10" rx="4"/>
  </g>`;
}

function renderBarDecor(theme, centerX, topY, bottomY) {
  return `
  ${renderDecorIcon(theme.decor, centerX, topY, theme.accent)}
  ${renderDecorIcon(theme.decor, centerX, bottomY, theme.accent)}
  `;
}

function renderAffinityPanel(entry, index, fontFamily, baseUrl) {
  const score = Math.round(entry.score);
  const mood = getMoodLabel(score);
  const themeKey = entry.theme || entry.image || "여동생";
  const theme = CHARACTER_THEMES[themeKey] || CHARACTER_THEMES["여동생"];
  const imageName = entry.image || themeKey;
  const imageFilename = `${imageName}-${mood}.png`;
  const imageFile = path.join(ASSET_DIR, imageFilename);
  const imageUrl = buildImageUrl(baseUrl, imageFilename);
  const imageExists = fs.existsSync(imageFile);
  const safeLabel = escapeXml(entry.label || imageName);
  const columnX = index * LAYOUT.columnWidth;
  const barCenterX = LAYOUT.barX + LAYOUT.barWidth / 2;
  const decorTopY = LAYOUT.barY + 90;
  const decorBottomY = LAYOUT.barY + LAYOUT.barHeight - 90;
  const barRadius = LAYOUT.barWidth / 2;
  const fillHeight = Math.round(LAYOUT.barHeight * (score / 100));
  const fillY = LAYOUT.barY + (LAYOUT.barHeight - fillHeight);
  const clipId = `barClip-${index}`;

  const imageTag = imageExists
    ? `<image x="${LAYOUT.imageX}" y="${LAYOUT.imageY}" width="${LAYOUT.imageSize}" height="${LAYOUT.imageSize}" href="${imageUrl}" xlink:href="${imageUrl}" preserveAspectRatio="xMidYMin meet" filter="url(#panelShadow)"/>`
    : `<g>
        <rect x="${LAYOUT.imageX}" y="${LAYOUT.imageY}" width="${LAYOUT.imageSize}" height="${LAYOUT.imageSize}" rx="28" fill="#f3f4f6" stroke="#d1d5db" stroke-width="3"/>
        <text x="${LAYOUT.imageX + LAYOUT.imageSize / 2}" y="${LAYOUT.imageY + LAYOUT.imageSize / 2}" font-size="28" text-anchor="middle" font-family="${fontFamily}" fill="#9ca3af">Missing image</text>
      </g>`;

  return `
  <g transform="translate(${columnX} 0)">
    <defs>
      <clipPath id="${clipId}">
        <rect x="${LAYOUT.barX}" y="${LAYOUT.barY}" width="${LAYOUT.barWidth}" height="${LAYOUT.barHeight}" rx="${barRadius}"/>
      </clipPath>
    </defs>
    <rect x="${LAYOUT.barX}" y="${LAYOUT.barY}" width="${LAYOUT.barWidth}" height="${LAYOUT.barHeight}" rx="${barRadius}" fill="#ffffff" stroke="${theme.barStroke}" stroke-width="6"/>
    <rect x="${LAYOUT.barX}" y="${fillY}" width="${LAYOUT.barWidth}" height="${fillHeight}" fill="${theme.bar}" clip-path="url(#${clipId})"/>
    ${renderBarDecor(theme, barCenterX, decorTopY, decorBottomY)}
    ${imageTag}
    <text x="${LAYOUT.labelX}" y="${LAYOUT.labelY}" font-size="84" font-family="${fontFamily}" fill="${theme.text}" stroke="${theme.textStroke}" stroke-width="8" paint-order="stroke fill" letter-spacing="1">${safeLabel}</text>
    <text x="${LAYOUT.labelX}" y="${LAYOUT.scoreY}" font-size="128" font-family="${fontFamily}" fill="${theme.text}" stroke="${theme.textStroke}" stroke-width="10" paint-order="stroke fill">${score}%</text>
  </g>`;
}

function renderAffinitySvg(entries, baseUrl) {
  const fontStyle = getFontFaceStyle();
  const fontFamily = getFontFamily();
  const panels = entries
    .map((entry, index) => renderAffinityPanel(entry, index, fontFamily, baseUrl))
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${LAYOUT.width}" height="${LAYOUT.height}" viewBox="0 0 ${LAYOUT.width} ${LAYOUT.height}" role="img" aria-label="Affinity summary">
  <defs>
    ${fontStyle}
    <filter id="panelShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#000000" flood-opacity="0.18"/>
    </filter>
  </defs>
  <rect width="${LAYOUT.width}" height="${LAYOUT.height}" fill="#ffffff"/>
  ${panels}
</svg>`;
}

function renderProfileEntry(entry, index, fontFamily, baseUrl) {
  const columnX = index * PROFILE_LAYOUT.columnWidth;
  const imageFilename = `${entry.name}-무표정.png`;
  const imageFile = path.join(ASSET_DIR, imageFilename);
  const imageUrl = buildImageUrl(baseUrl, imageFilename);
  const imageExists = fs.existsSync(imageFile);
  const relationText = safeText(entry.relation, 3, "미정");
  const imageX = PROFILE_LAYOUT.imageX;
  const imageY = PROFILE_LAYOUT.imageY;
  const relationX = imageX + PROFILE_LAYOUT.imageSize + PROFILE_LAYOUT.relationOffsetX;
  const relationY =
    PROFILE_LAYOUT.imageY +
    Math.round(PROFILE_LAYOUT.imageSize / 2) +
    PROFILE_LAYOUT.relationOffsetY;

  const imageTag = imageExists
    ? `<image x="${imageX}" y="${imageY}" width="${PROFILE_LAYOUT.imageSize}" height="${PROFILE_LAYOUT.imageSize}" href="${imageUrl}" xlink:href="${imageUrl}" preserveAspectRatio="xMidYMin meet"/>`
    : `<g>
        <rect x="${imageX}" y="${imageY}" width="${PROFILE_LAYOUT.imageSize}" height="${PROFILE_LAYOUT.imageSize}" rx="24" fill="#f3f4f6" stroke="#d1d5db" stroke-width="3"/>
        <text x="${imageX + PROFILE_LAYOUT.imageSize / 2}" y="${imageY + PROFILE_LAYOUT.imageSize / 2}" font-size="24" text-anchor="middle" font-family="${fontFamily}" fill="#9ca3af">Missing image</text>
      </g>`;

  return `
  <g transform="translate(${columnX} 0)">
    ${imageTag}
    <text x="${relationX}" y="${relationY}" font-size="${PROFILE_LAYOUT.relationSize}" font-family="${fontFamily}" fill="#111827">: ${relationText}</text>
  </g>`;
}

function renderProfileSvg(params, baseUrl) {
  const fontStyle = getFontFaceStyle();
  const fontFamily = getFontFamily();
  const { name, age, job } = readUserFields(params);
  const userName = safeText(name, 12, "유저");
  const userAge = safeText(age, 3, "??");
  const userJob = safeText(job, 10, "미상");
  const statusText = safeText(params.get("status"), 20, "없음");
  const entries = [
    { name: "여동생", relation: params.get("s1") },
    { name: "누나", relation: params.get("s2") },
    { name: "엄마", relation: params.get("m") }
  ];
  const headerText = `유저 이름: ${userName} | 유저 나이: ${userAge} | 유저 직업: ${userJob}`;
  const panels = entries
    .map((entry, index) => renderProfileEntry(entry, index, fontFamily, baseUrl))
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${PROFILE_LAYOUT.width}" height="${PROFILE_LAYOUT.height}" viewBox="0 0 ${PROFILE_LAYOUT.width} ${PROFILE_LAYOUT.height}" role="img" aria-label="${headerText}">
  <defs>
    ${fontStyle}
  </defs>
  <rect width="${PROFILE_LAYOUT.width}" height="${PROFILE_LAYOUT.height}" fill="#ffffff"/>
  <text x="${PROFILE_LAYOUT.headerX}" y="${PROFILE_LAYOUT.headerY}" font-size="${PROFILE_LAYOUT.headerSize}" font-family="${fontFamily}" fill="#111827">${headerText}</text>
  ${panels}
  <text x="${PROFILE_LAYOUT.statusX}" y="${PROFILE_LAYOUT.statusY}" font-size="${PROFILE_LAYOUT.statusSize}" font-family="${fontFamily}" fill="#111827">현재 상황 : ${statusText}</text>
</svg>`;
}

function renderStatusSvg(relationship, situation) {
  const rel = escapeXml(relationship || "Relationship");
  const sit = escapeXml(situation || "Current status");
  const fontStyle = getFontFaceStyle();
  const fontFamily = getFontFamily();

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="300" viewBox="0 0 900 300" role="img" aria-label="${rel} ${sit}">
  <defs>
    ${fontStyle}
    <linearGradient id="bg2" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffe8d6"/>
      <stop offset="60%" stop-color="#fef6e4"/>
      <stop offset="100%" stop-color="#dbeafe"/>
    </linearGradient>
    <linearGradient id="stroke2" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#ff7a7a"/>
      <stop offset="100%" stop-color="#60a5fa"/>
    </linearGradient>
  </defs>
  <rect width="900" height="300" rx="26" fill="url(#bg2)"/>
  <g opacity="0.25">
    <path d="M 40 260 C 140 180 260 180 360 260" stroke="#f59e0b" stroke-width="14" fill="none" stroke-linecap="round"/>
    <path d="M 520 50 C 620 130 740 130 840 50" stroke="#3b82f6" stroke-width="14" fill="none" stroke-linecap="round"/>
  </g>
  <rect x="48" y="70" width="804" height="160" rx="22" fill="#ffffff" opacity="0.85"/>
  <text x="90" y="130" font-size="32" font-family="${fontFamily}" fill="#0f172a">${rel}</text>
  <text x="90" y="190" font-size="44" font-family="${fontFamily}" fill="#111827">${sit}</text>
  <line x1="90" y1="210" x2="820" y2="210" stroke="url(#stroke2)" stroke-width="4" stroke-linecap="round"/>
</svg>`;
}

function writeSvg(res, svg) {
  res.writeHead(200, {
    "Content-Type": "image/svg+xml; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*"
  });
  res.end(svg);
}

function writeText(res, status, text) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}

const server = http.createServer((req, res) => {
  if (!req.url) {
    writeText(res, 400, "Bad request");
    return;
  }

  const url = new URL(req.url, "http://localhost");
  if (req.method !== "GET") {
    writeText(res, 405, "Method not allowed");
    return;
  }

  if (url.pathname.startsWith("/img/")) {
    const relativePath = decodeURIComponent(url.pathname.slice(5));
    if (!relativePath || relativePath.includes("..") || relativePath.includes("/") || relativePath.includes("\\")) {
      writeText(res, 400, "Bad request");
      return;
    }

    const filePath = path.join(ASSET_DIR, relativePath);
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.toLowerCase().startsWith(ASSET_DIR.toLowerCase())) {
      writeText(res, 400, "Bad request");
      return;
    }

    fs.readFile(resolvedPath, (err, data) => {
      if (err) {
        writeText(res, 404, "Not found");
        return;
      }
      res.writeHead(200, {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, immutable",
        "Access-Control-Allow-Origin": "*"
      });
      res.end(data);
    });
    return;
  }

  if (url.pathname === "/api/affinity") {
    const baseUrl = getBaseUrl(req);
    const entries = AFFINITY_CHARACTERS.map((character) => ({
      label: character.label,
      image: character.image,
      theme: character.theme,
      score: readAffinityParam(url.searchParams, character.key, character.aliases)
    }));
    const svg = renderAffinitySvg(entries, baseUrl);
    writeSvg(res, svg);
    return;
  }

  if (url.pathname === "/api/profile") {
    const baseUrl = getBaseUrl(req);
    const svg = renderProfileSvg(url.searchParams, baseUrl);
    writeSvg(res, svg);
    return;
  }

  if (url.pathname === "/api/status") {
    const relationship = url.searchParams.get("relationship");
    const situation = url.searchParams.get("situation");
    const svg = renderStatusSvg(relationship, situation);
    writeSvg(res, svg);
    return;
  }

  if (url.pathname === "/") {
    writeText(
      res,
      200,
      [
        "SVG generator server",
        "",
        "Endpoints:",
        "  /api/affinity?y1=30&y2=70&y3=95",
        "  /api/profile?u=이름&u=나이&u=직업&s1=관계&s2=관계&m=관계&status=상황",
        "  /api/status?relationship=Friends&situation=Chill"
      ].join("\n")
    );
    return;
  }

  writeText(res, 404, "Not found");
});

server.listen(PORT, () => {
  console.log(`SVG server listening on http://localhost:${PORT}`);
});
