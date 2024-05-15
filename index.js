const cookieParser = require('cookie-parser');
const express = require('express');
const app = express();
const knex = require('knex')(require('./knexfile').development);
const session = require('express-session');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');

const maxTitleLength = 60;
const maxDescriptionLength = 3000;
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname + '/public'));
app.use(cookieParser());
app.use(session({ secret: 'super sekretny kluczyk :3', resave: false, saveUninitialized: true, cookie: {secure: false} }));
app.set('view engine', 'ejs');
const storage = multer.diskStorage({ 
    destination: function (req, file, cb) {
        cb(null, './public/data')
    },
    
    filename: function (req, file, cb) {
        const name = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, file.fieldname + '_' + name + path.extname(file.originalname));
    },
    
});
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 2097152 },
    fileFilter: (req, file, cb) => {
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
        const ext = path.extname(file.originalname);
        if (allowedExtensions.includes(ext)) {
            cb(null, true);
        } else {
            let msg = ""
            if ( file.size > 2097152 ) {
                msg = 'Plik jest za duży.';
            } else {
                msg = 'Niedozwolone rozszerzenie pliku.';
            }
            cb(new Error(msg));
        }
    }
 }).single('image');

async function getUser(req) {
    if(req.cookies.username !== undefined) {
        return await knex('users').where('username', req.cookies.username).first();
    }
    return undefined;
}

async function getUsernameById(id) {
    id = parseInt(id);
    const user = await knex('users').where('id', id).first();
    if(user === undefined) {
        return '[deleted user]';
    }
    return user.username;
}

async function getUserSession(session) {
    if(session.loggedUserId !== undefined) {
        let user = await knex('users').where('id', session.loggedUserId).first();
        return user;
    } else {
        return undefined;
    }
}

app.get('/', async (req, res) => {
    let arts = await knex('art').select('*');
    let user = await getUserSession(req.session);
    console.log(user);
    await Promise.all(arts.map(async (art) => {
        art.username = await getUsernameById(art.authorid);
    }));
    arts.sort((a, b) => b.date - a.date);
    res.render('gallery', { arts, user });
});

app.get('/art' , async (req, res) => {
    const id = req.query.id;
    let art = await knex('art').where('id', id).first();
    art.username = await getUsernameById(art.authorid);
    let comments = await knex('comments').where('artid', id).select('*').orderBy('date', 'desc');
    await Promise.all(comments.map(async (comment) => {
        comment.username = await getUsernameById(comment.userid);
    }));
    //console.log(art);
    if(art.image === undefined) {
        art.image = 'empty.png';
    }
    //console.log(comments);
    let user = await getUserSession(req.session);
    res.render('artpage', { art, user, comments });
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/loginreq', async (req, res) => {
    const { username, password } = req.body;
    const user = await knex('users').where('username', username).first();
    if(!user) {
        res.status(401).send('Nieprawidłowe dane logowania<br/><a href="/login">Wróć do logowania</a>');
        return;
    }

    bcrypt.compare(password, user.password).then((result) => {
        if (result) {
            req.session.loggedUserId = user.id;
            res.redirect('/');
        } else {
            res.status(401).send('Nieprawidłowe dane logowania<br/><a href="/login">Wróć do logowania</a>');
        }
    }).catch((err) => {
        console.error(err);
        res.status(500).send('Wystąpił wewnętrzny błąd podczas weryfikacji danych');
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.post('/registerreq', async (req, res) => {
    const { username, password } = req.body;
    if (username === '' || password === '') {
        res.status(400).send('Nazwa użytkownika i hasło nie mogą być puste!');
        return;
    }
    if (await knex('users').where('username', username).first()) {
        res.status(400).send('Nazwa użytkownika jest już zajęta!');
        return;
    }
    
    try {
        bcrypt.hash(password, 10, async (err, hash) => {
            if(err) {
                console.error(err);
                res.status(500).send('Error hashing password');
                return;
            }
            await knex('users').insert({ username, password: hash });
            res.redirect('/login');
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error adding user');
    }
});

app.get('/addpost', async (req, res) => {
    let user = await getUserSession(req.session);
    if(user) {
        res.render('addpost', { user });
    } else {
        res.redirect('/login');
    }
});

app.post('/addpostreq', async (req, res) => {
    upload(req, res, async (err) => {
        const { title, description } = req.body;
        if(err) {
            if(err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).send("Nie udało się wstawić posta: Plik jest za duży" );
            }
            else {
                return res.status(400).send("Błąd podczas wstawiania posta: " + err.message );
            }
        }

        if(title === '' || description === '' || !req.file) {
            res.status(500).send("Nieprawidłowe parametry podczas wstawiania posta");
            return;
        }
    
        if(title.length > maxTitleLength || description.length > maxDescriptionLength) {
            res.status(500).send('Tytuł lub opis są za długie!');
            return;
        }
    
        let author = await getUserSession(req.session);
        const timestamp = Date.now();
        if(author) {
            try {
                await knex('art').insert({ title, description, image: req.file.filename, authorid: author.id, date: timestamp, score: 0});
                res.redirect('/');
            } catch (error) {
                console.error(error);
                res.status(500).send('Error adding post');
            }
        } else {
            res.status(401).send('Unauthorized');
        }
    });
});

app.post('/editpost', async (req, res) => {
    const { id, description } = req.body;
    if(description === '') {
        res.redirect(`/art?id=${id}`);
        return;
    }
    let user = await getUserSession(req.session);
    if(user) {
        try {
            numId = parseInt(id);
            const post = await knex('art').where('id', numId).first();
            if(post.authorid == user.id) {
                await knex('art').where('id', numId).update({ description });
            } else {
                res.status(401).send('Nie można edytować postu, który nie należy do jego twórcy!');
            }
            res.redirect(`/art?id=${numId}`);
        } catch (error) {
            console.error(error);
            res.status(500).send('Błąd podczas edycji postu');
        }
    } else {
        res.status(401).send('Użytkownik nieautoryzowany');
    }
});

app.post('/addcommentreq', async (req, res) => {
    const { content, artid } = req.body;
    if(content === '' || content === undefined || artid === '' || artid === undefined) {
        res.redirect(`/art?id=${artid}`);
        return;
    }
    const timestamp = Date.now();
    let user = await getUserSession(req.session);
    if(user) {
        try {
            await knex('comments').insert({ content, artid, userid: user.id, date: timestamp });
            res.redirect(`/art?id=${artid}`);
        } catch (error) {
            console.error(error);
            res.status(500).send('Error adding comment');
        }
    } else {
        res.status(401).send('Unauthorized');
    }
});

app.post('/addrating', async(req, res) => {
    const { artid, rating } = req.body;
    let user = await getUserSession(req.session);
    const score = parseInt(rating)
    if(!(score == 1 || score == -1))
    {
        res.status(500).send('Invalid rating');
        return;
    }
    if(user) {
        try {
            let votedArt = await knex('votedart').where({ artid, userid: user.id });
            if(votedArt.length <= 0) {
                // we expect rating to be 1 or -1
                let art = await knex('art').where({ id: artid })
                let existingRating = art[0].score;
                await knex('art').where({ id: artid }).update({ score: existingRating + score });
                await knex('votedart').insert({ artid, userid: user.id});
                res.status(200).send({ rating: existingRating + score });
                //res.redirect(`/art?id=${artid}`);
            } else {
                res.status(500).send('Już oceniłeś ten post!');
            }
        } catch (error) {
            console.error(error);
            res.status(500);
        }
    } else {
        res.status(401).send("Musisz być zalogowany, aby ocenić post!");
    }
});

app.listen(3000, () => console.log('Server running on port 3000'));