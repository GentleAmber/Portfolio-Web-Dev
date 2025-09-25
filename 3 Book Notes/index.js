import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import pg from "pg";

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "book_notes",
  password: "wkx",
  port: 5432,
});
await db.connect();
await databaseInit();

async function databaseInit() {
  const createTable1 = 
  "CREATE TABLE IF NOT EXISTS books_basic_info(" +
  "id SERIAL PRIMARY KEY," + 
  "title TEXT NOT NULL," +
  "rating SMALLSERIAL NOT NULL," + 
  "notes TEXT NOT NULL," +
  "datetime timestamptz NOT NULL);";

  const createTable2 = 
  "CREATE TABLE IF NOT EXISTS books_full_info(" +
  "id SERIAL PRIMARY KEY references books_basic_info(id)," + 
  "author TEXT," + 
  "tags TEXT," + 
  "book_id_type CHAR(4)," + 
  "book_id_num TEXT," +
  "book_cover_src TEXT," +
  "UNIQUE(book_id_type, book_id_num));";
  try {
    await db.query(createTable1);
    console.log("Table [books_basic_info] is ready.");
    await db.query(createTable2);
    console.log("Table [books_full_info] is ready.");
  } catch(err) {
    console.error(err);
  }
  
}

const app = express();
const port = 3000;
const maxBookPerPage = 10;
const pageNavLength = 12; // e.g.: <pre 1 2 3 4 5 6 7 ... 12 13 14 15 next>
const API_URL = "https://collectionapi.metmuseum.org";

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.locals.maxBookPerPage = maxBookPerPage;

app.listen(port, () => {
  console.log(`Listens on port ${port}...`);
})

app.get('/', async (req, res) => {
  /* index.ejs params:
    1. totalBooks: Total number of read books
    2. pageNavLength: Number of places on the page nav bar
    3. sortType: Sort type, including: date, rating, title
    4. page: Current page
    5. locals.books: Result rows for current page queried from database
    6. currentYear: Current year number, like: 2025
  */
  let sort = req.query.sort; // Check the sort type of books
  let page = req.query.page; // Check the starting index of books on this page

  // If it's the 1st time user gets this route, use default value for everything
  if (!sort) {
    sort = "datetime";
    page = "1";
  } else if (sort === "date") {
    // Solve the inconsistency between front and back end
    sort = "datetime";
  }

  console.log(`Sort type: ${sort}. Page: ${page}.`);

  /*
    Start queries to database. Syntax:
    SELECT select_list
      FROM table_expression
      [ ORDER BY ... ]
      [ LIMIT { count | ALL } ]
      [ OFFSET start ]
  */

  const totalBookQuery = 
  `SELECT COUNT(*) FROM books_basic_info;`;

  let totalBooks = 0;
  let books;

  try {
    const result = await db.query(totalBookQuery);
    totalBooks = parseInt(result.rows[0].count, 10);
    if (totalBooks === 0) {
      // Show empty status
      console.log("There's no book at all.")
    } else {
      // Get all the books for this page
      const homeViewQuery = 
      `SELECT books_basic_info.id, title, rating, notes, datetime, author, tags, book_id_type, book_id_num, book_cover_src
      FROM books_basic_info LEFT JOIN books_full_info 
      ON books_basic_info.id = books_full_info.id 
      ORDER BY ${sort} DESC
      LIMIT ${maxBookPerPage}
      OFFSET ${(page - 1) * maxBookPerPage}
      ;`;

      const result = await db.query(homeViewQuery);
      books = result.rows;

      // Get all the tags of all the books in the database
      const tagQuery = `SELECT tags FROM books_full_info;`;
      const result2 = await db.query(tagQuery);
      let allTagsStringRaw = "";
      result2.rows.forEach(row => {
        allTagsStringRaw += row.tags;
      });

      const allTagsArray = allTagsStringRaw.split("#");
      const tagCount = new Map();
      allTagsArray.forEach((tag) => {
        tag = tag.trim();
        if (tag === "") {
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
    totalBooks : totalBooks,
    pageNavLength : pageNavLength,
    sortType : sort,
    page : page,
    books : books,
    tags: sortedTags,
    currentYear : new Date().getFullYear()
  };

  res.render('index.ejs', data);
})

app.get('/addBook', (req, res) => {
  res.render('addBook.ejs');
})

app.post('/submitBook', async (req, res) => {
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
 // Start dealing with the req
 const urlShared = "https://covers.openlibrary.org/b";
 if (req.body.idtype !== '') {

  const url = urlShared + `/${req.body.idtype}/${req.body.id}-L.jpg?default=false`;
 }
})


