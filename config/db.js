const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true, 
            useUnifiedTopology: true,
            useCreateIndex: true
        });
        console.log(`Connected to Database: ${conn.connection.host}`);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

module.exports = connectDB;