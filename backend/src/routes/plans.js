const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const TripPlan = require('../models/tripPlan');
const Booking = require('../models/booking');

// Unified plans endpoint: returns both planned trip plans and booked trips
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const [plans, bookings] = await Promise.all([
      TripPlan.find({ user: userId }).lean(),
      Booking.find({ user: userId }).lean(),
    ]);

    // Normalize fields for UI
    const normalizedPlans = [
      ...plans.map((p) => ({
        _id: p._id,
        destination: p.destination,
        numberOfPeople: p.numberOfPeople,
        budget: p.budget,
        tripType: p.tripType,
        itineraryText: p.itineraryText,
        startDate: p.startDate,
        endDate: p.endDate,
        safetyMonitoring: p.safetyMonitoring,
        trustedContactEmail: p.trustedContactEmail,
        lastSafetyCheck: p.lastSafetyCheck,
        status: p.status || 'planned',
        createdAt: p.createdAt,
        destinations: p.destinations || [],
        source: 'plan',
      })),
      ...bookings.map((b) => ({
        _id: b._id,
        destination: b.destination,
        numberOfPeople: b.numberOfPeople,
        budget: b.budget,
        tripType: b.tripType,
        itineraryText: b.itineraryText,
        startDate: b.startDate,
        endDate: b.endDate,
        safetyMonitoring: b.safetyMonitoring,
        trustedContactEmail: b.trustedContactEmail,
        lastSafetyCheck: b.lastSafetyCheck,
        status: b.status || 'booked',
        createdAt: b.createdAt,
        destinations: Array.isArray(b.destinations) ? b.destinations : [],
        source: 'booking',
      })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ plans: normalizedPlans });
  } catch (e) {
    console.error('Unified plans fetch error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


