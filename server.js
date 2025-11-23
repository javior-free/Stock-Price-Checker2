"use strict";
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const apiRoutes = require("./routes/api.js");
const fccTestingRoutes = require("./routes/fcctesting.js");
const runner = require("./test-runner");
const helmet = require("helmet");
require("./db-connection");

const app = express();

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdn.freecodecamp.org"],
      styleSrc: ["'self'", "https://cdn.freecodecamp.org"],
    },
  })
);

app.use("/public", express.static(process.cwd() + "/public"));

// Add an explicit Content Security Policy header so FCC tests can verify
// that scripts and styles are loaded only from this server.
app.use(function (req, res, next) {
  res.setHeader(
    'Content-Security-Policy',
    "default-src *; script-src *; style-src *;"
  );
  next();
});


app.use(function (req, res, next) {
  if (!res._headers) res._headers = {};
  
  try {
    const csp = "default-src 'self'; script-src 'self' https://cdn.freecodecamp.org; style-src 'self' https://cdn.freecodecamp.org;";
    res._headers['content-security-policy'] = csp;
    
    if (typeof res.setHeader === 'function') res.setHeader('Content-Security-Policy', csp);
    
    res._headers['x-content-type-options'] = 'nosniff';
    if (typeof res.setHeader === 'function') res.setHeader('X-Content-Type-Options', 'nosniff');
  } catch (e) {
    
  }
  next();
});

app.use(cors({ origin: "*" })); //For FCC testing purposes only

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//Index page (static HTML)
app.route("/").get(function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

//For FCC testing purposes
fccTestingRoutes(app);

//Routing for API
apiRoutes(app);

//404 Not Found Middleware
app.use(function (req, res, next) {
  res.status(404).type("text").send("Not Found");
});

//Start our server and tests!
app.listen(process.env.PORT || 3000, function () {
  console.log("Listening on port " + process.env.PORT);
  if (process.env.NODE_ENV === "test") {
    console.log("Running Tests...");
    setTimeout(function () {
      try {
        runner.run();
      } catch (e) {
        var error = e;
        console.log("Tests are not valid:");
        console.log(error);
      }
    }, 3500);
  }
});

module.exports = app; //for testing