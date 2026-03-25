const router = require('express').Router();
const { auth } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

// Middleware that accepts token from query string OR header
const flexAuth = async (req, res, next) => {
  const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { _id: decoded.userId };
    next();
  } catch { return res.status(401).json({ message: 'Invalid token' }); }
};

// GET /api/export/statement?month=2026-03&token=xxx
router.get('/statement', flexAuth, async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const user = await User.findById(req.user._id).select('name email upiId walletBalance');
    const startDate = new Date(month + '-01');
    const endDate = new Date(startDate); endDate.setMonth(endDate.getMonth() + 1);

    const txns = await Transaction.find({ userId: req.user._id, timestamp: { $gte: startDate, $lt: endDate } }).sort({ timestamp: -1 });

    // Generate simple HTML statement
    const totalCredit = txns.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
    const totalDebit = txns.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0);
    const monthName = new Date(month + '-01').toLocaleDateString('en-IN', { year: 'numeric', month: 'long' });

    const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>PayBridge Statement - ${monthName}</title>
<style>
  body { font-family: 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #333; }
  .header { text-align: center; border-bottom: 3px solid #FF9933; padding-bottom: 20px; margin-bottom: 30px; }
  .header h1 { color: #FF9933; margin: 0; }
  .header p { color: #666; margin: 5px 0; }
  .summary { display: flex; justify-content: space-between; margin-bottom: 30px; }
  .summary-card { background: #f8f9fa; border-radius: 12px; padding: 20px; flex: 1; margin: 0 10px; text-align: center; }
  .summary-card.credit { border-top: 3px solid #22c55e; }
  .summary-card.debit { border-top: 3px solid #ef4444; }
  .summary-card.balance { border-top: 3px solid #FF9933; }
  .summary-card h3 { margin: 0; color: #666; font-size: 12px; text-transform: uppercase; }
  .summary-card p { margin: 8px 0 0; font-size: 24px; font-weight: bold; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #FF9933; color: white; padding: 12px; text-align: left; }
  td { padding: 10px 12px; border-bottom: 1px solid #eee; }
  tr:nth-child(even) { background: #fafafa; }
  .credit { color: #22c55e; } .debit { color: #ef4444; }
  .footer { margin-top: 30px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px; }
</style></head><body>
<div class="header">
  <h1>₹ PayBridge</h1>
  <p>Monthly Transaction Statement</p>
  <p><strong>${user.name}</strong> | ${user.email} | UPI: ${user.upiId || 'N/A'}</p>
  <p>${monthName}</p>
</div>
<div class="summary">
  <div class="summary-card credit"><h3>Total Credits</h3><p style="color:#22c55e">₹${totalCredit.toLocaleString('en-IN')}</p></div>
  <div class="summary-card debit"><h3>Total Debits</h3><p style="color:#ef4444">₹${totalDebit.toLocaleString('en-IN')}</p></div>
  <div class="summary-card balance"><h3>Current Balance</h3><p style="color:#FF9933">₹${user.walletBalance.toLocaleString('en-IN')}</p></div>
</div>
<table>
  <thead><tr><th>Date</th><th>Type</th><th>Merchant</th><th>Category</th><th>Amount</th></tr></thead>
  <tbody>
    ${txns.map(t => `<tr>
      <td>${new Date(t.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
      <td class="${t.type}">${t.type === 'credit' ? '🟢 Credit' : '🔴 Debit'}</td>
      <td>${t.merchant || '-'}</td>
      <td>${t.category}</td>
      <td class="${t.type}"><strong>₹${t.amount.toLocaleString('en-IN')}</strong></td>
    </tr>`).join('')}
    ${txns.length === 0 ? '<tr><td colspan="5" style="text-align:center;padding:30px;color:#999">No transactions this month</td></tr>' : ''}
  </tbody>
</table>
<div class="footer">
  <p>Generated on ${new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })} | PayBridge — Inclusive UPI Platform</p>
  <p>This is an auto-generated statement. For queries, contact support.</p>
</div>
</body></html>`;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="PayBridge_Statement_${month}.html"`);
    res.send(html);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ message: 'Export failed.' });
  }
});

module.exports = router;
