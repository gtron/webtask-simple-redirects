const http = require('http');
const querystring = require('querystring');

const Influx = require('influx');


var urlProcessor = ( {
   context:{}, req:{}, res:{},
   key: "", 
   urlData: {},
   call : 0 ,
   
   processData : function(data) {
     
     this.urlData = data;
     this.checkData();
     this.incLocalCounter();
     this.saveData(this.key,this.urlData);
     this.initInflux();
     this.sendToInflux();
     this.sendRedirect(302, this.urlData.url );

   },
   
   sendToInflux : function() {
     var secrets = this.context.secrets;
    
    console.log(this.influx);
    
    this.influx.writePoints([
      {
        measurement: 'response_times',
        tags: { host: os.hostname() },
        fields: { duration, path: this.req.path },
      }
    ]);
    
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
     console.log('K:' + k);
     this.context.storage.get(function (error, data) {
          if (error) return cb(error);
          console.log(data);
          data = data || { counter: 1 };
          console.log( data, k , data[k]);
          if ( k in data ) {
            dataK = data[k] ;
            urlProcessor.processData(dataK);
          }  else {
            urlProcessor.sendNotFound('Url not found');
          }
    });
  },
  
  saveData : function ( k, v ) {
     storage = this.context.storage;
     storage.get(function (error, data) {
          if (error) return cb(error);
          
          data[k] = v;
          storage.set(data, function (error) {
              if (error) return cb(error);
          });
    });
  },
  
  sendNotFound: function (message = 'Not found...') {
    this.res.writeHead(404, { 'Content-Type': 'text/html ' });
    this.res.end('Error! ' + message );
  },
  
  sendRedirect : function (code = 404, destination = '') {
    this.res.writeHead(code, { 'Content-Type': 'text/html ', 'Location' : destination });
    this.res.end('<a href="'+destination+'">Continue &raquo;</a>');
  },
   
   checkData : function() {
     if ( this.urlData === undefined )
        throw( new Error('No data')); 
   },
   
   incLocalCounter : function () {
     this.urlData.cnt ++;
   },
   
   log : function (prefix = '---') {
     //console.log("urlProcessorLogger - " + prefix + " call:" + this.call++ , this.urlData );
   },
   
   initInflux : function()  {
     this.influx = new Influx.InfluxDB({
     host: this.context.secrets.influxHost,
     database: this.context.secrets.influxDb,
     username: this.context.secrets.influxUser,
     password: this.context.secrets.influxPassord,
     schema: [
       {
         measurement: 'redirects-webtask',
         fields: {
           path: Influx.FieldType.STRING,
           duration: Influx.FieldType.INTEGER
         },
         tags: [
           'host'
         ]
       }
     ]
    });
   }
}); 

module.exports = function (ctx, req, res) {
  
  let arr = req.url.split('/');
  let key = arr[arr.length - 1].split('?')[0];
  
  console.log(arr, key);
  
  urlProcessor.setContext(ctx, req, res); 
  urlProcessor.processUrlKey(key);
  
};

