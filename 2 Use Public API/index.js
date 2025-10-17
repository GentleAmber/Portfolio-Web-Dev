import express from "express";
import bodyParser from "body-parser";
import axios from "axios";

const app = express();
const port = 3000;
const API_URL = "https://collectionapi.metmuseum.org";
const objectsWithImages = [
  56616, 47867, 47724, 42365, 170490, 89513, 193964, 193963, 193739, 467344,
  467182, 467256, 467217, 53611, 187269, 187267, 47663, 501349, 448638, 780144,
  40531, 218720, 187270, 45989, 200548, 99630, 242850, 317762, 478182, 478183,
  86182, 336285, 138841, 191696, 133358, 123771, 133357, 215328, 698675, 119568,
  119569, 119571, 119573, 119574, 206878, 453224, 320390, 98049, 309911, 243821,
  774678, 122638, 106537, 117671, 122637, 115838, 475032, 501032, 114121,
  448381, 443082, 443051, 444615, 444616, 444461, 444485, 505365, 37772, 38967,
  57967, 501426, 88885, 500964, 141760, 501403, 256160, 82697, 38112, 156175,
  326711, 326716, 325860, 323528, 40467, 650061, 701395, 30994, 31539, 493749,
  490188, 675891, 203144, 169252, 174194, 852919, 591132, 493220, 482438,
  641143, 435914, 756139, 756129, 756195, 756190, 756213, 756215, 756235,
  756249, 756239, 756233, 756222, 756212, 756248, 756236, 755953, 755998,
  755995, 756005, 756004, 755961, 756008, 756018, 756047, 756293, 756271,
  728516, 728523, 736983, 737014, 737020, 737017, 737069, 737047, 737079,
  737076, 737045, 737073, 737068, 737075, 733493, 733525, 733552, 733555,
  733595, 737098, 737100, 737120, 737103, 737118, 737101, 737119, 737141,
  737140, 737138, 737150, 776305, 776301, 776310, 774153, 774110, 774137,
  774172, 209335, 741402, 741434, 741407, 741412, 741430, 741436, 741418,
  741424, 741446, 741445, 741469, 741493, 741464, 741470, 741452, 741488,
  741477, 741459, 741448, 741449, 741478, 741454, 741472, 741465, 741473,
  741461, 741487, 741475, 741482, 741492, 741486, 741479, 741485, 741476,
  741450, 741494, 741484, 741458, 741463, 741480, 741481, 741471, 741466,
  741489, 741447, 741460, 741474, 741491, 741490, 741468, 741467, 741653,
  741666, 741665, 741664, 741654, 741660, 741667, 741678, 741679, 741686,
  741650, 741674, 741717, 741865, 741866, 741892, 741881, 741870, 741895,
  741869, 741868, 741883, 741887, 741871, 741880, 741897, 741922, 741902,
  741903, 741898, 741899, 741906, 741907, 741896, 741933, 741908, 741900,
  741940, 741901, 741904, 741931, 741905, 741936, 741795, 741783, 741754,
  741792, 741791, 741794, 741799, 741812, 741815, 741798, 741805, 741808,
  741803, 741800, 741243, 741231, 741207, 741219, 741213, 741226, 741195,
  741238, 741201, 741232, 741203, 741233, 741227, 741198, 741199, 741228,
  741216, 741240, 741211, 741223, 741206, 741235, 741212, 741218, 741230,
  741196, 741225, 741242, 741202, 741237, 741208, 741220, 741214, 741197,
  741244, 741209, 741215, 741221, 741239, 741210, 741204, 741205, 741222, 7180,
  811664, 811660, 811726, 811719, 811700, 811885, 811944, 811983, 812213,
  812252, 812376, 812407, 365862, 349199, 195764, 835439, 834126, 289280,
  335921, 344516, 341417, 335181, 811435, 725813, 812406, 344463, 340469,
  207715, 340814, 363757, 335558, 367201, 639688, 289292, 363344, 199806,
  505495, 204972, 267939, 267938, 267937, 631887, 392154, 392151, 267936,
  287959, 459292, 10074, 10369, 367189, 363391, 197707, 385024, 371563, 12749,
  263189, 198946, 416856, 532, 336983, 337338, 343212, 383307, 369736, 425016,
  339110, 338019, 338036, 346370, 337200, 254318, 247296, 240948, 391841,
  391825, 440349, 338035, 388961, 388958, 341781, 338432, 229754, 340601,
  435731, 349842, 335177, 352478, 459986, 468315, 399866, 347406, 338037,
  254411, 41451, 488016, 255714, 347945, 254312, 254227, 24950, 360631, 335123,
  249056, 435947, 435684, 436450, 264924, 264912, 264927, 264917, 264923,
  264914, 264925, 264926, 264911, 264910, 264928, 264921, 264908, 264903,
  264913, 264907, 264922, 264906, 264904, 264916, 264936, 264941, 264937,
  264935, 264947, 264929, 264948, 264944, 264933, 264945, 264930, 264943,
  264946, 264915, 264918, 264905, 264934, 264932, 264938, 264940, 264939,
  195754, 188212, 816245, 416869, 13866, 200423, 200398, 200381, 812618, 812394,
  811334, 349222, 264919, 371686, 289374, 289373, 289369, 394251, 286305,
  786067, 393721, 642840, 642879, 642841, 642877, 642835, 641664, 641669,
  642837, 642838, 641666, 641671, 642871, 642839, 641670, 642908, 642880,
  642886, 642913, 642918, 642900, 642921, 642902, 642922, 642910, 642917,
  642881, 642884, 642888, 642897, 642926, 642885, 642901, 395958, 363792,
  338908, 641646, 268288, 197215, 334913, 396854, 654351, 371415, 193457,
  375895, 642899, 642932, 638838, 399364, 371462, 431433, 812589, 12637, 679175,
  775493, 775489, 192913, 157611, 340776, 289375, 626349, 336447, 459223,
  388111, 671030, 642935, 251490, 339653, 268360, 248102, 251381, 391829,
  359247, 388960, 168569, 195996, 392212, 26441, 361711, 361617, 361621, 360764,
  338961, 255248, 334883, 341181, 360765, 338211, 340993, 335122, 660840,
  337096, 366522, 45752, 339703, 12661,
];

const departments = [
  {
    departmentId: 1,
    displayName: "American Decorative Arts",
  },
  {
    departmentId: 3,
    displayName: "Ancient Near Eastern Art",
  },
  {
    departmentId: 4,
    displayName: "Arms and Armor",
  },
  {
    departmentId: 5,
    displayName: "Arts of Africa, Oceania, and the Americas",
  },
  {
    departmentId: 6,
    displayName: "Asian Art",
  },
  {
    departmentId: 7,
    displayName: "The Cloisters",
  },
  {
    departmentId: 8,
    displayName: "The Costume Institute",
  },
  {
    departmentId: 9,
    displayName: "Drawings and Prints",
  },
  {
    departmentId: 10,
    displayName: "Egyptian Art",
  },
  {
    departmentId: 11,
    displayName: "European Paintings",
  },
  {
    departmentId: 12,
    displayName: "European Sculpture and Decorative Arts",
  },
  {
    departmentId: 13,
    displayName: "Greek and Roman Art",
  },
  {
    departmentId: 14,
    displayName: "Islamic Art",
  },
  {
    departmentId: 15,
    displayName: "The Robert Lehman Collection",
  },
  {
    departmentId: 16,
    displayName: "The Libraries",
  },
  {
    departmentId: 17,
    displayName: "Medieval Art",
  },
  {
    departmentId: 18,
    displayName: "Musical Instruments",
  },
  {
    departmentId: 19,
    displayName: "Photographs",
  },
  {
    departmentId: 21,
    displayName: "Modern Art",
  },
];

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", async (req, res) => {

  try {
    const randomIndex = Math.floor(Math.random() * objectsWithImages.length);
    const randomId = objectsWithImages[randomIndex];

    const response = await axios.get(
      API_URL + "/public/collection/v1/objects/" + randomId
    );
    const object = response.data;
    /* Get random object until it has image. This is abandoned for now due to performance issues.
        do {
        var randomIndex = Math.floor(Math.random() * dataOfAll.total);
        var objectId = dataOfAll.objectIDs[randomIndex];
        const responseOfObject = await axios.get(API_URL + "/public/collection/v1/objects/" + objectId);
        var object = responseOfObject.data;
        } while (object.primaryImage === "");
        */

    res.render("index.ejs", { object: object });
  } catch (error) {
    console.error(error);
  }
});

app.post("/search", (req, res) => {
  /*
  req.body : {
    artist: '',
    objectMatter: '',
    department: '',
  }
  */
  
  res.redirect(`/result?artist=${encodeURIComponent(req.body.artist)}&objectMatter=${encodeURIComponent(req.body.objectMatter)}&department=${encodeURIComponent(req.body.department)}&page=1`);

});

app.get("/search", (req, res) => {
  const data = { departments: departments };
  res.render("search.ejs", data); // Render a search form
});

app.get("/result", async (req, res) => {
  const artist = req.query.artist;
  const objectMatter = req.query.objectMatter;
  const department = req.query.department;
  const body = {
    "artist" : artist,
    "objectMatter" : objectMatter,
    "department" : department
  };

  const page = parseInt(req.query.page) || 1;
  const perPage = 8;
  const maxResults = 80; // Should be greater than const perPage

  if (maxResults < perPage) {
    throw new Error("const maxResults should be greater than const perPage!");
  }

  // Only search for artworks that have image
  var searchEndPoint = "/public/collection/v1/search?hasImages=true";
  searchEndPoint += generateFilters(body);

  const apiUrl = API_URL + searchEndPoint;

  const objectEndpoint = API_URL + "/public/collection/v1/objects/";
  var objectIDs;
  var minResults;
  var total;

  try {
    const { data } = await axios.get(apiUrl);

    objectIDs = data.objectIDs;
    minResults = data.total;
    total = data.total;

    if (data.total > maxResults) {
      objectIDs = objectIDs.slice(0, maxResults);
      minResults = maxResults;
    }

  } catch (error) {
    res.status(404).send("No data");
  }

  // Ready to fetch objects one by one from public API
  var objectUrl;
  var images = [];
  var i = perPage * (page - 1);
  // Temp variable to store individual object
  var image;

  while (i < perPage * page) {

    try {
      objectUrl = objectEndpoint + objectIDs[i];
      
      setTimeout(() => {
        // In order not to trigger security block, query every 4 sec
      }, 4000);
      const { data } = await axios.get(objectUrl);
      
      // When the object exists, pull its info into image and then push this image 
      // object into images[].
      image = new Image(data.primaryImage, data.title, data.artistDisplayName);
      
    } catch (error) {
      // Use default value for this object.
      image = new Image();
    } finally {
      images.push(image);
      i++;
    }
  }


  const totalPages = Math.ceil(minResults / perPage);

  const dataForRender = {
    departments: departments, 
    total: total,
    max: maxResults,
    images: images,
    page: page,
    query: req.query,
    totalPages: totalPages,

  };
  res.render("result.ejs", dataForRender);
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

// The following code is created to tackle with the wierd search engine the api has.
// The principal is to have only two filters while searching
function generateFilters (body) {
  
  var keywords = "";
  var ifInput = false;

  // Artist is most important. Will be added to the keywords as long as input exists.
  if (body.artist != "") {
    keywords += ("&q=" + body.artist);
    ifInput = true;
  }

  // Then comes object matter
  if (body.objectMatter != "") {
    if (!ifInput) {
      keywords += ("&q=" + body.objectMatter);
      ifInput = true;
    }
  }

  // Then comes department
  if (body.department != "") {
    if (!ifInput) {
      keywords += ("&departmentId=" + body.department);
      ifInput = true;
    }
  }

  // If there's completely no input, will search with "a" to broaden the range
  if (ifInput === false) {
    keywords += "&q=a";
  }

  return keywords;
}

class Image {
  constructor(primaryImage, title, artistDisplayName) {
    this.primaryImage = primaryImage || "/images/defaultImage.jpg";
    this.title = title || "No data";
    this.artistDisplayName = artistDisplayName || "No data";
  }
}

