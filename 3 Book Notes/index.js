import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import Pool from 'pg-pool';
import cookieParser from "cookie-parser";
import crypto from "crypto";
import bcrypt from "bcrypt";

const pool = new Pool({
  database: 'book_notes',
  user: "postgres",
  host: "localhost",
  password: 'wkx',
  port: 5432,
  max: 20, 
  idleTimeoutMillis: 1500, 
  connectionTimeoutMillis: 1000, 
})

const app = express();
const port = 3000;
const maxBookPerPage = 10;
const pageNavLength = 12; // e.g.: <pre 1 2 3 4 5 6 7 ... 12 13 14 15 next>
const currentYear = new Date().getFullYear();
const saltRounds = 10;

const sessions = {}; // To remember verified users on their browsers

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());
app.use((req, res, next) => {
  
  if (req.path.startsWith("/css") || req.path.startsWith("/scripts") || req.path.startsWith("/images")) {
    return next(); // skip auth for static assets
  }
  // To check if the user has logged in / has been given a session
  const { sessionID } = req.cookies || "";
  if (sessionID && sessions[sessionID]) {
    req.user = sessions[sessionID];
  }

  next();
});
app.locals.maxBookPerPage = maxBookPerPage;

app.listen(port, () => {
  console.log(`Listens on port ${port}...`);
})

// Finished.
app.get('/', (req, res) => {
  if (!req.user) {
    res.render('preLogin.ejs', {currentYear: currentYear});
  } else {
    res.redirect('/user/' + req.user);
  }
  
})

// Finished.
app.post('/login', async (req, res) => {
  try {
    const queryResult = await pool.query("SELECT * FROM users WHERE username = $1",
      [req.body.username]);

    if (queryResult.rowCount !== 1) {
      // Username doesn't exist
      res.status(401).json({errType : "VAGUE"}); 
    } else {
      bcrypt.compare(req.body.password, queryResult.rows[0].password, function(err, result) {
      // result == true when password is right
        if (result) {
          const sessionID = generateToken();
          sessions[sessionID] = queryResult.rows[0].id;
          res.status(200).cookie("sessionID", sessionID, { 
            httpOnly: true, 
            maxAge: 1000 * 60 * 60 * 24 * 7, 
            secure: true}).json({ userID: queryResult.rows[0].id });

        } else {
          // Password is wrong.
          res.status(401).json({errType : "VAGUE"}); 
        }
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({errType : "UNKNOWN"});
  }
})

app.post('/logOut', (req, res) => {
  const sessionID = req.cookies.sessionID;

  if (sessionID) {
    delete sessions[sessionID];
  }

  try {
    res.clearCookie("sessionID", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });

    res.status(200).send();
  } catch(err) {
    res.status(500).send();
    console.error(err);
  }

})

// Finished.
app.get('/signUp', (req, res) => {
  res.render('signUp.ejs', {currentYear: currentYear});
})

// Finished.
app.post('/signUp', async (req, res) => {

  // Check if username exists.
  const resultUser = await pool.query(`SELECT exists (SELECT 1 FROM users WHERE username = $1 LIMIT 1);`,
    [req.body.username]
  );

  const usernameExists = resultUser.rows[0].exists;

  // Check if invitation code exists.
  const resultInvi = await pool.query(`SELECT exists (SELECT 1 FROM invitations WHERE invitation_code = $1 LIMIT 1);`,
    [req.body.invitationCode]
  );

  const invitationCodeExists = resultInvi.rows[0].exists;

  if (!usernameExists && invitationCodeExists) {
    // Register the info into database with password ciphered.
    try {
      bcrypt.hash(req.body.password, saltRounds, async function(err, hash) {
        // Store hash in your password DB.
        await pool.query(`INSERT INTO users(username, password, invitation_code) VALUES ($1, $2, $3)`,
          [req.body.username, hash, req.body.invitationCode]
        );
        res.status(200).send();
      })
    } catch(err) {
      console.error(err);
      res.status(500).json({errType : "UNKNOWN"});
    }
  } else {
    // If it fails because of wrong invitation code, return the error msg
    if (!invitationCodeExists) {
      res.status(400).json({errType : "CODE"});
    }
    // If it fails because of existing username, return the error msg
    if (usernameExists) {
      res.status(400).json({errType : "USERNAME"});
    }
    // Otherwise, return unknown
    res.status(400).json({errType : "UNKNOWN"});
  }
})

// Finished
app.get('/user/:userid', async (req, res) => {
  const userID =  req.params.userid;

  // Authentication check
  if (!req.user || req.user != userID) {
    res.status(401).render('unauthentication.ejs', {currentYear: currentYear});
  } else {
    /* index.ejs params:
    1. totalBooks: Total number of read books
    2. pageNavLength: Number of places on the page nav bar
    3. sortType: Sort type, including: date, rating, title
    4. page: Current page
    5. locals.books: Result rows for current page queried from database
    6. currentYear: Current year number, like: 2025
  */

    const resultForUsername = await pool.query("SELECT username FROM users WHERE id = $1", [userID]);
    const username = resultForUsername.rows[0].username;

    let sort = req.query.sort; 
    let page = req.query.page; 

    // If it's the 1st time user gets this route, use default value for everything
    if (!sort) {
      sort = "datetime";
      page = "1";
    } else if (sort === "date") {
      // Solve the inconsistency between front and back end
      sort = "datetime";
    }

    const totalBookQuery = 
    `SELECT COUNT(*) FROM books_basic_info WHERE user_id = $1;`;

    let totalBooks = 0;
    let books;

    try {
      const result = await pool.query(totalBookQuery, [userID]);
      totalBooks = parseInt(result.rows[0].count, 10);
      if (totalBooks !== 0) {
      
        let homeViewQuery;
        if (sort !== "title") {
          homeViewQuery = 
          `SELECT books_basic_info.id, title, rating, notes, datetime, author, tags, book_id_type, book_id_num, book_cover_src
          FROM books_basic_info LEFT JOIN books_full_info 
          ON books_basic_info.id = books_full_info.id 
          WHERE user_id = $1
          ORDER BY ${sort} DESC
          LIMIT ${maxBookPerPage}
          OFFSET ${(page - 1) * maxBookPerPage}
          ;`;
        } else {
          homeViewQuery = 
          `SELECT books_basic_info.id, title, rating, notes, datetime, author, tags, book_id_type, book_id_num, book_cover_src
          FROM books_basic_info LEFT JOIN books_full_info 
          ON books_basic_info.id = books_full_info.id 
          WHERE user_id = $1
          ORDER BY ${sort}
          LIMIT ${maxBookPerPage}
          OFFSET ${(page - 1) * maxBookPerPage}
          ;`;
        }

        const result = await pool.query(homeViewQuery, [userID]);
        books = result.rows;

        // Get all the tags of all the books in the database
        const tagQuery = `
        SELECT tags FROM books_full_info 
        JOIN books_basic_info 
        ON books_full_info.id = books_basic_info.id
        WHERE user_id = $1;`;
        const result2 = await pool.query(tagQuery, [userID]);
        let allTagsStringRaw = "";
        result2.rows.forEach(row => {
          if (row.tags != null)
            allTagsStringRaw += row.tags;
        });

        const allTagsArray = allTagsStringRaw.split("#");
        const tagCount = new Map();
        allTagsArray.forEach((tag) => {
          tag = tag.trim();
          if (tag === "" || tag == null) {
            return;
          }

          if (tagCount.has(tag)) { 
            tagCount.set(tag, tagCount.get(tag) + 1); 
          } else { 
            tagCount.set(tag, 1); 
          }
        });

        var sortedTags = new Map(
          [...tagCount.entries()].sort((a, b) => b[1] - a[1])
        );
      }
    } catch(err) {
      console.error(err);
    }

    const data = {
      username: username,
      totalBooks : totalBooks,
      pageNavLength : pageNavLength,
      sortType : sort,
      page : page,
      books : books,
      tags: sortedTags,
      userID: userID,
      currentYear : currentYear
    };

    res.render('index.ejs', data);

  }
})

// Finished
app.get('/user/:userid/addBook', async (req, res) => {
  const userID = req.params.userid;

  if (!req.user || req.user != userID) {
    res.status(401).render('unauthentication.ejs', {currentYear: currentYear});
  } else {
    res.render('addBook.ejs', {userID: userID, bookReview : {}, bookId: null});
  }
})

// Change the query after adding the src part.
app.get('/user/:userid/addBook/:bookid', async (req, res) => {
  const userID = req.params.userid;

  if (!req.user || req.user != userID) {
    res.status(401).render('unauthentication.ejs', {currentYear: currentYear});
  } else {
    const bookId = req.params.bookid;
    try {
      const query = `SELECT books_basic_info.id, title, rating, notes, datetime, author, tags, book_id_type, book_id_num, book_cover_src
        FROM books_basic_info LEFT JOIN books_full_info 
        ON books_basic_info.id = books_full_info.id
        WHERE books_basic_info.id = $1 AND user_id = $2;`;

      const result = await pool.query(query, [bookId, userID]);
      const bookReview = result.rows[0];
      res.render('addBook.ejs', {userID: userID, bookReview : bookReview, bookId: bookId});
    } catch(err) {
      res.status(500).send("Unexpected error.");
    }
  }
})

// Finished
app.post('/user/:userid/submitBook', async (req, res) => {

  const userID = req.params.userid;

  if (!req.user || req.user != userID) {
    res.status(401).render('unauthentication.ejs', {currentYear: currentYear});
  } else {
    /* req.body:
    {
      title: 'TEST TITLE',
      author: '',
      idtype: 'oclc',
      id: '4109850912834',
      rating: '3',
      tag: '',
      notes: "I don't know what to say more."
      imgsrc
    }
    */
  // Start dealing with the req. Register the basic info first
    const newBook = req.body;

    // If for some reason, there's no title. Return an error
    if (newBook.title == "" || !newBook.title) {
      res.status(400).send("There must be a title.");
    }

    bookStandardizeInput(newBook);

    try {
      const client = await pool.connect();
      await client.query('BEGIN');

      const insertQuery = `INSERT INTO books_basic_info VALUES(DEFAULT, $1, $2, $3, Now(), $4) RETURNING id;`;

      // Insert basic info first and get the returning id to insert full info if any
      const result = await client.query(insertQuery, [newBook.title, newBook.rating, newBook.notes, userID]);
      const newId = result.rows[0].id;
      if (result.rowCount != 0) {
        // Register extra info (if any)
        const ifExtraInfo = ifExtraBookInfo(newBook);

        // Only when the basic info is recorded and there's any extra info to add, execute the following.
        if (newId && ifExtraInfo) {
          
          let imgSrc = newBook.imgsrc ? newBook.imgsrc : "";

          // Only when there's no user input imgSrc, do the api search
          if (newBook.idtype != '' && imgSrc === "") {
            imgSrc = await findCover(newBook);
          }

          const fullInfoInsertQuery = "INSERT INTO books_full_info VALUES($1, $2, $3, $4, $5, $6);"
          await client.query(fullInfoInsertQuery, [newId, newBook.author, newBook.tags, newBook.idtype, newBook.id, imgSrc]);
        }

        await client.query('COMMIT');
        res.redirect('/');

      } else {
        res.status(500).send("Unexpected error.");
        await client.query('ROLLBACK');
      }
    } catch(err) {
      console.error(err);
      res.status(500).send("Unexpected error.");
      await client.query('ROLLBACK');
    }
  }
})

app.post('/user/:userid/editBook/:id', async (req, res) => {
  const userID = req.params.userid;

  if (!req.user || req.user != userID) {
    res.status(401).render('unauthentication.ejs', {currentYear: currentYear});
  } else {

    const bookId = req.params.id;
    const editedBook = req.body;

    bookStandardizeInput(editedBook);

    try {
      const updateBasic = `UPDATE books_basic_info SET title = $1, rating = $2, notes = $3
      WHERE id = $4`;

      const ifExtraInfo = ifExtraBookInfo(editedBook);
      const checkBookId = `SELECT book_id_type, book_id_num FROM books_full_info WHERE id = $1`;
      
      const client = await pool.connect();
      //Begin transaction
      await client.query('BEGIN');
      const resultInsertBasic = await client.query(updateBasic, [editedBook.title, editedBook.rating, editedBook.notes, bookId]);
      if (resultInsertBasic.rowCount === 0) {
        // This usually should succeeds, if not, the user must have manipulated the primary key
        res.status(400).send("Bad request [InsertBasic].");
        await client.query('ROLLBACK');
      } else if (ifExtraInfo) {
        // If there's any extra information, check if there's already the row on full_info table
        const resultCheckBookId = await client.query(checkBookId, [bookId]);
        if (resultCheckBookId.rowCount === 0) {
          // No row. Then should insert instead of update
          let imgSrc = editedBook.imgsrc ? editedBook.imgsrc : "";
          if (imgSrc === "") {
            imgSrc = await findCover(editedBook);
          }

          const insertFullInfo = "INSERT INTO books_full_info VALUES($1, $2, $3, $4, $5, $6);"
          await client.query(insertFullInfo, [bookId, editedBook.author, editedBook.tags, editedBook.idtype, editedBook.id, imgSrc]);
          await client.query('COMMIT');
          res.redirect('/');
        } else {
          // There's row. Then should update
          const sameIdType = resultCheckBookId.rows[0].book_id_type == editedBook.idtype ? true : false;
          const sameId = resultCheckBookId.rows[0].book_id_num == editedBook.id ? true : false;

          let imgSrc = editedBook.imgsrc ? editedBook.imgsrc : "";

          if ((!sameId || !sameIdType) && imgSrc === "") {
            // If book id info is different from what's in the db && the user doesn't input their own imgsrc
            // then try finding the cover again and update.
            imgSrc = await findCover(editedBook);
            const updateFull = `UPDATE books_full_info SET author = $1, tags = $2, 
            book_id_type = $3, book_id_num = $4, book_cover_src = $5
            WHERE id = $6`;
            const resultUpdateFull = await client.query(updateFull, [editedBook.author, editedBook.tags, editedBook.idtype, editedBook.id, imgSrc, bookId]);

            if (resultUpdateFull.rowCount === 0) {
              res.status(400).send("Bad request.");
              await client.query('ROLLBACK');
            } else {
              await client.query('COMMIT');
              res.redirect('/');
            }
          } else {
            let imgSrc = editedBook.imgsrc ? editedBook.imgsrc : "";

            if (imgSrc === "") {
              imgSrc = await findCover(editedBook);
            }

            const updateFull = `UPDATE books_full_info SET author = $1, tags = $2, book_id_type = $3, book_id_num = $4, book_cover_src = $5
            WHERE id = $6`;
            const resultUpdateFull = await client.query(updateFull, [editedBook.author, editedBook.tags, editedBook.idtype, editedBook.id, imgSrc, bookId]);

            if (resultUpdateFull.rowCount === 0) {
              res.status(400).send("Bad request [UpdateFull without pic].");
              await client.query('ROLLBACK');
            } else {
              await client.query('COMMIT');
              res.redirect('/');
            }
          }
        }      
      }
    } catch(err) {
      res.status(500).send("Unexpected error. You may have used an existing book id.")
      console.error(err);
      await client.query('ROLLBACK');
    }
  }
})

app.delete('/user/:userid/book/:bookID', async (req, res) => {
  const userID = req.params.userid;

  if (!req.user || req.user != userID) {
    res.status(401).render('unauthentication.ejs', {currentYear: currentYear});
  } else {
    const bookID = req.params.bookID;

    const client = await pool.connect();

    client.query("BEGIN");

    await client.query(`DELETE FROM books_full_info 
      WHERE id = $1`, [bookID]);

    const resultForBasicInfo = await client.query(`DELETE FROM books_basic_info 
      WHERE id = $1`, [bookID]);

    if (resultForBasicInfo.rowCount === 1) {
      client.query("COMMIT");
      res.status(200).send();
    } else {
      client.query("ROLLBACK");
      res.status(500).send();
    }
  }
})


function bookStandardizeInput(newBook) {
  newBook.rating = newBook.rating ? newBook.rating : 0;
  newBook.author = newBook.author ? newBook.author.trim() : null;
  newBook.idtype = newBook.idtype ? newBook.idtype.trim() : null;
  newBook.id = newBook.id ? newBook.id.trim() : null;
  newBook.tags = newBook.tags ? newBook.tags.trim() : null;
  newBook.imgsrc = newBook.imgsrc ? newBook.imgsrc.trim() : null;
}

async function findCover(book) {
  const urlShared = "https://covers.openlibrary.org/b";
  const apiUrl = urlShared + `/${book.idtype}/${book.id}-L.jpg?default=false`;
  try {
    await axios.get(apiUrl);
    return apiUrl;
  } catch (err) {
    return "";
  }
}

function ifExtraBookInfo(book) {
  if (book.author !== '' && book.author != null) {return true;}
  if (book.idtype !== '' && book.idtype != null) {return true;}
  if (book.tags !== '' && book.tags != null) {return true;}
  if (book.imgsrc !== '' && book.imgsrc != null) {return true;}

  return false;
}

function generateToken() {
  return crypto.randomBytes(16).toString("hex");
}