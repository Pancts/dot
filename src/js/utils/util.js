import child_process from 'child_process';
import Promise from 'bluebird';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import http from 'http';
import electron from 'electron';
import toBuffer from 'typedarray-to-buffer';
import canvasBuffer from 'electron-canvas-to-buffer';

const remote = electron.remote;
const dialog = remote.dialog;
const app = remote.app;


module.exports = {
  native: null,
  getUDB: function (){
      let udb = remote.getGlobal('udb');
      return udb || "";
  },
  getYYUID: function (){
      let yyuid = remote.getGlobal('yyuid');
      return yyuid || "";
  },
  getDataPath: function(callback){
    fetch(process.env.APP_PROXY_URL + '/getFileSavePath').then(function(res) {
        return res.json();
    }).then(function(data) {
        if(data.hasOwnProperty("path")){
          callback(data.path)
        }
    });
  },
  formatTime: function (secs) {
    var hours = (secs / 3600) | 0
    var mins = ((secs - hours * 3600) / 60) | 0
    secs = (secs - (3600 * hours + 60 * mins)) | 0
    if (mins < 10) mins = '0' + mins
    if (secs < 10) secs = '0' + secs
    return (hours ? hours + ':' : '') + mins + ':' + secs
  },
  formatToTime: function (secs) {
      var time = 0;
      var arr = secs.split(":").reverse();
      for (var i = arr.length - 1; i >= 0; i--) {
          if(i==0) time += parseInt(arr[i])
          if(i==1) time += parseInt(arr[i])*60
          if(i==2) time += parseInt(arr[i])*3600
      };
    return time;
  },
  getRemoteSetting (key, callback){
      fetch(process.env.APP_PROXY_URL + '/getSetting?key='+key).then(function(res) {
          return res.json();
      }).then(function(data) {
          if(data.hasOwnProperty("value")){
              callback(data["value"])
          }else{
              callback(null)
          }
      });
  },
  setRemoteSetting (key, value, callback){
    //console.info(process.env.APP_PROXY_URL + '/setSetting?key='+key+"&value="+value)
      fetch(process.env.APP_PROXY_URL + '/setSetting?key='+key+"&value="+value).then(function(res) {
          return res.json();
      }).then(function(data) {
          //console.info(data)
      });
  },
  getRemoteSettingPath (callback){
      fetch(process.env.APP_PROXY_URL + '/getFileSavePath').then(function(res) {
          return res.json();
      }).then(function(data) {
          callback(data["path"])
      });
  },
  execFile: function (args, options) {
    return new Promise((resolve, reject) => {
      child_process.execFile(args[0], args.slice(1), options, (error, stdout) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    });
  },
  exec: function (args, options) {
    return new Promise((resolve, reject) => {
      child_process.exec(args, options, (error, stdout) => {
        if (error) {
          reject(new Error('Encountered an error: ' + error));
        } else {
          resolve(stdout);
        }
      });
    });
  },
  isWindows: function () {
    return process.platform === 'win32';
  },
  isLinux: function () {
    return process.platform === 'linux';
  },
  isNative: function () {
    if (this.native === null) {
      if (this.isWindows()) {
        this.native = http.get({
          url: `http:////./pipe/docker_engine/v1.23/version`
        }, (response) => {
          if (response.statusCode !== 200 ) {
            return false;
          } else {
            return true;
          }
        });
      } else {
        try {
          // Check if file exists
          let stats = fs.statSync('/var/run/docker.sock');
          if (stats.isSocket()) {
            this.native = true;
          }
        } catch (e) {
          if (this.isLinux()) {
            this.native = true;
          } else {
            this.native = false;
          }
        }
      }
    }
    return this.native;
  },
  canvasToFile(canvas, file, callback) {
    var buffer = canvasBuffer(canvas, 'image/jpeg')

    // write canvas to file
    fs.writeFile(file, buffer, function (err) {
      callback(err)
    })
     /*let url = canvas.toDataURL("image/jpg")
        let uri = url.split(',')[1]
        let bytes = atob(uri)
        let arr = new Uint8Array(bytes.length)
        for (var i = 0, l = bytes.length; i < l; i++) {
            arr[i] = bytes.charCodeAt(i)
        }
        var buffer = toBuffer(arr);
        fs.writeFile(file, buffer, function(err){})*/
  },
  binsPath: function () {
    return this.isWindows() ? path.join(this.home(), 'Kitematic-bins') : path.join('/usr/local/bin');
  },
  binsEnding: function () {
    return this.isWindows() ? '.exe' : '';
  },
  dockerBinPath: function () {
    return path.join(this.binsPath(), 'docker' + this.binsEnding());
  },
  dockerMachineBinPath: function () {
    return path.join(this.binsPath(), 'docker-machine' + this.binsEnding());
  },
  dockerComposeBinPath: function () {
    return path.join(this.binsPath(), 'docker-compose' + this.binsEnding());
  },
  escapePath: function (str) {
    return str.replace(/ /g, '\\ ').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  },
  home: function () {
    return app.getPath('home');
  },
  documents: function () {
    // TODO: fix me for windows 7
    return 'Documents';
  },
  CommandOrCtrl: function () {
    return this.isWindows() ? 'Ctrl' : 'Command';
  },
  removeSensitiveData: function (str) {
    if (!str || str.length === 0 || typeof str !== 'string' ) {
      return str;
    }
    return str.replace(/-----BEGIN CERTIFICATE-----.*-----END CERTIFICATE-----/mg, '<redacted>')
      .replace(/-----BEGIN RSA PRIVATE KEY-----.*-----END RSA PRIVATE KEY-----/mg, '<redacted>')
      .replace(/\/Users\/[^\/]*\//mg, '/Users/<redacted>/')
      .replace(/\\Users\\[^\/]*\\/mg, '\\Users\\<redacted>\\');
  },
  packagejson: function () {
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  },
  settingsjson: function () {
    var settingsjson = {};
    try {
      settingsjson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'settings.json'), 'utf8'));
    } catch (err) {}
    return settingsjson;
  },
  isOfficialRepo: function (name) {
    if (!name || !name.length) {
      return false;
    }

    // An official repo is alphanumeric characters separated by dashes or
    // underscores.
    // Examples: myrepo, my-docker-repo, my_docker_repo
    // Non-examples: mynamespace/myrepo, my%!repo
    var repoRegexp = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
    return repoRegexp.test(name);
  },
  compareVersions: function (v1, v2, options) {
    var lexicographical = options && options.lexicographical,
      zeroExtend = options && options.zeroExtend,
      v1parts = v1.split('.'),
      v2parts = v2.split('.');

    function isValidPart (x) {
      return (lexicographical ? /^\d+[A-Za-z]*$/ : /^\d+$/).test(x);
    }

    if (!v1parts.every(isValidPart) || !v2parts.every(isValidPart)) {
      return NaN;
    }

    if (zeroExtend) {
      while (v1parts.length < v2parts.length) {
        v1parts.push('0');
      }
      while (v2parts.length < v1parts.length) {
        v2parts.push('0');
      }
    }

    if (!lexicographical) {
      v1parts = v1parts.map(Number);
      v2parts = v2parts.map(Number);
    }

    for (var i = 0; i < v1parts.length; ++i) {
      if (v2parts.length === i) {
        return 1;
      }
      if (v1parts[i] === v2parts[i]) {
        continue;
      } else if (v1parts[i] > v2parts[i]) {
        return 1;
      } else {
        return -1;
      }
    }

    if (v1parts.length !== v2parts.length) {
      return -1;
    }

    return 0;
  },
  md5: function(content){
    var md5 = crypto.createHash('md5');
    md5.update(content);
    return md5.digest('hex');  
  },
  randomId: function () {
    return crypto.randomBytes(32).toString('hex');
  },
  mkdirsSync: function mkdirsSync(dirname, mode){
    if(fs.existsSync(dirname)){
        return true;
    }else{
        if(mkdirsSync(path.dirname(dirname), mode)){
            fs.mkdirSync(dirname, mode);
            return true;
        }
    }
  },
  windowsToLinuxPath: function (windowsAbsPath) {
    var fullPath = windowsAbsPath.replace(':', '').split(path.sep).join('/');
    if (fullPath.charAt(0) !== '/') {
      fullPath = '/' + fullPath.charAt(0).toLowerCase() + fullPath.substring(1);
    }
    return fullPath;
  },
  linuxToWindowsPath: function (linuxAbsPath) {
    return linuxAbsPath.replace('/c', 'C:').split('/').join('\\');
  },
  linuxTerminal: function () {
    if (fs.existsSync('/usr/bin/x-terminal-emulator')) {
      return ['/usr/bin/x-terminal-emulator', '-e'];
    } else {
      dialog.showMessageBox({
        type: 'warning',
        buttons: ['OK'],
        message: 'The terminal emulator symbolic link doesn\'t exists. Please read the Wiki at https://github.com/docker/kitematic/wiki/Early-Linux-Support.'
      });
      return false;
    }
  },
  webPorts: ['80', '8000', '8080', '8888', '3000', '5000', '2368', '9200', '8983']
};
