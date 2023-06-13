const express = require('express')
const app = express()
const cors = require('cors')
const port = process.env.PORT || 5000
require('dotenv').config()
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require("stripe")(process.env.SECRET_KEY_OF_STRIP);

// middleware
app.use(express.static("public"));
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
        // Collections
        const LanguageCollection = client.db('SummerCamp').collection('Languages');
        const TestimonialsCollection = client.db('SummerCamp').collection('Testimonials');
        const UsersCollection = client.db('SummerCamp').collection('Users');
        const selectedClassesCollection = client.db('SummerCamp').collection('SelectedClasses');
        const enrolledClassesCollection = client.db('SummerCamp').collection('enrolledClasses');



        // $============================================================$
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
        app.post('/user', async (req, res) => {
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


        // Payments Routes
        // Create payment intent
        app.post('/create-payment-intent', verifyJwt, async (req, res) => {
            const { price } = req.body;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ["card"]
            })
            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })

        // payment information
        app.post('/payment', verifyJwt, async (req, res) => {
            const payment = req.body;
            const UserEmail = req.decoded.email
            const paymentEmail = payment.email
            const result = await enrolledClassesCollection.insertOne(payment)

            if (result && UserEmail === paymentEmail) {
                const query = { StudentEmail: UserEmail }
                if (query) {
                    await selectedClassesCollection.deleteMany(query)
                }

            }
            res.send(result)
        })



        app.patch('/availableSeat', verifyJwt, async (req, res) => {
            const email = req.decoded.email;
            if (email) {
                const query = { email: email };

                const enrolledClasses = await enrolledClassesCollection.find(query).toArray();
                console.log(enrolledClasses);
                const bookedIds = enrolledClasses.map(classItem => classItem.BookedId);



                for (const bookedIdArray of bookedIds) {
                    for (const bookedId of bookedIdArray) {
                        // console.log('bookedId:', bookedId);

                        await LanguageCollection.updateOne(
                            { _id: new ObjectId(bookedId) },
                            { $inc: { availableSeat: -1, numberOfStudents: 1 } }
                        );

                        // console.log('Update Result:', updateResult);
                    }
                }
            }
        })



        // payment history  routes

        app.get('/paymentHistory', verifyJwt, async (req, res) => {
            const email = req.decoded.email;
            if (email) {
                const result = await enrolledClassesCollection.find({ email }).sort({ _id: -1 }).toArray()
                res.send(result)
            }
        })


        //enrolled classes
        app.get('/enrolledClasses', async (req, res) => {
            // const email = req.decoded.email
            try {
                const pipeline = [
                    {
                        $addFields: {
                            BookedId: {
                                $map: {
                                    input: '$BookedId',
                                    as: 'itemId',
                                    in: { $toObjectId: '$$itemId' }
                                }
                            }
                        }
                    },
                    {
                        $lookup: {
                            from: 'Languages',
                            localField: 'BookedId',
                            foreignField: '_id',
                            as: 'bookedData'
                        }
                    },
                    {
                        $unwind: '$bookedData'
                    },
                    {
                        $group: {
                            _id: '$bookedData.foreignLanguageName',
                            teacherName: { $first: '$bookedData.teacherName' },
                            languageImage: { $first: '$bookedData.languageImage' },
                            numberOfStudents: { $first: '$bookedData.numberOfStudents' },
                            availableSeat: { $first: '$bookedData.availableSeat' },
                            email: { $first: '$bookedData.email' },
                            price: { $first: '$bookedData.price' },
                            status: { $first: '$bookedData.status' }
                        }
                    },
                    {
                        $project: {
                            foreignLanguageName: '$_id',
                            teacherName: '$teacherName',
                            languageImage: '$languageImage',
                            numberOfStudents: '$numberOfStudents',
                            availableSeat: '$availableSeat',
                            email: '$email',
                            price: '$price',
                            status: '$status',
                            _id: 0
                        }
                    }
                ];

                const result = await enrolledClassesCollection.aggregate(pipeline).toArray();
                res.send(result);
            } catch (error) {
                console.error('Error:', error);
                res.status(500).send('An error occurred');
            }
        });

        // Instructors routes
        app.post('/AddCourse', verifyJwt, async (req, res) => {
            const email = req.decoded.email
            const course = req.body
            if (email === course.email) {
                const result = await LanguageCollection.insertOne(course)
                res.send(result);
            }
        })

        // All Classes That I posted
        app.get('/MyClasses', verifyJwt, async (req, res) => {
            const email = req.decoded.email

            if (email) {
                const result = await LanguageCollection.find({ email }).toArray()
                res.send(result);
            }
        })

        // Update my Classes Data
        app.patch('/updateData/:id', verifyJwt, async (req, res) => {
            const id = req.params.id;
            const newData = req.body;
            const updateDoc = {
                $set: {
                    languageImage: newData.languageImage,
                    foreignLanguageName: newData.foreignLanguageName,
                    teacherName: newData.teacherName,
                    courseEnrollDeadline: newData.courseEnrollDeadline,
                    courseDetails: newData.courseDetails,
                    email: newData.email,
                    availableSeat: newData.availableSeat,
                    price: newData.price,

                }
            }
            const query = { _id: new ObjectId(id) };
            const result = await LanguageCollection.updateOne(query, updateDoc);

            res.send(result);
        });
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