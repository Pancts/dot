import React from 'react';

class AboutPage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            src: "",
            sources: [],
        }; 
    }

    componentDidMount() {

    }

    render() {
        var self = this;

        return (
            <div classNmae="row">
                 <div className="well">
                    <p>1. 解压压缩包</p>
                    <p>2. 双击<code>Setup.exe</code>安装应用程序</p>
                    <p>3. 在chrome浏览器打开地址：<code>chrome://extensions/</code></p>
                    <p>4. 拖动整个文件夹<code>chrome-plugin</code>到chrome中</p>
                    <p>5. 在桌面点击已经安装好的图标<code>electron</code>，打开应用</p>
                    <p>6. 在chrome浏览器打开直播网站，目前支持虎牙(仅直播线路1)，斗鱼，龙珠，熊猫，战旗，可能由于官方规则更改，上面网站的直播抓取不到。</p>
                    <p>7. 通过快捷键<kbd><kbd>ctrl</kbd> + <kbd>shift</kbd> + <kbd>x</kbd> </kbd>截取已经抓取到的直播流，可自行通过修改chrome快捷键更改设置</p>
                </div>
            </div>
        );
    }
}

export default AboutPage;
