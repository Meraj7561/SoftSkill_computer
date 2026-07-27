const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const https = require('https');

const isVercel = Boolean(process.env.VERCEL);
const jsonBlobId = process.env.JSONBLOB_ID || '019fa08f-1926-73c7-8910-ef35f1496c08';
const useJsonFallback = isVercel;

const nowString = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
const cacheDir = path.join(require('os').tmpdir(), 'softskill-node');
const cacheFile = path.join(cacheDir, 'softskill-db.json');
const jsonBlobPath = `/api/jsonBlob/${jsonBlobId}`;

const defaultData = () => ({
  admins: [],
  courses: [],
  certificates: [],
  contact_messages: [],
});

const seedData = (data) => {
  data.admins = Array.isArray(data.admins) ? data.admins : [];
  data.courses = Array.isArray(data.courses) ? data.courses : [];
  data.certificates = Array.isArray(data.certificates) ? data.certificates : [];
  data.contact_messages = Array.isArray(data.contact_messages) ? data.contact_messages : [];

  if (data.admins.length === 0) {
    data.admins.push({
      id: 1,
      username: 'admin',
      password: '$2b$10$wUyp5.CPYhH/mGvtep71EODNJfNtbYw0jeAHfff4kqU1MGDhnBqk6',
      full_name: 'Administrator',
      created_at: nowString(),
    });
  }

  if (data.courses.length === 0) {
    const seedCourses = [
      ['computer', 'COA', 'Certificate in Office Automation (COA)', '3 Months', 'Master MS Office suite and essential productivity tools', 0, 1],
      ['computer', 'CFA', 'Certificate in Financial Accounting (CFA)', '3 Months', 'Learn accounting fundamentals with Tally', 0, 2],
      ['computer', 'CDP', 'Certificate in Desktop Publishing (CDP)', '3 Months', 'Design stunning graphics and layouts', 0, 3],
      ['computer', 'CWD', 'Certificate in Web Designing (CWD)', '3 Months', 'Build beautiful, responsive websites', 0, 4],
      ['computer', 'CBH', 'Certificate in Basic Hardware (CBH)', '3 Months', 'Understand computer hardware and troubleshooting', 0, 5],
      ['computer', 'CCAD', 'Certificate in Computer Aided Design (CCAD)', '4 Months', 'Learn AutoCAD and technical drawing', 0, 6],
      ['computer', 'DCA', 'Diploma in Computer Application (DCA)', '6 Months', 'Comprehensive computer skills training', 1, 7],
      ['computer', 'DTA', 'Diploma in Taxation & Accountancy (DTA)', '6 Months', 'Master tax and accounting software', 0, 8],
      ['computer', 'DTP', 'Diploma in Desktop Publishing (DTP)', '6 Months', 'Advanced graphic design and publishing', 0, 9],
      ['computer', 'DCAD', 'Diploma in Computer Aided Design (DCAD)', '6 Months', 'Advanced CAD and 3D modeling', 0, 10],
      ['computer', 'DWD', 'Diploma in Web Designing (DWD)', '6 Months', 'Professional web development skills', 0, 11],
      ['computer', 'DCAT', 'Diploma in Computer Application with Tally (DCAT)', '9 Months', 'Computer skills plus accounting expertise', 0, 12],
      ['computer', 'ADCA', 'Advance Diploma in Computer Application (ADCA)', '12 Months', 'Complete IT professional training program', 1, 13],
      ['english', 'ENG', 'Spoken English & Personality Development', '3 Months', 'Transform your overall personality', 0, 1],
    ];

    data.courses = seedCourses.map((course, idx) => ({
      id: idx + 1,
      category: course[0],
      course_code: course[1],
      course_name: course[2],
      duration: course[3],
      description: course[4],
      is_featured: course[5],
      sort_order: course[6],
      status: 1,
      created_at: nowString(),
      updated_at: nowString(),
    }));
  }

  if (data.certificates.length === 0) {
    data.certificates.push({
      id: 1,
      roll_no: 'SS-001',
      student_name: 'Test Student',
      course_name: 'Certificate in Office Automation (COA)',
      duration: '3 Months',
      grade: 'A+',
      issue_date: '2026-07-01',
      father_name: 'Test Father',
      extra_info: 'Sample certificate record for verification testing.',
      uploaded_at: nowString(),
      updated_at: nowString(),
    });
  }

  return data;
};

const ensureCacheDir = () => {
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
};

const writeLocalCache = (data) => {
  try {
    ensureCacheDir();
    fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Local JSON cache save failed:', err);
  }
};

const loadLocalCache = () => {
  try {
    if (fs.existsSync(cacheFile)) {
      return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    }
  } catch (err) {
    console.error('Local JSON cache load failed:', err);
  }
  return null;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchRemoteJsonOnce = () => new Promise((resolve, reject) => {
  const req = https.get(
    {
      hostname: 'jsonblob.com',
      path: `${jsonBlobPath}?_=${Date.now()}`,
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        'User-Agent': 'softskill-node',
      },
      timeout: 10000,
    },
    (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`Remote JSON blob load failed: ${res.statusCode}`));
        }
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          reject(err);
        }
      });
    }
  );

  req.on('error', reject);
  req.on('timeout', () => {
    req.destroy(new Error('Remote JSON blob request timed out'));
  });
});

const fetchRemoteJson = async () => {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await fetchRemoteJsonOnce();
    } catch (err) {
      lastError = err;
      if (attempt < 3) {
        await sleep(200 * attempt);
      }
    }
  }
  throw lastError;
};

const saveRemoteJson = (data) => new Promise((resolve, reject) => {
  const text = JSON.stringify(data, null, 2);
  const req = https.request(
    {
      hostname: 'jsonblob.com',
      path: jsonBlobPath,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(text),
      },
      timeout: 10000,
    },
    (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          return resolve();
        }
        reject(new Error(`Remote JSON blob save failed: ${res.statusCode} ${body}`));
      });
    }
  );

  req.on('error', reject);
  req.on('timeout', () => {
    req.destroy(new Error('Remote JSON blob save timed out'));
  });
  req.write(text);
  req.end();
});

const loadJsonDb = async () => {
  let data = null;
  let loadedFromRemote = false;
  let loadedFromCache = false;

  try {
    data = await fetchRemoteJson();
    loadedFromRemote = true;
    console.log('Loaded JSON DB from remote blob', jsonBlobId);
  } catch (err) {
    console.error('Remote JSON blob load failed:', err.message);
  }

  if (!data) {
    data = loadLocalCache();
    if (data) {
      loadedFromCache = true;
      console.log('Loaded JSON DB from local cache');
    }
  }

  if (!data) {
    data = defaultData();
    console.log('Initializing fresh JSON DB seed data');
  }

  data = seedData(data);
  writeLocalCache(data);

  if (loadedFromRemote || loadedFromCache) {
    try {
      await saveRemoteJson(data);
      console.log('Saved JSON DB to remote blob', jsonBlobId);
    } catch (err) {
      console.error('Remote JSON blob save failed on init:', err.message);
    }
  } else {
    console.log('Skipping remote save on init because remote load failed and no local cache exists');
  }

  return { data };
};

const assertJsonId = (collection, id) => collection.find((item) => Number(item.id) === Number(id));

if (useJsonFallback) {
  const loadJsonState = async () => {
    let data = null;
    let loadedFromRemote = false;
    let loadedFromCache = false;

    try {
      data = await fetchRemoteJson();
      loadedFromRemote = true;
      console.log('Loaded JSON DB from remote blob', jsonBlobId);
    } catch (err) {
      console.error('Remote JSON blob load failed:', err.message);
    }

    if (!data) {
      data = loadLocalCache();
      if (data) {
        loadedFromCache = true;
        console.log('Loaded JSON DB from local cache');
      }
    }

    if (!data) {
      data = defaultData();
      console.log('Initializing fresh JSON DB seed data');
    }

    data = seedData(data);
    writeLocalCache(data);

    return data;
  };

  const saveRemoteJsonWithRetry = async (data) => {
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        await saveRemoteJson(data);
        return;
      } catch (err) {
        lastError = err;
        console.error(`Remote JSON blob save attempt ${attempt} failed:`, err.message);
        if (attempt < 3) {
          await sleep(200 * attempt);
        }
      }
    }
    throw lastError;
  };

  const normalizeForCompare = (obj) => {
    const clone = {
      admins: Array.isArray(obj.admins) ? [...obj.admins] : [],
      courses: Array.isArray(obj.courses) ? [...obj.courses] : [],
      certificates: Array.isArray(obj.certificates) ? [...obj.certificates] : [],
      contact_messages: Array.isArray(obj.contact_messages) ? [...obj.contact_messages] : [],
    };
    const sortById = (a, b) => (Number(a.id) || 0) - (Number(b.id) || 0);
    clone.admins.sort(sortById);
    clone.courses.sort(sortById);
    clone.certificates.sort(sortById);
    clone.contact_messages.sort(sortById);
    return JSON.stringify(clone);
  };

  // Compare-and-retry save to reduce lost updates across concurrent instances.
  const saveRemoteJsonCAS = async (localData) => {
    let lastErr;
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      try {
        // fetch latest remote
        let remote = null;
        try {
          remote = await fetchRemoteJson();
        } catch (err) {
          console.error('Could not fetch remote during CAS save attempt', attempt, err.message);
        }

        const merged = mergeRemoteIntoLocal(remote, localData);
        // write local cache immediately
        writeLocalCache(merged);

        await saveRemoteJson(merged);

        // verify remote now matches merged (best-effort)
        let verify = null;
        try {
          verify = await fetchRemoteJson();
        } catch (err) {
          console.error('Could not re-fetch remote after save to verify:', err.message);
        }

        if (!verify) {
          // assume success if we couldn't re-fetch, but allow retries
          return;
        }

        const a = normalizeForCompare(merged);
        const b = normalizeForCompare(verify);
        if (a === b) {
          console.log('Remote JSON blob verified after save');
          return;
        }

        console.warn('Remote JSON blob changed between fetch and verify, retrying CAS save', attempt);
        // remote changed under us; loop will refetch and merge again
        await sleep(150 * attempt);
      } catch (err) {
        lastErr = err;
        console.error('CAS save attempt failed:', err.message);
        await sleep(200 * attempt);
      }
    }
    if (lastErr) throw lastErr;
  };

  const mergeCollections = (remoteCol = [], localCol = []) => {
    const map = new Map();
    for (const item of remoteCol) map.set(String(item.id), item);
    for (const item of localCol) map.set(String(item.id), item);
    return Array.from(map.values()).sort((a, b) => Number(a.id) - Number(b.id));
  };

  const mergeRemoteIntoLocal = (remote, local) => {
    if (!remote) return local;
    const out = {};
    out.admins = mergeCollections(remote.admins || [], local.admins || []);
    out.courses = mergeCollections(remote.courses || [], local.courses || []);
    out.certificates = mergeCollections(remote.certificates || [], local.certificates || []);
    out.contact_messages = mergeCollections(remote.contact_messages || [], local.contact_messages || []);
    return out;
  };

  const saveData = async (data) => {
    // always persist local cache first
    writeLocalCache(data);
    try {
      await saveRemoteJsonCAS(data);
    } catch (err) {
      console.error('Remote JSON blob save failed after retries:', err.message);
      // leave local cache in place so future instances can recover
    }
  };

  const query = async (sql, params = []) => {
    const normalized = sql.replace(/\s+/g, ' ').trim().toLowerCase();
    const values = Array.isArray(params) ? params : [params];
    let data = await loadJsonState();

    const ensureFreshState = async () => {
      data = await loadJsonState();
    };

    if (normalized.startsWith('select password from admins where id = ?')) {
      const row = assertJsonId(data.admins, values[0]);
      return [[row ? { password: row.password } : []], []];
    }

    if (normalized.startsWith('select * from admins where username = ? limit 1')) {
      const row = data.admins.find((admin) => admin.username === values[0]);
      return [[row].filter(Boolean), []];
    }

    if (normalized.startsWith('select count(*) c from courses')) {
      return [[{ c: data.courses.length }], []];
    }

    if (normalized.startsWith('select count(*) c from certificates')) {
      return [[{ c: data.certificates.length }], []];
    }

    if (normalized.startsWith('select count(*) c from contact_messages')) {
      return [[{ c: data.contact_messages.length }], []];
    }

    if (normalized.startsWith('select count(*) c from contact_messages where is_read = 0')) {
      return [[{ c: data.contact_messages.filter((r) => Number(r.is_read) === 0).length }], []];
    }

    if (normalized.startsWith('select * from contact_messages order by created_at desc limit 5')) {
      const rows = [...data.contact_messages].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, 5);
      return [rows, []];
    }

    if (normalized.startsWith('select * from contact_messages order by created_at desc')) {
      const rows = [...data.contact_messages].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      return [rows, []];
    }

    if (normalized.startsWith('insert into contact_messages')) {
      await ensureFreshState();
      const row = {
        id: data.contact_messages.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1,
        name: values[0],
        email: values[1],
        phone: values[2],
        course: values[3],
        message: values[4],
        is_read: 0,
        created_at: nowString(),
      };
      data.contact_messages.push(row);
      await saveData(data);
      return [{ insertId: row.id, affectedRows: 1 }, []];
    }

    if (normalized.startsWith('update contact_messages set is_read = 1 where id = ?')) {
      await ensureFreshState();
      const row = assertJsonId(data.contact_messages, values[0]);
      if (row) {
        row.is_read = 1;
        await saveData(data);
        return [{ affectedRows: 1 }, []];
      }
      return [{ affectedRows: 0 }, []];
    }

    if (normalized.startsWith('delete from contact_messages where id = ?')) {
      await ensureFreshState();
      const before = data.contact_messages.length;
      data.contact_messages = data.contact_messages.filter((item) => Number(item.id) !== Number(values[0]));
      await saveData(data);
      return [{ affectedRows: before - data.contact_messages.length }, []];
    }

    if (normalized.startsWith('select * from courses where status = 1 order by sort_order asc, id asc')) {
      const rows = [...data.courses].filter((course) => Number(course.status) === 1)
        .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
      return [rows, []];
    }

    if (normalized.startsWith('select * from courses where category = ? order by sort_order asc, id desc')) {
      const rows = [...data.courses].filter((course) => course.category === values[0])
        .sort((a, b) => a.sort_order - b.sort_order || b.id - a.id);
      return [rows, []];
    }

    if (normalized.startsWith('select * from courses order by category asc, sort_order asc, id desc')) {
      const rows = [...data.courses].sort((a, b) => {
        if (a.category < b.category) return -1;
        if (a.category > b.category) return 1;
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
        return b.id - a.id;
      });
      return [rows, []];
    }

    if (normalized.startsWith('insert into courses')) {
      await ensureFreshState();
      const row = {
        id: data.courses.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1,
        category: values[0],
        course_code: values[1],
        course_name: values[2],
        duration: values[3],
        description: values[4],
        is_featured: Number(values[5]),
        status: Number(values[6]),
        sort_order: Number(values[7]),
        created_at: nowString(),
        updated_at: nowString(),
      };
      data.courses.push(row);
      await saveData(data);
      return [{ insertId: row.id, affectedRows: 1 }, []];
    }

    if (normalized.startsWith('update courses set category=?')) {
      await ensureFreshState();
      const row = assertJsonId(data.courses, values[7]);
      if (row) {
        row.category = values[0];
        row.course_code = values[1];
        row.course_name = values[2];
        row.duration = values[3];
        row.description = values[4];
        row.is_featured = Number(values[5]);
        row.status = Number(values[6]);
        row.sort_order = Number(values[7]);
        row.updated_at = nowString();
        await saveData(data);
        return [{ affectedRows: 1 }, []];
      }
      return [{ affectedRows: 0 }, []];
    }

    if (normalized.startsWith('delete from courses where id = ?')) {
      await ensureFreshState();
      const before = data.courses.length;
      data.courses = data.courses.filter((item) => Number(item.id) !== Number(values[0]));
      await saveData(data);
      return [{ affectedRows: before - data.courses.length }, []];
    }

    if (normalized.startsWith('select * from certificates where roll_no like ? or student_name like ? order by id desc limit 200')) {
      const needle = String(values[0]).replace(/%/g, '').toLowerCase();
      const rows = data.certificates.filter((cert) =>
        String(cert.roll_no).toLowerCase().includes(needle) || String(cert.student_name).toLowerCase().includes(needle)
      ).sort((a, b) => b.id - a.id).slice(0, 200);
      return [rows, []];
    }

    if (normalized.startsWith('select * from certificates order by id desc limit 200')) {
      const rows = [...data.certificates].sort((a, b) => b.id - a.id).slice(0, 200);
      return [rows, []];
    }

    if (normalized.startsWith('select * from certificates order by id desc limit')) {
      const limitMatch = normalized.match(/limit\s+(\d+)/);
      const limit = limitMatch ? Number(limitMatch[1]) : 1;
      const rows = [...data.certificates].sort((a, b) => b.id - a.id).slice(0, limit);
      return [rows, []];
    }

    if (normalized.startsWith('select roll_no, student_name, course_name, duration, grade, issue_date, father_name, extra_info from certificates where roll_no = ? limit 1')) {
      const row = data.certificates.find((cert) => String(cert.roll_no) === String(values[0]));
      return [[row].filter(Boolean), []];
    }

    if (normalized.startsWith('select * from certificates where roll_no = ? limit 1')) {
      const row = data.certificates.find((cert) => String(cert.roll_no) === String(values[0]));
      return [[row].filter(Boolean), []];
    }

    if (normalized.startsWith('select * from certificates where id = ? limit 1')) {
      const row = assertJsonId(data.certificates, values[0]);
      return [[row].filter(Boolean), []];
    }

    if (normalized === 'truncate table certificates') {
      data.certificates = [];
      await saveData(data);
      return [{ affectedRows: 0 }, []];
    }

    if (normalized.startsWith('insert into certificates')) {
      await ensureFreshState();
      const row = {
        id: data.certificates.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1,
        roll_no: values[0],
        student_name: values[1],
        course_name: values[2],
        duration: values[3],
        grade: values[4],
        issue_date: values[5],
        father_name: values[6],
        extra_info: values[7],
        uploaded_at: nowString(),
        updated_at: nowString(),
      };
      data.certificates.push(row);
      await saveData(data);
      return [{ insertId: row.id, affectedRows: 1 }, []];
    }

    if (normalized.startsWith('update certificates set roll_no = ?')) {
      await ensureFreshState();
      const row = assertJsonId(data.certificates, values[8]);
      if (row) {
        row.roll_no = values[0];
        row.student_name = values[1];
        row.course_name = values[2];
        row.duration = values[3];
        row.grade = values[4];
        row.issue_date = values[5];
        row.father_name = values[6];
        row.extra_info = values[7];
        row.updated_at = nowString();
        await saveData(data);
        return [{ affectedRows: 1 }, []];
      }
      return [{ affectedRows: 0 }, []];
    }

    if (normalized.startsWith('delete from certificates where id = ?')) {
      await ensureFreshState();
      const before = data.certificates.length;
      data.certificates = data.certificates.filter((item) => Number(item.id) !== Number(values[0]));
      await saveData(data);
      return [{ affectedRows: before - data.certificates.length }, []];
    }

    if (normalized.startsWith('truncate table certificates')) {
      await ensureFreshState();
      data.certificates = [];
      await saveData(data);
      return [[], []];
    }

    if (normalized.startsWith('update admins set password = ? where id = ?')) {
      await ensureFreshState();
      const row = assertJsonId(data.admins, values[1]);
      if (row) {
        row.password = values[0];
        await saveData(data);
        return [{ affectedRows: 1 }, []];
      }
      return [{ affectedRows: 0 }, []];
    }

    console.error('JSON DB could not execute query:', sql, values);
    return [[], []];
  };

  module.exports = { query };
  module.exports.__jsonFallback = true;
} else {
  let pool = global.__softskillPool;

  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
    });
    global.__softskillPool = pool;
  }

  // Mark pool so callers can detect whether the JSON fallback is active
  pool.__jsonFallback = false;
  module.exports = pool;
}
