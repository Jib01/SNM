const CLIENT_ID = "653be7d0262f4e2aa925a12365ef54e7";
const CLIENT_SECRET = "0928d3c9737e41fa85194d0caf0423e2";
const URL = "https://accounts.spotify.com/api/token";
let token = "";

const getRefreshToken = async () => {

  try {

    const res = await fetch(URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
        },
        body: new URLSearchParams({ grant_type: "client_credentials" }),

    });

    const data = await res.json();
    token = data.access_token;
    return token;

  } catch (error) {
    console.error('Errore nel recupero del token: ', error);
    throw error;
}
};

const getAvailableGenres = async (token) => {

  try{

      const res = await fetch('https://api.spotify.com/v1/recommendations/available-genre-seeds', {
          method: 'GET',
          headers: {
              Authorization: `Bearer ${token}`, 
          },
      });
      const genres = await res.json();
      return genres;

  } catch (error) {
    console.error('Errore nel recupero dei generi: ', error);
    throw error;
}
};

const searchArtists = async (query, token) => {

  try{
    
      const res = await fetch(
          
        `https://api.spotify.com/v1/search?q=${query}&type=artist`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();
      return data.artists.items;

    } catch (error) {
        console.error('Errore nella ricerca degli artisti: ', error);
        throw error;
    }
};

const getArtists = async (id, token) => {

  try{

      const res = await fetch(`https://api.spotify.com/v1/artists/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const artist = await res.json();
      return artist;

} catch (error) {
  console.error('Errore nel recupero degli artisti: ', error);
  throw error;
}
};
  
const searchTracks = async (query, token) => {

  try{

      const res = await fetch(
        `https://api.spotify.com/v1/search?q=${query}&type=track`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();
      return data.tracks.items;
      
} catch (error) {
  console.error('Errore nella ricerca delle tracce: ', error);
  throw error;
}
}

const getTracks = async (id, token) => {

  try{

      const res = await fetch(`https://api.spotify.com/v1/tracks/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const track = await res.json();
      return track;

  } catch (error) {
    console.error('Errore nel recupero delle tracce: ', error);
    throw error;
  }
}; 

const getTracksByArtist = async (id_artist, token) => {

  try{
  const res = await fetch(`https://api.spotify.com/v1/artists/${id_artist}/albums`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const { items: albums } = await res.json();

  const tracks = await Promise.all(
    albums.map(async (album) => {
      const res = await fetch(
        `https://api.spotify.com/v1/albums/${album.id}/tracks`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const { items: tracks } = await res.json();
      return tracks.map((track) => {
        return {
          ...track,
          album: {
            name: album.name,
            image: album.images[0].url,
            release_date: album.release_date,
          },
        };
      });
    })
  );
   //return tracks.flat();
  } catch (error) {
    console.error('Errore nel recupero delle tracce in base agli artisti: ', error);
    throw error;
  }
}

const getRecommendations = async (token, genres = '', artists = '') => {

  try {

      const res = await fetch(
          `https://api.spotify.com/v1/recommendations?limit=15&seed_genres=${genres}&seed_artists=${artists}`,
          {
              method: 'GET',
              headers: {
                  Authorization: `Bearer ${token}`,
              },
          }
      );

      const recommendations = await res.json();
      return recommendations;

  } catch (error) {
      console.error('Errore nel recupero delle raccomandazioni: ', error);
      throw error;
  }
};

const getRecommendationsByGenre = async (token, genres) => {
  return getRecommendations(token, genres);
};


module.exports = { 
  getRefreshToken,
  getAvailableGenres, 
  getArtists, 
  searchArtists, 
  searchTracks, 
  getTracks, 
  getTracksByArtist, 
  getRecommendations, 
  getRecommendationsByGenre
};
