const express = require('express');
const router = express.Router();
const pool = require('../db');
const { renderCourseCards } = require('../utils/render');

const DEFAULT_ANNOUNCEMENT = 'New batch starting soon! Limited seats available • Enroll now and get 20% discount • 100% Job Assistance guaranteed';

async function getAnnouncement() {
    let announcement = DEFAULT_ANNOUNCEMENT;
    try {
        const [rows] = await pool.query('SELECT value FROM settings WHERE setting_key = ? LIMIT 1', ['announcement']);
        const dataRow = Array.isArray(rows) ? rows[0] : rows;
        if (dataRow && dataRow.value) announcement = dataRow.value;
    } catch (err) {
        if (!pool.__jsonFallback && err && err.code === 'ER_NO_SUCH_TABLE') {
            try {
                await pool.query(`CREATE TABLE IF NOT EXISTS settings (setting_key VARCHAR(128) PRIMARY KEY, value TEXT)`);
            } catch (createErr) {
                console.error('Failed to create settings table:', createErr);
            }
        }
    }
    return announcement;
}

router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM courses WHERE status = 1 ORDER BY sort_order ASC, id ASC'
        );

        const coursesByCategory = {
            computer: [],
            university: [],
            programming: [],
            english: [],
        };

        for (const row of rows) {
            if (!coursesByCategory[row.category]) {
                coursesByCategory[row.category] = [];
            }
            coursesByCategory[row.category].push(row);
        }

        const announcement = await getAnnouncement();
        res.render('index', {
            coursesByCategory,
            renderCourseCards,
            announcement,
            apiBaseUrl: process.env.PUBLIC_API_URL || '',
            siteUrl: (process.env.PUBLIC_SITE_URL || 'https://softskill-node.vercel.app').replace(/\/$/, ''),
        });
    } catch (err) {
        console.error('Homepage error:', err && err.stack ? err.stack : err, 'db.__jsonFallback=', pool && pool.__jsonFallback);
        res.status(500).send('Something went wrong loading the page. Please check the database connection.');
    }
});

router.get('/robots.txt', (req, res) => {
        const siteUrl = (process.env.PUBLIC_SITE_URL || 'https://softskill-node.vercel.app').replace(/\/$/, '');
        res.type('text/plain').send(`User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`);
});

router.get('/sitemap.xml', (req, res) => {
        const siteUrl = (process.env.PUBLIC_SITE_URL || 'https://softskill-node.vercel.app').replace(/\/$/, '');
        res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url><loc>${siteUrl}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
    <url><loc>${siteUrl}/#courses</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>
    <url><loc>${siteUrl}/#verify</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>
    <url><loc>${siteUrl}/#contact</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>
</urlset>`);
});

module.exports = router;
