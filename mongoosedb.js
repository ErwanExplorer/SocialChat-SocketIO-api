const mongoose = require('mongoose');

//Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/chat', { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.connection.on('error', (err) => {
    console.log('Mongoose Error: ' + err);
});