var express = require("express");
var router = express.Router();

const pool = require("./db");
const registration = require("./registration");
const journals = require("./journals");
const friendsRouter = require("./friendRouter");
const bcrypt = require("bcrypt");
const saltRounds = 10;

//Redirect everyone to home page.
router.get("/", (req, res, next) => {
    res.redirect("/home");
});

/* GET home page. */
router.get("/home", function(req, res, next) {
    if (!req.session.userID)
        res.render("home", {
            Navbar: "Login_Navbar",
            LoginName: "",
            friendRequests: [],
            invalidLogin: false
        });
    else {
        res.render("home", {
            Navbar: "Logout_Navbar",
            LoginName: req.session.full_name,
            friendRequests: req.session.requests,
            invalidLogin: false
        });
    }
});

router.post("/login", (req, res, next) => {
    var email = req.body.email.trim().toLowerCase();
    var password = req.body.password_1.trim();
    var getAccount = "SELECT * FROM users WHERE email = $1";

    pool.query(getAccount, [email], (err, qRes) => {
        if (err) {
            console.log(err.stack);
            res.redirect("/home");
        } else {
            //If no results go back.
            if (qRes.rows.length < 1) {
                res.render("home", {
                    Navbar: "Login_Navbar",
                    LoginName: "",
                    friendRequests: [],
                    invalidLogin: true
                });
                return;
            }

            let hash = qRes.rows[0].password;
            bcrypt.compare(password, hash, function(err, pRes) {
                if (pRes) {
                    req.session.userID = qRes.rows[0].id;
                    req.session.first_name = qRes.rows[0].first;
                    req.session.last_name = qRes.rows[0].last;
                    req.session.full_name =
                        qRes.rows[0].first + " " + qRes.rows[0].last;
                    req.session.email = email;

                    var getRequestsSql =
                        "SELECT requests.id, users.first, users.last FROM requests INNER JOIN users\
                            ON requests.sender = users.id WHERE requests.receiver = $1";

                    pool.query( getRequestsSql, [req.session.userID], (err, qRes) => {
                            req.session.requests = qRes.rows;
                            res.redirect("/home"); //Go back to home.
                    });

                    var getFriendEmails = 
                        "SELECT users.email FROM users JOIN friends ON\
                        (users.id = friends.friend1 OR users.id = friends.friend2) WHERE friend1 = $1 OR friend2 = $1";

                    pool.query(getFriendEmails, [req.session.userID], (err, qRes) => {
                        if (qRes.rows.length == 0)
                            return;

                        var friendEmails = []
                        for (i in qRes.rows)
                        {
                            if (qRes.rows[i].email != req.session.email)
                                friendEmails.push(qRes.rows[i].email);
                        }
                        req.session.friendEmails = friendEmails;
                        
                        //After res.redirect or res.send has been used res.session.save must be used.
                        req.session.save();
                    });
                } else {
                    res.render("home", {
                        Navbar: "Login_Navbar",
                        LoginName: "",
                        friendRequests: [],
                        invalidLogin: true
                    });
                }
            });
        }
    });
});

router.get("/logout", (req, res, next) => {
    //Removes ression and rebuilds it on next request.
    req.session.destroy();
    res.redirect("/home"); //Go back to home.
});

//Add other routers.
router.use("/register", registration);
router.use("/journals", journals);
router.use("/friends", friendsRouter);
module.exports = router;
