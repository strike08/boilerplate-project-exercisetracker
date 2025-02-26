const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const cors = require('cors')
require('dotenv').config();
let mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI);



const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  }
});

const exerciseSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    description: String,
    duration: Number,
    date: Date
});
userSchema.virtual('exercises', {
    ref: 'Exercise',
    localField: '_id',
    foreignField: 'user'
})

let Exercise = mongoose.model('Exercise', exerciseSchema);
let User = mongoose.model('User', userSchema);

app.use(cors())
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


app.post('/api/users', (req, res) => {
  let newUser = new User({username: req.body.username});
  newUser.save().then(result => {
    res.json({username: result.username, _id: result._id});
  });
})

app.post('/api/users/:_id/exercises', async (req, res) => {
    let user = await User.findById(req.params._id).exec();
    if (!user) {
        res.json({error: "User not found"});
        return;
    }
    let newExercise = new Exercise({
        user: user,
        description: req.body.description,
        duration: req.body.duration,
        date: req.body.date ? new Date(req.body.date) : new Date()
    });
    
    newExercise.save().then(result => {
        res.json({username: result.user.username, 
            description: result.description, 
            duration: result.duration, 
            date: result.date.toDateString("yyyy-mm-dd"),
            _id: result._id});
    });
});

app.get('/api/users/:id/logs', (req, res) => {
    let userQuery = User.findById(req.params.id);
    let logs = User.findById(req.params.id).populate('exercises');
    console.log(logs);
    if (req.query.from){
        logs.where('date').gte(new Date(req.query.from));
    }
    if (req.query.to){
        logs.where('date').lte(new Date(req.query.to));
    }
    if (req.query.limit){
        logs.limit(parseInt(req.query.limit));
    }
    logs.exec().then(async result => {
        let user = await userQuery.exec();
        let parsedResults = result.exercises.map(excercise => {
            return {
                description: excercise.description,
                duration: excercise.duration,
                date: excercise.date.toDateString()
            };
        });
        res.json({username: user.username, count: result.length, _id: user._id, log: parsedResults});
    });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
