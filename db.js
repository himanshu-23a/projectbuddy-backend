//Red flag -> getting started with mongoose
const mongoose = require('mongoose');
require('dotenv').config();

const connectToMongo = async () => {
    const uri = process.env.DB_URI || "mongodb+srv://<username>:<password>@projectbuddy.lh8pesb.mongodb.net/?retryWrites=true&w=majority";
    const clientOptions = { serverApi: { version: '1', strict: true, deprecationErrors: true } };
    await mongoose.connect(uri, clientOptions);
    await mongoose.connection.db.admin().command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    //await mongoose.connect('');
    //var db = mongoose.connection;
    //db.on('error', console.error.bind(console, 'connection error:'));
    //db.once('open', function () {
      //  console.log("We are connected");
    //})
}
module.exports = connectToMongo;


