import fs from 'fs';
import events from 'events';
import path from 'path';
import fetch from 'node-fetch';

function playlist() {
    var that = new events.EventEmitter()

    that.entries = []
    that.selected = null
    that.repeating = false
    that.repeatingOne = false

    var onfile = function(link, cb, play){
        let file = {}

        fs.stat(link, function (err, st) {
            if (err) return cb(err)

            file.length = st.size
            file.name = path.basename(link)
            file.path = link;
            file.createReadStream = function (opts) {
                return fs.createReadStream(link, opts)
            }

            file.id = that.entries.push(file) - 1
            let ondone = function () {
                if(play !== false) that.emit('update', file)
                if(cb) cb()
            }
            ondone()
        })
    }

    var onhttplink = function (link, cb, play) {
        var file = {}

        file.name = link.lastIndexOf('/') > -1 ? link.split('/').pop() : link

        file.createReadStream = function (opts) {
          if (!opts) opts = {}

          if (opts && (opts.start || opts.end)) {
            var rs = 'bytes=' + (opts.start || 0) + '-' + (opts.end || file.length || '')
            return fetch(link, {headers: {Range: rs}})
          }

          return fetch(link)
        }

        // first, get the head for the content length.
        // IMPORTANT: servers without HEAD will not work.
        fetch(link, {method: "HEAD"}).then(function(res){
            if(!res.ok) return cb(res.statusText)
            if (!/2\d\d/.test(res.status)) return cb(new Error('request failed'))
            file.length = Number(res.headers.get("content-length"))
            file.id = that.entries.push(file) - 1
            file.path = link
            if(play !== false) that.emit('update', file)
            if(cb) cb()
        })
    }

    that.deselect = function () {
        that.selected = null
        that.emit('deselect')
    }

    that.clear = function(){
        that.entries = [];
    }

    that.select = function (id) {
        that.selected = that.get(id)
        that.emit('select')
        return that.selected
    }

    that.get = function (id) {
        return that.entries[id]
    }

    that.repeat = function () {
        that.repeating = true
        that.repeatingOne = false
    }

    that.repeatOne = function () {
        that.repeating = true
        that.repeatingOne = true
    }

    that.unrepeat = function () {
        that.repeating = false
        that.repeatingOne = false
    }

    that.add = function(link, cb, play){
        if (/^https?:\/\//i.test(link)) return onhttplink(link, cb, play)
        onfile(link, cb, play)
    }

    return that
}

module.exports = playlist();
