# PayBridge — Gamified UPI Payments for Students

PayBridge is a full-stack UPI payment web application designed for students, featuring gamification, parental controls, and enhanced accessibility for differently-abled users.

## 🚀 How to Run

### 1. Unified Setup (Recommended)
From the **root directory** (UPI), just run:
```bash
npm install
npm run dev
```
*This will automatically start both the backend and frontend at the same time using `concurrently`!*

---

### 2. Manual Alternative
If you prefer separate terminals:

### 🎮 Student Dashboard
- **Gamification**: Earn XP and level up (Beginner → Saver → Master).
- **Savings Goals**: Set goals, save money, and celebrate with confetti!
- **Smart Insights**: Category-wise spending charts and weekly comparisons.
- **Pay Your Way**: Pay via UPI ID, Voice commands, or QR scan.

### 🛡️ Parental Controls
- **Real-time Monitoring**: Get instant Socket.io alerts for every payment.
- **Spending Limits**: Set daily, weekly, or monthly limits per category.
- **Merchant Whitelist**: Approve specific merchants for your child.
- **Wallet Freeze**: One-click instant wallet lock.
- **Auto-Allowance**: Weekly automated transfers.

### ♿ Accessibility (Divyang Mode)
- **Full TTS**: Text-to-Speech audio feedback for every action.
- **Voice Control**: Operable entirely via voice commands.
- **High Contrast**: Ultra-legible UI with large touch targets.

### 🔐 Security
- **Triple Auth**: Password (Login), 6-digit PIN (Payment), and custom **Vibration Pattern** (Alternative Payment Auth).
- **JWT**: Secure sessions with refresh token rotation.
- **Bcrypt**: All sensitive codes and patterns are hashed.

---

## 📁 Project Structure

```text
UPI/
├── backend/            # Express, Node.js, MongoDB
│   ├── server.js       # Main entry & Socket.io
│   ├── routes/         # auth, payment, goals, etc.
│   └── .env            # Config
├── frontend/           # React, Vite, Tailwind
│   ├── src/pages/      # Student, Parent, Accessibility dashboards
│   └── components/     # PinPad, VibrationVerifier
└── README.md           # This file
```

# Nexus
