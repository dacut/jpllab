'use strict';

const fs = require("fs");
const sjcl = require("./keys-website/js/sjcl.js");

function toUsername(i) {
    var username = String(i);
    while (username.length < 3) {
        username = "0" + username;
    }

    return "lab" + username;
}

function readPasswords() {
    "use strict";

    return new Promise((resolve, reject) => {
        fs.open("credentials.txt", "r", (err, fd) => {
            if (err) {
                console.log("Error opening credentials.txt: " + err);
                reject(err);;
            }

            fs.readFile(fd, (err, data) => {
                if (err) {
                    console.log("Error reading credentials.txt: " + err);
                    reject(err);
                }

                var passwords = {};
                var lines = data.toString().split("\n");

                for (var i = 1; i < lines.length; ++i) {
                    var line = lines[i];
                    var parts = line.split(/\s+/);

                    if (parts.length == 2) {
                        passwords[parts[0]] = parts[1];
                    }
                };

                resolve(passwords);
            });
        });
    });
}

function readAWSKeys() {
    "use strict";

    return new Promise((resolve, reject) => {
        fs.open("awskeys.txt", "r", (err, fd) => {
            if (err) {
                console.log("Error opening awskeys.txt: " + err);
                reject(err);
            }

            fs.readFile(fd, (err, data) => {
                if (err) {
                    console.log("Error reading awskeys.txt: " + err);
                    reject(err);
                }

                var awsKeys = {}
                var lines = data.toString().split("\n");

                for (var i = 0; i < lines.length; ++i) {
                    var line = lines[i];
                    if (! line) {
                        continue;
                    }

                    var parts = line.split("\t");
                    if (parts.length == 3) {
                        awsKeys[parts[0]] = [parts[1], parts[2]];
                    }
                }

                resolve(awsKeys);
            });
        });
    });
}

function readRSAKeys() {
    "use strict";

    return new Promise((resolve, reject) => {
        var readers = [];

        for (var i = 1; i <= 100; ++i) {
            readers.push(new Promise((resolve, reject) => {
                var username = toUsername(i);
                var filename = username + ".rsa";

                fs.open(filename, "r", (err, fd) => {
                    if (err) {
                        console.log("Error opening " + filename + ": " + err);
                        reject(err);
                    }

                    fs.readFile(fd, (err, data) => {
                        if (err) {
                            console.log("Error reading " + filename + ": " + err);
                            reject(err);
                        }

                        resolve([username, data.toString()]);
                    });
                });
            }));
        }

        Promise.all(readers).then((results) => {
            var rsa = {};

            for (var i = 0; i < results.length; ++i) {
                rsa[results[i][0]] = results[i][1];
            }

            resolve(rsa);
        });
    });
}

function encryptUsersRSA(passwords) {
    "use strict";
    var promises = [];

    for (var i = 1; i <= 100; ++i) {
        var username = String(i);

        while (username.length < 3) {
            username = "0" + username;
        }

        username = "lab" + username;
        var password = passwords[username];

        if (! password) {
            throw "No password for " + username;
        }

        promises.push(encryptUserRSA(username, password));
    }

    return Promise.all(promises);
}

function encryptFile(infilename, outfilename, password) {
    "use strict";
    return new Promise((resolve, reject) => {
        fs.open(filename, "r", (err, fd) => {
            if (err) {
                console.log("Error opening " + filename + ": " + err);
                reject(err);
            }

            fs.readFile(fd, (err, data) => {
                if (err) {
                    console.log("Error reading " + filename + ": " + err);
                    reject(err);
                }

                rsa_key = data.toString();
                var encrypted = sjcl.encrypt(password, data.toString());

                fs.open(encfilename, "w", (err, fd) => {
                    if (err) {
                        console.log("Error: " + err);
                        reject(err);
                    }

                    fs.writeFile(ofd, encrypted.toString(), resolve);
                });
            });
        });
    });
}

var promise = Promise.all([
    readPasswords(),
    readAWSKeys(),
    readRSAKeys()
]).then(function (results) {
    var passwords = results[0];
    var awsKeys = results[1];
    var rsaKeys = results[2];
    var crypto = {};

    for (var i = 1; i <= 100; ++i) {
        var username = toUsername(i);
        var password = passwords[username];
        var credText = JSON.stringify({
            accessKey: awsKeys[username][0],
            secretKey: awsKeys[username][1],
            sshKey: rsaKeys[username]
        });

        crypto[username] = sjcl.encrypt(password, credText).toString();
    }

    fs.open("keys.json", "w", (err, fd) => {
        if (err) {
            console.log("Error opening keys.json: " + err);
            throw err;
        }

        fs.writeFileSync(fd, JSON.stringify(crypto));
    });
}, function (error) { console.log("Error: " + error); });
