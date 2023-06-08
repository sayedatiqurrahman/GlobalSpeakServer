const express = require('express')
const app = express()
const cors = require('cors')
const port = process.env.PORT || 5000
require('dotenv').config()

// middleware
app.use(cors())
app.use(express.json())



// routes
app.get('/', (req, res) => {
    res.send('app is running')
})

// app listening on port
app.listen(port, () => {
    console.log('app listening on port', port);
})