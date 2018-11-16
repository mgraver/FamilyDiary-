var express = require("express");
var router = express.Router();

//Redirect everyone to home page.
router.get("/", (req, res, next) => {
    res.render("friendsList", { Navbar: "Logout_Navbar", LoginName: req.session.full_name });
})

router.get("/acceptRequest/:requestId", (req, res, next) => {
	let rId = req.params.requestId;
	console.log("Received accept action for request " + rId);

	//Before acceptance make sure that user who sent request
	//was the receiver.
	//e.g if (req.session.user != qRes.rows[0].receiver) stop anyfurther actions.
	res.status(200);
})

router.get("/declineRequest/:requestId", (req, res, next) => {
	let rId = req.params.requestId;
	console.log("Received decline action for request " + rId);

	//Before acceptance make sure that user who sent request
	//was the receiver.
	//e.g if (req.session.user != qRes.rows[0].receiver) stop anyfurther actions.
	res.status(200);
})

module.exports = router;