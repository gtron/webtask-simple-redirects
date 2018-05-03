const http = require('http');

/**
* @param ctx {WebtaskContext}
*/
var urlProcessor = ( {
   context:{}, req:{}, res:{},
   key: "", 
   urlData: {},
   call : 0 ,
   
   processData : function(data) {
     
     this.urlData = data;
     this.checkData();
     this.incCounter();
     this.saveData(this.key,this.urlData);
     this.sendToInflux();
     this.endProcess();

   },
   
   sendToInflux : function() {
     http.get('http://www.google.com/index.html', (res) => {
        console.log(`Got response: ${res.statusCode}`);
        // consume response body
        res.resume();
      }).on('error', (e) => {
        console.log(`Got error: ${e.message}`);
      });
   },
   
   setContext: function(ctx, req, res){
    this.context = ctx;
    this.req = req;
    this.res = res;
   }, 
   
   processUrlKey : function ( k ) {
     
     this.key = k;
     
     this.context.storage.get(function (error, data) {
          if (error) {
            return cb(error);
          }
          data = data || { counter: 1 };
          dataK = data[k] || {};
          
          urlProcessor.processData(dataK);
          
    });
  },
  
  saveData : function ( k, v ) {
     
     storage = this.context.storage;
     
     storage.get(function (error, data) {
          if (error) {
            return cb(error);
          }
          data[k] = v;
          
          storage.set(data, function (error) {
              if (error) return cb(error);
              console.log("written new Data", data);
          });
    });
  },
  
  endProcess : function () {
    this.res.writeHead(301, { 'Content-Type': 'text/html '});
  
    this.res.end('This is the redirect!');
    
  },
   
   checkData : function() {
     if ( this.urlData === undefined )
        throw( new SyntaxError('')); 
   },
   
   incCounter : function () {
     this.urlData.cnt ++;
   },
   
   log : function (prefix = '---') {
     console.log("urlProcessorLogger - " + prefix + " call:" + this.call++ , this.urlData );
   }
}); 

module.exports = function (ctx, req, res) {
  
  let arr = req.url.split('/');
  let key = arr[arr.length - 1].split('?')[0];
  
  urlProcessor.setContext(ctx, req, res); 
  urlProcessor.processUrlKey(key);
  
  /*
  res.writeHead(404, { 'Content-Type': 'text/html '});
  
  res.end('URL Not found!');
  */
};


