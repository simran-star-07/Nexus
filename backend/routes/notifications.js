const router = require('express').Router();
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');

// GET /api/notifications
router.get('/', auth, async (req, res) => {
  const notifications = await Notification.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50);
  const unreadCount = await Notification.countDocuments({ userId: req.user._id, isRead: false });
  res.json({ notifications, unreadCount });
});

// POST /api/notifications/mark-read
router.post('/mark-read', auth, async (req, res) => {
  const { ids } = req.body;
  if (ids && ids.length) {
    await Notification.updateMany({ _id: { $in: ids }, userId: req.user._id }, { isRead: true });
  } else {
    await Notification.updateMany({ userId: req.user._id }, { isRead: true });
  }
  res.json({ message: 'Marked as read.' });
});

module.exports = router;
