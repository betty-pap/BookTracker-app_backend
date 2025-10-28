const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  author: {
    type: String,
    required: true,
    default: "Unknown Author"
  },
  status: {
    type: String,
    enum: ["tbr", "reading", "finished"], 
    default: "tbr"
  },
  pageRead: {
    type: Number,
    default: 0
  },
  totalPages: {
    type: Number,
    default: 0
  },
  cover: {
    type: String,
    default: "https://placehold.co/100x150?text=No+Cover"
  },
  cover_i: String,
  workId: String, //open library id
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

const Book = mongoose.model('Book', bookSchema);

module.exports = Book;