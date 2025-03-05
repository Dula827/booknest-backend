const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');

// Get all lending records
router.get('/', auth, async (req, res) => {
  try {
    const [records] = await db.execute(
      `SELECT l.*, b.title as book_title 
       FROM lending l 
       JOIN books b ON l.book_id = b.id 
       WHERE l.user_id = ? 
       ORDER BY l.borrow_date DESC`,
      [req.user.id]
    );
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create lending record
router.post('/', auth, async (req, res) => {
  try {
    const { book_id, borrower_name, borrow_date, return_date } = req.body;

    const [books] = await db.execute(
      'SELECT lending_status FROM books WHERE id = ? AND user_id = ?',
      [book_id, req.user.id]
    );

    if (books.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    if (books[0].lending_status === 'Lent Out') {
      return res.status(400).json({ error: 'Book is already lent out' });
    }

    const [result] = await db.execute(
      `INSERT INTO lending (
        user_id, 
        book_id, 
        borrower_name, 
        borrow_date, 
        return_date,
        return_status
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        book_id,
        borrower_name,
        borrow_date,
        return_date || null,
        'Not Returned'
      ]
    );

    await db.execute(
      'UPDATE books SET lending_status = ? WHERE id = ? AND user_id = ?',
      ['Lent Out', book_id, req.user.id]
    );

    res.status(201).json({
      message: 'Lending record created successfully',
      id: result.insertId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update lending record (mark as returned)
router.put('/:id/return', auth, async (req, res) => {
  try {
    const { return_date } = req.body;

    const [records] = await db.execute(
      'SELECT book_id FROM lending WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (records.length === 0) {
      return res.status(404).json({ error: 'Lending record not found' });
    }

    await db.execute(
      `UPDATE lending 
       SET return_status = ?, return_date = ?
       WHERE id = ? AND user_id = ?`,
      ['Returned', return_date || new Date(), req.params.id, req.user.id]
    );

    await db.execute(
      'UPDATE books SET lending_status = ? WHERE id = ? AND user_id = ?',
      ['Available', records[0].book_id, req.user.id]
    );

    res.json({ message: 'Book marked as returned successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get lending history for a specific book
router.get('/book/:bookId', auth, async (req, res) => {
  try {
    const [records] = await db.execute(
      `SELECT * FROM lending 
       WHERE book_id = ? AND user_id = ? 
       ORDER BY borrow_date DESC`,
      [req.params.bookId, req.user.id]
    );
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;