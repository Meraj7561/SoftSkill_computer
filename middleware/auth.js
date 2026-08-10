const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'softskill_admin_token';

function issueToken(res, admin) {
    const token = jwt.sign(
        { id: admin.id, username: admin.username, full_name: admin.full_name },
        process.env.JWT_SECRET,
        { expiresIn: '12h' }
    );
    res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 12 * 60 * 60 * 1000,
    });
}

function clearToken(res) {
    res.clearCookie(COOKIE_NAME);
}

// Reads the token (if any) and attaches req.admin, but does not block the request.
function readAuth(req, res, next) {
    const token = req.cookies[COOKIE_NAME];
    if (token) {
        try {
            req.admin = jwt.verify(token, process.env.JWT_SECRET);
        } catch (e) {
            req.admin = null;
        }
    }
    next();
}

// Blocks the request unless logged in.
function requireAuth(req, res, next) {
    if (!req.admin) {
        return res.redirect('/admin/login');
    }
    next();
}

module.exports = { issueToken, clearToken, readAuth, requireAuth, COOKIE_NAME };
