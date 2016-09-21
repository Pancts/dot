var Datastore = require('nedb')
var path = require('path');
var util = require('../utils/util');
var dbPath = path.join(util.getHomePath(),  'Databases');

db = {};
db.setting = new Datastore({ filename: path.join(dbPath, 'setting.db'), timestampData:true});
db.live = new Datastore({ filename: path.join(dbPath, 'live.db'), timestampData:true});

// You need to load each database (here we do it asynchronously)
db.setting.loadDatabase();
db.live.loadDatabase();

module.exports = db;