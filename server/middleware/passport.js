const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");
const User = require("../models/User.js");
const { LOGGER_ROUTE_KEYS } = require("../constants/logger.constants");
const Logger = require("../handlers/logger");
const logger = new Logger(LOGGER_ROUTE_KEYS.MIDDLEWARE_PASSPORT);

module.exports = function (passport) {
  passport.use(
    new LocalStrategy({ usernameField: "username" }, async (username, password, done) => {
      try {
        const user = await User.findOne({ username });
        if (!user) {
          return done(null, false, { message: "That username is not registered" });
        }
        bcrypt.compare(password, user.password, (err, isMatch) => {
          if (err) return done(err);
          if (isMatch) return done(null, user);
          return done(null, false, { message: "Password incorrect" });
        });
      } catch (err) {
        logger.error(err);
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
};
