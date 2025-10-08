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


// Table creation
// `CREATE TABLE IF NOT EXISTS books_basic_info(
// id SERIAL PRIMARY KEY,
// title TEXT NOT NULL,
// rating SMALLSERIAL NOT NULL,
// notes TEXT NOT NULL,
// datetime timestamptz NOT NULL,
// user_id INTEGER references users(id)) NOT NULL;`;

// `CREATE TABLE IF NOT EXISTS books_full_info(
// id SERIAL PRIMARY KEY references books_basic_info(id),
// author TEXT,
// tags TEXT,
// book_id_type CHAR(4),
// book_id_num TEXT,
// book_cover_src TEXT,
// UNIQUE(book_id_type, book_id_num));`;

// `CREATE TABLE users(
// id SERIAL PRIMARY KEY,
// username VARCHAR(15) UNIQUE NOT NULL,
// password TEXT NOT NULL
// );`

// CREATE TABLE invitations(
// 	id SERIAL PRIMARY KEY,
// 	invitation_code VARCHAR(10) UNIQUE NOT NULL 
// );

const app = express();
const port = 3000;
const maxBookPerPage = 10;
const pageNavLength = 12; // e.g.: <pre 1 2 3 4 5 6 7 ... 12 13 14 15 next>
const currentYear = new Date().getFullYear();
const saltRounds = 10;

const sessions = {}; // To remember verified users on their browsers
const rememberedToken = {};

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());
app.use((req, res, next) => {
  // To check if the user has logged in / has been given a session
  const { sessionID } = req.cookies || "";
  if (sessionID && sessions[sessionID]) {
    req.user = sessions[sessionID];
    console.log(`UserID ${sessions[sessionID]} | sessionID: ${sessionID}`);
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
  console.log(req.body);
  // Authentication of the user. If successful, 
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
          res.status(200).cookie("sessionID", sessionID, { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 7 }).json({ userID: queryResult.rows[0].id });

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
        await pool.query(`INSERT INTO users VALUES (default, $1, $2)`,
          [req.body.username, hash]
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

app.get('/user/:userid', async (req, res) => {
  /*
  Must do authentication check
  All the queries need changing
  */
 console.log(`req.user: ${req.user}, userid: ${req.params.userid}`);
  if (!req.user || req.user != req.params.userid) {
    res.status(401).render('unauthentication.ejs', {currentYear: currentYear});
  } else {
    res.send(`Hello ${req.user}, welcome back!`);
  }

  /* index.ejs params:
    1. totalBooks: Total number of read books
    2. pageNavLength: Number of places on the page nav bar
    3. sortType: Sort type, including: date, rating, title
    4. page: Current page
    5. locals.books: Result rows for current page queried from database
    6. currentYear: Current year number, like: 2025
  */
//   let sort = req.query.sort; 
//   let page = req.query.page; 

//   // If it's the 1st time user gets this route, use default value for everything
//   if (!sort) {
//     sort = "datetime";
//     page = "1";
//   } else if (sort === "date") {
//     // Solve the inconsistency between front and back end
//     sort = "datetime";
//   }

//   const totalBookQuery = 
//   `SELECT COUNT(*) FROM books_basic_info;`;

//   let totalBooks = 0;
//   let books;

//   try {
//     const result = await pool.query(totalBookQuery);
//     totalBooks = parseInt(result.rows[0].count, 10);
//     if (totalBooks === 0) {
//       console.log("There's no book at all.")
//     } else {
//       const homeViewQuery = 
//       `SELECT books_basic_info.id, title, rating, notes, datetime, author, tags, book_id_type, book_id_num, book_cover_src
//       FROM books_basic_info LEFT JOIN books_full_info 
//       ON books_basic_info.id = books_full_info.id 
//       ORDER BY ${sort} DESC
//       LIMIT ${maxBookPerPage}
//       OFFSET ${(page - 1) * maxBookPerPage}
//       ;`;

//       const result = await pool.query(homeViewQuery);
//       books = result.rows;

//       // Get all the tags of all the books in the database
//       const tagQuery = `SELECT tags FROM books_full_info;`;
//       const result2 = await pool.query(tagQuery);
//       let allTagsStringRaw = "";
//       result2.rows.forEach(row => {
//         if (row.tags != null)
//           allTagsStringRaw += row.tags;
//       });

//       const allTagsArray = allTagsStringRaw.split("#");
//       const tagCount = new Map();
//       allTagsArray.forEach((tag) => {
//         tag = tag.trim();
//         if (tag === "" || tag == null) {
//           return;
//         }

//         if (tagCount.has(tag)) { 
//           tagCount.set(tag, tagCount.get(tag) + 1); 
//         } else { 
//           tagCount.set(tag, 1); 
//         }
//       });

//       var sortedTags = new Map(
//         [...tagCount.entries()].sort((a, b) => b[1] - a[1])
//       );
//     }
//   } catch(err) {
//     console.error(err);
//   }

//   const data = {
//     totalBooks : totalBooks,
//     pageNavLength : pageNavLength,
//     sortType : sort,
//     page : page,
//     books : books,
//     tags: sortedTags,
//     currentYear : currentYear
//   };

//   res.render('preLogin.ejs', {currentYear: currentYear});
// })

// app.get('/user/:userid/addBook', async (req, res) => {
//   // Must do authentication check. If fails send 401
//   res.render('addBook.ejs', {bookReview : {}, bookId: null});
// })

// app.get('/user/:userid/addBook/:bookid', async (req, res) => {
//   // Must do authentication check. If fails send 401
//   const bookId = req.params.bookid;
//   try {
//     const query = `SELECT books_basic_info.id, title, rating, notes, datetime, author, tags, book_id_type, book_id_num, book_cover_src
//       FROM books_basic_info LEFT JOIN books_full_info 
//       ON books_basic_info.id = books_full_info.id
//       WHERE books_basic_info.id = $1;`;
//     const result = await db.query(query, [bookId]);
//     const bookReview = result.rows[0];
//     res.render('addBook.ejs', {bookReview : bookReview, bookId: bookId});
//   } catch(err) {
//     res.status(500).send("Unexpected error.");
//   }  
})

app.post('/user/:userid/submitBook', async (req, res) => {
  // Must do authentication check. If fails send 401

  /* req.body:
  {
    title: 'TEST TITLE',
    author: '',
    idtype: 'oclc',
    id: '4109850912834',
    rating: '3',
    tag: '',
    notes: "I don't know what to say more."
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
    const insertQuery = `INSERT INTO books_basic_info VALUES(DEFAULT, $1, $2, $3, Now()) RETURNING id;`;
    await db.query('BEGIN');
    const result = await db.query(insertQuery, [newBook.title, newBook.rating, newBook.notes]);
    const newId = result.rows[0].id;
    if (result.rowCount != 0) {
      console.log(`A record is inserted into [books_basic_info]. Its id is: ${newId}`);

      // Register extra info (if any)
      const ifExtraInfo = ifExtraBookInfo(newBook);

      if (newId && ifExtraInfo) {
        // Only when the basic info is recorded and there's any extra info to add, execute the following.
        let imgSrc ="";
        if (newBook.idtype != '') {
          imgSrc = await findCover(newBook);
        }

        const fullInfoInsertQuery = "INSERT INTO books_full_info VALUES($1, $2, $3, $4, $5, $6);"
        await db.query(fullInfoInsertQuery, [newId, newBook.author, newBook.tags, newBook.idtype, newBook.id, imgSrc]);
        console.log(`A record is inserted into [books_full_info]. Its id is: ${newId}`);
      }
      await db.query('COMMIT');
    } else {
      res.status(500).send("Unexpected error.");
      await db.query('ROLLBACK');
      console.log("What has been added into database is now withdrawn.");
    }
  } catch(err) {
    if (err.response) {
      console.log("Error status:", err.response.status);
      console.log("Error data:", err.response.data);
    } else {
      console.log("Network or other error:", err.message);
    }
    res.status(500).send("Unexpected error.");
    await db.query('ROLLBACK');
    console.log("What has been added into database is now withdrawn.");
  }

  // In the end, redirect back to homepage
  res.redirect('/');
})

app.post('/user/:userid/editBook/:id', async (req, res) => {
  // Must do authentication check. If fails send 401
  const bookId = req.params.id;
  const editedBook = req.body;

  bookStandardizeInput(editedBook);

  try {
    const updateBasic = `UPDATE books_basic_info SET title = $1, rating = $2, notes = $3
    WHERE id = $4`;

    const ifExtraInfo = ifExtraBookInfo(editedBook);
    const checkBookId = `SELECT book_id_type, book_id_num FROM books_full_info WHERE id = $1`;
    

    //Begin transaction
    await db.query('BEGIN');
    const resultInsertBasic = await db.query(updateBasic, [editedBook.title, editedBook.rating, editedBook.notes, bookId]);
    if (resultInsertBasic.rowCount === 0) {
      // This usually should succeeds, if not, the user must have manipulated the primary key
      res.status(400).send("Bad request [InsertBasic].");
      await db.query('ROLLBACK');
    } else if (ifExtraInfo) {
      // If there's any extra information, check if there's already the row on full_info table
      const resultCheckBookId = await db.query(checkBookId, [bookId]);
      if (resultCheckBookId.rowCount === 0) {
        // No row. Then should insert instead of update
        let imgSrc = await findCover(editedBook);
        const insertFullInfo = "INSERT INTO books_full_info VALUES($1, $2, $3, $4, $5, $6);"
        await db.query(insertFullInfo, [bookId, editedBook.author, editedBook.tags, editedBook.idtype, editedBook.id, imgSrc]);
        await db.query('COMMIT');
        res.redirect('/');
      } else {
        // There's row. Then should update
        const sameIdType = resultCheckBookId.rows[0].book_id_type == editedBook.idtype ? true : false;
        const sameId = resultCheckBookId.rows[0].book_id_num == editedBook.id ? true : false;

        if (!sameId || !sameIdType) {
          // If any of them is different from what's in the db, then try finding the cover again and update.
          let imgSrcUpdated = "";
          imgSrcUpdated = await findCover(editedBook);
          const updateFull = `UPDATE books_full_info SET author = $1, tags = $2, 
          book_id_type = $3, book_id_num = $4, book_cover_src = $5
          WHERE id = $6`;
          const resultUpdateFull = await db.query(updateFull, [editedBook.author, editedBook.tags, editedBook.idtype, editedBook.id, imgSrcUpdated, bookId]);

          if (resultUpdateFull.rowCount === 0) {
            res.status(400).send("Bad request [UpdateFull with pic].");
            await db.query('ROLLBACK');
          } else {
            await db.query('COMMIT');
            res.redirect('/');
          }
        } else {
          const updateFull = `UPDATE books_full_info SET author = $1, tags = $2, book_id_type = $3, book_id_num = $4
          WHERE id = $5`;
          const resultUpdateFull = await db.query(updateFull, [editedBook.author, editedBook.tags, editedBook.idtype, editedBook.id, bookId]);

          if (resultUpdateFull.rowCount === 0) {
            res.status(400).send("Bad request [UpdateFull without pic].");
            await db.query('ROLLBACK');
          } else {
            await db.query('COMMIT');
            res.redirect('/');
          }
        }
      }      
    }
  } catch(err) {
    res.status(500).send("Unexpected error. You may have used an existing book id.")
    console.error(err);
    await db.query('ROLLBACK');
  }
  
})


function bookStandardizeInput(newBook) {
  newBook.rating = newBook.rating ? newBook.rating : 0;
  newBook.author = newBook.author ? newBook.author.trim() : null;
  newBook.idtype = newBook.idtype ? newBook.idtype.trim() : null;
  newBook.id = newBook.id ? newBook.id.trim() : null;
  newBook.tags = newBook.tags ? newBook.tags.trim() : null;
}

async function findCover(book) {
  const urlShared = "https://covers.openlibrary.org/b";
  const apiUrl = urlShared + `/${book.idtype}/${book.id}-L.jpg?default=false`;
  try {
    await axios.get(apiUrl);
    return apiUrl;
  } catch (err) {
    console.log("No cover for the book. Use default cover instead.")
    return "";
  }
}

function ifExtraBookInfo(book) {
  if (book.author !== '' && book.author != null) {return true;}
  if (book.idtype !== '' && book.idtype != null) {return true;}
  if (book.tags !== '' && book.tags != null) {return true;}

  return false;
}

function generateToken() {
  return crypto.randomBytes(16).toString("hex");
}