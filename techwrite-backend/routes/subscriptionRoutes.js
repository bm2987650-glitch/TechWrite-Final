const express = require('express');
const router = express.Router();

router.post('/', (req, res) => {
  res.json({ ok: true, message: 'Subscribed successfully!' });
});

module.exports = router;