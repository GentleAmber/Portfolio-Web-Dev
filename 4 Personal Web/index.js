import express from "express";

const app = express();
const port = 3000;

app.use(express.static("public"));

app.listen(port, () => {
  console.log('Listens on port ' + port + '...');
})

app.get('/', (req, res) => {
  res.render('index.html');
})