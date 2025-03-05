const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const auth = require('../middleware/auth');

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.execute(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    const user = users[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN
    });

    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const [users] = await db.execute(
      'SELECT id, username, email, created_at, updated_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(users)

    const [[bookStats]] = await db.execute(
      `SELECT 
        COUNT(*) as total_books,
        SUM(CASE WHEN reading_status = 'Read' THEN 1 ELSE 0 END) as books_read,
        SUM(CASE WHEN lending_status = 'Lent Out' THEN 1 ELSE 0 END) as books_lent
      FROM books 
      WHERE user_id = ?`,
      [req.user.id]
    );

    const [[wishlistCount]] = await db.execute(
      'SELECT COUNT(*) as total_wishlist FROM wishlist WHERE user_id = ?',
      [req.user.id]
    );

    res.json({
      user: users[0],
      statistics: {
        total_books: bookStats.total_books || 0,
        books_read: bookStats.books_read || 0,
        books_lent: bookStats.books_lent || 0,
        wishlist_items: wishlistCount.total_wishlist || 0
      }
    });
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: error.message });
  }
});

// Update profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const userId = req.user.id;

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.execute(
        'UPDATE users SET username = ?, email = ?, password = ? WHERE id = ?',
        [username, email, hashedPassword, userId]
      );
    } else {
      await db.execute(
        'UPDATE users SET username = ?, email = ? WHERE id = ?',
        [username, email, userId]
      );
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: error.message });
  }
});

// Delete account
router.delete('/profile', auth, async (req, res) => {
  try {
    await db.execute('DELETE FROM users WHERE id = ?', [req.user.id]);
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;