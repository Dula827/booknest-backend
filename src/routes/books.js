const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');

// Get all books
router.get('/', auth, async (req, res) => {
  try {
    const [books] = await db.execute(
      'SELECT * FROM books WHERE user_id = ? ORDER BY series_name, series_no',
      [req.user.id]
    );

    books.forEach(book => {
      book.images = book.book_images ? book.book_images.split(',') : [];
      delete book.book_images;
    });

    res.json(books);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/seriesnames', auth, async (req, res) => {
  try {
    const [books] = await db.execute(
      `SELECT DISTINCT series_name 
       FROM books 
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

router.get('/getallwf', auth, async (req, res) => {
  try {
    const {
      category,
      reading_status,
      series_name,
      page = 1,
      limit = 10,
      sort_by = 'title',
      sort_order = 'asc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 10);

    let conditions = ['user_id = ?'];
    let params = [req.user.id];

    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }
    if (reading_status) {
      conditions.push('reading_status = ?');
      params.push(reading_status);
    }
    if (series_name) {
      conditions.push('series_name = ?');
      params.push(series_name);
    }

    const validSortColumns = ['title', 'author', 'series_name', 'purchase_date', 'category'];
    const validSortOrders = ['asc', 'desc'];

    const finalSortBy = validSortColumns.includes(sort_by) ? sort_by : 'title';
    const finalSortOrder = validSortOrders.includes(sort_order.toLowerCase()) ? sort_order.toLowerCase() : 'asc';

    const baseQuery = `FROM books WHERE ${conditions.join(' AND ')}`;

    const [countResult] = await db.execute(
      `SELECT COUNT(*) as total ${baseQuery}`,
      params
    );
    const totalItems = countResult[0].total;

    const offset = (pageNum - 1) * limitNum;
    const [books] = await db.execute(
      `SELECT * ${baseQuery} ORDER BY ${finalSortBy} ${finalSortOrder} LIMIT ? OFFSET ?`,
      [...params, limitNum.toString(), offset.toString()]
    );

    const processedBooks = books.map(book => {
      const processedBook = { ...book };
      processedBook.images = book.book_images ? book.book_images.split(',') : [];
      delete processedBook.book_images;
      return processedBook;
    });

    res.json({
      books: processedBooks,
      pagination: {
        total_items: totalItems,
        current_page: pageNum,
        total_pages: Math.ceil(totalItems / limitNum),
        items_per_page: limitNum
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search books
router.get('/search', auth, async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.json({ books: [] });
    }

    const [books] = await db.execute(
      `SELECT * FROM books 
       WHERE user_id = ? 
         AND (
           LOWER(title) LIKE LOWER(?) OR 
           LOWER(author) LIKE LOWER(?) OR 
           LOWER(category) LIKE LOWER(?)
         )
       LIMIT 10`,
      [req.user.id, `%${query}%`, `%${query}%`, `%${query}%`]
    );

    const processedBooks = books.map(book => {
      const processedBook = { ...book };
      processedBook.images = book.book_images ? book.book_images.split(',') : [];
      delete processedBook.book_images;
      return processedBook;
    });

    res.json({ books: processedBooks });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a new book
router.post('/', auth, async (req, res) => {
  try {
    const {
      title,
      author,
      category,
      series_name,
      series_no,
      purchase_date,
      reading_status,
      personal_notes,
      images
    } = req.body;

    if (images && images.length > 10) {
      throw new Error('Maximum 10 images allowed per book');
    }

    const [result] = await db.execute(
      `INSERT INTO books (
        user_id, ref_no, title, author, category, series_name, series_no,
        purchase_date, reading_status, personal_notes, book_images
      ) VALUES (
        ?, (SELECT COALESCE(MAX(ref_no), 0) + 1 FROM books b2 WHERE user_id = ?),
        ?, ?, ?, ?, ?, ?, ?, ?, ?
      )`,
      [
        req.user.id,
        req.user.id,
        title,
        author,
        category,
        series_name || null,
        series_no || null,
        purchase_date || null,
        reading_status || 'Unread',
        personal_notes || null,
        images && images.length > 0 ? images.join(',') : null
      ]
    );

    res.status(201).json({
      message: 'Book added successfully',
      id: result.insertId,
      images: images || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a book
router.put('/:id', auth, async (req, res) => {
  try {
    const [books] = await db.execute(
      'SELECT * FROM books WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (books.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const currentBook = books[0];
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
      updateValues.push(updates.category);
    }
    if ('series_name' in updates) {
      updateFields.push('series_name = ?');
      updateValues.push(updates.series_name || null);
    }
    if ('series_no' in updates) {
      updateFields.push('series_no = ?');
      updateValues.push(updates.series_no || null);
    }
    if ('purchase_date' in updates) {
      updateFields.push('purchase_date = ?');
      updateValues.push(updates.purchase_date || null);
    }
    if ('reading_status' in updates) {
      updateFields.push('reading_status = ?');
      updateValues.push(updates.reading_status);
    }
    if ('personal_notes' in updates) {
      updateFields.push('personal_notes = ?');
      updateValues.push(updates.personal_notes || null);
    }
    if ('images' in updates) {
      if (updates.images && updates.images.length > 10) {
        throw new Error('Maximum 10 images allowed per book');
      }
      updateFields.push('book_images = ?');
      updateValues.push(updates.images && updates.images.length > 0 ? updates.images.join(',') : null);
    }

    if (updateFields.length === 0) {
      return res.json({
        message: 'No fields to update',
        images: currentBook.book_images ? currentBook.book_images.split(',') : []
      });
    }

    updateValues.push(req.params.id, req.user.id);

    await db.execute(
      `UPDATE books SET ${updateFields.join(', ')} WHERE id = ? AND user_id = ?`,
      updateValues
    );

    const [updatedBooks] = await db.execute(
      'SELECT book_images FROM books WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    const updatedImages = updatedBooks[0].book_images ? updatedBooks[0].book_images.split(',') : [];

    res.json({
      message: 'Book updated successfully',
      images: updatedImages
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a book
router.delete('/:id', auth, async (req, res) => {
  try {
    await db.execute(
      'DELETE FROM books WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    res.json({ message: 'Book deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get book details by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const [books] = await db.execute(
      'SELECT * FROM books WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (books.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const book = books[0];
    book.images = book.book_images ? book.book_images.split(',') : [];
    delete book.book_images;

    let seriesBooks = [];
    if (book.series_name) {
      [seriesBooks] = await db.execute(
        `SELECT id, title, series_no, reading_status, lending_status 
         FROM books 
         WHERE series_name = ? 
         AND user_id = ? 
         AND id != ?
         ORDER BY series_no`,
        [book.series_name, req.user.id, book.id]
      );
    }

    let lendingDetails = null;
    if (book.lending_status === 'Lent Out') {
      const [lendingRecords] = await db.execute(
        `SELECT l.*, 
                DATE_FORMAT(l.borrow_date, '%Y-%m-%d') as formatted_borrow_date,
                DATE_FORMAT(l.return_date, '%Y-%m-%d') as formatted_expected_return_date
         FROM lending l
         WHERE l.book_id = ? 
         AND l.user_id = ? 
         AND l.return_status = 'Not Returned'
         ORDER BY l.borrow_date DESC 
         LIMIT 1`,
        [book.id, req.user.id]
      );

      if (lendingRecords.length > 0) {
        lendingDetails = {
          borrower_name: lendingRecords[0].borrower_name,
          borrow_date: lendingRecords[0].formatted_borrow_date,
          return_date: lendingRecords[0].formatted_expected_return_date
        };
      }
    }

    res.json({
      book,
      series_books: seriesBooks,
      lending_details: lendingDetails
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


module.exports = router;