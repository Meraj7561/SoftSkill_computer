const express = require('express');
const router = express.Router();
const pool = require('../db');

// ---------------------------------------------------------------------
// POST /api/contact
// Saves the enquiry, then returns a WhatsApp deep-link so the front-end
// can automatically open WhatsApp with the message pre-filled.
// ---------------------------------------------------------------------
router.post('/contact', async (req, res) => {
    const name = (req.body.name || '').trim();
    const email = (req.body.email || '').trim();
    const phone = (req.body.phone || '').trim();
    const course = (req.body.course || '').trim();
    const message = (req.body.message || '').trim();

    if (!name || !email || !phone) {
        return res.status(422).json({ success: false, message: 'Name, email and phone are required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(422).json({ success: false, message: 'Please enter a valid email address.' });
    }

    try {
        await pool.query(
            'INSERT INTO contact_messages (name, email, phone, course, message) VALUES (?, ?, ?, ?, ?)',
            [name, email, phone, course, message]
        );

        const waText =
            `New Enquiry from Website\n` +
            `Name: ${name}\n` +
            `Email: ${email}\n` +
            `Phone: ${phone}\n` +
            `Course: ${course || 'Not specified'}\n` +
            `Message: ${message || '-'}`;

        const whatsappUrl = `https://wa.me/${process.env.WHATSAPP_NUMBER}?text=${encodeURIComponent(waText)}`;

        res.json({
            success: true,
            message: 'Thank you! Your message has been received.',
            whatsapp_url: whatsappUrl,
        });
    } catch (err) {
        console.error('Contact form error:', err);
        res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
    }
});

// ---------------------------------------------------------------------
// GET/POST /api/verify-certificate
// ---------------------------------------------------------------------
router.all('/verify-certificate', async (req, res) => {
    const rollNo = ((req.query.roll_no || req.body.roll_no) || '').trim();

    if (!rollNo) {
        return res.status(422).json({ success: false, message: 'Please enter a roll number.' });
    }

    try {
        const [rows] = await pool.query(
            `SELECT roll_no, student_name, course_name, duration, grade, issue_date, father_name, extra_info
             FROM certificates WHERE roll_no = ? LIMIT 1`,
            [rollNo]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No certificate found for this roll number. Please check and try again.',
            });
        }

        res.json({ success: true, data: rows[0] });
    } catch (err) {
        console.error('Verify certificate error:', err);
        res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
    }
});

module.exports = router;
