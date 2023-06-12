const express = require('express')
const app = express()
const cors = require('cors')
const port = process.env.PORT || 5000
require('dotenv').config()
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// middleware
app.use(cors())
app.use(express.json())

const verifyJwt = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'Authorization Required' })
    }
    const token = authorization.split(' ')[1]

    jwt.verify(token, `${process.env.ACCESS_TOKEN}`, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'Unauthorized Access Token' });
        }
        req.decoded = decoded;
        next()
    });

}

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
        const UsersCollection = client.db('SummerCamp').collection('Users');
        const selectedClassesCollection = client.db('SummerCamp').collection('SelectedClasses');

        // routes
        app.post('/jwt', (req, res) => {
            const email = req.body;
            const token = jwt.sign(email, `${process.env.ACCESS_TOKEN}`, { expiresIn: '1h' });
            res.send({ token });
        })


        // projects routes to get or post data 
        app.get('/', async (req, res) => {
            const Language = await LanguageCollection.find({}).toArray()
            res.send(Language)
        })

        app.get('/testimonials', async (req, res) => {
            const testimonials = await TestimonialsCollection.find({}).toArray()
            res.send(testimonials)
        })



        // Users Data post/create
        app.post('/user', verifyJwt, async (req, res) => {
            const user = req.body;
            const email = user.email
            const query = { email: email }
            const inQuery = await UsersCollection.findOne(query)
            if (inQuery) {
                return
            } else {
                const result = await UsersCollection.insertOne(user)
                res.send(result)
            }


        })

        app.get('/user/:email', async (req, res) => {
            const query = { email: req.params.email }
            const filter = await UsersCollection.findOne(query)
            res.send(filter)
        })


        // Selected classes
        app.post('/mySelectedClass', verifyJwt, async (req, res) => {
            const classes = req.body
            const bookedClass = classes.bookedClass
            const query = await selectedClassesCollection.findOne({ bookedClass })
            if (query) {
                return res.send({ error: true, message: "This Items is Already booked" })
            } else {
                const result = await selectedClassesCollection.insertOne(classes)
                res.send(result)
            }

        })
        app.get('/selectedClasses/:email', verifyJwt, async (req, res) => {
            const StudentEmail = req.params.email;
            const result = await selectedClassesCollection.find({ StudentEmail }).toArray()

            res.send(result)
        })
        // delete selecterd class
        app.delete('/selectedClasses/:id', verifyJwt, async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await selectedClassesCollection.deleteOne(query)
     
            res.send(result)
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