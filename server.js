import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import listEndpoints from 'express-list-endpoints'
import dotenv from 'dotenv'

dotenv.config()

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/happyThoughts"
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true})
mongoose.Promise = Promise

const port = process.env.PORT || 8080
const app = express()

//schema
const thoughtSchema = new mongoose.Schema({
  message: {
    type: String,
    required: [true, 'did someone forget to type in a message? (someone = you)'],
    unique: false,
    trim: true, //clearing out spaces
    validate:{
      validator: (value) => {
        return /^[^0-9]+$/.test(value)
      },
      message: 'numbers are not allowed'
    },
    minlength: [5, 'Please give me more than 5 characters. This is too boring!'],
    maxlength: [140, 'Please not so many characters! Write a book already!'],
  },
  hearts: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
})

const Thought = mongoose.model('Thought', thoughtSchema)

// middlewares to enable cors and json body parsing
app.use(cors())
app.use(express.json())

// ROUTES 
//endpointoverview
app.get('/', (req, res) => {
  res.send(listEndpoints(app))
})

//listing of 20 thoughts
app.get('/thoughts', async (req, res) => {
  const listedThoughts = await Thought.find()
  .sort({ createdAt: -1 })
  .limit(20)
  .exec()
  res.json(listedThoughts)
})

//post new thought
app.post('/thoughts', async (req, res) => {

  try{
    const newThought = await new Thought(req.body).save()
    res.json(newThought)
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'duplicated value', fields: error.keyValue })
    }
    res.status(400).json(error)
  }
})

//increasing likes
app.post('/thoughts/:thoughtId/likes', async (req, res) => {
  const { thoughtId } = req.params

  try {
    const updatedThought = await Thought.findOneAndUpdate(
      { _id: thoughtId },
      { $inc: {hearts: 1} },
      { new: true }
    );  
    if (updatedThought) {
      res.json(updatedThought);
    } else {
      res.status(404).json({ message: "Not found" });
    }
  } catch (error) {
    res.status(400).json({ message: "Invalid request", error });
  }
});

//delete thought
app.delete('/thoughts/:thoughtId', async (req, res) => {
  const { thoughtId } = req.params

  try {
    const deletedThought = await Thought.findByIdAndDelete({ _id: thoughtId })
    if (deletedThought) {
      res.json(deletedThought)
    } else {
      res.status(404).json({ message: 'not found' })
    }
  } catch (error) {
    res.json(400).json({ message: 'invalid request', error })
  }
})

//update thought
app.patch('/thoughts/:thoughtId', async (req, res) => {
  const { thoughtId } = req.params

  try {
    const updatedThought = await Thought.findOneAndReplace({ _id: thoughtId }, req.body, { new: true });
    if (updatedThought) {
      res.json(updatedThought);
    } else {
      res.status(404).json({ message: 'Not found' });
    }
  } catch (error) {
    res.status(400).json({ message: 'Invalid request', error });
  }
});
// start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
