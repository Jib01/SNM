const express = require('express');
const mongoose = require('mongoose');
const spotify = require('../api_spotify_calls.js');
const router = express.Router();

let token;

const getSpotifyToken = async () => {
  // Se non hai ancora un token o è scaduto,ni ottieni uno nuovo
  if (!token) {
    token = await spotify.getRefreshToken();
  }
  return token;
};

const playlistSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: true,
    },
    /*immagine: { 
      type: String,
      required: false,
    },*/
    descrizione: {
      type: String,
      required: false,
    },
    privata: {
      type: Boolean,
      required: true,
    },
    tags: {
        type: [
          {
            type: String,
          },
        ],
        required: false,
        default: [],
    },
    tracce: [
      {
        type: {
          id: {
            type: String,
            required: true,
          },
          nome: {
            type: String,
            required: true,
          },
          album: {
            type: String,
            required: true,
          },
          artista: {
            type: String,
            required: true,
          },
          immagine: {
            type: String,
            required: true,
          },
          data_rilascio: {
            type: String,
            required: true,
          },
          durata: {
            type: Number,
            required: true,
          },
        },
        required: false,
        default: [],
      },
    ],
    owner: {
      type: String,
      required: true,
    },
    followers: {
      type: [
        {
          user_id: {
            type: String,
            required: true,
            ref: 'userModel',
          },
          isOwner: {
            type: Boolean,
            required: false,
            default: false,
          },
          //implementazione aggiuntiva: aggiunta collaboratori
        },
      ],
      required: true,
    },
  },
  { collection: 'playlists' }
);

//Istanza dello schema playlist
const playlistModel = mongoose.model('playlist', playlistSchema);

router.post('/createPlaylist', async (req, res) => {

  const username = req.session.username;

  if (!req.body.nome) {
    return res.status(400).json({ error: 'Il nome della playlist non è valido' });
  }

  if (
    await playlistModel.findOne({
      nome: req.body.nome,
      owner: username,
    })
  ) {
    return res.status(400).json({ error: 'Playlist già esistente' });
  }

  try {
    const newPlaylist = await playlistModel.create({
      owner: username,
      nome: req.body.nome,
      /*immagine: req.body.immagine,*/
      descrizione: req.body.descrizione,
      privata: req.body.privata,
      tags: req.body.tags,

      followers: [
        {
          user_id: req.session.user_id,
          isOwner: true,
        },
      ],
      tracce: [],
    });

    console.log("creata la playlist: ", newPlaylist);
    return res.status(201).json({ status: 'success' , data: newPlaylist });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Errore del server' });
  }
});

router.patch('/editPlaylist/:playlist_id',/*, upload.single('immagine'),*/ async (req, res) => {

  const updatedData = {};

  if (req.body.nome) {
      updatedData.nome = req.body.nome;
  }
  /*if (req.body.immagine) {
      updatedData.immagine = req.body.immagine;
  }*/
  if (req.body.descrizione) {
      updatedData.descrizione = req.body.descrizione;
  }
  if (req.body.tags) {
      updatedData.tags = req.body.tags;
  }
  if (req.body.privata) {
      updatedData.privata = req.body.privata;
  }

  try {
    const playlist = await playlistModel.findOne({ _id: req.params.playlist_id }).lean();

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist non trovata' });
    }

    if (playlist.owner !== req.session.username) {
      return res
        .status(401)
        .json({ error: 'Solo il proprietario può modificare la playlist' });
    }

    if (Object.keys(updatedData).length > 0) {

      await playlistModel.updateOne({ _id: req.params.playlist_id }, { $set: updatedData });
      return res.status(200).json({ status: 'Modifiche apportate con successo!' });

    } else {
      return res.status(400).json({ error: 'Non è avvenuta alcuna modifica' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Errore del server' });
  }
});

router.delete('/deletePlaylist/:playlist_id', async (req, res) => {

  try {
    const playlist = await playlistModel
      .findOne({ _id: req.params.playlist_id }).lean();

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist non trovata' });
    }

    if (playlist.owner !== req.session.username) {
      return res.status(401).json({ error: 'Solo il proprietario può cancellare la playlist' });
    }

    await playlistModel.deleteOne({ _id: req.params.playlist_id });
    console.log("playlist eliminata correttamente");
    return res.status(200).json({ status: 'success' });

  } catch (error) {
      console.error(error)
    return res.status(500).json({ error: 'Errore interno del server' });
  }
});

router.post('/addTrack', async (req, res) => {
    const { track_id } = req.query;
    const { playlist_id } = req.query;
  
    try {
      //trovo playlist
      const playlist = await playlistModel.findOne({ _id: playlist_id }).lean();
  
      if (!playlist) {
        return res.status(404).json({ error: 'Playlist non trovata' });
      }
      //controllo i permessi
      if (playlist.owner !== req.session.username) {
        return res.status(401).json({ error: 'Solo il proprietario della playlist può aggiungere tracce' });
      }

      //prendo traccia
      let track = await spotify.getTracks(track_id, await getSpotifyToken());
  
      if (track.error) {
        token = await spotify.getRefreshToken();
        track = await spotify.getTracks(track_id, token);
      }
  
      if (!track) {
        return res.status(404).json({ error: 'La traccia non è stata trovata' });
      }
  
      const newTrack = {
        id: track.id,
        nome: track.name,
        album: track.album.name,
        artista: track.artists[0].name,
        immagine: track.album.images[0].url,
        data_rilascio: track.album.release_date,
        durata: track.duration_ms,
      };

      if (
        await playlistModel.findOne({
          _id: playlist_id,
          tracce: { $elemMatch: { id: newTrack.id } },
        })
      ) {
        return res.status(400).json({ error: 'Traccia già aggiunta alla playlist' });
      }
  
      await playlistModel.updateOne(
        { _id: playlist_id },
        { $push: { tracce: newTrack } }
      );

      return res.status(200).json({ status: 'success' });

    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Errore del server' });
    }
});

router.delete('/deleteTrack', async (req, res) => {

    const { track_id } = req.query;
    const { playlist_id } = req.query;
  
    try {
      const playlist = await playlistModel.findOne({ _id: playlist_id }).lean();
  
      if (!playlist) {
        return res.status(404).json({ error: 'La playlist non è stata trovata' });
      }
      if (playlist.owner !== req.session.username) {
        return res.status(401).json({ error: 'Solo il proprietario della playlist può eliminare tracce' });
      }
  
      await playlistModel.updateOne(
        { _id: playlist_id },
        { $pull: { tracce: { id: track_id } } }
      );
  
      return res.status(200).json({ status: 'success' });

    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: 'Errore del server' });
    }
  });

router.get('/getFollowedPlaylists', async (req, res) => {

    try {

      const playlists = await playlistModel.find({
        followers: { $elemMatch: { user_id: req.session.user_id } },
        owner: { $ne: req.session.username }
      }).lean();

      return res.status(200).json({status: 'success', data: playlists });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Errore del server' });
    }
  });

router.get('/getPublicPlaylists', async (req, res) => {

    try {
      //guardo le playlist pubbliche di altri utenti
      const playlists = await playlistModel.find({ 
        privata: false ,
        owner: { $ne: req.session.username },
      }).lean();

      return res.status(200).json({ status: 'success', data: playlists });

    } catch (error) {
        console.error(error);
      return res.status(500).json({ error: 'Errore del server' });
    }

});

router.get('/getMyPlaylists', async (req, res) => {

    const username = req.session.username;

    try {

      const playlists = await playlistModel.find({
        owner: username,
      }).lean();
  
      return res.status(200).json({ status: 'success', data: playlists });

    } catch (error) {
        console.error(error);
      return res.status(500).json({ error: 'Errore del server' });
    }
  });

router.get('/getPlaylistData/:playlist_id', async (req, res) => {

    try {
      const playlist = await playlistModel.findOne({ _id: req.params.playlist_id }).lean();
  
      if (!playlist) {
        return res.status(404).json({ error: 'La playlist non è stata trovata' });
      }

      return res.status(200).json({status: 'success', data: playlist });
    } catch (error) {
        console.error(error)
      return res.status(500).json({ error: 'Errore del server' });
    }
});

router.post('/followPlaylist/:playlist_id', async (req, res) => {

    try {
      const playlist = await playlistModel.findOne({ _id: req.params.playlist_id }).lean();
  
      if (!playlist) {
        return res.status(404).json({ error: 'La playlist non è stata trovata' });
      }
  
      if (
        await playlistModel.findOne({
          _id: req.params.playlist_id,
          followers: { $elemMatch: { userId: req.session.user_id } },
        })
      ) {
        return res.status(400).json({ error: 'Playlist già seguita' });
      }
  
      await playlistModel.updateOne(
        { _id: req.params.playlist_id },
        {
          $push: {
            followers: {
              user_id: req.session.user_id,
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

router.delete('/unfollowPlaylist/:playlist_id', async (req, res) => {

    try {

      const playlist = await playlistModel.findOne({ _id: req.params.playlist_id }).lean();

      if (!playlist) {
        return res.status(404).json({ error: 'La playlist non è stata trovata' });
      }
  
      await playlistModel.updateOne(
        { _id: req.params.playlist_id },
        {
          $pull: {
            followers: {
              user_id: req.session.user_id,
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

module.exports = {
    playlistRoute: router,
    playlistModel: playlistModel,
  };
  