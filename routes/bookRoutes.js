const express = require("express");
const router = express.Router();
const Book = require("../models/Book");
// Polyfill fetch for CommonJS
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));


// search route
router.get("/search/:query", async (req, res) => {
  try {
    const query = req.params.query;
    const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}`);

    if (!response.ok) {
      return res.status(500).json({ error: "Failed to fetch from Google Books" });
    }

    const data= await response.json();
    res.json(data.docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
  
});

// details route
router.get("/details/:workId", async (req, res) => {
  try {
    const { workId } = req.params;
    const response = await fetch(`https://openlibrary.org/works/${workId}.json`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch book details" });
  }
});


//book covers 
router.get('/details/:olid', async (req, res) => {
  try {
    const { olid } = req.params;
    const response = await fetch(`https://openlibrary.org/works/${olid}.json`);
    const book = await response.json();

    // Add cover URL to the response
    const coverUrl = book.covers
      ? `https://covers.openlibrary.org/b/id/${book.covers[0]}-M.jpg`
      : null;

    res.json({ ...book, coverUrl });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch book' });
  }
});

//shelfs

// Get all books with a given status (shelf)
router.get("/shelf/:status", async (req, res) => {
  try {
    const { status } = req.params;
    const book = await Book.find({ status });
    res.json(book);
  } catch (err) {
    console.error('Error fetching books:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add a book to a shelf
router.post("/shelf/:status", async (req, res) => {
  //const bookData = req.body; // book object from frontend
 
  try {
    //const book = new Book({ ...bookData, status});
    const { 
      title, 
      author, 
      cover, 
      workId,
      pageRead 
    } = req.body;
    const status = req.params.status;

    const book = new Book({
      title,
      author,
      cover,
      workId,
      status: status || 'tbr',
      pageRead: pageRead || 0,
      //user: req.user.id // if you have user authentication
    });

    await book.save();

    res.status(201).json({ message: 'Book added successfully', book: book });

    // avoid duplicates ?
    
  } catch (err) {
    console.error('Error saving book:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT update a book's status (move between shelves)
router.put("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const book = await Book.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    res.json(book);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove a book
router.delete("/:id", async (req, res) => {
  try {
    await Book.findByIdAndDelete(req.params.id);
    res.json({ message: "Book deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

