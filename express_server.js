const express = require('express');

const cookieParser = require('cookie-parser');

const bcrypt = require('bcrypt');

const app = express();

const PORT = 8080; // default port 8080

app.set('view engine', 'ejs');
app.use(cookieParser());

const urlDatabase = {
  b6UTxQ: { longURL: 'https://www.tsn.ca', userID: 'aJ48lW' },
  i3BoGr: { longURL: 'https://www.google.ca', userID: 'aJ48lW' },
  iiiIII: { longURL: 'https://www.neopets.com', userID: 'n1kh17' },
  XnXnxx: { longURL: 'https://oilers.nhl.com', userID: 'n1kh17' }
};

const users = {};

const genStr = () => {
  return Math.floor((1 + Math.random()) * 0x1000000)
    .toString(16)
    .substring(1);
};

const getUserId = (email, pass) => {
  let id = '';
  const userObj = Object.entries(users);
  userObj.forEach(userId => {
    if (userId[1].email === email && bcrypt.compareSync(pass, userId[1].password)) {
      id = userId[0];
    }
  });
  return id;
};

const userCheck = (func, userObj, email, pass) => {
  const myEmails = [];
  const userDetails = users[getUserId(email, pass)];
  let status = 0;
  Object.values(userObj).forEach(user => {
    myEmails.push(user.email);
  });
  if (func === 'register' && (email === '' || pass === '' || myEmails.includes(email))) {
    status = 400;
  } else {
    status = 200;
  }
  if (func === 'login') {
    try {
      if (userDetails.email === email && bcrypt.compareSync(pass, userDetails.password)) {
        status = 200;
      } else {
        status = 403;
      }
    } catch (TypeError) {
      status = 403;
    }
  }
  return status;
};

const urlsForUser = id => {
  const usersLinks = {};
  const urlDB = Object.entries(urlDatabase);
  urlDB.forEach(link => {
    if (id === link[1].userID) {
      usersLinks[link[0]] = link[1];
    }
  });
  return usersLinks;
};

const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: true }));

app.get('/urls.json', (req, res) => {
  res.json(urlDatabase);
});

app.get('/urls', (req, res) => {
  const templateVars = {
    urls: urlsForUser(req.cookies['user_id']),
    user: users[req.cookies['user_id']]
  };
  res.render('urls_index', templateVars);
});

app.get('/urls/new', (req, res) => {
  const templateVars = {
    user: users[req.cookies['user_id']]
  };
  if (templateVars.user === undefined) {
    res.redirect('/login');
  } else {
    res.render('urls_new', templateVars);
  }
});

app.get(`/urls/:shortURL`, (req, res) => {
  const filteredList = urlsForUser(req.cookies['user_id']);
  let longURL;
  if (filteredList[req.params.shortURL] !== undefined) {
    longURL = filteredList[req.params.shortURL].longURL;
  }
  const templateVars = {
    shortURL: req.params.shortURL,
    longURL,
    user: users[req.cookies['user_id']]
  };
  res.render('urls_show', templateVars);
});

app.post('/urls', (req, res) => {
  const genURL = genStr();
  urlDatabase[genURL] = {
    longURL: req.body.longURL,
    userID: req.cookies['user_id']
  };
  res.redirect(`/urls/${genURL}`);
});

app.get('/u/:shortURL', (req, res) => {
  const longURL = urlDatabase[req.params.shortURL].longURL;
  res.redirect(longURL);
});

app.post(`/urls/:shortURL`, (req, res) => {
  urlDatabase[req.params.shortURL].longURL = req.body.longURL;
  res.redirect('/urls');
});

app.post('/urls/:shortURL/delete', (req, res) => {
  const filteredList = urlsForUser(req.cookies['user_id']);
  if (filteredList[req.params.shortURL] !== undefined) {
    delete urlDatabase[req.params.shortURL];
  }
  res.redirect('/urls');
});

app.post('/login', (req, res) => {
  const status = userCheck('login', users, req.body.email, req.body.password);
  if (status !== 200) {
    res.status(status).send(`${status} Error. Click your browser's Back Button.`);
  } else {
    res.cookie('user_id', getUserId(req.body.email, req.body.password));
    res.redirect('/urls');
  }
});

app.get('/login', (req, res) => {
  const templateVars = {
    user: users[req.cookies['user_id']]
  };
  res.render('urls_login', templateVars);
});

app.post('/logout', (req, res) => {
  res.clearCookie('user_id');
  res.redirect('/urls');
});

app.get('/register', (req, res) => {
  const templateVars = {
    user: users[req.cookies['user_id']]
  };
  res.render('urls_register', templateVars);
});

app.post('/register', (req, res) => {
  const userRandomID = genStr();
  const status = userCheck('register', users, req.body.email, req.body.password);
  if (status !== 200) {
    res.status(status).send(`${status} Error. Click your browser's Back button.`);
  } else {
    users[userRandomID] = { id: userRandomID, email: req.body.email, password: bcrypt.hashSync(req.body.password, 10) };
    res.cookie('user_id', userRandomID);
    res.redirect('/urls');
  }
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
