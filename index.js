const express = require('express')
const app = express()
const cors = require('cors')
const port = process.env.PORT || 5000
require('dotenv').config()
const { MongoClient, ServerApiVersion } = require('mongodb');

// middleware
app.use(cors())
app.use(express.json())

const uri = 'mongodb://127.0.0.1:27017/'
const client = new MongoClient(uri);

// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@atiqurrahman.ac8ixft.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
// const client = new MongoClient(uri, {
//     serverApi: {
//         version: ServerApiVersion.v1,
//         strict: true,
//         deprecationErrors: true,
//         newUrlParser: true
//     }
// });

// mongodb function
async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        client.connect();
        // Send a ping to confirm a successful connection
        const LanguageCollection = client.db('SummerCamp').collection('Languages');
        const TestimonialsCollection = client.db('SummerCamp').collection('Testimonials');
        // routes
        app.get('/', async (req, res) => {
            const Language = await LanguageCollection.find({}).toArray()
            res.send(Language)
        })

        app.get('/testimonials', async (req, res) => {
            const testimonials = await TestimonialsCollection.find({}).toArray()
            res.send(testimonials)
        })


        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {

    }
}
run().catch(console.dir);


// app listening on port
app.listen(port, () => {
    console.log('app listening on port', port);
})