const express = require("express");
const router = express.Router();
const Quote = require("../models/Quote");

// Get all quotes
router.get("/", async (req, res) => {
  try {
    const quotes = await Quote.find().sort({ createdAt: -1 });
    res.json(quotes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get quotes for a specific book
router.get("/:workId", async (req, res) => {
  try {
    const quotes = await Quote.find({ workId: req.params.workId }).sort({ createdAt: -1 });
    res.json(quotes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a quote
router.post("/", async (req, res) => {
  try {
    const { workId, text, pageNumber } = req.body;

    const quote = new Quote({ workId, text, pageNumber });
    await quote.save();
    res.status(201).json(quote);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a quote
router.delete("/:id", async (req, res) => {
  try {
    const quote = await Quote.findByIdAndDelete(req.params.id);
    if (!quote) return res.status(404).json({ message: "Quote not found" });
    res.json({ message: "Quote deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;