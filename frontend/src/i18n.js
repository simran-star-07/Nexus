import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      "welcome": "Welcome back",
      "balance": "Wallet Balance",
      "pay": "Pay",
      "recharge": "Recharge",
      "tickets": "Tickets",
      "goals": "Goals",
      "history": "History",
      "insights": "Insights",
      "profile": "Profile",
      "logout": "Logout",
      "scan_qr": "Scan QR",
      "show_qr": "Show QR",
      "send_money": "Send Money",
      "request_money": "Request Money",
      "daily_limit": "Daily Limit",
      "spent_today": "Spent Today",
      "settings": "Settings",
      "accessibility": "Accessibility",
      "font_size": "Font Size",
      "voice_enabled": "Voice Feedback",
      "language": "Language",
      "home": "Home",
      "back": "Back"
    }
  },
  hi: {
    translation: {
      "welcome": "वापसी पर स्वागत है",
      "balance": "वॉलेट बैलेंस",
      "pay": "भुगतान करें",
      "recharge": "रिचार्ज",
      "tickets": "टिकट",
      "goals": "लक्ष्य",
      "history": "इतिहास",
      "insights": "इनसाइट्स",
      "profile": "प्रोफ़ाइल",
      "logout": "लॉगआउट",
      "scan_qr": "क्यूआर स्कैन करें",
      "show_qr": "क्यूआर दिखाएं",
      "send_money": "पैसे भेजें",
      "request_money": "पैसे का अनुरोध करें",
      "daily_limit": "दैनिक सीमा",
      "spent_today": "आज का खर्च",
      "settings": "सेटिंग्स",
      "accessibility": "एक्सेसिबिलिटी",
      "font_size": "फ़ॉन्ट आकार",
      "voice_enabled": "वॉइस फीडबैक",
      "language": "भाषा",
      "home": "होम",
      "back": "वापस"
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: { escapeValue: false }
  });

export default i18n;
