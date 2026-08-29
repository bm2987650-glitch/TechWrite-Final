const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ ok: true, payouts: [] });
});

module.exports = router;