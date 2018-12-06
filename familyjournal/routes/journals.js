var express = require("express");
var router = express.Router();

const pool = require("./db");
const aws = require("../AWSconfig");
const bucketName = "byui-seniorproject";

const multer = require("multer");
const multerS3 = require("multer-s3");
const s3 = new aws.S3();
var storageMs3 = multerS3({
    s3: s3,
    bucket: bucketName,
    key: (mReq, file, cb) => {
        pool.query("SELECT last_value FROM entries_id_seq;", (err, qRes) => {
            var lastValue = qRes.rows[0].last_value;
            if (lastValue == 1)
                //Have to use this if statement only when starting empty.
                //Otherwise the Id could be increamented when it shouldn't.
                pool.query("SELECT * FROM entries", (err, entriesRes) => {
                    if (entriesRes.rows.length > 0) {
                        lastValue++;
                        cb(
                            null,
                            mReq.session.userID +
                            "/" +
                            mReq.params.journalId +
                            "/" +
                            lastValue +
                            "/" +
                            file.originalname
                        );
                    } else
                        cb(
                            null,
                            mReq.session.userID +
                            "/" +
                            mReq.params.journalId +
                            "/" +
                            lastValue +
                            "/" +
                            file.originalname
                        );
                });
            else
                cb(
                    null,
                    mReq.session.userID +
                    "/" +
                    mReq.params.journalId +
                    "/" +
                    ++lastValue +
                    "/" +
                    file.originalname
                );
        });
    }
});

//Setup file upload.
const upload = multer({ storage: storageMs3 });

//Reroute the user back to home if they arent logged in.
router.use((req, res, next) => {
    if (req.session.userID) next();
    else res.status(403).redirect("/home");
});

router.get("/", (req, res, next) => {
    const getJournals = "SELECT * FROM journals WHERE userid = $1";
    pool.query(getJournals, [req.session.userID], (err, qRes) => {
        res.render("journalList", {
            Navbar: "Logout_Navbar",
            LoginName: req.session.full_name,
            Journals: qRes.rows,
            friendRequests: req.session.requests
        });
    });
});

router.post("/createJournal", (req, res, next) => {
    const makeJournal =
        "INSERT INTO journals (userid, title, description, shared) VALUES ($1, $2, $3, $4)";
    const title = req.body.title;
    const description = req.body.description;
    const shared = req.body.shared ? true : false;

    pool.query(
        makeJournal,
        [req.session.userID, title, description, shared],
        (err, qRes) => {
            res.redirect("/journals");
        }
    );
});

router.get("/:journalId/:journalName/entries", (req, res, next) => {
    let jName = req.params.journalName;
    let jId = req.params.journalId;
    var entries = [];
    var promises = [];

    var params = {
        Bucket: bucketName,
        Delimiter: "/",
        Prefix: req.session.userID + "/" + req.params.journalId + "/"
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
});

router.get("/:journalId/:journalName/createEntry", (req, res, next) => {
    let jName = req.params.journalName;
    let jId = req.params.journalId;
    res.render("entryCreation", {
        Navbar: "Logout_Navbar",
        LoginName: req.session.full_name,
        JournalName: jName,
        JournalId: jId,
        friendRequests: req.session.requests,
        entryData: {},
        photoKeys: {}
    });
});

//NOTE: multer middleware must be called first before the rest of the form data can be accessed.
router.post(
    "/:journalId/:journalName/addEntry",
    upload.array("photos", 12),
    (req, res, next) => {
        const addEntrySQL =
            "INSERT INTO entries (userid, journalid, title) VALUES ($1, $2, $3) RETURNING id";
        var entry = {};

        entry.date = req.body.date;
        entry.title = req.body.title;
        entry.text = req.body.text;

        pool.query(
            addEntrySQL,
            [req.session.userID, req.params.journalId, entry.title],
            (err, qRes) => {
                var entryJson = JSON.stringify(entry);
                var entryBuffer = Buffer.from(entryJson);

                //Params so aws can put json in write place in bucket.
                var params = {
                    Bucket: bucketName,
                    Body: entryBuffer,
                    Key: req.session.userID +
                        "/" +
                        req.params.journalId +
                        "/" +
                        qRes.rows[0].id +
                        ".json",
                    Metadata: {
                        title: entry.title,
                        date: entry.date,
                        desci: entry.text.substring(0, 53),
                        keyName: qRes.rows[0].id.toString()
                    }
                };

                //Put the json in the bucket and head back to the entries
                s3.putObject(params, (err, data) => {
                    if (err) {
                        console.log("Error", err);
                    }
                    res.redirect("entries");
                });
            }
        );
    }
);


router.get(
    "/:journalId/:journalName/:entryKey/:entryTitle/entry",
    (req, res, next) => {
        var promises = [];
        var photos = []; //Sighned URLs for the pictures
        var photoKeys = []; //Save keys for the pictures

        var listParams = {
            Bucket: bucketName,
            Delimiter: "/",
            Prefix: req.session.userID +
                "/" +
                req.params.journalId +
                "/" +
                req.params.entryKey +
                "/"
        };

        s3.listObjectsV2(listParams, (err, data) => {
            if (err) console.log(err, err.stack);
            for (let i = 0; i < data.Contents.length; i++) {
                photoKeys.push(data.Contents[i].Key);
                let params = {
                    Bucket: bucketName,
                    Key: data.Contents[i].Key,
                    Expires: 1200 //URL lasts for 20 mins.
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
                Key: req.session.userID +
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
                for (let i in results) {
                    if (typeof results[i] === "string") photos.push(results[i]);
                    else {
                        let entryJson = results[i].Body.toString();
                        entry = JSON.parse(entryJson);
                    }
                }

                //Save the entry info to the session so it can be edited faster.
                req.session.editEntry = entry;
                req.session.photoKeys = photoKeys;

                res.render("entryDisplay", {
                    Navbar: "Logout_Navbar",
                    LoginName: req.session.full_name,
                    journalTitle: entry.title,
                    journalDate: entry.date,
                    journalText: entry.text,
                    entryPhotos: photos,
                    friendRequests: req.session.requests
                });
            });
        });
    }
);

router.get(
    "/:journalId/:journalName/:entryKey/:entryTitle/edit",
    (req, res, next) => {
        const jName = req.params.journalName;
        const jId = req.params.journalId;
        res.render("entryCreation", {
            Navbar: "Logout_Navbar",
            LoginName: req.session.full_name,
            JournalName: jName,
            JournalId: jId,
            friendRequests: req.session.requests,
            entryData: req.session.editEntry,
            photoKeys: req.session.photoKeys
        });
    }
);

//NOTE: multer middleware must be called first before the rest of the form data can be accessed.
router.post(
    "/:journalId/:journalName/:entryKey/:entryTitle/editEntry",
    upload.array("photos", 12),
    (req, res, next) => {
        const entryKey = req.params.entryKey;
        const jName = req.params.journalName;
        const jId = req.params.journalId;

        var entry = {};
        var checkBoxes = req.body.deletedPics;

        entry.date = req.body.date;
        entry.title = req.body.title;
        entry.text = req.body.text;

        var entryJson = JSON.stringify(entry);
        var entryBuffer = Buffer.from(entryJson);

        //Params so aws can put json in write place in bucket.
        var params = {
            Bucket: bucketName,
            Body: entryBuffer,
            Key: req.session.userID +
                "/" +
                req.params.journalId +
                "/" +
                entryKey +
                ".json",
            Metadata: {
                title: entry.title,
                date: entry.date,
                desci: entry.text.substring(0, 53),
                keyName: entryKey
            }
        };

        //Put the json in the bucket and head back to the entries
        s3.putObject(params, (err, data) => {
            if (err) {
                console.log("Error", err);
            }
        });

        var keyObjects = [];
        for (i in checkBoxes) {
            keyObjects.push({ Key: req.session.photoKeys[checkBoxes[i]] });
        }
        
        params = {
            Bucket: bucketName,
            Delete: { Objects: keyObjects, Quiet: false }
        };

        s3.deleteObjects(params, (err, data) => {
            if (err) console.log(err.stack);
            res.redirect("/journals/" + jId + "/" + jName + "/entries");
        });

    }
);

module.exports = router;