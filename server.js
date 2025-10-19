const express = require('express');
const app = express();
const session = require('express-session');
const collection = require("./dbconnection");
const cors = require('cors');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('pages'));

app.use(
    session({
      secret: '0000',
      resave: true,
      saveUninitialized: true,
    })
);

//---------------- SWAGGER -----------------------

const swaggerUi = require('swagger-ui-express');
const swaggerDocs = require('./swagger-output.json');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

//----------------- ROUTES ------------------------

const routes = require('./pages/routes.js');
app.use('/', routes);

const {userRoute} = require('./pages/user.js');
app.use('/user', userRoute);

const {spotifyRoute} = require('./pages/spotify.js');
app.use('/spotify',spotifyRoute); 

const {playlistRoute} = require('./pages/playlist.js');
app.use('/playlist',playlistRoute); 

app.listen(3004, () => {
    console.log('Server in ascolto sulla porta 3004'); 
});
