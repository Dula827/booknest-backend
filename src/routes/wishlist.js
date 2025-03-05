const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');

// Get all wishlist items
router.get('/', auth, async (req, res) => {
  try {
    const { series_name } = req.query;

    let conditions = ['user_id = ?'];
    let params = [req.user.id];

    if (series_name) {
      conditions.push('series_name = ?');
      params.push(series_name);
    }

    const [items] = await db.execute(
      `SELECT * FROM wishlist 
       WHERE ${conditions.join(' AND ')} 
       ORDER BY series_name, series_no`,
      params
    );

    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/wlseriesnames', auth, async (req, res) => {
  try {
    const [books] = await db.execute(
      `SELECT DISTINCT series_name 
       FROM wishlist
       WHERE user_id = ? 
       AND series_name IS NOT NULL 
       AND series_name != '' 
       AND series_name != '-'
       AND series_name != " -"
       AND series_name != " - "
       ORDER BY series_name ASC`,
      [req.user.id]
    );
    res.json(books);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search wishlist
router.get('/search', auth, async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.json({ items: [] });
    }

    const [items] = await db.execute(
      `SELECT * FROM wishlist 
       WHERE user_id = ? 
         AND (
           LOWER(title) LIKE LOWER(?) OR 
           LOWER(author) LIKE LOWER(?) OR 
           LOWER(series_name) LIKE LOWER(?)
         )
       ORDER BY series_name, series_no
       LIMIT 10`,
      [req.user.id, `%${query}%`, `%${query}%`, `%${query}%`]
    );

    res.json({ items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add wishlist item
router.post('/', auth, async (req, res) => {
  try {
    const { title, author, category, series_name, series_no, remarks } = req.body;

    if (!title || !author) {
      return res.status(400).json({ error: 'Title and author are required' });
    }

    const [result] = await db.execute(
      `INSERT INTO wishlist (
        user_id, 
        ref_no, 
        title, 
        author, 
        category, 
        series_name, 
        series_no, 
        remarks
      ) VALUES (
        ?, 
        (SELECT COALESCE(MAX(ref_no), 0) + 1 FROM wishlist w2 WHERE user_id = ?),
        ?, 
        ?, 
        ?, 
        ?, 
        ?, 
        ?
      )`,
      [
        req.user.id,
        req.user.id,
        title,
        author,
        category || null,
        series_name || null,
        series_no || null,
        remarks || null
      ]
    );

    res.status(201).json({
      message: 'Wishlist item added successfully',
      id: result.insertId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Move wishlist item to books
router.post('/:id/move-to-books', auth, async (req, res) => {
  try {
    const [wishlistItems] = await db.execute(
      'SELECT * FROM wishlist WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (wishlistItems.length === 0) {
      return res.status(404).json({ error: 'Wishlist item not found' });
    }

    const wishlistItem = wishlistItems[0];
    const { purchase_date, reading_status, personal_notes, images } = req.body;

    const [result] = await db.execute(
      `INSERT INTO books (
        user_id,
        ref_no,
        title,
        author,
        category,
        series_name,
        series_no,
        purchase_date,
        reading_status,
        personal_notes,
        book_images
      ) VALUES (?, (SELECT COALESCE(MAX(ref_no), 0) + 1 FROM books b2 WHERE user_id = ?), ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        req.user.id,
        wishlistItem.title,
        wishlistItem.author,
        wishlistItem.category,
        wishlistItem.series_name,
        wishlistItem.series_no,
        purchase_date || null,
        reading_status || 'Unread',
        personal_notes || null,
        images && images.length > 0 ? images.join(',') : null
      ]
    );

    await db.execute(
      'DELETE FROM wishlist WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    res.json({
      message: 'Item successfully moved to books',
      bookId: result.insertId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update wishlist item
router.put('/:id', auth, async (req, res) => {
  try {
    const updates = req.body;

    const updateFields = [];
    const updateValues = [];

    if ('title' in updates) {
      updateFields.push('title = ?');
      updateValues.push(updates.title);
    }
    if ('author' in updates) {
      updateFields.push('author = ?');
      updateValues.push(updates.author);
    }
    if ('category' in updates) {
      updateFields.push('category = ?');
      updateValues.push(updates.category || null);
    }
    if ('series_name' in updates) {
      updateFields.push('series_name = ?');
      updateValues.push(updates.series_name || null);
    }
    if ('series_no' in updates) {
      updateFields.push('series_no = ?');
      updateValues.push(updates.series_no || null);
    }
    if ('remarks' in updates) {
      updateFields.push('remarks = ?');
      updateValues.push(updates.remarks || null);
    }

    if (updateFields.length === 0) {
      return res.json({ message: 'No fields to update' });
    }

    updateValues.push(req.params.id, req.user.id);

    await db.execute(
      `UPDATE wishlist SET ${updateFields.join(', ')} WHERE id = ? AND user_id = ?`,
      updateValues
    );

    res.json({ message: 'Wishlist item updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete wishlist item
router.delete('/:id', auth, async (req, res) => {
  try {
    await db.execute(
      'DELETE FROM wishlist WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Wishlist item deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get wishlist item by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const [items] = await db.execute(
      'SELECT * FROM wishlist WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (items.length === 0) {
      return res.status(404).json({ error: 'Wishlist item not found' });
    }

    res.json(items[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;