var express = require('express');
var router = express.Router();

var registration = require("./registration");

/* GET home page. */
router.get('/', function(req, res, next) {

	if(!req.session.userID)
  		res.render('home', { Navbar: 'Login_Navbar', LoginName: ''});
  	else {
  		let first = req.session.first_name;
  		let last = req.session.last_name;
  		res.render('home', { Navbar: 'Logout_Navbar', LoginName: first + ' ' + last});
  	}
});

router.get('/logout', (req, res, next) => {
	//Removes ression and rebuilds it on next request.
	req.session.destroy();
	res.redirect("../"); //Go back to home.
})

router.use('/register', registration);

module.exports = router;
