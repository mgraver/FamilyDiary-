'use strict';

var express = require('express');
var router = express.Router();

var registration = require("./registration");

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('home', { Navbar: 'Login_Navbar', LoginName: '' });
});

router.use('/register', registration);

module.exports = router;