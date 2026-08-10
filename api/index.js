require('dotenv').config();
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const siteRoutes = require('../routes/site');
const apiRoutes = require('../routes/api');
const adminRoutes = require('../routes/admin');

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
