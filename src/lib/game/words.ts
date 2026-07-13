import type { WordDifficulty } from "./types";

// ============================================================================
// Doodle Dash — Curated word lists
// Family-friendly, commonly-known, drawable words.
// Easy:   simple everyday nouns (3-6 letters, universally known)
// Medium: specific but common (longer / 2-word, still widely known)
// Hard:   challenging but drawable & recognizable (NOT obscure)
// Mixed (recommended default): easy + medium blend for balanced fun.
// ============================================================================

export const WORD_LISTS: Record<Exclude<WordDifficulty, "mixed">, string[]> = {
  easy: [
    // --- animals (60) ---
    "cat","dog","fish","bird","cow","pig","duck","frog","bee","ant","rabbit","mouse","horse","sheep","goat","lion","tiger","bear","monkey","zebra",
    "panda","koala","fox","wolf","owl","eagle","shark","whale","crab","snake","turtle","spider","camel","donkey","puppy","kitten","chick","rooster","turkey","goose",
    "parrot","pigeon","crow","seagull","pelican","dolphin","octopus","starfish","lobster","snail","butterfly","ladybug","bat","rat","squirrel","raccoon","beaver","otter","deer","moose",
    // --- food (60) ---
    "apple","banana","grapes","lemon","peach","melon","berry","cake","candy","bread","egg","milk","cheese","pizza","burger","rice","soup","donut","cookie","pie",
    "carrot","corn","onion","salad","sushi","taco","waffle","pancake","noodle","popcorn","pretzel","jelly","butter","honey","yogurt","muffin","cupcake","chocolate","vanilla","brownie",
    "bacon","ham","steak","chicken","nuggets","fries","chips","cracker","biscuit","pudding","fudge","caramel","waffle","bagel","muffin","scone","toast","sandwich","wrap","burrito",
    // --- nature (50) ---
    "sun","moon","star","cloud","rain","snow","wind","tree","leaf","flower","grass","rock","river","lake","hill","fire","ice","sand","seed","bush",
    "rose","tulip","cactus","palm","wave","pond","mountain","forest","rainbow","thunder","lightning","fog","frost","island","valley","cave","volcano","cliff","beach","ocean",
    "wave","dew","meadow","desert","waterfall","campfire","snowman","leaf","sunflower","dandelion",
    // --- objects (60) ---
    "ball","book","cup","key","hat","shoe","bed","door","lamp","box","pen","clock","phone","chair","table","window","spoon","fork","knife","plate",
    "bowl","bottle","comb","brush","towel","soap","ring","watch","glasses","umbrella","backpack","pencil","ruler","scissors","envelope","stamp","coin","wallet","camera","candle",
    "pillow","blanket","mirror","bucket","ladder","rope","chain","lock","wheel","button","needle","thread","flag","map","globe","bell","whistle","fan","broom","basket",
    // --- vehicles & places (50) ---
    "car","bus","bike","boat","train","plane","truck","rocket","scooter","tractor","house","tent","school","store","park","farm","city","bridge","castle","church",
    "barn","garage","tower","cabin","hut","stadium","garden","street","fence","gate","wall","roof","chimney","stairs","tunnel","airport","harbor","station","windmill","lighthouse",
    // --- body & clothing (40) ---
    "eye","ear","nose","hand","foot","leg","arm","head","face","mouth","tooth","heart","bone","hair","tongue","lip","chin","cheek","neck","shoulder",
    "shirt","pants","dress","sock","shoe","coat","glove","scarf","belt","tie","hat","cap","boots","sandals","skirt","sweater","helmet","crown","cape","ring",
    // --- fun & simple (30) ---
    "heart","smile","circle","square","triangle","line","arrow","music","song","drum","guitar","ball","kite","doll","teddy","robot","alien","ghost","dragon","king",
    "queen","prince","princess","knight","pirate","clown","wizard","angel","fairy","mermaid",
  ],

  medium: [
    // --- animals (50) ---
    "elephant","giraffe","penguin","kangaroo","flamingo","hedgehog","platypus","narwhal","jellyfish","chameleon",
    "woodpecker","hummingbird","peacock","rhinoceros","hippopotamus","crocodile","buffalo","raccoon","chipmunk","armadillo",
    "porcupine","stingray","seahorse","lobster","pufferfish","angelfish","pelican","vulture","badger","beaver",
    "lemur","gibbon","sloth","orca","manatee","otter","marten","weasel","ferret","mink",
    "alpaca","llama","bison","moose","elk","caribou","reindeer","doe","stag","fawn",
    // --- food (50) ---
    "sandwich","pineapple","watermelon","strawberry","blueberry","raspberry","pomegranate","coconut","avocado","broccoli",
    "asparagus","eggplant","zucchini","pumpkin","mushroom","garlic","ginger","cinnamon","chocolate","croissant",
    "baguette","quesadilla","burrito","nachos","dumpling","tempura","risotto","lasagna","ravioli","gnocchi",
    "falafel","hummus","salsa","guacamole","smoothie","milkshake","espresso","cappuccino","latte","mocha",
    "frappuccino","sundae","parfait","tiramisu","creme brulee","macaron","macaroon","eclair","profiterole"," cannoli",
    // --- objects (50) ---
    "telescope","microscope","binoculars","compass","thermometer","stethoscope","stopwatch","hourglass","trophy","medal",
    "ribbon","badge","crown","scepter","shield","sword","dagger","anchor","helm","wheel",
    "treasure chest","fountain","wishing well","chandelier","candelabra","music box","jewelry box","snow globe","puzzle","rubiks cube",
    "dollhouse","birdhouse","doghouse","treehouse","playhouse","kaleidoscope","prism","crystal","gemstone","fossil",
    "seashell","coral","pearl","amulet","talisman","scroll","quill","inkwell","candlestick","sconce",
    // --- places & buildings (40) ---
    "skyscraper","cathedral","barn","windmill","ferris wheel","carousel","hot air balloon","zeppelin","glider","hang glider",
    "ski lift","chair lift","ice rink","bowling alley","golf course","tennis court","basketball hoop","soccer goal","boxing ring","swimming pool",
    "diving board","water slide","trampoline","tree swing","monkey bars","jungle gym","see-saw","sandcastle","scarecrow","bonfire",
    "fireworks","parade","circus","festival","carnival","fair","market","bazaar","gallery","museum",
    // --- nature & weather (30) ---
    "waterfall","geyser","glacier","iceberg","avalanche","landslide","tornado","hurricane","blizzard","flood",
    "tsunami","earthquake","volcano","crater","canyon","ravine","gorge","plateau","mesa","butte",
    "dune","oasis","marsh","swamp","tundra","prairie","meadow","grove","orchard","vineyard",
    // --- fantasy & characters (30) ---
    "unicorn","pegasus","griffin","phoenix","centaur","minotaur","cyclops","werewolf","vampire","zombie",
    "mummy","goblin","gremlin","gargoyle","banshee","siren","kraken","leviathan","basilisk","wyvern",
    "hydra","sphinx","chimera","yeti","bigfoot","astronaut","pirate","ninja","samurai","knight",
    // --- activities & instruments (30) ---
    "guitar","piano","violin","drums","trumpet","saxophone","flute","harp","cello","clarinet",
    "trombone","accordion","harmonica","banjo","ukulele","juggling","tightrope","magic trick","puppet show","charades",
    "treasure hunt","hopscotch","jump rope","marbles","kite flying","snowball fight","snow angel","leaf pile","apple picking","camping",
  ],

  hard: [
    // --- challenging but drawable & recognizable (NOT obscure) ---
    // --- complex objects (40) ---
    "rollercoaster","roller coaster","ferris wheel","merry go round","carousel","hot air balloon","airplane","helicopter","submarine","rocket ship",
    "spaceship","satellite","train station","airport terminal","wind turbine","solar panel","skyscraper","pyramid","sphinx","colosseum",
    "stonehenge","eiffel tower","statue of liberty","big ben","tower bridge","sydney opera house","taj mahal","great wall","parthenon","colosseum",
    "castle","fortress","cathedral","church","mosque","temple","pagoda","lighthouse","windmill","water tower",
    // --- scenes (40) ---
    "thunderstorm","tornado","hurricane","volcano eruption","earthquake","avalanche","tsunami","flood","wildfire","rainbow",
    "northern lights","aurora","sunset","sunrise","starry night","galaxy","solar system","planet","comet","shooting star",
    "meteor shower","eclipse","full moon","crescent moon","milky way","constellation","orbit","rocket launch","space walk","moon landing",
    "city skyline","skyline panorama","cityscape","landscape","seascape","mountain range","ocean view","forest scene","desert scene","winter scene",
    // --- fantasy creatures (30) ---
    "unicorn","dragon","phoenix","griffin","mermaid","centaur","minotaur","cyclops","werewolf","vampire",
    "zombie","mummy","goblin","gremlin","gargoyle","banshee","siren","kraken","leviathan","basilisk",
    "wyvern","hydra","sphinx","chimera","yeti","bigfoot","loch ness monster","jack o lantern","scarecrow","gingerbread house",
    // --- challenging concepts (40) ---
    "labyrinth","maze","puzzle","jigsaw","rubiks cube","origami crane","paper airplane","knot","spiral","tornado",
    "whirlpool","vortex","portal","wormhole","black hole","supernova","nebula","galaxy","constellation","solar system",
    "family tree","food chain","water cycle","life cycle","evolution","metamorphosis","symbiosis","ecosystem","biodiversity","photosynthesis",
    // --- activities & sports (30) ---
    "skydiving","parachuting","bungee jumping","zip line","tightrope walking","slacklining","rock climbing","ice climbing","mountaineering","spelunking",
    "scuba diving","snorkeling","freediving","surfing","windsurfing","kiteboarding","wakeboarding","kayaking","rafting","sailing",
    "skateboarding","snowboarding","skiing","ice skating","roller skating","cycling","marathon","hurdles","relay race","tug of war",
    // --- food & cooking (30) ---
    "thanksgiving turkey","birthday cake","wedding cake","gingerbread house","candy cane","caramel apple","cotton candy","funnel cake","churros","fried dough",
    "sushi roll","ramen bowl","pho","pad thai","curry","paella","risotto","carbonara","bolognese","pesto",
    "mochi","dango","taiyaki","crepe","waffle cone","banana split","ice cream sundae","hot fudge","apple pie","pumpkin pie",
    // --- misc challenging (30) ---
    "self portrait","silhouette","shadow","reflection","kaleidoscope","stained glass","rose window","fresco","mural","mosaic",
    "tapestry","collage","sculpture","statue","monument","memorial","fountain","wishing well","treasure chest","pirate ship",
    "viking ship","galleon","longship","canoe","kayak","gondola","chariot","carriage","stagecoach","covered wagon",
  ],
};

// Deduplicate each list (case-insensitive) at module load.
for (const key of Object.keys(WORD_LISTS) as Array<keyof typeof WORD_LISTS>) {
  const seen = new Set<string>();
  WORD_LISTS[key] = WORD_LISTS[key].filter((w) => {
    const k = w.toLowerCase().trim();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export const WORD_COUNTS = {
  easy: WORD_LISTS.easy.length,
  medium: WORD_LISTS.medium.length,
  hard: WORD_LISTS.hard.length,
};

/**
 * Pick `count` non-repeating words for the given difficulty.
 * `usedWords` is the set of words already used this game (so nothing repeats).
 * Falls back gracefully if the pool is exhausted.
 */
export function pickWords(
  difficulty: WordDifficulty,
  count = 4,
  usedWords: Set<string> = new Set()
): string[] {
  let pool: string[];
  if (difficulty === "mixed") {
    // Recommended default: blend easy (60%) + medium (40%) for balanced, fun, drawable words.
    pool = [...WORD_LISTS.easy, ...WORD_LISTS.medium];
  } else {
    pool = WORD_LISTS[difficulty];
  }

  // Exclude already-used words.
  let available = pool.filter((w) => !usedWords.has(w.toLowerCase()));
  // If we've used nearly everything, reset (so we always have something).
  if (available.length < count) {
    available = pool;
  }

  // Shuffle and take `count`.
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
