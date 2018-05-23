import { Component, NgModule, ViewChild, ElementRef, OnInit, AfterViewChecked } from '@angular/core';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@aspnet/signalr'

@Component({
  selector: 'app-live-feed',
  templateUrl: './live-feed.component.html',
  styleUrls: ['./live-feed.component.css']
})
export class LiveFeedComponent implements OnInit, AfterViewChecked {

  @ViewChild('feed') feed: ElementRef;

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
  title: string = 'Sendy Words';

  messageList: Array<Message> = new Array<Message>();

  newMessage: string;
  nameIn: string;

  savedName: string;
  color: string = "#299ac7";

  connected: boolean = false;
  connecting: boolean = false;

  scrollLock: boolean;

  constructor(){}

  ngOnInit(): void {
    let hubBuilder = new HubConnectionBuilder();
    hubBuilder.withUrl("https://localhost:44332/chat");
    hubBuilder.configureLogging(LogLevel.Information);

    this.sendyHub = hubBuilder.build();

    this.sendyHub.on("ReceiveMessage", (user, message, color) => {
      this.messageReceived(user, message, color);
    });

    this.sendyHub.on("ReceiveImage", (user, url, color) => {
      this.imageReceived(user, url, color);
    });

    this.sendyHub.on("SetTitle", (title) => {
      this.setTitle(title);
    });

    this.sendyHub.on("SystemMessage", (message) => {
      this.systemMessage( message);
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

  
  ngAfterViewChecked() {
    if(this.scrollLock){
      this.scrollToBottom();
    }
    
  }

  messageReceived(user: string, message: string, color: string){
    this.messageList.push(new Message(user, message, color));
  }

  imageReceived(user: string, url: string, color: string){
    let msg = new Message(user, url, color);
    msg.isImage = true;
    this.messageList.push(msg);
  }

  systemMessage(message: string){
    let msg = new Message();
    msg.message = message;
    msg.isSystem = true;
    this.messageList.push(msg);
  }

  setTitle(title: string){
    this.title = title;
  }

  clearAll(){
    this.savedName = undefined;
    this.color = this.colorList.default;
    this.messageList = new Array<Message>();
    this.title = "Sendy Words";
    this.nameIn = undefined;
  }

  sendMessage(){
    let m = this.handleMessage(this.newMessage);
    if(m == null) { this.newMessage = ""; return;}
    this.sendyHub.invoke("SendMessage", this.savedName, m, this.color).then((response) => {console.log("RESPONSE", response); this.newMessage = "";}).catch(err => console.log("ERROR", err));
    this.scrollToBottom();
  }

  saveName(){
    if(this.nameIn && this.nameIn.trim() !== ''){
      this.savedName = this.nameIn;
      this.nameIn = undefined;

      this.sendyHub.invoke("UserJoin", this.savedName).then((response) => {console.log("RESPONSE", response);}).catch(err => console.log("ERROR", err));
    }
  }

  private handleMessage(msg: string):string {

    if(msg.startsWith('/title')){
      let t = msg.substr(7);


      if(t && t.trim() != ''){
        this.sendyHub.invoke("SetTitle", t, this.savedName).then(() => {}).catch(err => console.log("ERROR", err));
        return null;
      }      
    }


    if(msg.startsWith('/color')){
      let c = msg.substr(7);
      if(c.match(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)){
        this.color = c;
        return 'I am now ' + c + '!';
      }

      if(this.colorList[c]){
        this.color = this.colorList[c];
        return 'I am now ' + c + '!';
      }
    }

    if(msg.startsWith('/swap')){

      let words = msg.split(' ');

      if(words.length === 3){
        this.sendyHub.invoke("AddSwap", words[1], words[2], this.savedName).then(() => {}).catch(err => console.log("ERROR", err));
        return null;
      }

      
    }

    if(msg.startsWith('/clear')){

      let words = msg.split(' ');

      if(words.length === 2){
        this.sendyHub.invoke("ClearAll", words[1]).then(() => {}).catch(err => console.log("ERROR", err));
        return null;
      }

      
    }

    msg = msg.replace('/shruggie', '¯\\_(ツ)_/¯');

    return msg;
  }

  
  onScroll(){
    let frame = this.feed.nativeElement;
    if((frame.scrollTop + frame.clientHeight) == frame.scrollHeight){
      this.scrollLock = true;
    }else{
      this.scrollLock = false;
    }
  }
  
  scrollToBottom(){
    this.feed.nativeElement.scrollTop = this.feed.nativeElement.scrollHeight;
    this.scrollLock = true;
  }

}

class Message {
  isSystem: boolean;
  isImage: boolean;
  user: string;
  message: string;
  color: string;

  constructor(u?: string, m?: string, c?: string){
    this.user = u;
    this.message = m;
    this.color = c;
  }
}