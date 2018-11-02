var express = require("express");
var router = express.Router();

const pool = require("./db");
const aws = require("../AWSconfig");

//Reroute the user back to home if they arent loged in.
router.use((req, res, next) => {
	if (req.session.userID) next();
	else res.status(403).redirect("/home");
});

router.get("/", (req, res, next) => {
	const getJournals = "SELECT * FROM journals WHERE userid = $1";
	pool.query(getJournals, [req.session.userID], (err, qRes) => {
		console.log(qRes.rows);
		res.render("journalList", {
			LoginName: req.session.full_name,
			Journals: qRes.rows
		});
	});
});

router.post("/createJournal", (req, res, next) => {
	const makeJournal =
		"INSERT INTO journals (userid, title, description) VALUES ($1, $2, $3)";
	const title = req.body.title;
	const description = req.body.description;

	pool.query(
		makeJournal,
		[req.session.userID, title, description],
		(err, qRes) => {
			res.redirect("/journals");
		}
	);
});

router.get("/:journalId/:journalName/entries", (req, res, next) => {
	let jName = req.params.journalName;
	let jId = req.params.journalId;
	res.render("entryList", {
		LoginName: req.session.full_name,
		JournalName: jName,
		JournalId: jId
	});
});

router.get("/:journalId/:journalName/createEntry", (req, res, next) => {
	let jName = req.params.journalName;
	let jId = req.params.journalId;
	res.render("entryCreation", {
		LoginName: req.session.full_name,
		JournalName: jName,
		JournalId: jId
	});
});

router.post("/:journalId/:journalName/addEntry", (req, res, next) => {
	const addEntrySQL =
		"INSERT INTO entries (userid, journalid, title) VALUES ($1, $2, $3) RETURNING id";
	var entry = {};
	var s3 = new aws.S3();

	entry.date = req.body.date;
	entry.title = req.body.title;
	entry.text = req.body.text;

	pool.query(
		addEntrySQL,
		[req.session.userID, req.params.journalId, entry.title],
		(err, qRes) => {
			var entryJson = JSON.stringify(entry);
			var entryBuffer = Buffer.from(entryJson);

			var params = {
				Bucket: "byui-seniorproject",
				Body: entryBuffer,
				Key:
					req.session.userID +
					"/" +
					req.params.journalId +
					"/" +
					qRes.rows[0].id +
					".json"
			};

			s3.putObject(params, (err, data) => {
				if (err) {
					console.log("Error", err);
				}
				res.redirect("entries");
			});
		}
	);
});

module.exports = router;
