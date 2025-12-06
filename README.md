# Introduction Of The Projects
This repository includes my personal projects as a portfolio for web development. The following paragraphs will explain **what they are** and **how to run** them respectively.
## 1 Blog Application
It is the first website I have made. Users can post new blogs, and edit or delete existing blogs. Note the data is stored in the server, so when the server restarts, user will lose data. Also the preview panel only displays the latest 4 blogs (though all blogs are stored).
<br>
To run the project, direct to `.../1 Blog Application`, run `npm i` in the terminal. After all packages are installed, run `node index.js`, and enter `localhost:3000` in your browser, now you can test the website.

## 2 Use Public API
This website has a home page where a random piece of art is displayed, and a search page where users can search for artworks under certain criteria.
<br>
This website uses this public API: [The Metropolitan Museum of Art Collection API](https://metmuseum.github.io/)
<br>
To run the project, direct to `.../2 Use Public API`, still run `npm i` in the terminal. After all packages are installed, run `node index.js`, and enter `localhost:3000` in your browser.

## 3 Book Notes with PostgreSQL ([Demo Video](https://youtu.be/LFDgva3Vxpw))
This website uses PostgreSQL to save user data, [Open Library Covers API](https://openlibrary.org/dev/docs/api/covers) to fetch covers for the books whose serial numbers are provided. Different users have different accounts and can only sign up with the right invitation code. Users can write notes, give ratings, add online pics as covers for books or actually anything else.
<br>
Compared with setting up the PostgreSQL database and running this project yourself, watching the demo video is recommended.

## 4 Personal Website
I plan to deploy it on GitHub Pages. The link will be updated here once that is done.
