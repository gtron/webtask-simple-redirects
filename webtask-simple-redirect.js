const http = require('http');
const querystring = require('querystring');

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
     var secrets = this.context.secrets;
     
      postData =  secrets.influxDb+','+querystring.stringify({
        "urlKey": this.key
        }, 
        ',') + " value=1";
      
      const options = {
        hostname: secrets.influxHost,
        port: secrets.influxPort,
        path: '/write?db='+secrets.influxDb,
        method: 'POST',
        auth: secrets.influxUser+':'+secrets.influxPassword,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      
      const req = http.request(options, (res) => {
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          console.log(`BODY: ${chunk}`);
        });
      });
      
      req.on('error', (e) => {
        console.error(`problem with request to Influx: ${e.message}`);
      });
      //console.log("sending to Influx: " + postData );
      req.write(postData);
      req.end();
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
          dataK = data[k] ;
          
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
              // console.log("written new Data", data);
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
  
};

