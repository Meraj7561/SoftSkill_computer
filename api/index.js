const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cookieParser = require('cookie-parser');

const siteRoutes = require('../routes/site');
const apiRoutes = require('../routes/api');
const adminRoutes = require('../routes/admin');

// Quick startup sanity check — helps catch a missing/misnamed .env file
// immediately instead of a confusing "Access denied for user ''@..." error later.
console.log('--- SoftSkill startup config check ---');
console.log('DB_HOST:', process.env.DB_HOST || '(missing!)');
console.log('DB_NAME:', process.env.DB_NAME || '(missing!)');
console.log('DB_USER:', process.env.DB_USER || '(missing!)');
console.log('DB_PASS set:', process.env.DB_PASS !== undefined && process.env.DB_PASS !== '' ? 'yes' : '(empty - ok if your MySQL root has no password)');
console.log('---------------------------------------');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/', siteRoutes);
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);

app.use((req, res) => {
    res.status(404).send('Page not found.');
});

// When running locally (npm start / npm run dev), start a normal server.
// On Vercel, this file is imported as a serverless function instead,
// so app.listen is skipped there.
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`SoftSkill server running at http://localhost:${PORT}`);
    });
}

module.exports = app;
