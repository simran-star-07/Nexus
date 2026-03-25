const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const ParentalControl = require('../models/ParentalControl');
const AccessibilitySettings = require('../models/AccessibilitySettings');
const OTPStore = require('../models/OTPStore');
const Notification = require('../models/Notification');
const LoginActivity = require('../models/LoginActivity');
const upload = require('../middleware/upload');
const { auth } = require('../middleware/auth');
const { 
  generateRegistrationOptions, 
  verifyRegistrationResponse, 
  generateAuthenticationOptions, 
  verifyAuthenticationResponse 
} = require('@simplewebauthn/server');

const rpName = 'PayBridge UPI';
const rpID = 'localhost'; // Should match the domain in production
const origin = `http://${rpID}:3000`; // Frontend origin

// ... existing code ...

// Check if email credentials are real or placeholders
const isEmailConfigured = process.env.EMAIL_USER &&
  process.env.EMAIL_PASS &&
  process.env.EMAIL_USER !== 'your_email@gmail.com' &&
  process.env.EMAIL_PASS !== 'your_app_password';

let transporter = null;
if (isEmailConfigured) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });
  // Verify connection on startup
  transporter.verify()
    .then(() => console.log('✅ Email transporter verified — ready to send emails'))
    .catch(err => console.error('❌ Email transporter verification FAILED:', err.message));
} else {
  console.warn('⚠️  EMAIL_USER / EMAIL_PASS not configured — OTPs will be logged to console (dev mode)');
}

const generateTokens = async (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
  const refreshTokenStr = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await RefreshToken.create({ userId, token: refreshTokenStr, expiresAt });
  return { accessToken, refreshToken: refreshTokenStr };
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, mobile, password, pin, vibrationPattern, role, parentEmail, parentMobile, language } = req.body;
    if (!name || !email || !password || !pin || !role || !vibrationPattern) {
      return res.status(400).json({ message: 'All security fields (Password, PIN, Vibration) are required.' });
    }
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already registered.' });

    const passwordHash = await bcrypt.hash(password, 12);
    const pinHash = await bcrypt.hash(pin, 12);

    let parentId = null;
    if (role === 'student') {
      if (parentEmail) {
        const parent = await User.findOne({ email: parentEmail, role: 'parent' });
        if (parent) parentId = parent._id;
      } else if (parentMobile) {
        const parent = await User.findOne({ mobile: parentMobile, role: 'parent' });
        if (parent) parentId = parent._id;
      }
    }

    const user = await User.create({
      name, email, role,
      mobile: mobile || '',
      upiId: email.split('@')[0] + '@paybridge',
      passwordHash, pinHash,
      vibrationPattern: vibrationPattern || [],
      parentId,
      language: language || 'en'
    });

    // Create parental control doc for student
    if (role === 'student') {
      await ParentalControl.create({ childId: user._id, parentId: parentId });
      if (parentId) {
        await User.findByIdAndUpdate(parentId, { $addToSet: { linkedChildren: user._id } });
      }
    }
    if (role === 'divyang') {
      await AccessibilitySettings.create({ userId: user._id });
    }
    if (role === 'parent') {
      await AccessibilitySettings.create({ userId: user._id, highContrast: false, voiceEnabled: false });
    }

    // Log login activity
    await LoginActivity.create({ userId: user._id, ip: req.ip || '127.0.0.1', device: req.headers['user-agent'] || 'unknown' });

    const { accessToken, refreshToken } = await generateTokens(user._id);
    res.status(201).json({
      message: 'Registration successful.',
      accessToken, refreshToken,
      user: { _id: user._id, name: user.name, email: user.email, mobile: user.mobile, upiId: user.upiId, role: user.role, walletBalance: user.walletBalance, xpPoints: user.xpPoints, level: user.level, profilePhoto: user.profilePhoto, parentId: user.parentId, linkedChildren: user.linkedChildren, rewardsPoints: user.rewardsPoints, dailyLimit: user.dailyLimit, dailySpent: user.dailySpent, streakCount: user.streakCount, freezeStatus: user.freezeStatus, language: user.language }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials.' });
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials.' });

    // Update streak
    const today = new Date().toDateString();
    const lastActive = user.lastActiveDate ? new Date(user.lastActiveDate).toDateString() : '';
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    let streakCount = user.streakCount || 0;
    if (lastActive === yesterday) { streakCount += 1; }
    else if (lastActive !== today) { streakCount = 1; }
    await User.findByIdAndUpdate(user._id, { lastActiveDate: new Date(), streakCount });

    // Log login activity
    await LoginActivity.create({ userId: user._id, ip: req.ip || '127.0.0.1', device: req.headers['user-agent'] || 'unknown' });

    const { accessToken, refreshToken } = await generateTokens(user._id);
    res.json({
      accessToken, refreshToken,
      user: { _id: user._id, name: user.name, email: user.email, mobile: user.mobile, upiId: user.upiId, role: user.role, walletBalance: user.walletBalance, xpPoints: user.xpPoints, level: user.level, profilePhoto: user.profilePhoto, parentId: user.parentId, linkedChildren: user.linkedChildren, rewardsPoints: user.rewardsPoints, dailyLimit: user.dailyLimit, dailySpent: user.dailySpent, streakCount, freezeStatus: user.freezeStatus, caretakerId: user.caretakerId, language: user.language }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required.' });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'No account found with this email.' });

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await OTPStore.updateMany({ email, type: 'password_reset', isUsed: false }, { isUsed: true });
    await OTPStore.create({ email, otpHash, expiresAt, type: 'password_reset' });

    if (!isEmailConfigured || !transporter) {
      console.log('🔑 DEV MODE — PASSWORD RESET OTP for', email, ':', otp);
      return res.json({ message: 'OTP sent to your email address.' });
    }

    await transporter.sendMail({
      from: `"PayBridge" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'PayBridge — Password Reset OTP',
      html: `<div style="font-family:Arial;max-width:400px;margin:auto;padding:30px;background:#0a0e1a;border-radius:16px;color:#fff">
        <h2 style="color:#FF9933;text-align:center">PayBridge</h2>
        <p style="text-align:center;color:#ccc">Your OTP for password reset is:</p>
        <h1 style="text-align:center;color:#FF9933;font-size:36px;letter-spacing:8px">${otp}</h1>
        <p style="text-align:center;color:#888;font-size:12px">This OTP expires in 5 minutes.</p>
      </div>`
    });

    res.json({ message: 'OTP sent for password reset.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send OTP.' });
  }
});

// POST /api/auth/forgot-pin
router.post('/forgot-pin', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required.' });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'No account found.' });

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await OTPStore.updateMany({ email, type: 'pin_reset', isUsed: false }, { isUsed: true });
    await OTPStore.create({ email, otpHash, expiresAt, type: 'pin_reset' });

    if (!isEmailConfigured || !transporter) {
      console.log('🔑 DEV MODE — PIN RESET OTP for', email, ':', otp);
      return res.json({ message: 'OTP sent to your email address.' });
    }

    await transporter.sendMail({
      from: `"PayBridge" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'PayBridge — PIN Reset OTP',
      html: `<div style="font-family:Arial;max-width:400px;margin:auto;padding:30px;background:#0a0e1a;border-radius:16px;color:#fff">
        <h2 style="color:#FF9933;text-align:center">PayBridge</h2>
        <p style="text-align:center;color:#ccc">Your OTP for payment PIN reset is:</p>
        <h1 style="text-align:center;color:#FF9933;font-size:36px;letter-spacing:8px">${otp}</h1>
        <p style="text-align:center;color:#888;font-size:12px">This OTP expires in 5 minutes.</p>
      </div>`
    });

    res.json({ message: 'OTP sent for PIN reset.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send OTP.' });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp, type } = req.body; // Expect type: 'password_reset' or 'pin_reset'
    if (!email || !otp || !type) return res.status(400).json({ message: 'Email, OTP, and Type required.' });

    const otpDoc = await OTPStore.findOne({ email, type, isUsed: false }).sort({ createdAt: -1 });
    if (!otpDoc) return res.status(400).json({ message: 'No valid OTP found.' });
    if (otpDoc.expiresAt < new Date()) {
      await OTPStore.findByIdAndUpdate(otpDoc._id, { isUsed: true });
      return res.status(400).json({ message: 'OTP has expired.' });
    }

    const match = await bcrypt.compare(String(otp), otpDoc.otpHash);
    if (!match) return res.status(400).json({ message: 'Incorrect OTP.' });

    res.json({ message: 'OTP verified successfully.', otpId: otpDoc._id });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otpId, newPassword } = req.body;
    const otpDoc = await OTPStore.findById(otpId);
    if (!otpDoc || otpDoc.isUsed || otpDoc.email !== email || otpDoc.type !== 'password_reset') {
      return res.status(400).json({ message: 'Invalid OTP session.' });
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await User.findOneAndUpdate({ email }, { passwordHash });
    await OTPStore.findByIdAndUpdate(otpId, { isUsed: true });
    res.json({ message: 'Password reset successful.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/auth/reset-pin
router.post('/reset-pin', async (req, res) => {
  try {
    const { email, otpId, newPin } = req.body;
    const otpDoc = await OTPStore.findById(otpId);
    if (!otpDoc || otpDoc.isUsed || otpDoc.email !== email || otpDoc.type !== 'pin_reset') {
      return res.status(400).json({ message: 'Invalid OTP session.' });
    }
    const pinHash = await bcrypt.hash(newPin, 12);
    await User.findOneAndUpdate({ email }, { pinHash });
    await OTPStore.findByIdAndUpdate(otpId, { isUsed: true });
    res.json({ message: 'PIN reset successful.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ message: 'Refresh token required.' });
    const rt = await RefreshToken.findOne({ token: refreshToken });
    if (!rt || rt.expiresAt < new Date()) {
      if (rt) await rt.deleteOne();
      return res.status(401).json({ message: 'Invalid or expired refresh token.' });
    }
    await rt.deleteOne();
    const { accessToken, refreshToken: newRefresh } = await generateTokens(rt.userId);
    res.json({ accessToken, refreshToken: newRefresh });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await RefreshToken.deleteOne({ token: refreshToken });
    res.json({ message: 'Logged out.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/auth/link-child
router.post('/link-child', auth, async (req, res) => {
  try {
    const { childMobile, childEmail } = req.body;
    if (req.user.role !== 'parent') return res.status(403).json({ message: 'Only parents can link children.' });

    let child;
    if (childMobile) {
      child = await User.findOne({ mobile: childMobile, role: 'student' });
    } else if (childEmail) {
      child = await User.findOne({ email: childEmail, role: 'student' });
    }
    if (!child) return res.status(404).json({ message: 'Student not found.' });

    await User.findByIdAndUpdate(req.user._id, { $addToSet: { linkedChildren: child._id } });
    await User.findByIdAndUpdate(child._id, { parentId: req.user._id });

    let pc = await ParentalControl.findOne({ childId: child._id });
    if (!pc) pc = await ParentalControl.create({ childId: child._id, parentId: req.user._id });
    else { pc.parentId = req.user._id; await pc.save(); }

    res.json({ message: 'Child linked successfully.', childId: child._id, childName: child.name });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// POST /api/auth/upload-photo
router.post('/upload-photo', auth, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
    const photoUrl = req.file.path; // Cloudinary URL
    await User.findByIdAndUpdate(req.user._id, { profilePhoto: photoUrl });
    res.json({ message: 'Photo uploaded.', photoUrl });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// PUT /api/auth/update-profile
router.put('/update-profile', auth, async (req, res) => {
  try {
    const { name, mobile, language } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (mobile) updates.mobile = mobile;
    if (language) updates.language = language;
    
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-passwordHash -pinHash');
    res.json({ message: 'Profile updated.', user });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/auth/link-caretaker (divyang links a caretaker)
router.post('/link-caretaker', auth, async (req, res) => {
  try {
    const { caretakerEmail, caretakerMobile } = req.body;
    if (req.user.role !== 'divyang') return res.status(403).json({ message: 'Only Divyang users can link caretakers.' });
    let caretaker;
    if (caretakerEmail) caretaker = await User.findOne({ email: caretakerEmail });
    else if (caretakerMobile) caretaker = await User.findOne({ mobile: caretakerMobile });
    if (!caretaker) return res.status(404).json({ message: 'User not found.' });
    await User.findByIdAndUpdate(req.user._id, { caretakerId: caretaker._id });
    res.json({ message: 'Caretaker linked.', caretakerId: caretaker._id, caretakerName: caretaker.name });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.user._id).select('-passwordHash -pinHash');
  res.json({ user });
});

// WebAuthn Registration Options
router.get('/webauthn/register-options', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const options = await generateRegistrationOptions({
      rpName, rpID,
      userID: user._id.toString(),
      userName: user.email,
      attestationType: 'none',
      authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
    });
    // Store challenge in user doc or session (simplified: store in user doc temporarily)
    await User.findByIdAndUpdate(user._id, { currentWebAuthnChallenge: options.challenge });
    res.json(options);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// WebAuthn Registration Verify
router.post('/webauthn/register-verify', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const expectedChallenge = user.currentWebAuthnChallenge;
    const verification = await verifyRegistrationResponse({
      response: req.body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (verification.verified) {
      const { credentialID, credentialPublicKey, counter, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
      await User.findByIdAndUpdate(user._id, {
        webAuthnCredentialId: Buffer.from(credentialID).toString('base64'),
        webAuthnPublicKey: Buffer.from(credentialPublicKey),
        webAuthnCounter: counter,
        currentWebAuthnChallenge: null
      });
      return res.json({ verified: true });
    }
    res.status(400).json({ verified: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// WebAuthn Login Options
router.post('/webauthn/login-options', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user || !user.webAuthnCredentialId) return res.status(404).json({ message: 'No fingerprint registered.' });

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: [{
        id: Buffer.from(user.webAuthnCredentialId, 'base64'),
        type: 'public-key',
        transports: user.webAuthnTransports,
      }],
      userVerification: 'preferred',
    });
    await User.findByIdAndUpdate(user._id, { currentWebAuthnChallenge: options.challenge });
    res.json(options);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// WebAuthn Login Verify
router.post('/webauthn/login-verify', async (req, res) => {
  try {
    const { email, response } = req.body;
    const user = await User.findOne({ email });
    const expectedChallenge = user.currentWebAuthnChallenge;

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: Buffer.from(user.webAuthnCredentialId, 'base64'),
        credentialPublicKey: user.webAuthnPublicKey,
        counter: user.webAuthnCounter,
      },
    });

    if (verification.verified) {
      await User.findByIdAndUpdate(user._id, {
        webAuthnCounter: verification.authenticationInfo.newCounter,
        currentWebAuthnChallenge: null
      });
      const { accessToken, refreshToken } = await generateTokens(user._id);
      return res.json({ verified: true, accessToken, refreshToken, user });
    }
    res.status(400).json({ verified: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
