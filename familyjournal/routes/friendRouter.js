var express = require("express");
var router = express.Router();

const pool = require("./db");

//Reroute the user back to home if they arent logged in.
router.use((req, res, next) => {
	if (req.session.userID) next();
	else res.status(403).redirect("/home");
});

//Redirect everyone to home page.
router.get("/", (req, res, next) => {
	res.render("friendsList", {
		Navbar: "Logout_Navbar",
		LoginName: req.session.full_name,
		friendRequests: req.session.requests
	});
});

router.get("/acceptRequest/:requestId", (req, res, next) => {
	let rId = req.params.requestId;
	console.log("Received accept action for request " + rId);

	//Before acceptance make sure that user who sent request
	//was the receiver.
	//e.g if (req.session.user != qRes.rows[0].receiver) stop anyfurther actions.
	res.status(200);
});

router.get("/declineRequest/:requestId", (req, res, next) => {
	let rId = req.params.requestId;
	console.log("Received decline action for request " + rId);

	//Before acceptance make sure that user who sent request
	//was the receiver.
	//e.g if (req.session.user != qRes.rows[0].receiver) stop anyfurther actions.
	res.status(200);
});

router.post("/requestFriend", (req, res, next) => {
	var getIdSql = "SELECT ID from users WHERE email = $1";
	var requestSql = "INSERT INTO requests (sender, receiver) VALUES ($1, $2)";
	var email = req.body.email;

	pool.connect((err, client, done) => {
		if (err) throw err;

		client.query(getIdSql, [email], (err, qRes) => {
			if (qRes.rows.length == 0) {
				console.log("Failed to find matching email");
				done();
				return;
			} else {
				console.log("Creating Request");
				client.query(
					requestSql,
					[req.session.userID, qRes.rows[0].id],
					(err, qRes) => {
						done();
					}
				);
			}
		});
	});
});

module.exports = router;
