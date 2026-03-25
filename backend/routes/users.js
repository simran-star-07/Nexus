const router = require('express').Router();
const User = require('../models/User');
const AccessibilitySettings = require('../models/AccessibilitySettings');
const LoginActivity = require('../models/LoginActivity');
const { auth } = require('../middleware/auth');
const upload = require('../middleware/upload');

// GET /api/users/profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash -pinHash -vibrationPattern');
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/users/accessibility
router.get('/accessibility', auth, async (req, res) => {
  try {
    let settings = await AccessibilitySettings.findOne({ userId: req.user._id });
    if (!settings) settings = await AccessibilitySettings.create({ userId: req.user._id });
    res.json({ settings });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// PUT /api/users/accessibility
router.put('/accessibility', auth, async (req, res) => {
  try {
    const { voiceEnabled, highContrast, fontSize, vibrationSensitivity, audioFeedback } = req.body;
    const settings = await AccessibilitySettings.findOneAndUpdate(
      { userId: req.user._id },
      { voiceEnabled, highContrast, fontSize, vibrationSensitivity, audioFeedback, updatedAt: new Date() },
      { new: true, upsert: true }
    );
    res.json({ settings });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/users/login-activity
router.get('/login-activity', auth, async (req, res) => {
  try {
    const activity = await LoginActivity.find({ userId: req.user._id })
      .sort({ timestamp: -1 })
      .limit(10);
    res.json({ activity });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// PUT /api/users/profile-photo
router.put('/profile-photo', auth, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
    
    let profilePhoto = '';
    if (req.file.path) { // Cloudinary
      profilePhoto = req.file.path;
    } else { // Local DiskStorage (legacy)
      profilePhoto = `/uploads/profiles/${req.file.filename}`;
    }
    
    // Multer-storage-cloudinary usually puts URL in path. 
    // If using diskStorage, we might need to format it.
    const photoPath = req.file.path.startsWith('http') ? req.file.path : `/uploads/profiles/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profilePhoto: photoPath },
      { new: true }
    ).select('-passwordHash -pinHash');
    
    res.json({ message: 'Profile photo updated.', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// PUT /api/users/profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, mobile } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, mobile },
      { new: true }
    ).select('-passwordHash -pinHash');
    res.json({ message: 'Profile updated.', user });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
