const express = require("express");
const bcrypt = require("bcrypt");
const sqlite3 = require("sqlite3");
const path = require("path");
const { open } = require("sqlite");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "userData.db");
let db;

(async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("Server started at port: 3000");
    });
  } catch (error) {
    console.log(error.message);
  }
})();

const isPasswordValid = (password) => password.length >= 5;
// API - 1
//scenario_1 --- If user already exists ? 400 and resp-'User already exists'
//scenario_2 --- If password < 5 char ? 400 and resp-'Password is too short'
//scenario_3 --- If everything ok ? 2000 and resp-'User created successfully'
app.post("/register/", async (req, res) => {
  try {
    const { username, name, password, gender, location } = req.body;
    const encryptedPassword = await bcrypt.hash(password, 10);

    // check User already exists ?
    const getUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
    const userFound = await db.get(getUserQuery);

    if (userFound) {
      res.status(400);
      res.send("User already exists");
    } else {
      const validPassword = isPasswordValid(password);
      if (validPassword) {
        const createUserQuery = `INSERT INTO user
        (username, name, password, gender, location)
        VALUES ('${username}',
                '${name}',
                '${encryptedPassword}',
                '${gender}',
                '${location}');`;
        await db.run(createUserQuery);
        res.status(200);
        res.send("User created successfully");
      } else {
        res.status(400);
        res.send("Password is too short");
      }
    }
  } catch (error) {
    console.log(error.message);
  }
});

// API-2
//scenario_1 --- If unregistered user tries to login ? 400 and resp-'Invalid user'
//scenario_2 --- If  user provides incorrect password ? 400 and resp-'Invalid password'
//scenario_3 --- If everything ok ? 2000 and resp-'Login success!'
app.post("/login/", async (req, res) => {
  try {
    const { username, password } = req.body;

    // check if user already exists
    const getUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
    const userFound = await db.get(getUserQuery);

    if (!userFound) {
      res.status(400);
      res.send("Invalid user");
    } else {
      const checkPassword = await bcrypt.compare(password, userFound.password);
      if (checkPassword) {
        res.status(200);
        res.send("Login success!");
      } else {
        res.status(400);
        res.send("Invalid password");
      }
    }
  } catch (error) {
    console.log(error.message);
  }
});

// API-3
//scenario_1 --- If incorrect current password ? 400 and resp-'Invalid current password'
//scenario_2 --- If new password with less than 5 characters ? 400 and resp-'Password is too short'
//scenario_3 --- If everything ok ? 2000 and resp-'Password updated'
app.put("/change-password", async (req, res) => {
  try {
    const { username, oldPassword, newPassword } = req.body;

    // check password
    const getUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
    const userFound = await db.get(getUserQuery);

    const validCurrPassword = await bcrypt.compare(
      oldPassword,
      userFound.password
    );
    if (!validCurrPassword) {
      res.status(400);
      res.send("Invalid current password");
    } else {
      const validNewPassword = isPasswordValid(newPassword);
      if (!validNewPassword) {
        res.status(400);
        res.send("Password is too short");
      } else {
        const encryptedNewPassword = await bcrypt.hash(newPassword, 10);
        // update user password
        const updatePasswordQuery = `UPDATE user SET password = '${encryptedNewPassword}'
        WHERE username = '${username}';`;
        await db.run(updatePasswordQuery);
        res.status(200);
        res.send("Password updated");
      }
    }
  } catch (error) {
    console.log(error.message);
  }
});

// exporting 'app' object
module.exports = app;
