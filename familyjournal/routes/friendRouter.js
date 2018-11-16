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
	let getFriendsSql = "SELECT users.first, users.last, users.id FROM users INNER JOIN friends\
	ON users.id = friend1 OR users.id = friend2\
	WHERE friend1 = $1 OR friend2 = $1";
	var friends = [];

	pool.query(getFriendsSql, [req.session.userID], (err, qRes) => {
		if (err)
		{
			console.log(err.stack)
		}
		else
		{
			let results = qRes.rows;
			for (let i in results) {
				if (results[i].id != req.session.userID)
					friends.push(results[i]);
			}
		}

		res.render("friendsList", {
			Navbar: "Logout_Navbar",
			LoginName: req.session.full_name,
			friendRequests: req.session.requests,
			friendsList: friends
		});
	});
});

router.get("/acceptRequest/:requestId", (req, res, next) => {
	let rId = req.params.requestId;

	//Before acceptance make sure that user who sent request
	//was the receiver.
	pool.connect((err, client, done) => {
		client.query("SELECT receiver, sender FROM requests WHERE id = $1", [rId], (err, qRes) => {
			if (req.session.userID != qRes.rows[0].receiver)
			{
				done();
				return;
			}
			let addFriend = "INSERT INTO friends (friend1, friend2) VALUES ($1, $2)";
			var promises = [];

			promises.push(new Promise( (success, reject) => {
				client.query(addFriend, [qRes.rows[0].sender, qRes.rows[0].receiver], (err, qRes) => {
					if (err) reject(err);
					success(qRes);
				});
			}));

			promises.push(new Promise((success, reject) => {
				client.query("DELETE FROM requests WHERE id = $1", [rId], (err, qRes) => {
					if (err) reject(err);
					success(qRes);
				});
			}));

			Promise.all(promises).then(results => {
				done();
				return;
			})
		});
	});
});

router.get("/declineRequest/:requestId", (req, res, next) => {
	let rId = req.params.requestId;
	console.log("Received decline action for request " + rId);
	
	//Before acceptance make sure that user who sent request
	//was the receiver.
	//e.g if (req.session.user != qRes.rows[0].receiver) stop anyfurther actions.
	pool.connect((err, client, done) => {
		client.query("SELECT receiver FROM requests WHERE id = $1", [rId], (err, qRes) => {
			if (req.session.userID != qRes.rows[0].receiver)
			{
				done();
				return;
			}
			client.query("DELETE FROM requests WHERE id = $1", [rId], (err, qRes) => {
				done();
				return;
			})
		});
	});
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
