require("dotenv").config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

// middleware
app.use(cors());
app.use(express.json());

//from env file
const uri = process.env.MONGO_URI;
const port = process.env.PORT || 3000;

// root route
app.get('/', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Import routes
const bookRoute = require("./routes/bookRoutes");
//const authRoutes = require("./routes/auth");

// Use routes
app.use("/api/books", bookRoute);
//app.use("/api/auth", authRoutes);

//DB connection
mongoose.connect(uri)
  .then(() => console.log('connected'))
  .catch(err => console.log(err));

// start server
app.listen(port, '0.0.0.0', () => {
  console.log('backend running on port 3000 now');
});





