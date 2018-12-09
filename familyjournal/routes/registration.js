var express = require("express");
var router = express.Router();

const pool = require("./db");
const bcrypt = require("bcrypt");
const saltRounds = 10;

/* GET registration form */
router.get("/", (req, res, next) => {
    res.render("register.ejs", {
        form: {
            first: "",
            last: "",
            email: "",
            pass: ""
        },
        errors: { email: false },
        invalidLogin: false
    });
});

/*POST form data for account creation*/
router.post("/createAccount", (req, res, next) => {
    var first_name = req.body.first_name.trim();
    var last_name = req.body.last_name.trim();
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
                if (err.code == 23505)
                    res.render("register.ejs", {
                        form: {
                            first: first_name,
                            last: last_name,
                            email: email,
                            pass: password
                        },
                        errors: { email: true },
                        invalidLogin: false
                    });
            } else {
                console.log(qRes.rows[0]);
                req.session.userID = qRes.rows[0].id;
                req.session.first_name = qRes.rows[0].first;
                req.session.last_name = qRes.rows[0].last;
                req.session.requests = [];
                res.redirect("/home"); //Go back to home.
            }
        });
    });
});

module.exports = router;
