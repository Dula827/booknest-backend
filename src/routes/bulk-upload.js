const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');
const xlsx = require('xlsx');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

// Helper function to process series number
const processSeriesNo = (value) => {
    if (value == null || value === '') {
        return null;
    }
    const strValue = String(value);
    if (strValue.trim() === '-') {
        return null;
    }
    const num = parseInt(strValue);
    return isNaN(num) ? null : num;
};

// Helper function to upload image
const uploadImage = async (filePath, refNo) => {
    const uniqueId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fileName = `${refNo}_${uniqueId}_${path.basename(filePath).replace(/\s+/g, '_')}`;

    const formData = new FormData();
    formData.append('image', await fs.readFile(filePath), fileName);

    const response = await axios.post('http://localhost:3001/upload', formData, {
        headers: {
            ...formData.getHeaders()
        }
    });

    if (response.status !== 200) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }

    const data = response.data;
    if (!data.filePath) {
        throw new Error('No path returned from server');
    }

    return data.filePath;
};

// Bulk upload books and wishlist items
router.post('/', auth, async (req, res) => {
    try {
        const workbook = xlsx.readFile('/Users/isuru/Downloads/Data.xlsx');

        const booksSheet = workbook.Sheets['Mini Library'];
        const books = xlsx.utils.sheet_to_json(booksSheet);

        const wishlistSheet = workbook.Sheets['Wishlist'];
        const wishlistItems = xlsx.utils.sheet_to_json(wishlistSheet);

        const photosDir = '/Users/isuru/Downloads/Mini Library - Photos';

        for (const book of books) {
            const refNo = book['Ref No.'];
            const bookPhotoDir = path.join(photosDir, refNo.toString());

            let imageUrls = [];
            try {
                const bookFiles = await fs.readdir(bookPhotoDir);
                const imageUploadPromises = bookFiles
                    .filter(file => /\.(jpg|jpeg|png)$/i.test(file))
                    .map(file => uploadImage(path.join(bookPhotoDir, file), refNo));

                imageUrls = await Promise.all(imageUploadPromises);
            } catch (err) {
                console.log(`No images found for book ${refNo}`);
            }

            await db.execute(
                `INSERT INTO books (
                    user_id, ref_no, title, author, series_name, series_no,
                    book_images, category
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    req.user.id,
                    refNo,
                    book['Title of the Book'],
                    book['Name of the Author'],
                    book['Name of the Series'] || null,
                    processSeriesNo(book['Book number of the Series']),
                    imageUrls.length > 0 ? imageUrls.join(',') : null,
                    null
                ]
            );
        }

        for (const item of wishlistItems) {
            await db.execute(
                `INSERT INTO wishlist (
                    user_id, ref_no, title, author, series_name, series_no,
                    remarks, category
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    req.user.id,
                    item['Ref No.'],
                    item['Title of the Book'],
                    item['Name of the Author'],
                    item['Name of the Series'] || null,
                    processSeriesNo(item['Book number of the Series']),
                    item['Remarks'] || null,
                    null
                ]
            );
        }

        res.json({
            message: 'Bulk upload completed successfully',
            booksCount: books.length,
            wishlistCount: wishlistItems.length
        });
    } catch (error) {
        console.error('Bulk upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;