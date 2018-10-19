var express = require('express');
var router = express.Router();

/* GET registration form */
router.get('/', (req, res, next) => {
	res.render('register.ejs', {})
});

/*POST form data for account creation*/
router.post('/createAccount', (req, res, next) => {
	console.log(req.body);
	var first_name = req.body.first_name;
	var last_name = req.body.last_name;
	var email = req.body.email;
	var password = req.body.password;
});

module.exports = router;