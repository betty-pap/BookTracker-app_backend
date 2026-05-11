const mongoose = require('mongoose');

const QuoteSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  workId: {
    type: String,
    required: true
  },
});

const Quote = mongoose.model('Quote', QuoteSchema);

module.exports = Quote;