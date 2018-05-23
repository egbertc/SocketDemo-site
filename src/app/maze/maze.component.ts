import { Component, NgModule, ViewChild, ElementRef, OnInit, AfterViewChecked, OnDestroy } from '@angular/core';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@aspnet/signalr'
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-maze',
  templateUrl: './maze.component.html',
  styleUrls: ['./maze.component.css']
})
export class MazeComponent implements OnInit {

  private colorList = {
    green: '#00963e',
    blue: '#123cba',
    red: '#93020c',
    pink: '#b50e99',
    purple: '#78058c',
    grey: '#333333',
    black: '#000000',
    default: '#299ac7'
  }

  private sendyHub: HubConnection;
  title: string = 'The Maze';
  

  nameIn: string;
  playerId: number;

  // player: Player;

  playerName: string;
  color: string = "#299ac7";

  availableGames: Array<number>;

  currentGame: Game;

  connected: boolean = false;
  connecting: boolean = false;

  constructor(){}

  ngOnInit(): void {
    console.log("ON INIT");
    let hubBuilder = new HubConnectionBuilder();
    hubBuilder.withUrl(environment.baseUrl + "race");
    hubBuilder.configureLogging(LogLevel.Information);

    this.sendyHub = hubBuilder.build();

    this.sendyHub.on("InitPlayer", (player, games) => {
      this.initPlayer(player, games);
    });

    this.sendyHub.on("GameList", (games) => {
      this.gameListUpdate(games);
    });

    this.sendyHub.on("GameUpdate", (game) => {
      this.gameUpdate(game);
    });

    this.sendyHub.on("StartGame", (gameId) => {
      this.startGame(gameId);
    });

    this.sendyHub.on("MovePlayer", (playerId, x, y) => {
      this.movePlayer(playerId, x, y);
    });

    this.sendyHub.on("GameWinner", (gameId, player) => {
      this.gameWinner(gameId, player);
    });

    this.sendyHub.on("ClearAll", () => {
      this.clearAll();
    });

    this.connecting = true;

    this.sendyHub.onclose(() => this.connected = false)

    this.sendyHub.start().then(() => {
      console.log("SENDY HUB CONNECTED");
      this.connected = true;
      this.connecting = false;
    }).catch(err => {
      console.error("SENDY HUB FAILURE", err)
      this.connecting = false;
    });
    
  }

  ngOnDestroy() {
    console.log("FEED DESTROY");
    this.sendyHub.stop().then(()=> {console.log("HUB STOPPED")});
  }

  initPlayer(player, games){
    this.playerId = player.id;
    this.playerName = player.name;
    // this.player = player;
    this.availableGames = games;
  }

  gameListUpdate(games){    
    this.availableGames = games;
  }

  gameUpdate(game){
    this.currentGame = game;//JSON.parse(game);
    // this.player = game.players.find((p) => p.id === this.player.id);
    console.log("CURRENT GAME", this.currentGame);
  }

  startGame(gameId){
    if(this.currentGame.id === gameId){
      this.currentGame.active = true;
    }
  }

  gameWinner(gameId, winner){
    if(this.currentGame.id === gameId){
      this.currentGame.active = false;
      this.currentGame.winner = winner;
    }
  }

  movePlayer(playerId, x, y){
    let player = this.currentGame.players.find((p) => p.id === playerId);
    player.x = x;
    player.y = y;
  }

  clearAll(){
    this.playerName = undefined;
    this.color = this.colorList.default;
    this.nameIn = undefined;
  }

   move(keyEvent){
    if(!this.currentGame.active){
      return;
    }

    let dir: Direction;

    let player = this.currentGame.players.find((p) => p.id === this.playerId);

    let newX = player.x;
    let newY = player.y;

    switch(keyEvent.keyCode){
      case 38:
        dir = Direction.Up;
        newY--;
        break;
      case 39:
        dir = Direction.Right;
        newX++;
        break;
      case 40:
        dir = Direction.Down;
        newY++;
        break;
      case 37:
        dir = Direction.Left;
        newX--;
        break;
      default:
        return;
    }

    if(!(this.currentGame.mazeGrid[player.y][player.x] & dir)){
      player.x = newX;
      player.y = newY;
      // console.log("MOVE DIR", dir)
      this.sendyHub.invoke("MovePlayer",this.currentGame.id, player.id, dir).then((response) => {console.log("RESPONSE", response); }).catch(err => console.log("ERROR", err));
    }


    
  }

  saveName(){
    if(this.nameIn && this.nameIn.trim() !== ''){
      this.playerName = this.nameIn;

      this.nameIn = undefined;

      this.sendyHub.invoke("UserJoin", this.playerName).then((response) => {console.log("RESPONSE", response);}).catch(err => console.log("ERROR", err));
    }
  }

  joinGame(id: number){
    this.sendyHub.invoke("JoinGame", this.playerId, id).then((response) => {console.log("RESPONSE", response);}).catch(err => console.log("ERROR", err));
  }

  createGame(){
    this.sendyHub.invoke("NewGame", this.playerId).then((response) => {console.log("RESPONSE", response);}).catch(err => console.log("ERROR", err));
  }

  quitGame(){
    this.currentGame = undefined;
  }

  getCellClass(direction: Direction): string {
    let cls="maze-cell";

    if(direction & Direction.Up){
      cls += " north";
    }

    if(direction & Direction.Down){
      cls += " south";
    }

    if(direction & Direction.Left){
      cls += " west";
    }

    if(direction & Direction.Right){
      cls += " east";
    }

    return cls;
  }

  specialBorder(x,y){

    if(this.currentGame.startX == x && this.currentGame.startY == y){
      if(this.currentGame.players && this.currentGame.players.length > 0){
        return "2px solid " + this.currentGame.players[0].color;
      }

      return "2px solid #00963e";
    }

    if(this.currentGame.endX == x && this.currentGame.endY == y){
      if(this.currentGame.players && this.currentGame.players.length > 1){
        return "2px solid " + this.currentGame.players[1].color;
      }

      return "2px solid #cccccc";
    }

    return null;
  }

}

enum Direction {
  None = 0,
  Up = 1,
  Right = 2,
  Down = 4,
  Left = 8
}

class Player {
  id: number;
  clientId: string;
  name: string;
  color: string;
  x?: number;
  y?: number;
}

class Game {
  active: boolean;
  winner: string;
  id: number;
  mazeGrid: Array<Array<Direction>>;
  players: Array<Player>;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}