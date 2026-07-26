const express = require('express');
const router = express.Router();
const pool = require('../db');
const { renderCourseCards } = require('../utils/render');

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

        res.render('index', { coursesByCategory, renderCourseCards });
    } catch (err) {
        console.error('Homepage error:', err);
        res.status(500).send('Something went wrong loading the page. Please check the database connection.');
    }
});

module.exports = router;
