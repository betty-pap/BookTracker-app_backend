const express = require("express");
const router = express.Router();
const Book = require("../models/Book");

// search route
router.get("/search", async (req, res) => {
  try {
    const query = req.query.q;
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

// shelf route
router.get("/shelf/:status", async (req, res) => {
  try {
    const { status } = req.params;

    let query = Book.find({status});

    // If it's reading status, sort by last read
    if (status === 'reading') {
      query = query.sort({ lastRead: -1 });
    }

    const book = await query;
    res.json(book);

  } catch (err) {
    console.error('Error fetching books:', err);
    res.status(500).json({ error: err.message });
  }
});

// details route
router.get("/:workId", async (req, res) => {
  try {
    const { workId } = req.params;
    //check if book is in user's library
    const savedBook = await Book.findOne({ workId });
    //fetch details
    const response = await fetch(`https://openlibrary.org/works/${workId}.json`);
    const data = await response.json();

    // Get cover image
    const coverUrl = data.covers?.[0] 
      ? `https://covers.openlibrary.org/b/id/${data.covers[0]}-L.jpg` 
      : null;

    // Send complete book data
    res.json({
      ...data,
      coverUrl,
      // Add shelf info if book is saved
      shelf: savedBook?.status || null,
      progress: savedBook?.pageRead || null,
      isSaved: !!savedBook
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch book details" });
  }
});

// Add a book to a shelf
router.post("/", async (req, res) => {
  try {
    const { 
      title, 
      author, 
      cover, 
      cover_i,
      workId,
      status,
      pageRead,
      totalPages
    } = req.body;

    // Check for duplicates
    const existingBook = await Book.findOne({ workId });
    if (existingBook) {
      return res.status(400).json({ 
        error: 'Book already in library',
        book: existingBook 
      });
    }

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
    res.status(201).json({ message: 'Book added successfully', book });

  } catch (err) {
    console.error('Error saving book:', err);
    res.status(500).json({ error: err.message });
  }
});

// update book status (move between shelves)
router.put("/:workId/status", async (req, res) => {
  try {
    const { workId } = req.params;
    const { status } = req.body;

    const book = await Book.findOneAndUpdate(
      {workId},
      { status },
      { new: true }
    );
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    res.json(book);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update reading progress
router.put("/:workId/progress", async (req, res) => {
  try {
    const { workId } = req.params;
    const { currentPage, totalPages } = req.body;
    
    const book = await Book.findOne({ workId });
    if (!book) return res.status(404).json({ message: 'Book not found' });

    // Allow changing total pages 
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

    // Calculate progress %
    if (book.totalPages && book.totalPages > 0) {
      book.currentProgress = Math.round((book.pageRead / book.totalPages) * 100);

      // Auto-move to finished if complete
      if (book.currentProgress >= 100) {
        book.status = 'finished';
      }
    }

    await book.save();
    res.json(book);
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ error: error.message });
  }
});

// STAR Rating
router.patch("/:workId/rating", async (req, res) => {
  try {
    const { workId } = req.params;
    const { rating } = req.body;

    const book = await Book.findOneAndUpdate(
      { workId },
      { rating },
      { new: true }
    );
    res.json(book);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove a book
router.delete("/:workId", async (req, res) => {
  try {
    const { workId } = req.params; 
    
    const book = await Book.findOneAndDelete({ workId });

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    res.json({ message: "Book removed from shelves" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
