# SOCIAL NETWORK FOR MUSIC

## GUEYE JIBRIL

> Matricola: 03203A
> 

## ACCESSO AL SITO WEB

Address: [http://localhost:3004](http://localhost:3004/) 
API: [http://localhost:3004/api-docs/](http://localhost:3004/api-docs/)

Per la realizzazione del sito, come da specifiche, sono state utilizzate le seguenti tecnologie:

- Backend: Nodejs e MongoDB
- Frontend: HTML5, CSS3 e JavaScript

# STRUTTURA E SCELTE IMPLEMENTATIVE

> *Di seguito vengono elencati i file contenuti nel progetto seguiti da una breve descrizione delle loro funzionalità e le relative scelte di implementazione*
> 

- `dbconnection.js`: gestisce la connessione al database MongoDB, è possibile inserire l'URL relativo al proprio DB

```jsx
const mongoose = require("mongoose");

const db_url = "...";
const dbName = 'SNM';

const connect = mongoose.connect(db_url);
```

- `server.js`: configurazione e avvio del server Express, gestione delle routes necessarie alle funzionalità del sito legate a spotify, utente e playlists

Attraverso l'utilizzo di Express sono state gestite le richieste del server, consentendo la definizione di routes per gestire diverse operazioni. Le sessioni degli utenti sono state gestite attraverso l'utilizzo di express-session, permettendo al server di memorizzare i dati della sessione durante l'interazione con l'applicazione web.
questo ha permesso di mantenere lo stato dell'utente tra le varie richieste, ad esempio per gestire l'autenticazione degli utenti.
L'uso di cors permette la gestione delle richieste da diversi domini, mentre express.static ha reso disponibili le pagine HTML ai client.

```jsx
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
```

- `api_spotify_calls.js`: contiene una tutte le funzioni per interagire con l'API di Spotify. E' possibile inserire il proprio CLIENT_ID e CLIENT_SECRET

```jsx
const CLIENT_ID = "";
const CLIENT_SECRET = "";
const URL = "https://accounts.spotify.com/api/token";
let token = "";

const getRefreshToken = async () => {
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
};

```

# Cartella pages

- `routes.js`:
definisce un router che gestisce le diverse rotte per l'indirizzamento tra le pagine

- `user.js`:
Utilizza Mongoose per il creare modello User che viene utilizzato per il salvataggio dei dati dell'utente nel database. Gestisce inoltre tutte le operazioni legate agli utenti, come registrazione, login, gestione del profilo, preferenze musicali (artisti e generi) e interazioni con Spotify

```jsx
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

const userModel = mongoose.model('user', userSchema);
```

- `spotify.js`:
gestisce le interazioni con l'API di Spotify, permettendo di ottenere generi disponibili, cercare artisti e tracce e generare raccomandazioni musicali basate sulle preferenze dell'utente.
Le credenziali CLIENT_ID e CLIENT_SECRET devono essere inserite all'interno di questo file per ottenere un token di accesso dal servizio di autenticazione di Spotify. Il token viene quindi utilizzato per autorizzare tutte le richieste alle API di Spotify. Una precisazione inoltre sulle raccomandazioni: utiizzando il seed dei generi per richiedere i generi raccomandati, alcuni dei generi “comuni” vengono omessi, ad esempio “pop-rock” che potrebbe essere identificato come un genere comune, può essere utilizzato come metro ricerca ma non è un seed valido per i generi.
Infine, riguardo alla funzione per prelevare i dati di una traccia, per rispettare la richiesta della consegna, ho deciso di inserire come genere della traccia quello a cui appartiene l’artista. Questa scelta nasce dal fatto che l’API di spotify non permette di avere tra i dati della traccia il suo genere.

- `playlist.js`:
Utilizza Mongoose per il creare modello Playlist che viene utilizzato per il salvataggio dei dati delle playlist nel database. Gestisce inoltre tutte le operazioni ad esse relative, gestendo creazione, modifica, eliminazione, aggiunta/rimozione di tracce, e operazioni di follow/unfollow delle playlists.

```jsx
const playlistSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: true,
    },
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
        },
      ],
      required: true,
    },
  },
  { collection: 'playlists' }
);

const playlistModel = mongoose.model('playlist', playlistSchema);
```

# Frontend del sito

- `login.html`: Permette l'accesso dell'utente. E' implementata in modo che quando l'utente si registra, la pagina venga ricaricata automaticamente sul form di login che conterra solamente l'username dell'utente che si è appena registrato, la password, per motivi di sicurezza, può solamente essere inserita dall'utente. La pagina di login manterrà salvato l'username relativo all'ultimo utente che ha effettuato registrazione o accesso.

- `home.html`: Permette tutte le funzionalità di visualizzazione delle canzoni e di ricerca, Se l'utente ha effettuato l'accesso e ha salvato delle preferenze, verranno mostrate delle canzoni raccomandate in base alle sue preferenze. Vengono inoltre mostrate le playlist dell'utente e quelle pubbliche seguite. Inoltre da questa pagina è possibile procedere con la ricerca delle tracce.
Le raccomandazioni vengono gestite sulla base dei generi relativi alle tracce, quindi ad un artista vengono associati i generi relativi alla sua traccia selezionata, in modo da associare correttamente le preferenze.

- `publicPlaylists.html`: per non "mischiare" tutto in un'unica pagina, ho deciso di creare quest'altra pagina dove è possibile visualizzare e gestire le playlists, oltre che cercare quelle pubbliche e filtrarle sulla base delle preferenze dell'utente

- `createPlaylist.html`: serve per la creazione di una nuova playlist, ho scelto di separarla dalle altre pagine sempre per motivi di "ordine"

- `profile.html`: da questa pagina è possibile gestire i dati dell'utente e le sue preferenze

- `images` cartella che contiene le immagini utilizzate nel sito

- `style` cartella che contiene i file `.css`.

## Dipendenze sito Web

- [mongoose](https://www.npmjs.com/package/mongoose)
- [express](https://www.npmjs.com/package/express) 
- [express-session](https://www.npmjs.com/package/express-session)
- [swagger-ui-express](https://www.npmjs.com/package/swagger-ui-express) 
- [swagger-autogen](https://www.npmjs.com/package/swagger-autogen)
