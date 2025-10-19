const express = require('express');
const router = express.Router();
const spotify = require('../api_spotify_calls.js');
const { userModel } = require('./user.js');

let token;

const getSpotifyToken = async () => {
    // Se non hai ancora un token o è scaduto, ottieni uno nuovo
    if (!token) {
      token = await spotify.getRefreshToken();
    }
    return token;
  };

router.get('/getGenres', async (req, res) => { 
    try {
      let genres = await spotify.getAvailableGenres(await getSpotifyToken());
  
      if (genres.error) {
        token = await spotify.getRefreshToken();
        genres = await spotify.getAvailableGenres(token);
      }
  
      return res.status(200).json({ status: 'success', data: genres });
    } catch (error) {
      return res.status(500).json({ error: 'Errore server' });
    }
});


router.get('/searchArtist', async (req, res) => {
    const query = req.query.artist;

    if(!query) {
        return res.status(400).json({error: 'Query non valida'});
    }
    
    try {
        let artists = await spotify.searchArtists(query, await getSpotifyToken());

        if(artists.error){
            token = await spotify.getRefreshToken();
            artists = await spotify.searchArtists(query, token);
        }

        return res.status(200).json({status:'success', data: artists});

    } catch (error) {
        console.log(error);
        return res.status(500).json({error:'Errore server'})
    }
});

router.get('/searchTracks', async (req, res) => {

  const query = req.query.query;
  if (!query) {
    return res.status(400).json({ error: 'Query non valida' });
  }

  try {
    const tracks = await spotify.searchTracks(query, await getSpotifyToken());

    if (tracks.error) {
      token = await spotify.getRefreshToken();
      tracks = await spotify.searchTracks(query, token);
    }

    if (!tracks || tracks.error) {
      return res.status(404).json({ error: 'Non sono state trovate tracce' });
    }

    return res.status(200).json({ status: 'success', data: tracks });
  } catch (error) {
    console.log(error)
    return res.status(500).json({ error: 'Errore del server' });
  }
});

router.get('/getTracks/:track_id', async (req, res) => {

 
  try {
    let track = await spotify.getTracks(req.params.track_id, await getSpotifyToken());

    if (track.error) {
      token = await spotify.getRefreshToken();
      track = await spotify.getTracks(req.params.track_id, token);
    }

    if (!track || track.error) {
      return res.status(404).json({ error: 'La traccia non è stata trovata' });
    }

    const artist = await spotify.getArtists(track.artists[0].id, token);

    /*anno album*/
    track.album.release_date = track.album.release_date.slice(0, 4);

    /*associo il genere dell'artista alla traccia*/
    track.genres = artist.genres;

    return res.status(200).json({ status: 'success', data: track });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: 'Errore del server' });
  }
});

router.get('/getTracksByArtist', async (req, res) => {

  const artist_id = req.query.artist_id;
  if (!artist_id) {
    return res.status(400).json({ error: 'Artista non trovato' });
  }

  try {
    const tracks = await spotify.getTracksByArtist(artist_id, getSpotifyToken());

    if (tracks.error) {
      token = await spotify.getRefreshToken();
      tracks = await spotify.getTracksByArtist(artist_id, token);
    }

    if (!tracks || tracks.error) {
      return res.status(404).json({ error: 'Le tracce relative all\'artista non sono state trovate' });
    }

    return res.status(200).json({ status: 'success', data: tracks });

  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: 'Errore del server' });
  }
});

router.get('/getRecommendations', async (req, res) => {

  const user = await userModel.findOne({ _id: req.session.user_id }).lean();

  if (!user) {
    return res.status(404).json({ error: 'Utente non trovato' });
  }

  const favgenres = user.generiPreferiti;
  const favartists = user.artistiPreferiti;

  if (favgenres.length === 0 && favartists.length === 0) {
    return res.status(400).json({ error: 'Non ci sono preferenze su artisti o generi dell\'utente' });
  }

  let newGenres = [];
  let newArtists = [];

  if (favgenres.length + favartists.length >= 5) {

    while (newGenres.length + newArtists.length < 5) {
      const random = Math.floor(Math.random() * 2);
      if (random === 0) {
        const randomGenre = favgenres[Math.floor(Math.random() * favgenres.length)];
        if (!newGenres.includes(randomGenre)) {
          newGenres.push(randomGenre);
        }

      } else {

        const randomArtist = favartists[Math.floor(Math.random() * favartists.length)];
        if (!newArtists.includes(randomArtist)) {
          newArtists.push(randomArtist);
        }
      }

    }
  } else {
    newGenres = favgenres;
    newArtists = favartists;
  }

  console.log(newGenres, newArtists);


  const artistsSeed = newArtists.map((artist) => artist.id).join(',');
  const genresSeed = newGenres.join(',');

  try {
    let racc = await spotify.getRecommendations(
      await getSpotifyToken(),
      genresSeed,
      artistsSeed
    );

    if (racc.error) {
      racc = await spotify.getRecommendations(
        await getSpotifyToken(),
        genresSeed,
        artistsSeed
      );
    }

    if (!racc.tracks || racc.error) {
      return res.status(404).json({ error: 'Tracce raccomandate non trovate' });
    }

    if (newArtists.length === 0) {
      return res.status(400).json({ error: 'L\'utente non ha artisti preferiti' });
    }

    return res.status(200).json({ status: 'success', data: racc });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Errore del server' });
  }
});

router.get('/getReccomendationsByGenre', async (req, res) => {

  const genre = req.query.query;

  if (!genre) {
    return res.status(400).json({ error: 'Il genere non è valido' });
  }

  try {

    let racc = await spotify.getRecommendationsByGenre(
      await getRefreshToken(),
      genre
    );

    if (racc.error) {
      token = await getRefreshToken();
      racc = await spotify.getRecommendationsByGenre(
        token,
        genre
      );
    }

    if (!racc.tracks) {
      return res.status(404).json({ error: 'Nessuna raccomandazione per l\'utente trovata' });
    }

    return res.status(200).json({ status: 'success', data: racc });

  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Errore del server' });
  }
});


module.exports = {
  spotifyRoute: router,
};