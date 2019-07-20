var mongoose = require('mongoose');
console.log("HERE MONGO STUFF IS",process.env.MONGODB_URI)
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/detektor');
