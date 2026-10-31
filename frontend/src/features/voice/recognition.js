/** Browser speech input. The caller owns language, transcript editing and screen state. */
export const Recognition = {
  active:null,
  supported(){return !!(window.SpeechRecognition||window.webkitSpeechRecognition);},
  stop(){
    if(this.active){const previous=this.active;this.active=null;previous.abort();}
  },
  listen(language,onText,onState){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){onState('unsupported');return;}
    this.stop();
    const session=new SR();this.active=session;
    session.lang=language;session.interimResults=false;session.maxAlternatives=3;
    session.onstart=()=>{if(this.active===session)onState('listening');};
    session.onresult=event=>{if(this.active===session)onText(event.results[0][0].transcript);};
    session.onerror=()=>{if(this.active===session)onState('error');};
    session.onend=()=>{if(this.active===session){this.active=null;onState('end');}};
    try{session.start();}catch(_){this.active=null;onState('error');}
  }
};
