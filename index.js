const express = require('express')
const app = express();
const cors = require('cors')
const bodyParser = require("body-parser");
const path = require('path');
const crypto = require('crypto')
let currUser;

app.use(express.static(path.join(__dirname, "public")));
app.engine('html', require('ejs').renderFile);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.listen(process.env.PORT, () => {
  console.log('Server is running');
});

app.get('/', function (req, res) {  
  res.render("un.html");
})

app.get('/api/config', (req, res) => { res.json({ apiKey: process.env.API_KEY }); });

app.post('/rooms', function (req, res) {
  currUser = req.body.username;
  res.redirect('/rooms/'+req.body.room)
})

app.get('/rooms/:room', (req,res) => {
  const room = req.params.room;
  const us = currUser ? currUser : '';
  currUser = '';
      res.render('chatroom.html', {
          userId: crypto.randomUUID(),
          username: us,
          room: room,
      })
})