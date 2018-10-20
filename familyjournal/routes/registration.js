var express = require("express");
var router = express.Router();

const config = require("../serverConfig");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const saltRounds = 10;

const pool = new Pool(config);

pool.on("error", (err, client) => {
	console.error("Unexpected error on idle client", err);
	process.exit(-1);
});

/* GET registration form */
router.get("/", (req, res, next) => {
	res.render("register.ejs", {});
});

/*POST form data for account creation*/
router.post("/createAccount", (req, res, next) => {
	console.log("createAccount");
	console.log(req.body);
	var first_name = req.body.first_name.trim();
	var last_name = req.body.last_name.trim();
	var email = req.body.email.trim();
	var password = req.body.password_1.trim();

	bcrypt.hash(password, saltRounds, function(err, hash) {
		let insertSQL =
			"INSERT INTO users (first, last, email, password) VALUES ($1, $2, $3, $4) RETURNING *";

		let insertData = [first_name, last_name, email, hash];

		pool.connect((err, client, done) => {
			if (err) throw err;
			client.query(insertSQL, insertData, (err, qRes) => {
				done();
				console.log("Pool query.");
				if (err) {
					console.log(err.stack);
					res.status(500).send();
				} else {
					console.log(qRes.rows[0]);
					req.session.userID = qRes.rows[0].id;
					res.redirect("../../"); //Go back to home.
				}
			});
		});
	});
});

module.exports = router;
