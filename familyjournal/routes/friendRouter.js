var express = require("express");
var router = express.Router();

const pool = require("./db");
const aws = require("../AWSconfig");
const nodemailer = require("nodemailer");

const s3 = new aws.S3();
const bucketName = "byui-seniorproject";
const transporter = require("../emailConfig");

//Reroute the user back to home if they arent logged in.
router.use((req, res, next) => {
	if (req.session.userID) next();
	else res.status(403).redirect("/home");
});

//Call this security check.
router.use("/:friendId/journals/:journalId/", (req, res, next) => {
	if (req.session.friendId) next();
	else res.status(403).redirect("/home");
});

//Redirect everyone to home page.
router.get("/", (req, res, next) => {
	let getFriendsSql =
		"SELECT users.first, users.last, users.id FROM users INNER JOIN friends\
	ON users.id = friend1 OR users.id = friend2\
	WHERE friend1 = $1 OR friend2 = $1";
	var friends = [];

	pool.query(getFriendsSql, [req.session.userID], (err, qRes) => {
		if (err) {
			console.log(err.stack);
		} else {
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

	for (let i in req.session.requests)
		if (rId == req.session.requests[i].id)
			req.session.requests.splice(i, 1);

	//Before acceptance make sure that user who accepts request is the correct user.
	pool.connect((err, client, done) => {
		client.query(
			"SELECT users.email, requests.sender, requests.receiver FROM requests\
			 INNER JOIN users ON requests.sender = users.id WHERE requests.id = $1",
			[rId],
			(err, qRes) => {
				if (req.session.userID != qRes.rows[0].receiver) {
					done();
					return;
				}
				let addFriend =
					"INSERT INTO friends (friend1, friend2) VALUES ($1, $2)";
				var promises = [];

				var mailOptions = {
					from: "familyjournalnotifications@gmail.com",
					to: qRes.rows[0].email,
					subject: "Friend Request Accepted",
					text:
						req.session.full_name +
						" has accepted your friend request on Family Journal!"
				};

				transporter.sendMail(mailOptions, (err, info) => {
					if (err) console.log(err);
					else console.log(info);
				});

				promises.push(
					new Promise((success, reject) => {
						client.query(
							addFriend,
							[qRes.rows[0].sender, qRes.rows[0].receiver],
							(err, qRes) => {
								if (err) reject(err);
								success(qRes);
							}
						);
					})
				);

				promises.push(
					new Promise((success, reject) => {
						client.query(
							"DELETE FROM requests WHERE id = $1",
							[rId],
							(err, qRes) => {
								if (err) reject(err);
								success(qRes);
							}
						);
					})
				);

				Promise.all(promises).then(results => {
					done();
					return;
				});
			}
		);
	});
});

router.get("/declineRequest/:requestId", (req, res, next) => {
	let rId = req.params.requestId;

	for (let i in req.session.requests)
		if (rId == req.session.requests[i].id)
			req.session.requests.splice(i, 1);

	//Before acceptance make sure that user who sent request
	//was the receiver.
	//e.g if (req.session.user != qRes.rows[0].receiver) stop anyfurther actions.
	pool.connect((err, client, done) => {
		client.query(
			"SELECT receiver FROM requests WHERE id = $1",
			[rId],
			(err, qRes) => {
				if (req.session.userID != qRes.rows[0].receiver) {
					done();
					return;
				}
				client.query(
					"DELETE FROM requests WHERE id = $1",
					[rId],
					(err, qRes) => {
						done();
						return;
					}
				);
			}
		);
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
						if (err) console.log(err);
						else {
							var mailOptions = {
								from: "familyjournalnotifications@gmail.com",
								to: email,
								subject: "Friend Request",
								text:
									req.session.full_name +
									" has sent you a friend request on Family Journal!"
							};

							transporter.sendMail(mailOptions, (err, info) => {
								if (err) console.log(err);
								else console.log(info);
							});
						}
					}
				);
			}
		});
	});
});

router.get("/:friendId/journals", (req, res, next) => {
	var promises = [];
	const friendId = req.params.friendId;
	const securityQ =
		"SELECT id FROM friends WHERE (friend1 = $1 AND friend2 = $2) OR (friend1 = $2 AND friend2 = $1)";
	const getJournals =
		"SELECT * FROM journals WHERE userid = $1 AND shared = true";

	//This is for a security Check.
	promises.push(
		new Promise((success, reject) => {
			pool.query(
				securityQ,
				[friendId, req.session.userID],
				(err, qRes) => {
					if (err) reject(err);
					else success(qRes);
				}
			);
		})
	);

	//Get the journals.
	promises.push(
		new Promise((success, reject) => {
			pool.query(getJournals, [friendId], (err, qRes) => {
				if (err) reject(err);
				else success(qRes);
			});
		})
	);

	Promise.all(promises).then(results => {
		//If the user is not a friend then don't allow access.
		if (results[0].rows.length == 0) res.redirect("/home");
		else {
			req.session.friendId = friendId;
			res.render("journalList", {
				Navbar: "Logout_Navbar",
				LoginName: req.session.full_name,
				Journals: results[1].rows,
				friendRequests: req.session.requests
			});
		}
	});
});

router.get(
	"/:friendId/journals/:journalId/:journalName/entries", (req, res, next) => {
		let jName = req.params.journalName;
		let jId = req.params.journalId;
		var entries = [];
		var promises = [];

		var params = {
			Bucket: bucketName,
			Delimiter: "/",
			Prefix: req.session.friendId + "/" + req.params.journalId + "/"
		};

		s3.listObjectsV2(params, (err, data) => {
			if (err) console.log(err, err.stack);
			for (let i = 0; i < data.Contents.length; i++) {
				let params = {
					Bucket: bucketName,
					Key: data.Contents[i].Key
				};

				//Make a promise for each getObject that returnes the data
				promises.push(
					new Promise((success, reject) => {
						s3.getObject(params, (err, data) => {
							if (err) reject(err);
							else success(data);
						});
					})
				);
			}

			//Once all the get Objects are done save the metadata and return.
			Promise.all(promises).then(results => {
				for (let i in results) {
					entries.push(results[i].Metadata);
				}

				res.render("entryList", {
					Navbar: "Logout_Navbar",
					LoginName: req.session.full_name,
					JournalName: jName,
					JournalId: jId,
					entryList: entries,
					friendRequests: req.session.requests
				});
			});
		});
	}
);

router.get(
	"/:friendId/journals/:journalId/:journalName/:entryKey/:entryTitle/entry",
	(req, res, next) => {
		var promises = [];
		var photos = [];

		var listParams = {
			Bucket: bucketName,
			Delimiter: "/",
			Prefix:
				req.session.friendId +
				"/" +
				req.params.journalId +
				"/" +
				req.params.entryKey +
				"/"
		};

		s3.listObjectsV2(listParams, (err, data) => {
			if (err) console.log(err, err.stack);
			for (let i = 0; i < data.Contents.length; i++) {
				let params = {
					Bucket: bucketName,
					Key: data.Contents[i].Key,
					Expires: 60 * 20
				};

				promises.push(
					new Promise((success, reject) => {
						s3.getSignedUrl("getObject", params, (err, url) => {
							if (err) reject(err);
							else success(url);
						});
					})
				);
			}

			let params = {
				Bucket: bucketName,
				Key:
					req.session.friendId +
					"/" +
					req.params.journalId +
					"/" +
					req.params.entryKey +
					".json"
			};

			promises.push(
				new Promise((success, reject) => {
					s3.getObject(params, (err, data) => {
						if (err) reject(err);
						else success(data);
					});
				})
			);

			Promise.all(promises).then(results => {
				var entry;
				for (let i in results) {
					if (typeof results[i] === "string") photos.push(results[i]);
					else {
						let entryJson = results[i].Body.toString();
						entry = JSON.parse(entryJson);
					}
				}

				res.render("entryDisplay", {
					Navbar: "Logout_Navbar",
					LoginName: req.session.full_name,
					journalTitle: entry.title,
					journalDate: entry.date,
					journalText: entry.text,
					entryPhotos: photos,
					friendRequests: req.session.requests,
					edit: false
				});
			});
		});
	}
);

module.exports = router;
