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
      return res.status(500).json({ error: "Failed to fetch from Open Library" });
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

    // Extract author names properly
    let authors = [];
    if (data.authors) {
      // Fetch author names if we have author references
      const authorPromises = data.authors.map(async (author) => {
        try {
          const authorRes = await fetch(`https://openlibrary.org${author.author.key}.json`);
          const authorData = await authorRes.json();
          return authorData.name;
        } catch (error) {
          return "Unknown Author";
        }
      });
      authors = await Promise.all(authorPromises);
    }

    // Get cover image
    const coverUrl = data.covers && data.covers.length > 0 
      ? `https://covers.openlibrary.org/b/id/${data.covers[0]}-L.jpg` 
      : null;

    // Send complete book data
    res.json({
      ...data,
      coverUrl,
      author_names: authors, // Add author names in the format your frontend expects
      authors: authors,      // Alternative format
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch book details" });
  }
});


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

// Get one book by workId (check which shelf it's on)
router.get("/find/:workId", async (req, res) => {
  try {
    const { workId } = req.params;
    const book = await Book.findOne({ workId });

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    res.json(book);
  } catch (err) {
    console.error("Error finding book:", err);
    res.status(500).json({ error: err.message });
  }
});


// Add a book to a shelf
router.post("/shelf/:status", async (req, res) => {
  try {
    const { 
      title, 
      author, 
      cover, 
      cover_i,
      workId,
      pageRead,
      totalPages
    } = req.body;
    const status = req.params.status;

    const book = new Book({
      title,
      author,
      cover,
      cover_i,
      workId,
      status: status || 'tbr',
      pageRead: pageRead || 0,
      totalPages: totalPages || 0, 
      currentProgress: totalPages && pageRead ? Math.round((pageRead / totalPages) * 100) : 0
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
router.delete("/delete", async (req, res) => {
  try {
    const { workId } = req.body;
    await Book.findOneAndDelete({ workId });
    res.json({ message: "Book removed from shelves" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update reading progress
router.put("/progress/:workId", async (req, res) => {
  try {
    const { workId } = req.params;
    const { currentPage, pagesRead, duration, totalPages } = req.body;
    
    const book = await Book.findOne({ workId });

    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    // Update total pages if provided 
    if (totalPages) {
      book.totalPages = totalPages;
    }

    // Validate page number
    if (book.totalPages && currentPage > book.totalPages) {
      return res.status(400).json({ 
        message: `Current page cannot exceed total pages (${book.totalPages})` 
      });
    }

    // Update progress
    book.pageRead = currentPage;
    book.lastRead = new Date();

    // Calculate progress percentage if total pages is known
    if (book.totalPages && book.totalPages > 0) {
      book.currentProgress = Math.round((currentPage / book.totalPages) * 100);
    }

    // Add reading session if pages were read
    if (pagesRead && pagesRead > 0) {
      book.readingSessions.push({
        date: new Date(),
        pagesRead,
        startPage: currentPage - pagesRead,
        endPage: currentPage,
        duration: duration || 0
      });
    }

    // Update status based on progress
    if (book.currentProgress >= 100) {
      book.status = 'finished';
    } else if (book.currentProgress > 0 && book.status === 'tbr') {
      book.status = 'reading';
    }

    await book.save();
    res.json(book);
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get currently reading books with progress
router.get("/shelf/reading/with-progress", async (req, res) => {
  try {
    const books = await Book.find({ status: 'reading' })
      .sort({ lastRead: -1 });
    res.json(books);
  } catch (err) {
    console.error('Error fetching reading books:', err);
    res.status(500).json({ error: err.message });
  }
});

// STAR Rating
router.patch("/:workId/rating", async (req, res) => {
  try {
    const { workId } = req.params;
    const { rating } = req.body;
    const book = await Book.findByIdAndUpdate(
      {workId},
      { $set: { rating } },
      { new: true }
    );
    res.json(book);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
