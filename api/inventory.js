// Vercel Serverless Function — NEAF 재고 시트를 JSON으로 반환
// 인증: 동일 서비스 계정 (GOOGLE_SERVICE_ACCOUNT_JSON)
// 시트: 108wBszwCVx1mj2oc6irivlA52d7wif8jxQgqdqs7SeM (이동 재고 탭)
// 캐시: Vercel Edge 60초

const { google } = require('googleapis');

const INVENTORY_SHEET_ID = '108wBszwCVx1mj2oc6irivlA52d7wif8jxQgqdqs7SeM';

function toNum(v) {
  if (v === '' || v == null || v === '-') return 0;
  if (typeof v === 'number') return v;
  const s = String(v).replace(/[, ]/g, '').replace(/[^\d.\-]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

let cached = null;

module.exports = async (req, res) => {
  try {
    const fresh = req.query && req.query.fresh === '1';
    const now = Date.now();
    if (!fresh && cached && (now - cached.at) < 60_000) {
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json(cached.data);
    }

    const credsRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!credsRaw) {
      return res.status(500).json({ ok: false, error: 'GOOGLE_SERVICE_ACCOUNT_JSON 환경변수 미설정' });
    }
    const credentials = JSON.parse(credsRaw);

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });
    const sheets = google.sheets({ version: 'v4', auth });

    // 시트 메타 정보 → 첫 번째 탭 또는 '이동 재고' 탭 사용
    const meta = await sheets.spreadsheets.get({
      spreadsheetId: INVENTORY_SHEET_ID,
      fields: 'sheets(properties(title))'
    });
    const sheetTitles = meta.data.sheets.map(s => s.properties.title);
    const TARGET_NAMES = ['이동 재고', '재고', 'Inventory', '시트1', 'Sheet1'];
    let tabName = TARGET_NAMES.find(n => sheetTitles.includes(n)) || sheetTitles[0];

    const valRes = await sheets.spreadsheets.values.get({
      spreadsheetId: INVENTORY_SHEET_ID,
      range: `'${tabName.replace(/'/g, "''")}'`,
      valueRenderOption: 'UNFORMATTED_VALUE'
    });
    const values = valRes.data.values || [];

    // NEAF 시트 컬럼:
    //  0: desc (List Price)        1: 제품명           2: ASIN
    //  3: 카톤 입수                4: 이동 재고        5: 해상 발송
    //  6: 항공 발송                7: 3PL Withon9      8: 3PL → 아마존
    //  9: Available               10: FC transfer     11: FC processing
    // 12: Inbound(working)        13: Inbound(shipped) 14: Total
    // 15: FC 재고수량             16: 총 재고
    const rows = [];
    for (let i = 1; i < values.length; i++) {
      const r = values[i] || [];
      if (!r[1]) continue; // 제품명 없으면 스킵
      rows.push({
        desc:           String(r[0] || '').trim(),
        name:           String(r[1] || '').trim(),
        asin:           String(r[2] || '').trim(),
        carton:         toNum(r[3]),
        transit:        toNum(r[4]),
        sea:            toNum(r[5]),
        air:            toNum(r[6]),
        tpl:            toNum(r[7]),
        toAmz:          toNum(r[8]),
        available:      toNum(r[9]),
        fcTransfer:     toNum(r[10]),
        fcProcessing:   toNum(r[11]),
        inboundWorking: toNum(r[12]),
        inboundShipped: toNum(r[13]),
        total:          toNum(r[14]),
        fcStock:        toNum(r[15]),
        grandTotal:     toNum(r[16]),
      });
    }

    const data = {
      ok: true,
      rows,
      tabName,
      updatedAt: new Date().toISOString(),
      diag: {
        rowCount: rows.length,
        sheetTitles
      }
    };

    cached = { data, at: now };
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.setHeader('X-Cache', 'MISS');
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || String(e) });
  }
};
