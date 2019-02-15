/* =============================================================================
 *
 *														TinyApp - Link Shortener
 *						Created by Nik Malhotra for Lighthouse Labs on 02/15/19
 *
 * 																	Purpose:
 *        TinyApp is a full stack web application built with Node and Express
 *            that allows users to shorten long URLs (à la bit.ly).
 *
 * =============================================================================
 */

// initialization of packages, port, and engine
const express = require('express');

const cookieSession = require('cookie-session');

const bcrypt = require('bcrypt');

const bodyParser = require('body-parser');

const app = express();

const PORT = 8080;

app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(cookieSession({ name: 'session', keys: ['12345'] }));

// initialization of url database and users database.
const urlDatabase = {
  b6UTxQ: { longURL: 'https://www.tsn.ca', userID: 'aJ48lW', dCreated: '1-28-2018', hits: 1 },
  i3BoGr: { longURL: 'https://www.google.ca', userID: 'aJ48lW', dCreated: '1-1-2018', hits: 1 },
  iiiIII: { longURL: 'https://www.neopets.com', userID: 'n1kh17', dCreated: '2-13-2019', hits: 1 },
  XnXnxx: { longURL: 'https://oilers.nhl.com', userID: 'n1kh17', dCreated: '1-10-2019', hits: 1 }
};

const users = {};

// helper functions
//    generate random string for user ID and shortURL
const genStr = () => {
  return Math.floor((1 + Math.random()) * 0x1000000)
    .toString(16)
    .substring(1);
};

//    return today's date in MM-DD-YYYY format to fulfill Date Created attribute for shortened links.
const getCurrentDate = () => {
  const date = new Date();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month}-${day}-${year}`;
};

//    retrieve user ID from passed in email and password credentials from users object.
const getUserId = (email, pass) => {
  let id = '';
  const userObj = Object.entries(users);
  userObj.forEach(userId => {
    if (userId[1].email === email && bcrypt.compareSync(pass, userId[1].password)) {
      // eslint-disable-next-line prefer-destructuring
      id = userId[0];
    }
  });
  return id;
};

//  status routing function for log in and registration pages.
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
//   filtered list
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

//  root redirection
app.get('/', (req, res) => {
  if (users[req.session.user_id] !== undefined) {
    res.redirect('/urls');
  } else {
    res.redirect('/login');
  }
});

//  get method for main /urls page
app.get('/urls', (req, res) => {
  const templateVars = {
    urls: urlsForUser(req.session.user_id),
    user: users[req.session.user_id]
  };
  res.render('urls_index', templateVars);
});

//  get and post methods for new URLs
app.get('/urls/new', (req, res) => {
  const templateVars = {
    user: users[req.session.user_id]
  };
  if (templateVars.user === undefined) {
    res.redirect('/login');
  } else {
    res.render('urls_new', templateVars);
  }
});

app.post('/urls', (req, res) => {
  if (req.session.user_id === 'null') {
    res.redirect(`/urls/`);
  } else {
    const genURL = genStr();
    urlDatabase[genURL] = {
      longURL: req.body.longURL,
      userID: req.session.user_id,
      dCrea: getCurrentDate(),
      hits: 0
    };
    res.redirect(`/urls/${genURL}`);
  }
});

//  get and post methods for the short URLs
app.get(`/urls/:shortURL`, (req, res) => {
  const filteredList = urlsForUser(req.session.user_id);
  let longURL;

  if (filteredList[req.params.shortURL] !== undefined) {
    longURL = filteredList[req.params.shortURL].longURL;
  }
  const templateVars = {
    shortURL: req.params.shortURL,
    longURL,
    filteredList,
    user: users[req.session.user_id]
  };
  res.render('urls_show', templateVars);
});

app.post(`/urls/:shortURL`, (req, res) => {
  if (req.body.longURL !== undefined) {
    urlDatabase[req.params.shortURL].longURL = req.body.longURL;
  }
  res.redirect('/urls');
});

//  get method for shortened link
app.get('/u/:shortURL', (req, res) => {
  if (urlDatabase[req.params.shortURL] !== undefined) {
    const longURL = urlDatabase[req.params.shortURL].longURL;
    urlDatabase[req.params.shortURL].hits += 1;
    res.redirect(longURL);
  } else {
    res.redirect(`/urls/`); // TODO: add new 404 page with HTML and redirect user to this.
  }
});

//  get and post methods for delete function
//  initially, get method was not required, yet was added to handle requests that are manually entered in the address bar.
//  Although code looks somewhat DRY, the redirection different for post and get.
app.post('/urls/:shortURL/delete', (req, res) => {
  const filteredList = urlsForUser(req.session.user_id);
  if (filteredList[req.params.shortURL] !== undefined) {
    delete urlDatabase[req.params.shortURL];
  }
  res.redirect('/urls');
});

app.get('/urls/:shortURL/delete', (req, res) => {
  const filteredList = urlsForUser(req.session.user_id);
  if (filteredList[req.params.shortURL] !== undefined) {
    delete urlDatabase[req.params.shortURL];
    res.redirect(`/urls/`);
  } else {
    res.redirect(`/urls/${req.params.shortURL}`);
  }
});

//  get and post methods for login page
app.post('/login', (req, res) => {
  const status = userCheck('login', users, req.body.email, req.body.password);
  if (status !== 200) {
    res.status(status).send(`${status} Error. Click your browser's Back Button.`);
  } else {
    req.session.user_id = getUserId(req.body.email, req.body.password);
    res.redirect('/urls/');
  }
});

app.get('/login', (req, res) => {
  if (req.session.user_id !== undefined) {
    res.redirect('/urls');
  } else {
    const templateVars = {
      user: users[req.session.user_id]
    };
    res.render('urls_login', templateVars);
  }
});

//  post method for log out
app.post('/logout', (req, res) => {
  req.session = null;
  res.redirect('/urls');
});

//  get and post methods for register function
app.get('/register', (req, res) => {
  if (req.session.user_id !== undefined) {
    res.redirect('/urls');
  } else {
    const templateVars = {
      user: users[req.session.user_id]
    };
    res.render('urls_register', templateVars);
  }
});

app.post('/register', (req, res) => {
  const userRandomID = genStr();
  const status = userCheck('register', users, req.body.email, req.body.password);
  if (status !== 200) {
    res.status(status).send(`${status} Error. Click your browser's Back button.`);
  } else {
    users[userRandomID] = {
      id: userRandomID,
      email: req.body.email,
      password: bcrypt.hashSync(req.body.password, 10)
    };
    req.session.user_id = userRandomID;
    res.redirect('/urls');
  }
});

// port configuration here
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
