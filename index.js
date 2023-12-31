const express = require('express')
const jwt = require('jsonwebtoken');
const cors = require('cors')
require('dotenv').config()
const stripe=require('stripe')(process.env.PAYMENT_SECRET_KEY)
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || '5000'

//middleware
app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.send('server running')
})

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization
  if (!authorization) {
    return res.status(401).send({ error: true, message: "Unauthorized Access" })
  }
  const token = authorization.split(' ')[1]
  jwt.verify(token, process.env.JWT_ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: "Unauthorized Access" })
    }
    req.decoded = decoded
    next()
  })
}

//mongodb start

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ow6kx3p.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    app.post('/jwt', async (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.JWT_ACCESS_TOKEN, { expiresIn: '1h' })
      res.send({ token })
    })

       
    const classCollection = client.db('fashionDesign').collection('classes')
    const instructorCollection = client.db('fashionDesign').collection('instructors')
    const selectedClassCollection = client.db('fashionDesign').collection('selectedClass')
    const userCollection = client.db('fashionDesign').collection('users')
    const paymentCollection = client.db('fashionDesign').collection('payment')


    //verify user Admin or Instructor or others
    const verifyAdmin = async (req, res, next) => {
      const verifiedEmail = req.decoded.email
      const query = { email: verifiedEmail }
      const user = await userCollection.findOne(query)
      if (user?.role !== 'admin') {
        res.status(403).send({ error: true, message: "Forbidden Access" })
      }
      next()
    }

    const verifyInstructor = async (req, res, next) => {
      const verifiedEmail = req.decoded.email
      const query = { email: verifiedEmail }
      const user = await userCollection.findOne(query)
      if (user?.role !== 'instructor') {
        res.status(403).send({ error: true, message: "Forbidden Access" })
      }
      next()
    }

    //class collections related api
    app.get('/classes', async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result)
    })

    app.post('/classes', verifyJWT, verifyInstructor, async (req, res) => {
      const newClass = req.body
      const result = await classCollection.insertOne(newClass)
      res.send(result)
    })
    app.get('/instructor/classes', verifyJWT, verifyInstructor, async (req, res) => {
      const email = req.query.email
      if (!email) {
       return res.send([])
      }
      const query = { email: email }
      const result = await classCollection.find(query).toArray();
      res.send(result)
    })

    app.get('/admin/classes',verifyJWT, verifyAdmin, async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result)
    })

    app.put('/admin/approveClass/:id',verifyJWT, verifyAdmin, async (req, res)=>{
      const id=req.params.id
      const query={_id: new ObjectId(id)}
      const updateDoc = {
        $set: {
          status: `approved`
        },
      }; 
      const result = await classCollection.updateOne(query, updateDoc)
      res.send(result)
    })

    app.put('/admin/denyClass/:id',verifyJWT, verifyAdmin, async (req, res)=>{
      const id=req.params.id
      const query={_id: new ObjectId(id)}
      const updateDoc = {
        $set: {
          status: `denied`
        },
      }; 
      const result = await classCollection.updateOne(query, updateDoc)
      res.send(result)
    })

    app.put('/admin/feedback/:id',verifyJWT, verifyAdmin, async (req, res)=>{
      const id=req.params.id
      const message=req.body
      console.log(message)
      const query={_id: new ObjectId(id)}
      const updateDoc = {
        $set: {
          feedback: message
        },
      }; 
      const result = await classCollection.updateOne(query, updateDoc)
      res.send(result)
    })

    app.get('/classes/topsix', async (req, res) => {
      const allClasses = await classCollection.find().sort({ 'available_seats': -1 }).toArray()
      const topsix = allClasses.slice(0, 6)
      res.send(topsix)
    })


    //instructor collections related api
    app.get('/instructors', async (req, res) => {
      const result = await instructorCollection.find().toArray();
      res.send(result)
    })

    app.get('/instructors/topsix', async (req, res) => {
      const allInstructors = await instructorCollection.find().sort({ 'taken_class': -1 }).toArray()
      const topsix = allInstructors.slice(0, 6)
      res.send(topsix)
    })

    //selectedClass releted api
    app.get('/selected/classes', verifyJWT, async (req, res) => {
      const email = req.query.email
      if (!email) {
       res.send([])
      }
      const query = { email: email }
      const result = await selectedClassCollection.find(query).toArray();
      res.send(result)
    })

    app.post('/selected/classes', verifyJWT, async (req, res) => {
      const data = req.body
      const result = await selectedClassCollection.insertOne(data)
      res.send(result)
    })

    app.delete('/selected/classes/:id', verifyJWT, async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await selectedClassCollection.deleteOne(query)
      res.send(result)
    })
    //Enroll classes
     app.get('/enroll/classes/:email', async (req, res) => {
      const email=req.params.email
      const query={email:email}
      const result = await paymentCollection.find(query).toArray()
      const enrollClass=result.map(item=>item)
      res.send(enrollClass)
    })
    //payment history
    app.get('/payment/history/:email', async (req, res) => {
      const email=req.params.email
      const query={email:email}
      const result = await paymentCollection.find(query).sort({ 'date': -1 }).toArray()
      res.send(result)
    })
    //user Collection related api
    app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray()
      res.send(result)
    })

    app.post('/users', async (req, res) => {
      const user = req.body
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query)
      if (existingUser) {
        return res.send({ message: 'User already exist in database' })
      }
      const result = await userCollection.insertOne(user)
      res.send(result)
    })

    //user role manage api
    app.put('/users/admin/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          role: `admin`
        },
      };
      const result = await userCollection.updateOne(query, updateDoc)
      res.send(result)
    })

    app.put('/users/instructor/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          role: `instructor`
        },
      };
      const result = await userCollection.updateOne(query, updateDoc)
      res.send(result)
    })

    //check admin or user
    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      const verifiedEmail = req.decoded.email
      if (verifiedEmail !== email) {
       return res.send({ admin: false })
      }
      const query = { email: email }
      const user = await userCollection.findOne(query)
      const result = { admin: user?.role === 'admin' }
      res.send(result)
    })

    app.get('/users/instructor/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const user = await userCollection.findOne(query)
      const result = { instructor: user?.role === 'instructor' }
      res.send(result)
    })
    //Payment Method APIs
    app.post('/create-payment-intent', verifyJWT, async(req,res)=>{
      const {price}=req.body
      const amount=price*100
      const paymentIntent=await stripe.paymentIntents.create({
        amount:amount,
        currency:'usd',
        payment_method_types:['card']
      })
      res.send({
        clientSecret: paymentIntent.client_secret,
      })
    })

    app.post('/payment', verifyJWT, async(req,res)=>{
      const paymentInfo=req.body
      const insertResult = await paymentCollection.insertOne(paymentInfo)
      const query={_id:{$in: paymentInfo.cartItems.map(id=>new ObjectId(id))}}
      const deletedResult=await selectedClassCollection.deleteMany(query)
      res.send({insertResult,deletedResult})
    })
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

//Mongodb end

app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})

