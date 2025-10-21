require("dotenv").config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');


const app = express();
app.use(cors({
  origin: ['http://localhost:8081', 'exp://localhost:19000', 'http://localhost:3000'], // Expo URLs
  credentials: true
}));

//from env file
const uri = process.env.MONGO_URI;
const port = process.env.PORT || 3000;

// Middleware 
app.use(express.json());

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
//mongoose.connect(uri)
//  .then(() => console.log('connected'))
//  .catch(err => console.log(err));

app.listen(port, () => {
  console.log('backend running on port 3000 now');
})







