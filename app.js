var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/mydb";

var express = require('express');
var app = express();
var serv = require('http').Server(app);
var cookieParser = require('cookie-parser');
app.use(cookieParser());


app.get('/setuser', (req,res)=>{
    res.cookie("userData", USERS);
    res.send('user data added to cookie');
});

app.get('/getuser',(req, res)=>{
    res.send(req.cookies);
});


//app.use(session({
   // secret: 'ssshhhhh',
   // store: new redisStore({ host: 'localhost', port: 6379, client: client,ttl : 260}),
   // saveUninitialized:false,
    //resave:false
//}));

//app.use(bodyParser.json());
//app.use(bodyParser.urlencoded({extended: true}));



app.get('/',function(req, res) {
    res.sendFile(__dirname + '/client/entry.html');
});
app.get('/entry.html',function(req, res) {
    if (res.cookie != null){res.sendFile(__dirname + '/client/index.html');}
    else{ res.sendFile(__dirname + '/client/entry.html');}
   
});
app.get('/index.html',function(req, res) {
    res.cookie('loggedIn', 'true')
    res.sendFile(__dirname + '/client/index.html');
});

app.get('/login.html',function(req, res) {
    res.sendFile(__dirname + '/client/login.html');
});

app.get('/spaceship1.jpg', function(req,res){
    res.sendFile(__dirname + '/images/spaceship1.jpg')
})

app.get('/laser.jpg', function(req,res){
    res.sendFile(__dirname + '/images/laser.jpg')
})

app.get('/spaceship2.jpg', function(req,res){
    res.sendFile(__dirname + '/images/spaceship2.jpg')
})

app.get('/ghost.png', function(req,res){
    res.sendFile(__dirname + '/images/ghost.png')
})

MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbo = db.db("mydb");
    dbo.createCollection("customers", function(err, res) {
      if (err) throw err;
      
      db.close();
    });
  });

serv.listen(2000);
console.log("Server started.");
var ghostId = 0;
var laserId = 0;
var LASER_LIST = [];
var GHOST_LIST = []
var SOCKET_LIST = [];
var PLAYER_LIST = [];
var PARTNERS_LIST = []; 
var SPRITE_LIST = [];
let USERS = {
    name:"Ritik",
    Age:'18'
}





var Sprite = function(x, y, type, imgSrc,  width, height, id, direction, row, line){
    var self = {
        x:x,
        y:y,
        id:id,
        width:width,
        height:height,
        type:type,
        imgSrc:imgSrc,
        direction:direction,
        row:row,
        line:line,
        counter:0,
    }
    self.updatePosition = function(){
        self.y -= 10;
    }
    return self;
}

var Player = function(x, id,imgSrc, width, height, playNum){
    var self = {
        gameActive:true,
        x:x,
        y:660,
        id:id,
        width:width,
        height:height,
        imgSrc:imgSrc,
        playNum:playNum,
        pressingRight:false,
        pressingLeft:false,
        pressingUp:false,
        pressingDown:false,
        maxSpd:5,
        counter:0,
        
    }
    self.updatePosition = function(){
        if(self.pressingRight)
            self.x += self.maxSpd;
        if(self.pressingLeft)
            self.x -= self.maxSpd;
    }

    return self;
}

class Pack {
    constructor(socket1, player1){
        this.Socket = socket1;
        this.Player = player1;
    }

    get socket(){
        return this.Socket;
    }

    get player(){
        return this.Player;
    }
}




var Partner = function(pack1, pack2,){
    var self = {
        pack1:pack1,
        pack2:pack2,
        SPRITE_LIST:[],
     
    }

    self.insertToSprite = function(spr){
        self.SPRITE_LIST[self.SPRITE_LIST.length] = spr
    }
    return self;
}




var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket){

    socket.on('signIn',function(data){
        var truecredentials = false;
        MongoClient.connect(url, function(err, db) {
            if (err) throw err;
            var dbo = db.db("mydb");
            var userns = dbo.collection("customers").find().toArray();
            var myobj = {name : data.username, password:data.password};
            userns.then(function(result){
                for (var i in result){
                    if(result[i].name==myobj.name && result[i].password == myobj.password){
                        truecredentials = true;
                    }
                }
                socket.emit('signInResponse',{success:truecredentials});
            })
    });
})

    socket.on('signUp',function(data){  
        MongoClient.connect(url, function(err, db) {
            var usernametaken = true;
            if (err) throw err;
            var dbo = db.db("mydb");
            var userns = dbo.collection("customers").find().toArray();
            var myobj = {name : data.username, password:data.password};
            userns.then(function(result){
                for(var i in result){
                    if (result[i].name==myobj.name){
                        usernametaken = false;
                    }
                }
                if(usernametaken){
                    dbo.collection("customers").insertOne(myobj, function(err, res){
                        if (err) throw err;
                    db.close();
                    })
                }
                socket.emit('signUpResponse',{success:usernametaken});
            })
        });
    });


    socket.on('sortToPartners',function(){
        socket.id = SOCKET_LIST.length;
        SOCKET_LIST[socket.id] = socket;  
        var last_element = PARTNERS_LIST[PARTNERS_LIST.length - 1];
        if (last_element == null){
            var player = Player( 500,socket.id, '/spaceship1.jpg', 100, 100,1);
            PLAYER_LIST[socket.id] = player;
            newPack = new Pack(socket, player);
            PARTNERS_LIST[0] = Partner(newPack, null);
            partnerId = 0;
            numPack = 0;
        }
        else if (last_element.pack2 == null){
            var player = Player(900 ,socket.id, '/spaceship2.jpg', 100, 100,2);
            PLAYER_LIST[socket.id] = player;
            newPack = new Pack(socket, player);
            PARTNERS_LIST[PARTNERS_LIST.length-1].pack2 = newPack;
            partnerId = PARTNERS_LIST.length-1;
            numPack = 1;
            createGhosts();
            updateGhostPosition();
        }
        else {
            var player = Player(500, socket.id, '/spaceship1.jpg', 100, 100,1);
            PLAYER_LIST[socket.id] = player;
            newPack = new Pack(socket, player);
            partnerId = PARTNERS_LIST.length;
            PARTNERS_LIST[PARTNERS_LIST.length] =Partner(newPack, null);
            numPack = 0;
        }
    
    });
    
    
        
        socket.on('laserCreate',function(){
            var laser = Sprite(player.x,600,"laser",'/laser.jpg', 100, 100, partnering.SPRITE_LIST.length)
            partnering.insertToSprite(laser)
        })
       
        socket.on('keyPress',function(data){
            if(data.inputId === 'left')
                player.pressingLeft = data.state;
            else if(data.inputId === 'right')
                player.pressingRight = data.state;
            else if(data.inputId === 'up')
                player.pressingUp = data.state;
            else if(data.inputId === 'down')
                player.pressingDown = data.state;
        });
    
        socket.on('laserDelete',function(data){
            delete partnering.SPRITE_LIST[data.inputId]
        })
    
        socket.on('ghostDelete',function(data){ 
            partnering.aliveGhosts--;
            console.log(partnering.aliveGhosts);
            delete partnering.SPRITE_LIST[data.inputId2];
            
            
        })
    
        function createGhosts(){
            for (var i = 0 ; i < 3 ; i++){
                for (var j = 0 ; j < 9 ; j++){
                    var Ghost = Sprite(300 + 100*j,100 + 100*i,"ghost",'/ghost.png', 75, 75, partnering.SPRITE_LIST.length, 'right', i, j);
                    partnering.insertToSprite(Ghost);
                }
            }
   
        }
    





        function updateGhostPosition(){
            var outofboundaries = false;
            var direc;
            var endgame = true;
            for (var i = 0 ; i<partnering.SPRITE_LIST.length ; i++){
                if (partnering.SPRITE_LIST[i] != null){
                    if(partnering.SPRITE_LIST[i].type == "ghost"){
                        endgame = false;
                    }
                }
            }
            if (endgame == true){
                player.gameActive = false;
            }
            for (var i = 0 ; i<partnering.SPRITE_LIST.length ; i++){
                if (partnering.SPRITE_LIST[i] != null){
                    if(partnering.SPRITE_LIST[i].type == "ghost"){
                        if (partnering.SPRITE_LIST[i].y >= 650){
                            player.gameActive = false;
                            break;
                        }
                        if(partnering.SPRITE_LIST[i].x <= 100){
                            outofboundaries = true;
                            direc = "right";
                        }
                        if(partnering.SPRITE_LIST[i].x >= 1400){
                            outofboundaries = true;
                            direc = "left";
                        }


                        }
                }
                   }  
                for (var i = 0 ; i<partnering.SPRITE_LIST.length ; i++){
                    if (partnering.SPRITE_LIST[i] != null ){
                        if(partnering.SPRITE_LIST[i].type == "ghost"){
                        if (outofboundaries && direc == "left"){
                            partnering.SPRITE_LIST[i].y += 25;
                            partnering.SPRITE_LIST[i].x -= 50
                            partnering.SPRITE_LIST[i].direction = "left";
                        }
                        else if (outofboundaries && direc == "right"){
                            partnering.SPRITE_LIST[i].y += 25;
                            partnering.SPRITE_LIST[i].x += 50
                            partnering.SPRITE_LIST[i].direction = "right";
                        }
                        else{
                            if (partnering.SPRITE_LIST[i].direction == "right" ){ 
                                partnering.SPRITE_LIST[i].x += 50;
                            }
                             if (partnering.SPRITE_LIST[i].direction == "left" ){
                                partnering.SPRITE_LIST[i].x -= 50;
                            }
                        }
                    }
                    }
                }
            
   
            setTimeout(updateGhostPosition, 500);
        }
    
     
    });
    });
     
    
    
    setInterval(function(){
        for(var i in PARTNERS_LIST){
            if (PARTNERS_LIST[i] != null){
                pack = [];
                if (PARTNERS_LIST[i].pack1 != null && PARTNERS_LIST[i].pack2 != null){
                    if (PARTNERS_LIST[i].SPRITE_LIST.length === 0){
                        console.log("hey");
                    }
                    if (PARTNERS_LIST[i].pack1.player.gameActive==false || PARTNERS_LIST[i].pack2.player.gameActive==false){
                        PARTNERS_LIST[i].pack1.socket.emit("lost",)
                        PARTNERS_LIST[i].pack2.socket.emit("lost",)
                        delete PARTNERS_LIST[i]
                    }

                    else{
                    var player1 = PARTNERS_LIST[i].pack1;
                    player1.player.updatePosition();
                    pack.push({
                        x:player1.player.x,
                        y:player1.player.y,
                        imgSrc:player1.player.imgSrc,
                        height: player1.player.height,
                        width: player1.player.width,
                            
                    })
                    var spr_lst = PARTNERS_LIST[i].SPRITE_LIST
                    for (var j in spr_lst){
                        if (spr_lst[j] != null){
                            spr1 = spr_lst[j];
                            if (spr1.type == 'laser'){spr1.updatePosition();}
                            pack.push({
                                x:spr1.x,
                                y:spr1.y,
                                imgSrc:spr1.imgSrc,
                                height:spr1.height,
                                width:spr1.width,
                                type:spr1.type,
                                id:spr1.id,
                            })
                        }
                    }
                    var player2 = PARTNERS_LIST[i].pack2;
                  
                    player2.player.updatePosition();
                    pack.push({
                        x:player2.player.x,
                        y:player2.player.y,
                        imgSrc:player2.player.imgSrc,
                        height:player2.player.height,
                        width: player2.player.width,
                    })
                    
                   
                  
                    player1.socket.emit('newPositions',pack)
                    player2.socket.emit('newPositions',pack)
                    }
                }
                    else if (PARTNERS_LIST[i].pack2 == null){
                        var player1 = PARTNERS_LIST[i].pack1;
                        player1.socket.emit('waitingGame',)
                        
                    }
                    else{
                        var player2 = PARTNERS_LIST[i].pack2;
                        player2.socket.emit('waitingGame',)
                    }
            
                }    
            }
        
        },1000/25);