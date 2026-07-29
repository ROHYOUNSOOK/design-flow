const { google } = require('googleapis');

const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1rAEidqqq385c04hd4TtHsVNDaV2pDrciBB17hlv8aP4';
const HEADER_ROW = 11;

const PARTS = {
  '국내': { gid: '872099327', sheetName: '국내입력' },
  '해외': { gid: '269421064', sheetName: '글로벌입력' },
};

// ── CSV 파싱 (시트 → 앱, 공개 읽기) ──

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return [];
  return lines.map(l => parseCSVLine(l));
}

/**
 * 공개 시트에서 CSV 읽기 (파트별 GID 사용)
 */
async function fetchSheetCSV(part) {
  const config = PARTS[part];
  if (!config) throw new Error(`알 수 없는 파트: ${part}`);

  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${config.gid}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`시트 CSV 가져오기 실패: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  return parseCSV(text);
}

/**
 * 시트 데이터를 태스크 배열로 변환
 */
function mapSheetRowsToTasks(rows, part) {
  if (rows.length <= 1) return [];

  const dataRows = rows.slice(1);
  const tasks = [];

  for (let i = 0; i < dataRows.length; i++) {
    const r = dataRows[i];
    const keyword = (r[7] || '').trim(); // H열
    if (!keyword) continue;

    const requestDate = (r[0] || '').trim();
    const uploadDate = (r[1] || '').trim();
    const channel = (r[2] || '').trim();
    const aiYn = (r[3] || '').trim();
    const contentId = (r[4] || '').trim();
    const branch = (r[5] || '').trim();
    const request = (r[8] || '').trim();
    const team = (r[9] || '').trim();
    const marketer = (r[10] || '').trim();
    const designer = (r[15] || '').trim();  // P열
    const completed = (r[16] || '').trim(); // Q열
    const workTime = (r[17] || '').trim();

    const title = branch ? `[${branch}] ${keyword}` : keyword;

    const descParts = [];
    if (channel) descParts.push(`채널: ${channel}`);
    if (aiYn) descParts.push(`AI여부: ${aiYn}`);
    if (contentId) descParts.push(`아이디: ${contentId}`);
    if (request) descParts.push(`요청사항: ${request}`);
    if (team) descParts.push(`팀: ${team}`);
    if (marketer) descParts.push(`담당마케터: ${marketer}`);
    if (workTime) descParts.push(`작업소요시간: ${workTime}`);

    // P열 비어있으면 대기
    let status = '대기';
    let progress = 0;
    if (completed === 'O' || completed === 'o') {
      status = '완료';
      progress = 100;
    } else if (designer) {
      status = '진행중';
      progress = 50;
    }

    let dueDate = null;
    if (uploadDate) {
      const parsed = parseDateString(uploadDate);
      if (parsed) dueDate = parsed;
    }

    const sheetRow = HEADER_ROW + 1 + i;

    let parsedRequestDate = null;
    if (requestDate) {
      parsedRequestDate = parseDateString(requestDate);
    }

    tasks.push({
      title,
      description: descParts.join('\n'),
      status,
      progress,
      assigneeName: designer || null,
      priority: 'mid',
      dueDate,
      sheetRow,
      requestDate: parsedRequestDate,
      part,
    });
  }

  return tasks;
}

function parseDateString(str) {
  if (!str) return null;

  const gvizMatch = str.match(/Date\((\d{4}),(\d+),(\d+)\)/);
  if (gvizMatch) {
    const y = gvizMatch[1];
    const m = String(Number(gvizMatch[2]) + 1).padStart(2, '0');
    const d = gvizMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const isoMatch = str.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }

  return null;
}

// ── Google Sheets API (앱 → 시트, 서비스 계정 인증) ──

let sheetsClient = null;

function getServiceAccountKey() {
  const keyEnv = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyEnv) return null;
  try {
    const decoded = Buffer.from(keyEnv, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch {
    try {
      return JSON.parse(keyEnv);
    } catch {
      return null;
    }
  }
}

async function getSheetsClient() {
  if (sheetsClient) return sheetsClient;

  const key = getServiceAccountKey();
  if (!key) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY 환경변수가 설정되지 않았습니다.');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

async function updateSheetCells(range, values) {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
}

/**
 * 보드 → 시트 push (파트별 시트 이름 사용)
 */
async function pushToSheet(sheetRow, part, data) {
  const config = PARTS[part];
  const sheetName = config ? config.sheetName : '국내입력';
  const updates = [];

  if (data.designerName !== undefined) {
    updates.push({
      range: `'${sheetName}'!P${sheetRow}`,
      values: [[data.designerName || '']],
    });
  }

  if (data.completed !== undefined) {
    updates.push({
      range: `'${sheetName}'!Q${sheetRow}`,
      values: [[data.completed ? 'O' : '']],
    });
  }

  for (const update of updates) {
    await updateSheetCells(update.range, update.values);
  }
}

module.exports = {
  fetchSheetCSV,
  mapSheetRowsToTasks,
  pushToSheet,
  HEADER_ROW,
  PARTS,
};
