var fs = require("fs")

module.exports.getImageFromClipboard = function(event, file, callback){
    var clipboardData = event.clipboardData,
        i = 0,
        items, item, types;

    if( clipboardData ){
        items = clipboardData.items;

        if( !items ){
            return;
        }

        item = items[0];
        // 保存在剪贴板中的数据类型
        types = clipboardData.types || [];

        for( ; i < types.length; i++ ){
            if( types[i] === 'Files' ){
                item = items[i];
                break;
            }
        }

        // 判断是否为图片数据
        if( item && item.kind === 'file' && item.type.match(/^image\//i) ){
            // 读取该图片            
            saveToFile(item, file, callback)
        }
    }
}

function saveToFile(item, file, callback){
    let reader = new FileReader();
    reader.onload = function( e ){
        let imgData = e.target.result;
        let base64Data = imgData.replace(/^data:image\/\w+;base64,/, "");
        let dataBuffer = new Buffer(base64Data, 'base64');
        fs.writeFile(file, dataBuffer, function(err) {
            callback(err)
        });
    };
    return reader.readAsDataURL(item.getAsFile());
}