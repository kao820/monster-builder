const DATA={
  sizes:["Крошечный","Маленький","Средний","Большой","Огромный","Громадный"],
  hitDieBySize:{"Крошечный":4,"Маленький":6,"Средний":8,"Большой":10,"Огромный":12,"Громадный":20},
  types:["аберрация","зверь","небожитель","конструкт","дракон","элементаль","фея","исчадие","великан","гуманоид","чудовище","слизь","растение","нежить"],
  alignments:["законопослушный добрый","нейтральный добрый","хаотичный добрый","законопослушный нейтральный","нейтральный","хаотичный нейтральный","законопослушный злой","нейтральный злой","хаотичный злой","без мировоззрения","любое мировоззрение"],
  damageTypes:["дробящий","колющий","рубящий","кислота","холод","огонь","молния","гром","яд","психический","некротический","излучение","силовой"],
  conditions:["ослеплённый","очарованный","оглохший","испуганный","схваченный","недееспособный","невидимый","парализованный","окаменевший","отравленный","сбитый с ног","опутанный","ошеломлённый","бессознательный","истощение"],
  skills:[
    {id:"acrobatics",label:"Акробатика",ability:"dex"},{id:"animalHandling",label:"Уход за животными",ability:"wis"},{id:"arcana",label:"Магия",ability:"int"},
    {id:"athletics",label:"Атлетика",ability:"str"},{id:"deception",label:"Обман",ability:"cha"},{id:"history",label:"История",ability:"int"},
    {id:"insight",label:"Проницательность",ability:"wis"},{id:"intimidation",label:"Запугивание",ability:"cha"},{id:"investigation",label:"Расследование",ability:"int"},
    {id:"medicine",label:"Медицина",ability:"wis"},{id:"nature",label:"Природа",ability:"int"},{id:"perception",label:"Восприятие",ability:"wis"},
    {id:"performance",label:"Выступление",ability:"cha"},{id:"persuasion",label:"Убеждение",ability:"cha"},{id:"religion",label:"Религия",ability:"int"},
    {id:"sleightOfHand",label:"Ловкость рук",ability:"dex"},{id:"stealth",label:"Скрытность",ability:"dex"},{id:"survival",label:"Выживание",ability:"wis"}
  ],
  usageOptions:[
    {id:"none",label:"без ограничения"},
    {id:"recharge46",label:"перезарядка 4–6"},
    {id:"recharge56",label:"перезарядка 5–6"},
    {id:"1day",label:"1/день"},
    {id:"2day",label:"2/день"},
    {id:"3day",label:"3/день"},
    {id:"shortrest",label:"1/короткий или долгий отдых"},
    {id:"longrest",label:"1/долгий отдых"},
    {id:"custom",label:"свой текст"}
  ],
  targetOptions:["одна цель","несколько целей"],
  attackModes:[
    {id:"melee",label:"рукопашная"},
    {id:"ranged",label:"дальнобойная"},
    {id:"other",label:"другое"}
  ],
  attackCategories:[
    {id:"weapon",label:"оружием"},
    {id:"spell",label:"заклинанием"}
  ],
  saveAbilities:[
    {id:"str",label:"Силы"},{id:"dex",label:"Ловкости"},{id:"con",label:"Телосложения"},
    {id:"int",label:"Интеллекта"},{id:"wis",label:"Мудрости"},{id:"cha",label:"Харизмы"}
  ],
  crTable:[{cr:"0",xp:10,pb:2,ac:13,hpMin:1,hpMax:6,atk:3,dprMin:0,dprMax:1,dc:13},{cr:"1/8",xp:25,pb:2,ac:13,hpMin:7,hpMax:35,atk:3,dprMin:2,dprMax:3,dc:13},{cr:"1/4",xp:50,pb:2,ac:13,hpMin:36,hpMax:49,atk:3,dprMin:4,dprMax:5,dc:13},{cr:"1/2",xp:100,pb:2,ac:13,hpMin:50,hpMax:70,atk:3,dprMin:6,dprMax:8,dc:13},{cr:"1",xp:200,pb:2,ac:13,hpMin:71,hpMax:85,atk:3,dprMin:9,dprMax:14,dc:13},{cr:"2",xp:450,pb:2,ac:13,hpMin:86,hpMax:100,atk:3,dprMin:15,dprMax:20,dc:13},{cr:"3",xp:700,pb:2,ac:13,hpMin:101,hpMax:115,atk:4,dprMin:21,dprMax:26,dc:13},{cr:"4",xp:1100,pb:2,ac:14,hpMin:116,hpMax:130,atk:5,dprMin:27,dprMax:32,dc:14},{cr:"5",xp:1800,pb:3,ac:15,hpMin:131,hpMax:145,atk:6,dprMin:33,dprMax:38,dc:15},{cr:"6",xp:2300,pb:3,ac:15,hpMin:146,hpMax:160,atk:6,dprMin:39,dprMax:44,dc:15},{cr:"7",xp:2900,pb:3,ac:15,hpMin:161,hpMax:175,atk:6,dprMin:45,dprMax:50,dc:15},{cr:"8",xp:3900,pb:3,ac:16,hpMin:176,hpMax:190,atk:7,dprMin:51,dprMax:56,dc:16},{cr:"9",xp:5000,pb:4,ac:16,hpMin:191,hpMax:205,atk:7,dprMin:57,dprMax:62,dc:16},{cr:"10",xp:5900,pb:4,ac:17,hpMin:206,hpMax:220,atk:7,dprMin:63,dprMax:68,dc:16},{cr:"11",xp:7200,pb:4,ac:17,hpMin:221,hpMax:235,atk:8,dprMin:69,dprMax:74,dc:17},{cr:"12",xp:8400,pb:4,ac:17,hpMin:236,hpMax:250,atk:8,dprMin:75,dprMax:80,dc:18},{cr:"13",xp:10000,pb:5,ac:18,hpMin:251,hpMax:265,atk:8,dprMin:81,dprMax:86,dc:18},{cr:"14",xp:11500,pb:5,ac:18,hpMin:266,hpMax:280,atk:8,dprMin:87,dprMax:92,dc:18},{cr:"15",xp:13000,pb:5,ac:18,hpMin:281,hpMax:295,atk:8,dprMin:93,dprMax:98,dc:18},{cr:"16",xp:15000,pb:5,ac:18,hpMin:296,hpMax:310,atk:9,dprMin:99,dprMax:104,dc:18},{cr:"17",xp:18000,pb:6,ac:19,hpMin:311,hpMax:325,atk:10,dprMin:105,dprMax:110,dc:19},{cr:"18",xp:20000,pb:6,ac:19,hpMin:326,hpMax:340,atk:10,dprMin:111,dprMax:116,dc:19},{cr:"19",xp:22000,pb:6,ac:19,hpMin:341,hpMax:355,atk:10,dprMin:117,dprMax:122,dc:19},{cr:"20",xp:25000,pb:6,ac:19,hpMin:356,hpMax:400,atk:10,dprMin:123,dprMax:140,dc:19},{cr:"21",xp:33000,pb:7,ac:19,hpMin:401,hpMax:445,atk:11,dprMin:141,dprMax:158,dc:20},{cr:"22",xp:41000,pb:7,ac:19,hpMin:446,hpMax:490,atk:11,dprMin:159,dprMax:176,dc:20},{cr:"23",xp:50000,pb:7,ac:19,hpMin:491,hpMax:535,atk:11,dprMin:177,dprMax:194,dc:20},{cr:"24",xp:62000,pb:7,ac:19,hpMin:536,hpMax:580,atk:12,dprMin:195,dprMax:212,dc:21},{cr:"25",xp:75000,pb:8,ac:19,hpMin:581,hpMax:625,atk:12,dprMin:213,dprMax:230,dc:21},{cr:"26",xp:90000,pb:8,ac:19,hpMin:626,hpMax:670,atk:12,dprMin:231,dprMax:248,dc:21},{cr:"27",xp:105000,pb:8,ac:19,hpMin:671,hpMax:715,atk:13,dprMin:249,dprMax:266,dc:22},{cr:"28",xp:120000,pb:8,ac:19,hpMin:716,hpMax:760,atk:13,dprMin:267,dprMax:284,dc:22},{cr:"29",xp:135000,pb:9,ac:19,hpMin:761,hpMax:805,atk:13,dprMin:285,dprMax:302,dc:22},{cr:"30",xp:155000,pb:9,ac:19,hpMin:806,hpMax:850,atk:14,dprMin:303,dprMax:320,dc:23}]
};
