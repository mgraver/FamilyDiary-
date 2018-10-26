var express = require("express");
var router = express.Router();

const pool = require("./db");

//Reroute the user back to home if they arent loged in.
router.use((req, res, next) =>{
	if (req.session.userID)
		next();
	else
		res.status(403).redirect("/home");
});

router.get("/", (req, res, next) => {
	const getJournals = "SELECT * FROM journals WHERE userid = $1";
	pool.query(getJournals, [req.session.userID], (err, qRes) => {
		console.log(qRes.rows);
		res.render("journalList", {LoginName: req.session.full_name, Journals: qRes.rows});
	});
});

router.post("/createJournal", (req, res, next) => {
	const makeJournal = "INSERT INTO journals (userid, title, description) VALUES ($1, $2, $3)";
	console.log(req.body);
	const title = req.body.title;
	const description = req.body.description;

	console.log(title);
	console.log(description);

	pool.query(makeJournal, [req.session.userID, title, description], (err, qRes) => {
		res.redirect("/journals");
	});
});

router.get("/:journalId/:journalName/entries", (req, res, next) => {
	res.render("entryList", {LoginName: req.session.full_name, JournalName:req.params.journalName});
});

module.exports = router;