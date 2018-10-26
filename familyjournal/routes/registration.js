var express = require("express");
var router = express.Router();

const pool = require("./db");
const bcrypt = require("bcrypt");
const saltRounds = 10;

/* GET registration form */
router.get("/", (req, res, next) => {
    res.render("register.ejs", {});
});

/*POST form data for account creation*/
router.post("/createAccount", (req, res, next) => {
    console.log("createAccount");
    console.log(req.body);
    var first_name = req.body.first_name.trim().toLowerCase();
    var last_name = req.body.last_name.trim().toLowerCase();
    var email = req.body.email.trim().toLowerCase();
    var password = req.body.password_1.trim();

    bcrypt.hash(password, saltRounds, function(err, hash) {
        let insertSQL =
            "INSERT INTO users (first, last, email, password) VALUES ($1, $2, $3, $4) RETURNING *";

        let insertData = [first_name, last_name, email, hash];

        pool.query(insertSQL, insertData, (err, qRes) => {
            console.log("Pool query.");
            if (err) {
                console.log(err.stack);
                res.status(500).send();
            } else {
                console.log(qRes.rows[0]);
                req.session.userID = qRes.rows[0].id;
                req.session.first_name = qRes.rows[0].first;
                req.session.last_name = qRes.rows[0].last;
                res.redirect("../../"); //Go back to home.

            }
        });
    });
});

module.exports = router;