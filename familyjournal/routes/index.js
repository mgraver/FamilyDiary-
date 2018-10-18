var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('home', { Navbar: 'Login_Navbar', LoginName: ''});
});

/* GET registration form */
router.get('/createAccount', (req, res, next) => {
	res.render('register.ejs', {})
});

module.exports = router;
