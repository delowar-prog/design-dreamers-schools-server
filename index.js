const express = require('express')
const app = express()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors')
require('dotenv').config()
const port = process.env.PORT || '5000'

//middleware
app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.send('server running')
})

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
    await client.connect();

    const classCollection = client.db('fashionDesign').collection('classes')
    const instructorCollection = client.db('fashionDesign').collection('instructors')
    const selectedClassCollection=client.db('fashionDesign').collection('selectedClass')
    const userCollection=client.db('fashionDesign').collection('users')
    //class collections related api
    app.get('/classes', async (req, res) => {
      const result = await classCollection.find().toArray();
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
    app.get('/selected/classes', async (req, res) => {
      const email=req.query.email
      if(!email){
        res.send([])
      }
      const query={email:email}
      const result = await selectedClassCollection.find(query).toArray();
      res.send(result)
    })

    app.post('/selected/classes', async (req, res) => {
      const data = req.body
      const result = await selectedClassCollection.insertOne(data)
      res.send(result)
    })

    app.delete('/selected/classes/:id', async(req,res)=>{
      const id=req.params.id
      const query={_id: new ObjectId(id)}
      const result=await selectedClassCollection.deleteOne(query)
      res.send(result)
    })
    //user Collection related api
    app.get('/users', async(req,res)=>{
      const result=await userCollection.find().toArray()
      res.send(result)
    })
    app.post('/users', async(req,res)=>{
      const user=req.body
      const query={email:user.email}
      const existingUser=await userCollection.findOne(query)
      if(existingUser){
        return res.send({message:'User already exist in database'})
      }
      const result=await userCollection.insertOne(user)
      res.send(result)
    })
    //user role manage api
    app.put('/users/admin/:id', async(req,res)=>{
      const id=req.params.id
      const query={_id: new ObjectId(id)}
      const updateDoc = {
        $set: {
          role: `admin`
        },
      }; 
      const result=await userCollection.updateOne(query,updateDoc)
      res.send(result)
    })
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
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

