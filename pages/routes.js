const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.sendFile(__dirname + '/login.html');
});

router.get('/logoutpage', (req, res) => {
    req.session.destroy();
    res.sendFile(__dirname + '/login.html');
});

router.get('/homepage', (req, res) => {
    res.sendFile(__dirname + '/home.html');
});

router.get('/publicplaylistspage', (req, res) => {
    res.sendFile(__dirname + '/publicPlaylists.html');
});

router.get('/profilepage', (req, res) => {
    res.sendFile(__dirname + '/profile.html'); 
});

router.get('/editprofilepage', (req, res) => {
    res.sendFile(__dirname + '/editProfile.html'); 
});

router.get('/createplaylistpage', (req, res) => {
    res.sendFile(__dirname + '/createPlaylist.html'); 
});

router.get('/editplaylistpage', (req, res) => {
    res.sendFile(__dirname + '/editPlaylist.html'); 
});

module.exports = router;