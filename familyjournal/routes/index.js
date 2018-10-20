var express = require("express");
var router = express.Router();

const registration = require("./registration");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const config = require("../serverConfig");

const pool = new Pool(config);
const saltRounds = 10;

pool.on("error", (err, client) => {
	console.error("Unexpected error on idle client", err);
	process.exit(-1);
});

/* GET home page. */
router.get("/", function(req, res, next) {
	if (!req.session.userID)
		res.render("home", { Navbar: "Login_Navbar", LoginName: "" });
	else {
		let first = req.session.first_name;
		let last = req.session.last_name;
		res.render("home", {
			Navbar: "Logout_Navbar",
			LoginName: first + " " + last
		});
	}
});

router.post("/login", (req, res, next) => {
	var email = req.body.email.trim();
	var password = req.body.password_1.trim();
	var getAccount = "SELECT * FROM users WHERE email = $1";

	pool.connect((err, client, done) => {
		if (err) throw err;
		client.query(getAccount, [email], (err, qRes) => {
			done();

			if (err) {
				console.log(err.stack);
				res.status(500).send();
			} else {
				console.log(qRes.rows[0]);
				let hash = qRes.rows[0].password;
				bcrypt.compare(password, hash, function(err, pRes) {
					if (pRes) {
						req.session.userID = qRes.rows[0].id;
						req.session.first_name = qRes.rows[0].first;
						req.session.last_name = qRes.rows[0].last;
						res.redirect("../"); //Go back to home.
					}
					else
					{
						console.log("Invalid password");
						res.redirect("../../"); //Go back to home.
					}
				});
			}
		});
	});
});

router.get("/logout", (req, res, next) => {
	//Removes ression and rebuilds it on next request.
	req.session.destroy();
	res.redirect("../"); //Go back to home.
});

router.use("/register", registration);

module.exports = router;
