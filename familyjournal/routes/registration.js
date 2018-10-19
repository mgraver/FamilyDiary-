var express = require('express');
var router = express.Router();

const config = require('../serverConfig');
const {Pool} = require('pg');

const pool = new Pool(config);

pool.query('SELECT * FROM users', (err, res) => {
  console.log(err, res)
  pool.end()
})

/* GET registration form */
router.get('/', (req, res, next) => {
	res.render('register.ejs', {})
});

/*POST form data for account creation*/
router.post('/createAccount', (req, res, next) => {
	console.log(req.body);
	var first_name = req.body.first_name.trim();
	var last_name = req.body.last_name.trim();
	var email = req.body.email.trim();
	var password = req.body.password.trim();
});

module.exports = router;