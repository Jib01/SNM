const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
const spotify = require('../api_spotify_calls.js');
const router = express.Router();
const {playlistModel} = require('./playlist.js');

let token;

const getSpotifyToken = async () => {
  // Se non hai ancora un token o è scaduto, ne ottieni uno nuovo
  if (!token) {
    token = await spotify.getRefreshToken();
  }
  return token;
};


//schema dati utente
const userSchema = new mongoose.Schema({
    nome: {
        type: String,
        required: true,
      },
      cognome: {
        type: String,
        required: true,
      },
      username: {
        type: String,
        required: true,
        unique: true,
      },
      email: {
        type: String,
        required: true,
        unique: true,
      },
      password: {
        type: String,
        required: true,
      },
      /*immagine: { 
        type: String,
        required: false,
      },*/
      artistiPreferiti: {
        type: [
          {
            id: {
              type: String,
              required: true,
            },
            nome: {
              type: String,
              required: true,
            },
            immagine: {
              type: String,
              required: true,
            },
          },
        ],
        required: false,
        default: [],
      },
      generiPreferiti: {
        type: [String],
        required: false,
        default: [],
      },
});

//Istanza dello schema utente
const userModel = mongoose.model('user', userSchema);

//Funzione di hash per le password
function hash(tocrypt) {
  return crypto.createHash('md5')
      .update(tocrypt)
      .digest('hex');
}

router.post('/register', async (req,res)=> {

  const nome = req.body.nome;
  const cognome = req.body.cognome;
  const username = req.body.username;
  const email = req.body.email;
  let password = req.body.password;

  //Controlli di validità
  if (nome == null || nome.trim === '') {
    return res.status(400).json({ status: 'error', error: 'Nome non valido' });
  }
  if (cognome == null || cognome.trim === '') {
    return res.status(400).json({ status: 'error', error: 'Cognome non valido' });
  }
  if (username == null || /\s/.test(username)) {
    return res.status(400).json({ status: 'error', error: 'Username non valido' });
  }
  if (email == null ||  /\s/.test(email)) {
    return res.status(400).json({ status: 'error', error: 'Email non valida' });
  }
  if (password.length < 5) {
    return res.status(400).json({ status: 'error', error: 'La password deve contere almeno 5 caratteri' });
  }
  if (/\s/.test(password)) {
    return res.status(400).json({ status: 'error', error: 'La password non può contenere spazi' });
  }
  if (!/\d/.test(password)) {
    return res.status(400).json({ status: 'error', error: 'La password deve contenere almeno un numero' });
  }
    password = hash(req.body.password);

    const existingUsername = await userModel.findOne({ username: username });
    if (existingUsername) {
        return res.status(400).json({ status: 'error', error: 'Username già utilizzato' });
    }
    const existingEmail = await userModel.findOne({ email: email });
    if (existingEmail) {
        return res.status(400).json({ status: 'error', error: 'Email già utilizzata' });
    }

    try{
        const newUser = await userModel.create ({
            nome: nome,
            cognome: cognome,
            username: username,
            email: email,
            password: password,
        });

        console.log("Utente registrato correttamenre: ", newUser);
        res.status(201).json({ status: 'success', data: newUser });
    } catch(e) {
        console.error('Errore nella creazione dell\'utente', e);
        if(e.code === 11000){
            return res.status(400).json({ status: 'error', error: 'Utente già esistente' });
        }
        return res.status(500).json({ status: 'error', error: 'Si è verificato un errore durante la registrazione' });
    }

});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    const hashedPassword = hash(password);
    const user = await userModel.findOne({ username }).lean();

    if (!user || user.password !== hashedPassword) {
        return res.status(400).json({ error: 'Username o password errati' });
    }
  
    //accesso garantito
    req.session.user_id = user._id;
    req.session.username = user.username;
    console.log( "login effettuato id: " , req.session.user_id , ".\n Benvenuto " , req.session.username , "!"); 

    return res.status(200).json({
        id: req.session.user_id,
        username: req.session.username,
    });
});

router.get('/data', async (req, res) => { 

    try {

      const user = await userModel.findOne({ _id: req.session.user_id }).lean();

      if (!user) {
        return res.status(404).json({ error: 'L\'utente non è stato trovato' });
      }

      return res.json({ data: user , status: 'success' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Errore del server' });
    }  
});

router.get('/getArtists', async (req, res) => {

  try {

    const artisti = await userModel.findOne(
      { _id: req.session.user_id }).select('artistiPreferiti').lean();


    return res.status(200).json({ data: artisti , status: 'success' });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Errore del server' });
  }

});

router.post('/addArtist', async (req,res) => {

  const { artist_id } = req.query;

  try{

    let artist = await spotify.getArtists(artist_id, await getSpotifyToken());

    if (artist.error) {
      token = await spotify.getRefreshToken();
      artist = await spotify.getArtists(artist_id, token);
    }
    
    if (!artist || artist.error) {
      return res.status(404).json({ error: 'Artista non trovato' });
    }

    if (
      await userModel.findOne({
        _id: req.session.user_id,
        artistiPreferiti: { $elemMatch: {  id: artist.id } },
      })
    ) {
      return res.status(400).json({ error: 'Artista già aggiunto ai preferiti' });
    }
  
    await userModel.updateOne(
      { _id: req.session.user_id},
      {
        $push: {
          artistiPreferiti: {
            id: artist.id,
            nome: artist.name,
            immagine: artist.images[0].url,
          },
        },
      }
    );
  
    return res.status(200).json({ status: 'success' });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Errore del server' });
  }
  
});

router.delete('/removeArtist', async (req, res) => {

  const { artist_id } = req.query;

  try {

    await userModel.updateOne(
      { _id: req.session.user_id},
      { $pull: { artistiPreferiti: { id: artist_id } } }
    );

    return res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Errore del server' });
  }

});

router.get('/getGenres', async (req, res) => {

  try {

    const genre = await userModel.findOne({ _id: req.session.user_id })
    .select('generiPreferiti').lean();

    return res.status(200).json({ data: genre, status: 'success' });

  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Errore del server' });
  }

});

router.post('/addGenre', async (req,res) => {

  const { genre } = req.query;
  
    try {
      const user = await userModel.findOne({
        _id: req.session.user_id,
        generiPreferiti: genre,
      });
  
      if (user) {
        return res.status(400).json({ error: 'Genere già aggiunto ai preferiti' });
      }
  
    await userModel.updateOne(
        { _id: req.session.user_id },
        { $push: { generiPreferiti: genre } });

    return res.status(200).json({ status: 'success' });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Errore del server' });
  }
});

router.delete('/removeGenre', async (req, res) => {

  const { genre } = req.query;
  try {
    await userModel.updateOne(
      { _id: req.session.user_id},
      { $pull: { generiPreferiti: genre } }
    );
    return res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Errore del server' });
  }
});

router.patch('/editProfile', async(req, res) => {

  try{

    const updatedData = {};

    if(req.body.nome){
      if ( req.body.nome.trim === '') {
        return res.status(400).json({ status: 'error', error: 'Nome non valido' });
      }
      updatedData.nome = req.body.nome;
    }

    if(req.body.cognome){
      if ( req.body.cognome.trim === '') {
        return res.status(400).json({ status: 'error', error: 'Cognome non valido' });
      }
      updatedData.cognome = req.body.cognome;
    }

    if(req.body.username){
      if ( /\s/.test(req.body.username)) {
        return res.status(400).json({ status: 'error', error: 'Username non valido' });
      }
      updatedData.username = req.body.username;
    }

    if(req.body.email){
      if ( /\s/.test(req.body.email)) {
        return res.status(400).json({ status: 'error', error: 'Email non valida' });
      }
      updatedData.email = req.body.email;
    }

    if(req.body.password){
      if (req.body.password.length < 5) {
        return res.status(400).json({ status: 'error', error: 'La password deve contere almeno 5 caratteri' });
      }
      if (/\s/.test(req.body.password)) {
        return res.status(400).json({ status: 'error', error: 'La password non può contenere spazi' });
      }
      if (!/\d/.test(req.body.password)) {
        return res.status(400).json({ status: 'error', error: 'La password deve contenere almeno un numero' });
      }
      updatedData.password = hash(req.body.password);
    }

    if (updatedData.username) {
      const existingUsername = await userModel.findOne({ username: updatedData.username });
      if (existingUsername) {
        return res.status(400).json({ status: 'error', error: 'Username già utilizzato' });
      }
    }

    if (updatedData.email) {
      const existingEmail = await userModel.findOne({ email: updatedData.email });
      if (existingEmail) {
        return res.status(400).json({ status: 'error', error: 'Email già utilizzata' });
      }
    }

    if (Object.keys(updatedData).length > 0) {

      await userModel.updateOne({ _id:req.session.user_id}, { $set: updatedData });

      if (updatedData.username) {

        const playlists = await playlistModel.find({ owner: req.session.username }).lean();

        for (const playlist of playlists) {
          await playlistModel.updateOne(
            { _id: playlist._id },
            { $set: { creatore: updatedData.username } }
          );
        }
        req.session.username = updatedData.username;

      }
      return res.status(200).json({ status: 'success' });

    } else {
      console.error(error);
      return res.status(500).json({ error: 'Nessuna modifica apportata' });
    }

  } catch(error){
    return res.status(500).json({ error: 'Errore del server' });
  }
});

router.delete('/deleteProfile', async (req, res) => {

  try {

      const followedPlaylists = await playlistModel.find({
        followers: { $elemMatch: { userId: req.session.user_id } },
      }).lean();

      const userPlaylists = await playlistModel.find({
        owner: req.session.username,
      }).lean();

      for (const playlist of followedPlaylists) {
        await playlistModel.updateOne(
          { _id: playlist._id },
          { $pull: { followers: { user_id: userId } } } );
      }

      for (const playlist of userPlaylists) {
        await playlistModel.deleteOne({ _id: playlist._id });
      }

      await userModel.deleteOne({ _id: req.session.user_id });
      
      return res.status(200).json({ status: 'success' });

    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: 'Errore del server' });
    }
});

module.exports = {
  userRoute: router,
  userModel: userModel
};
