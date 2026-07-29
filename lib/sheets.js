const { google } = require('googleapis');

const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1rAEidqqq385c04hd4TtHsVNDaV2pDrciBB17hlv8aP4';
const SHEET_GID = process.env.GOOGLE_SHEET_GID || '269421064';
const HEADER_ROW = 11; // 헤더가 11행

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
  const rows = lines.map(l => parseCSVLine(l));
  return rows;
}

/**
 * 공개 시트에서 CSV 읽기
 * gviz/tq?tqx=out:csv&gid=... 엔드포인트 사용
 */
async function fetchSheetCSV() {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${SHEET_GID}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`시트 CSV 가져오기 실패: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  return parseCSV(text);
}

/**
 * 시트 데이터를 태스크 배열로 변환
 * 헤더: A=요청일자, B=업로드일자, C=채널구분, D=AI여부, E=아이디, F=지점,
 *        G=?(빈열), H=키워드(시술), I=요청사항, J=팀, K=담당마케터,
 *        ... P=디자이너, Q=작업완료, R=작업소요시간
 *
 * CSV 출력은 헤더행부터 시작하므로 첫 행이 헤더
 */
function mapSheetRowsToTasks(rows) {
  if (rows.length <= 1) return []; // 헤더만 있으면 빈 배열

  const header = rows[0];
  const dataRows = rows.slice(1);
  const tasks = [];

  for (let i = 0; i < dataRows.length; i++) {
    const r = dataRows[i];
    // 빈 행 스킵 (키워드가 없으면 유효하지 않은 행)
    const keyword = (r[7] || '').trim(); // H열 = 키워드(시술)
    if (!keyword) continue;

    const requestDate = (r[0] || '').trim();   // A = 요청일자
    const uploadDate = (r[1] || '').trim();    // B = 업로드일자
    const channel = (r[2] || '').trim();        // C = 채널구분
    const aiYn = (r[3] || '').trim();           // D = AI여부
    const contentId = (r[4] || '').trim();      // E = 아이디
    const branch = (r[5] || '').trim();         // F = 지점
    const request = (r[8] || '').trim();        // I = 요청사항
    const team = (r[9] || '').trim();           // J = 팀
    const marketer = (r[10] || '').trim();      // K = 담당마케터
    const designer = (r[15] || '').trim();      // P = 디자이너
    const completed = (r[16] || '').trim();     // Q = 작업완료
    const workTime = (r[17] || '').trim();      // R = 작업소요시간

    // title: [지점] 키워드
    const title = branch ? `[${branch}] ${keyword}` : keyword;

    // description: 상세 정보 조합
    const descParts = [];
    if (channel) descParts.push(`채널: ${channel}`);
    if (aiYn) descParts.push(`AI여부: ${aiYn}`);
    if (contentId) descParts.push(`아이디: ${contentId}`);
    if (request) descParts.push(`요청사항: ${request}`);
    if (team) descParts.push(`팀: ${team}`);
    if (marketer) descParts.push(`담당마케터: ${marketer}`);
    if (workTime) descParts.push(`작업소요시간: ${workTime}`);

    // status
    let status = '대기';
    if (completed === 'O' || completed === 'o') {
      status = '완료';
    } else if (designer) {
      status = '진행중';
    }

    // dueDate: 업로드일자 파싱 시도
    let dueDate = null;
    if (uploadDate) {
      const parsed = parseDateString(uploadDate);
      if (parsed) dueDate = parsed;
    }

    // sheetRow: 실제 시트 행 번호 = 헤더행(11) + 1(데이터 시작) + i
    const sheetRow = HEADER_ROW + 1 + i;

    // requestDate 파싱
    let parsedRequestDate = null;
    if (requestDate) {
      parsedRequestDate = parseDateString(requestDate);
    }

    tasks.push({
      title,
      description: descParts.join('\n'),
      status,
      assigneeName: designer || null,
      priority: 'mid',
      dueDate,
      sheetRow,
      requestDate: parsedRequestDate,
    });
  }

  return tasks;
}

/**
 * 날짜 문자열 파싱 (다양한 형식 지원)
 */
function parseDateString(str) {
  if (!str) return null;

  // "Date(2025,0,15)" 형식 (gviz CSV 출력 형태)
  const gvizMatch = str.match(/Date\((\d{4}),(\d+),(\d+)\)/);
  if (gvizMatch) {
    const y = gvizMatch[1];
    const m = String(Number(gvizMatch[2]) + 1).padStart(2, '0');
    const d = gvizMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // "2025-01-15" 또는 "2025/01/15"
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
    // base64 인코딩된 JSON
    const decoded = Buffer.from(keyEnv, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch {
    // 직접 JSON 문자열
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

/**
 * 시트의 특정 셀에 값 업데이트
 * @param {string} range - 예: "Sheet1!P12"
 * @param {string[][]} values - 2D 배열
 */
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
 * 보드 → 시트 push: 디자이너(P열)와 작업완료(Q열) 업데이트
 * @param {number} sheetRow - 시트 행 번호
 * @param {object} data - { designerName, completed }
 */
async function pushToSheet(sheetRow, data) {
  const updates = [];

  if (data.designerName !== undefined) {
    // P열 (디자이너)
    updates.push({
      range: `P${sheetRow}`,
      values: [[data.designerName || '']],
    });
  }

  if (data.completed !== undefined) {
    // Q열 (작업완료)
    updates.push({
      range: `Q${sheetRow}`,
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
};
