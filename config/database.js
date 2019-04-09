var mongoose = require('mongoose');
if (process.env.ENVIRONMENT == 'development') {
	mongoose.connect('mongodb://localhost:27017/detektor');
} else if (process.env.ENVIRONMENT == 'test') {
	mongoose.connect('mongodb://localhost:27017/detektor-test');
}
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/detektor');
