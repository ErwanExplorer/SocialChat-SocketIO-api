const express = require('express');
const app = express();
const server = require('http').createServer(app);
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');

app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

const port = 3000;
const io = require('socket.io')(server);

// définir une stratégie d'authentification
passport.use(new LocalStrategy(
    function (username, password, done) {
        User.findOne({ username: username }, function (err, user) {
            if (err) { return done(err); }
            if (!user) { return done(null, false); }
            if (!user.verifyPassword(password)) { return done(null, false); }
            return done(null, user);
        });
    }
));


// authentification de l'utilisateur
app.post('/login',
    passport.authenticate('local', { failureRedirect: '/login' }),
    function (req, res) {
        res.redirect('/');
    });

app.use(express.static(__dirname + '/public'));

//Router
app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname + '/public/index.html'));
});

// Vérifier l'authentification de l'utilisateur pour accéder à la page d'administration
app.get("/admin",
    require('connect-ensure-login').ensureLoggedIn(),
    function (req, res) {
        res.sendFile(path.join(__dirname + '/public/admin.html'));
    });

//Page history
app.get('/api/admin', function (req, res) {
    fs.readFile('chat_history.json', 'utf8', function (err, data) {
        if (err) {
            // Le fichier n'existe pas, on renvoie un tableau vide
            res.send([]);
        } else {
            try {
                // Le fichier existe, on parse les données et on les renvoie
                res.send(JSON.parse(data));
            } catch (e) {
                console.error(e);
                // Le fichier est vide ou corrompu, on renvoie un tableau vide
                res.send([]);
            }
        }
    });
})

//On écoute l'event "connection" de socket.io
io.on('connection', function (socket) {
    console.log('Un client est connecté !');

    //event "disconnect" de socket.io
    socket.on('disconnect', function () {
        console.log('Un client s\'est déconnecté !');
    })

    // Event "message" de socket.io
    socket.on('chat_message', function (msg) {
        console.log(msg);

        // On émet un event "chat_message" à tous les clients connectés
        io.emit('chat_message', msg);

        // Sauvegarde du message dans la base de données JSON
        fs.readFile('chat_history.json', 'utf8', function (err, data) {
            let history;

            if (err) {
                // Le fichier n'existe pas, on crée un tableau vide
                history = [];
            } else {
                try {
                    // Le fichier existe, on parse les données
                    history = JSON.parse(data);
                } catch (e) {
                    console.error(e);
                    // Le fichier est vide ou corrompu, on crée un tableau vide
                    history = [];
                }
            }

            history.push(msg);

            fs.writeFile('chat_history.json', JSON.stringify(history, null, 4), function (err) {
                if (err) throw err;
                console.log('Message saved in chat_history.json');
            });
        });
    });

})

//Listen to port
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})