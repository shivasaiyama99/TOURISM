const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const nodemailer = require('nodemailer');
const Booking = require('../models/booking');
const TripPlan = require('../models/tripPlan');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

router.post('/alert', auth, async (req, res) => {
  try {
    // Accept flexible payload: bookingId OR explicit fields
    const { bookingId, userId, tripId, trustedContactEmail, destination } = req.body || {};
    let to = trustedContactEmail;
    let dest = destination;

    if (bookingId) {
      const b = await Booking.findOne({ _id: bookingId, user: req.user.id });
      if (!b) return res.status(404).json({ message: 'Booking not found' });
      to = to || b.trustedContactEmail;
      dest = dest || b.destination;
    } else if (tripId) {
      const p = await TripPlan.findOne({ _id: tripId, user: req.user.id });
      if (!p) return res.status(404).json({ message: 'Trip plan not found' });
      to = to || p.trustedContactEmail;
      dest = dest || p.destination;
    }

    if (!to) return res.status(400).json({ message: 'trustedContactEmail required' });

    const subject = `🚨 Safety Alert`;
    const text = `The user has not confirmed their safety during their trip to ${dest || 'the destination'}. Please try contacting them immediately.`;
    console.log('Attempting to send safety alert email →', to, subject);
    const info = await transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, text });
    console.log('Email sent:', info?.messageId || 'ok');
    return res.json({ message: 'Alert email sent' });
  } catch (e) {
    console.error('Safety alert email error:', e);
    res.status(500).json({ message: 'Failed to send alert email' });
  }
});

module.exports = router;


