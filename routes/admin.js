const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const XLSX = require('xlsx');
const pool = require('../db');
const { issueToken, clearToken, readAuth, requireAuth } = require('../middleware/auth');

// In-memory storage: files are parsed immediately and never written to disk,
// which is required on Vercel's read-only/ephemeral filesystem.
const upload = multer({ storage: multer.memoryStorage() });

const CATEGORIES = {
    computer: 'Computer Courses',
    university: 'University Courses',
    programming: 'Programming',
    english: 'Spoken English',
};

// Every admin route below runs readAuth first (checks the JWT cookie, if any)
router.use(readAuth);

// ---------------------------------------------------------------------
// Login / Logout
// ---------------------------------------------------------------------
router.get('/login', (req, res) => {
    if (req.admin) return res.redirect('/admin/dashboard');
    res.render('admin/login', { error: null });
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.render('admin/login', { error: 'Please enter both username and password.' });
    }

    try {
        const [rows] = await pool.query('SELECT * FROM admins WHERE username = ? LIMIT 1', [username]);
        if (rows.length === 0) {
            return res.render('admin/login', { error: 'Invalid username or password.' });
        }

        const admin = rows[0];
        const match = await bcrypt.compare(password, admin.password);
        if (!match) {
            return res.render('admin/login', { error: 'Invalid username or password.' });
        }

        issueToken(res, admin);
        res.redirect('/admin/dashboard');
    } catch (err) {
        console.error('Login error:', err);
        res.render('admin/login', { error: 'Something went wrong. Please try again.' });
    }
});

router.get('/logout', (req, res) => {
    clearToken(res);
    res.redirect('/admin/login');
});

// Everything below this line requires login
router.use(requireAuth);

// ---------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------
router.get('/dashboard', async (req, res) => {
    try {
        const [[{ c: courseCount }]] = await pool.query('SELECT COUNT(*) c FROM courses');
        const [[{ c: certCount }]] = await pool.query('SELECT COUNT(*) c FROM certificates');
        const [[{ c: msgCount }]] = await pool.query('SELECT COUNT(*) c FROM contact_messages');
        const [[{ c: unreadCount }]] = await pool.query('SELECT COUNT(*) c FROM contact_messages WHERE is_read = 0');
        const [recentMessages] = await pool.query('SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 5');

        res.render('admin/dashboard', {
            admin: req.admin,
            pageTitle: 'Dashboard',
            activeNav: 'dashboard',
            courseCount,
            certCount,
            msgCount,
            unreadCount,
            recentMessages,
        });
    } catch (err) {
        console.error('Dashboard error:', err);
        res.status(500).send('Something went wrong loading the dashboard.');
    }
});

// ---------------------------------------------------------------------
// Courses — list / add / edit / delete
// ---------------------------------------------------------------------
router.get('/courses', async (req, res) => {
    const activeCategory = req.query.cat || 'all';
    let notice = req.query.deleted ? 'Course deleted successfully.' : (req.query.saved ? 'Course saved successfully.' : '');

    try {
        let courses;
        if (activeCategory !== 'all' && CATEGORIES[activeCategory]) {
            [courses] = await pool.query(
                'SELECT * FROM courses WHERE category = ? ORDER BY sort_order ASC, id DESC',
                [activeCategory]
            );
        } else {
            [courses] = await pool.query('SELECT * FROM courses ORDER BY category ASC, sort_order ASC, id DESC');
        }

        res.render('admin/courses', {
            admin: req.admin,
            pageTitle: 'Courses',
            activeNav: 'courses',
            categories: CATEGORIES,
            activeCategory,
            courses,
            notice,
            noticeType: 'success',
        });
    } catch (err) {
        console.error('Courses list error:', err);
        res.status(500).send('Something went wrong loading courses.');
    }
});

router.post('/courses/save', async (req, res) => {
    const id = parseInt(req.body.id, 10) || 0;
    let category = req.body.category || 'computer';
    if (!CATEGORIES[category]) category = 'computer';
    const courseCode = (req.body.course_code || '').trim();
    const courseName = (req.body.course_name || '').trim();
    const duration = (req.body.duration || '').trim();
    const description = (req.body.description || '').trim();
    const isFeatured = req.body.is_featured ? 1 : 0;
    const status = req.body.status ? 1 : 0;
    const sortOrder = parseInt(req.body.sort_order, 10) || 0;

    const redirectBack = `/admin/courses${req.body.cat ? '?cat=' + req.body.cat : ''}`;

    if (!courseName) {
        return res.redirect(redirectBack);
    }

    try {
        if (id > 0) {
            await pool.query(
                `UPDATE courses SET category=?, course_code=?, course_name=?, duration=?, description=?, is_featured=?, status=?, sort_order=? WHERE id=?`,
                [category, courseCode, courseName, duration, description, isFeatured, status, sortOrder, id]
            );
        } else {
            await pool.query(
                `INSERT INTO courses (category, course_code, course_name, duration, description, is_featured, status, sort_order) VALUES (?,?,?,?,?,?,?,?)`,
                [category, courseCode, courseName, duration, description, isFeatured, status, sortOrder]
            );
        }
        res.redirect(redirectBack + (redirectBack.includes('?') ? '&' : '?') + 'saved=1');
    } catch (err) {
        console.error('Save course error:', err);
        res.status(500).send('Something went wrong saving the course.');
    }
});

router.get('/courses/delete/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM courses WHERE id = ?', [req.params.id]);
        res.redirect('/admin/courses?deleted=1');
    } catch (err) {
        console.error('Delete course error:', err);
        res.status(500).send('Something went wrong deleting the course.');
    }
});

// ---------------------------------------------------------------------
// Certificates — upload Excel/CSV, list, search, delete
// ---------------------------------------------------------------------
router.get('/certificates', async (req, res) => {
    const search = (req.query.search || '').trim();
    const action = req.query.action;
    const editId = req.query.id;
    let notice = '';
    if (req.query.deleted) notice = 'Record deleted.';
    if (req.query.cleared) notice = 'All certificate records cleared.';
    if (req.query.saved) notice = 'Certificate record saved successfully.';
    if (req.query.uploaded) notice = decodeURIComponent(req.query.uploaded);

    try {
        let records;
        if (search) {
            const like = `%${search}%`;
            [records] = await pool.query(
                'SELECT * FROM certificates WHERE roll_no LIKE ? OR student_name LIKE ? ORDER BY id DESC LIMIT 200',
                [like, like]
            );
        } else {
            [records] = await pool.query('SELECT * FROM certificates ORDER BY id DESC LIMIT 200');
        }

        let certificateFormRecord = {
            id: '',
            roll_no: '',
            student_name: '',
            course_name: '',
            duration: '',
            grade: '',
            issue_date: '',
            father_name: '',
            extra_info: '',
        };
        let formMode = null;

        if (action === 'add') {
            formMode = 'add';
        } else if (action === 'edit' && editId) {
            const [[record]] = await pool.query('SELECT * FROM certificates WHERE id = ? LIMIT 1', [editId]);
            if (record) {
                certificateFormRecord = record;
                formMode = 'edit';
            }
        }

        res.render('admin/certificates', {
            admin: req.admin,
            pageTitle: 'Certificates',
            activeNav: 'certificates',
            records,
            search,
            notice,
            noticeType: 'success',
            certificateFormRecord,
            formMode,
        });
    } catch (err) {
        console.error('Certificates list error:', err);
        res.status(500).send('Something went wrong loading certificates.');
    }
});

function pick(row, keys) {
    for (const k of keys) {
        if (row[k] !== undefined && String(row[k]).trim() !== '') return String(row[k]).trim();
    }
    return '';
}

router.post('/certificates/upload', upload.single('cert_file'), async (req, res) => {
    if (!req.file) {
        return res.redirect('/admin/certificates?uploaded=' + encodeURIComponent('No file was uploaded.'));
    }

    try {
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        // header:1 => array-of-arrays, first row = headers
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });

        if (rows.length < 2) {
            return res.redirect('/admin/certificates?uploaded=' + encodeURIComponent('The file must contain a header row plus at least one data row.'));
        }

        const headers = rows[0].map((h) => String(h).trim().toLowerCase());
        let inserted = 0;
        let skipped = 0;

        for (let i = 1; i < rows.length; i++) {
            const rawRow = rows[i];
            if (!rawRow.some((v) => String(v).trim() !== '')) continue; // skip blank rows

            const record = {};
            headers.forEach((h, idx) => {
                record[h] = rawRow[idx] !== undefined ? String(rawRow[idx]).trim() : '';
            });

            const rollNo = pick(record, ['roll_no', 'rollno', 'roll no']);
            if (!rollNo) {
                skipped++;
                continue;
            }
            const studentName = pick(record, ['student_name', 'name', 'student name']);
            const courseName = pick(record, ['course_name', 'course']);
            const duration = pick(record, ['duration']);
            const grade = pick(record, ['grade', 'result']);
            const issueDate = pick(record, ['issue_date', 'date', 'issue date']);
            const fatherName = pick(record, ['father_name', "father's name", 'father name']);
            const extraInfo = pick(record, ['extra_info', 'remarks']);

            await pool.query(
                `INSERT INTO certificates (roll_no, student_name, course_name, duration, grade, issue_date, father_name, extra_info)
                 VALUES (?,?,?,?,?,?,?,?)
                 ON DUPLICATE KEY UPDATE
                    student_name = VALUES(student_name),
                    course_name  = VALUES(course_name),
                    duration     = VALUES(duration),
                    grade        = VALUES(grade),
                    issue_date   = VALUES(issue_date),
                    father_name  = VALUES(father_name),
                    extra_info   = VALUES(extra_info)`,
                [rollNo, studentName, courseName, duration, grade, issueDate, fatherName, extraInfo]
            );
            inserted++;
        }

        const msg = `Upload complete: ${inserted} record(s) processed` + (skipped ? `, ${skipped} row(s) skipped (missing roll number).` : '.');
        res.redirect('/admin/certificates?uploaded=' + encodeURIComponent(msg));
    } catch (err) {
        console.error('Certificate upload error:', err);
        res.redirect('/admin/certificates?uploaded=' + encodeURIComponent('Error reading file: ' + err.message));
    }
});

router.post('/certificates/save', async (req, res) => {
    const id = req.body.id ? req.body.id : null;
    const rollNo = (req.body.roll_no || '').trim();
    const studentName = (req.body.student_name || '').trim();
    const courseName = (req.body.course_name || '').trim();
    const duration = (req.body.duration || '').trim();
    const grade = (req.body.grade || '').trim();
    const issueDate = (req.body.issue_date || '').trim();
    const fatherName = (req.body.father_name || '').trim();
    const extraInfo = (req.body.extra_info || '').trim();

    if (!rollNo || !studentName) {
        return res.redirect('/admin/certificates?action=' + (id ? 'edit' : 'add') + (id ? '&id=' + encodeURIComponent(id) : '') + '&uploaded=' + encodeURIComponent('Roll number and student name are required.'));
    }

    try {
        if (id) {
            await pool.query(
                `UPDATE certificates SET roll_no = ?, student_name = ?, course_name = ?, duration = ?, grade = ?, issue_date = ?, father_name = ?, extra_info = ? WHERE id = ?`,
                [rollNo, studentName, courseName, duration, grade, issueDate, fatherName, extraInfo, id]
            );
        } else {
            await pool.query(
                `INSERT INTO certificates (roll_no, student_name, course_name, duration, grade, issue_date, father_name, extra_info)
                 VALUES (?,?,?,?,?,?,?,?)`,
                [rollNo, studentName, courseName, duration, grade, issueDate, fatherName, extraInfo]
            );
        }
        res.redirect('/admin/certificates?saved=1');
    } catch (err) {
        console.error('Certificate save error:', err);
        res.redirect('/admin/certificates?uploaded=' + encodeURIComponent('Error saving record: ' + err.message));
    }
});

router.get('/certificates/delete/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM certificates WHERE id = ?', [req.params.id]);
        res.redirect('/admin/certificates?deleted=1');
    } catch (err) {
        console.error('Delete certificate error:', err);
        res.status(500).send('Something went wrong.');
    }
});

router.get('/certificates/clear-all', async (req, res) => {
    try {
        await pool.query('TRUNCATE TABLE certificates');
        res.redirect('/admin/certificates?cleared=1');
    } catch (err) {
        console.error('Clear certificates error:', err);
        res.status(500).send('Something went wrong.');
    }
});

// ---------------------------------------------------------------------
// Contact Messages
// ---------------------------------------------------------------------
router.get('/messages', async (req, res) => {
    try {
        const [messages] = await pool.query('SELECT * FROM contact_messages ORDER BY created_at DESC');
        res.render('admin/messages', {
            admin: req.admin,
            pageTitle: 'Contact Messages',
            activeNav: 'messages',
            messages,
        });
    } catch (err) {
        console.error('Messages list error:', err);
        res.status(500).send('Something went wrong loading messages.');
    }
});

router.get('/messages/mark-read/:id', async (req, res) => {
    await pool.query('UPDATE contact_messages SET is_read = 1 WHERE id = ?', [req.params.id]);
    res.redirect('/admin/messages');
});

router.get('/messages/delete/:id', async (req, res) => {
    await pool.query('DELETE FROM contact_messages WHERE id = ?', [req.params.id]);
    res.redirect('/admin/messages');
});

// ---------------------------------------------------------------------
// Change Password
// ---------------------------------------------------------------------
router.get('/change-password', (req, res) => {
    res.render('admin/change-password', {
        admin: req.admin,
        pageTitle: 'Change Password',
        activeNav: 'password',
        notice: null,
        noticeType: 'success',
    });
});

router.post('/change-password', async (req, res) => {
    const { current_password, new_password, confirm_password } = req.body;
    let notice = '';
    let noticeType = 'success';

    try {
        const [rows] = await pool.query('SELECT password FROM admins WHERE id = ?', [req.admin.id]);
        const match = rows.length && (await bcrypt.compare(current_password || '', rows[0].password));

        if (!match) {
            notice = 'Current password is incorrect.';
            noticeType = 'error';
        } else if (!new_password || new_password.length < 6) {
            notice = 'New password must be at least 6 characters.';
            noticeType = 'error';
        } else if (new_password !== confirm_password) {
            notice = 'New password and confirmation do not match.';
            noticeType = 'error';
        } else {
            const hash = await bcrypt.hash(new_password, 10);
            await pool.query('UPDATE admins SET password = ? WHERE id = ?', [hash, req.admin.id]);
            notice = 'Password updated successfully.';
        }
    } catch (err) {
        console.error('Change password error:', err);
        notice = 'Something went wrong. Please try again.';
        noticeType = 'error';
    }

    res.render('admin/change-password', {
        admin: req.admin,
        pageTitle: 'Change Password',
        activeNav: 'password',
        notice,
        noticeType,
    });
});

module.exports = router;
