const express = require('express');
const router = express.Router();
const pool = require('../db');
const { renderCourseCards } = require('../utils/render');

router.get('/', async (req, res) => {
    const coursesByCategory = {
        computer: [],
        university: [],
        programming: [],
        english: [],
    };

    try {
        const [rows] = await pool.query(
            'SELECT * FROM courses WHERE status = 1 ORDER BY sort_order ASC, id ASC'
        );

        for (const row of rows) {
            if (!coursesByCategory[row.category]) {
                coursesByCategory[row.category] = [];
            }
            coursesByCategory[row.category].push(row);
        }
    } catch (err) {
        console.error('Homepage error:', err);
    }

    res.render('index', { coursesByCategory, renderCourseCards });
});

module.exports = router;
