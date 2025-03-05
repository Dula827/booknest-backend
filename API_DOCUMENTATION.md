# BookNest API Documentation

## Authentication Endpoints

### Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "securepassword123"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securepassword123"
  }'
```

### Get User Profile
```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```


### Update Profile
```bash
curl -X PUT http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe_updated",
    "email": "john_new@example.com"
  }'
```

### Delete Account
```bash
curl -X DELETE http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Books Management

### Get All Books
```bash
curl -X GET http://localhost:3000/api/books \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Add New Book
```bash
curl -X POST http://localhost:3000/api/books \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "The Hobbit",
    "author": "J.R.R. Tolkien",
    "category": "Fantasy",
    "series_name": "Middle-earth",
    "series_no": 1,
    "purchase_date": "2023-01-01",
    "reading_status": "Unread",
    "personal_notes": "Gift from John",
    "images": [
      "https://example.com/image1.jpg",
      "https://example.com/image2.jpg"
    ]
  }'
```

### Update Book
```bash
curl -X PUT http://localhost:3000/api/books/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "author": "Updated Author",
    "reading_status": "Read"
  }'
```

### Filter Books
```bash
curl -X GET "http://localhost:3000/api/books/filter?author=Tolkien&category=Fantasy&series_name=Middle-earth&purchase_date_start=2023-01-01&purchase_date_end=2023-12-31&reading_status=Read&lending_status=Available&page=1&limit=10&sort_by=title&sort_order=asc" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Query Parameters:
- `author`: Filter by author name (partial match)
- `category`: Filter by book category
- `series_name`: Filter by series name (partial match)
- `purchase_date_start`: Filter by purchase date range start (YYYY-MM-DD)
- `purchase_date_end`: Filter by purchase date range end (YYYY-MM-DD)
- `reading_status`: Filter by reading status ('Read' or 'Unread')
- `lending_status`: Filter by lending status ('Available' or 'Lent Out')
- `page`: Page number for pagination (default: 1)
- `limit`: Items per page (default: 10)
- `sort_by`: Sort field ('title', 'author', 'series_name', 'purchase_date', 'category')
- `sort_order`: Sort direction ('asc' or 'desc')

### Get Book by ID
```bash
curl -X GET http://localhost:3000/api/books/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response:
```json
{
  "book": {
    "id": 1,
    "ref_no": 1,
    "title": "The Hobbit",
    "author": "J.R.R. Tolkien",
    "series_name": "Middle-earth",
    "series_no": 1,
    "purchase_date": "2023-01-01",
    "reading_status": "Unread",
    "lending_status": "Available",
    "personal_notes": "Gift from Jane",
    "images": ["/uploads/books/1/cover.jpg"],
    "created_at": "2024-01-30T12:00:00Z",
    "updated_at": "2024-01-30T12:00:00Z"
  },
  "series_books": [
    {
      "id": 2,
      "title": "The Fellowship of the Ring",
      "series_no": 2,
      "reading_status": "Read",
      "lending_status": "Available"
    }
  ],
  "lending_details": {
    "borrower_name": "Jane Smith",
    "borrow_date": "2023-12-01",
    "expected_return_date": "2024-01-01"
  }
}
```

### Search Books
```bash
curl -X GET "http://localhost:3000/api/books/search?query=hobbit&category=Fantasy&page=1&limit=10&sort_by=title&sort_order=asc" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Query Parameters:
- `query`: Search term (searches in title, author, series_name, and personal_notes)
- `category`: Filter by book category
- `page`: Page number for pagination (default: 1)
- `limit`: Items per page (default: 10)
- `sort_by`: Sort field ('title', 'author', 'series_name', 'purchase_date', 'category')
- `sort_order`: Sort direction ('asc' or 'desc')

### Delete Book
```bash
curl -X DELETE http://localhost:3000/api/books/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Wishlist Management

### Get All Wishlist Items
```bash
curl -X GET http://localhost:3000/api/wishlist \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Add Wishlist Item
```bash
curl -X POST http://localhost:3000/api/wishlist \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "The Silmarillion",
    "author": "J.R.R. Tolkien",
    "series_name": "Middle-earth",
    "remarks": "Want to read after The Hobbit"
  }'
```

### Move Wishlist Item to Books
```bash
curl -X POST http://localhost:3000/api/wishlist/1/move-to-books \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "purchase_date": "2024-01-30",
    "reading_status": "Unread",
    "personal_notes": "Finally got it!",
    "images": ["/uploads/books/new/cover.jpg"]
  }'
```

### Update Wishlist Item
```bash
curl -X PUT http://localhost:3000/api/wishlist/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "remarks": "High priority"
  }'
```

### Delete Wishlist Item
```bash
curl -X DELETE http://localhost:3000/api/wishlist/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Search Wishlist
```bash
curl -X GET "http://localhost:3000/api/wishlist/search?query=silmarillion" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Lending Management

### Get All Lending Records
```bash
curl -X GET http://localhost:3000/api/lending \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Create Lending Record
```bash
curl -X POST http://localhost:3000/api/lending \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "book_id": 1,
    "borrower_name": "Jane Smith",
    "borrow_date": "2023-12-01",
    "return_date": "2024-01-01"
  }'
```

### Mark Book as Returned
```bash
curl -X PUT http://localhost:3000/api/lending/1/return \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "return_date": "2023-12-15"
  }'
```

### Get Lending History for a Book
```bash
curl -X GET http://localhost:3000/api/lending/book/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Bulk Upload

### Upload Books and Wishlist Items
```bash
curl -X POST http://localhost:3000/api/bulk-upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

This endpoint:
1. Reads the Excel file from the specified path
2. Processes both Mini Library and Wishlist sheets
3. For books:
   - Imports book data
   - Copies associated images to the uploads directory
   - Creates database entries with image references
4. For wishlist:
   - Imports wishlist data
   - Creates database entries

Response:
```json
{
  "message": "Bulk upload completed successfully",
  "booksCount": 45,
  "wishlistCount": 20
}