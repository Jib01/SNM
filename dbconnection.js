const mongoose = require("mongoose");

const db_url = "mongodb+srv://whiteplusion82:Jibbrogue01@cluster0.95sizsd.mongodb.net/";
const dbName = 'SNM';

const connect = mongoose.connect(db_url);

connect.then(() => {
    console.log("Database connesso con successo");
}).catch(()=> {
    console.log("Connessione con Database fallita");
})


