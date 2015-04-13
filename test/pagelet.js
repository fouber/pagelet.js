;(function (global) {
'use strict';
/**
 *  Universal Consts for all modules
 */

var READY_STATE_CHANGE = 'onreadystatechange'
var READY_STATE = 'readyState'
var TIMEOUT = 60 * 1000; // pagelet请求的默认超时时间
var DEFAULT_COMBO_PATTERN = '/co??%s';
/**
 *  Util functions
 */
function noop() {}
function _exec(code) {
    var node = $docm.createElement('script');
    _appendChild(node, $docm.createTextNode(code));
    _appendChild($head, node);
}
function _filter(item) {
    return !!item;
}
function _appendChild(node, child) {
    return node.appendChild(child);
}
function _hasOwn (obj, prop) {
    return obj.hasOwnProperty(prop)
}
function _attr(el, attName) {
    return el.getAttribute(attName)
}
function _is(obj, type) {
    return Object.prototype.toString.call(obj).toLowerCase() === '[object ' + type + ']';
}
/**
 *  Ajax request loader
 */
var isOldWebKit = +navigator.userAgent.replace(/.*AppleWebKit\/(\d+)\..*/, '$1') < 536;
var $head = document.head || document.getElementsByTagName('head')[0];

var xhr;
function loader (url, type, callback) {

    var isScript = type === 'js';
    var isCss = type === 'css';
    var node = document.createElement(isScript ? 'script' : 'link');
    var supportOnload = 'onload' in node;
    var tid = setTimeout(function() {
        clearTimeout(tid);
        clearInterval(intId);
        callback('timeout');
    }, TIMEOUT);
    var intId;

    if (isScript) {
        node.type = 'text/javascript';
        node.async = 'async';
        node.src = url;
    } else {
        if (isCss) {
            node.type = 'text/css';
            node.rel = 'stylesheet';
        }
        node.href = url;
    }
    node.onload = node[READY_STATE_CHANGE] = function() {
        if (node && (!node[READY_STATE] || /loaded|complete/.test(node[READY_STATE]))) {
            clearTimeout(tid);
            node.onload = node[READY_STATE_CHANGE] = noop;
            if (isScript && $head && node.parentNode) $head.removeChild(node);
            callback();
            node = null;
        }
    };
    node.onerror = function(e) {
        clearTimeout(tid);
        clearInterval(intId);
        e = (e || {}).error || new Error('load resource timeout');
        e.message = 'Error loading [' + url + ']: ' + e.message;
        callback(e);
    };

    _appendChild($head, node);

    if (isCss) {
        if (isOldWebKit || !supportOnload) {
            intId = setInterval(function() {
                if (node.sheet) {
                    clearTimeout(id);
                    clearInterval(intId);
                    callback();
                }
            }, 20);
        }
    }
};

loader.xhr = function () {
    return xhr
}
loader.request = function (quickling, options, callback, progress) {
    var before = options.before || noop
    /**
     *  only on request in processing
     */
    if (xhr && xhr[READY_STATE] < 4) {
        xhr[READY_STATE_CHANGE] = noop;
        xhr.abort();
    }
    xhr = new global.XMLHttpRequest();
    xhr.onprogress = progress;
    xhr[READY_STATE_CHANGE] = function() {
        if (xhr[READY_STATE] == 4) {
            xhr[READY_STATE_CHANGE] = noop;
            var result, error = null;
            if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304) {
                result = xhr.responseText;
                try {
                    result = JSON.parse(result);
                } catch (e) {
                    error = e;
                }
                error ? callback(error) : callback(null, result);
            } else {
                error = xhr.statusText || (xhr.status ? 'error' : 'abort')
                callback(error);
            }
        }
    };

    before(xhr);
    xhr.open('GET', quickling, true);
    xhr.send();
};
/**
 *  Attach message function to pagelet instance
 */
var TYPE_ENUM = ['beforeload','beforeDomReplace']

function pageletRouter (raw) {
    var callbacks = {};

    for (var i = 0; i < TYPE_ENUM.length; i++) {
    	callbacks[TYPE_ENUM[i]] = {}
    };

    raw.emit = function (type, urlPath) {
        var typeRouteMap = callbacks[type]
        
        for(var j in typeRouteMap){
        	var route_reg_str = typeRouteMap[j].routeData.route_reg
        	var route_re = new RegExp(route_reg_str)
			var match_ret = urlPath.match(route_re)

			if(match_ret != null)
			{
				var callFn = typeRouteMap[j].fn
				var paramsCount =  typeRouteMap[j].routeData.params_count
				var routeParams = []
				for(var i =1 ; i <= paramsCount ; i++){
					if(match_ret[i]) routeParams.push(match_ret[i])
				}

				var args = [].slice.call(arguments);
				args.shift();
				args.push(routeParams)

				return callFn.apply(raw, args);
			}
        }
        return false
    }
    raw.on = function (type, route, fn) {
        var handlers = callbacks[type][route];
        if(!handlers){
        	handlers = callbacks[type][route] = {}
        	handlers.fn = fn
        	handlers.routeData = __replace_route_to_route_reg(route)
        }
    }
}

function __replace_route_to_route_reg(route)
{
	var omission_param_re =	/\(.+\)/g		//省略参数
	var param_re = /:\w+\/?/g		//必传参数

	var params_count = route.split(':').length - 1		//参数个数
	
	var reg_str = route.replace(param_re, function($0)
	{
		var replace_role_str = '{[^\/]+}'

		var have_spilt = $0.indexOf('/') != -1

		if(have_spilt) replace_role_str += '/'
		
		return replace_role_str
	})    
	
	reg_str = reg_str.replace(omission_param_re, function($1)
	{
		var replace_role_str = $1.replace('(','(?:').replace(')','|)')

		return replace_role_str
	})

	var reg_str = reg_str.replace("*",".*")			//匹配全路路由

	//花括号替换回()
	var re = /{/g
	reg_str = reg_str.replace(re,'(')
	var re = /}/g
	reg_str = reg_str.replace(re,')')
	
	//转义字符构造
	var re = /\//g
	reg_str = reg_str.replace(re,'\\/')
	
	//最后加上结束符
	reg_str += "$"
	
	return { route_reg : reg_str , route : route , params_count : params_count }
}
/**
 *  Pagelet main module
 */

var pagelet = global.pagelet = {};
var loaded = {};
var combo = false;
var comboPattern = DEFAULT_COMBO_PATTERN;
var supportPushState = global.history && global.history.pushState && global.history.replaceState && !navigator.userAgent.match(/((iPod|iPhone|iPad).+\bOS\s+[1-4]\D|WebApps\/.+CFNetwork)/);
var _state

pageletRouter(pagelet)

pagelet.init = function(cb, cbp, used){
	combo = !!cb;
	comboPattern = cbp || DEFAULT_COMBO_PATTERN;
	if(used && used.length){
		used.forEach(function(uri){
			loaded[uri] = true;
		});
	}
};

//初始浏览器的第一个state
//可以用来兼容后端渲染出来的第一个页面
pagelet.initState = function(pagelets , pageletOptions){

	var pagelets = pagelets || []
	var pageletOptions = pageletOptions || {}

	if(!_state){
		_state = {
			url: global.location.href,
			title: document.title,
			pagelets : pagelets,
			pageletOptions : pageletOptions
		};
		global.history.replaceState(_state, document.title);
	}
}

pagelet.go = function(url, pagelets, pageletOptions){
	//console.log(url, pagelets, pageletOptions)
	var stateReplace = Boolean(pageletOptions.stateReplace) || false
	if(supportPushState && pagelets){
		pagelet.initState()
	}

	//阻止原有的load事件
	if(pagelet.emit('beforeload', url, pagelets)!="block"){
		pagelet.load(url, pagelets, pageletOptions, function(err, data, done){

			//加载成功之后用带 完整state的url去replace
			var title = data.title || document.title;
	        var state = {
				url: url,
				title: title,
				pagelets : pagelets,
				pageletOptions : pageletOptions
	        };
	        global.history.replaceState(state, title, url);
	        
	        _processHtml(err, data.html, url, pagelets, done)
		})
		
		//在发起异步请求开始时就先改变url，pagelet load完成之后再改变_state值
		var xhr = loader.xhr()
		if (xhr.readyState > 0) {
			if(stateReplace){
				global.history.replaceState(null, "", url);
			}else{
				global.history.pushState(null, "", url);
			}
		}
	}
	else{
		//TODO
		var state = {
			url: url,
			pagelets : pagelets,
			pageletOptions : pageletOptions
        };
		if(stateReplace){
			global.history.replaceState(state, "", url);
		}else{
			global.history.pushState(state, "", url);
		}
	}
}

pagelet.load = function(url, pagelets, pageletOptions, callback){
	if(pagelets && pagelets.length){
		callback = callback || noop;
		if(_is(pagelets, 'String')){
			pagelets = pagelets.split(/\s*,\s*/);
		}
		pagelets = pagelets.join(',');
		var quickling = url + (url.indexOf('?') === -1 ? '?' : '&') + 'pagelets=' + encodeURIComponent(pagelets);

		loader.request(quickling, {
            before: function (xhr) {
                //pagelet.emit('beforeload', pagelets, xhr)
            }
        }, function (err, result) {
        	if (err) return callback(err);

        	_pageletLoaded(result, callback)
        })
	} 
	else {
		location.href = url;
	}
}

//pagelet加载完成
function _pageletLoaded(result, callback){

	document.title = result.title || document.title;
	var res = [],error = null;
	_addResource(res, result.js, 'js');
	_addResource(res, result.css, 'css');
	var done = function(){
		if(result.script && result.script.length){
			var left = '!function(){';
			var right = '}();\n';
			var code = left + result.script.join(right + left) + right;
			_exec(code);
		}
		//TODO input[autofocus], textarea[autofocus]
		done = noop;
	};
	if(res && res.length){
		var len = res.length;
		res.forEach(function(r)
		{
			_loadResource(r.uri, r.type, function(err)
			{
				len--;
				if(len === 0){
					callback(error, result, done);
				}
				error = err;
			});
		});
	} 
	else {
		callback(error, result, done);
	}
}

//默认的pagelet dom替换操作
function _processHtml(err, htmlObj, url, pagelets, done){

	// Clear out any focused controls before inserting new page contents.
	try { document.activeElement.blur() } catch (e) { }

	if(err){
		throw new Error(err);
	}else{
		if(pagelet.emit('beforeDomReplace', url, pagelets, htmlObj, done)!="block"){
			for(var pageletId in htmlObj){
				if(htmlObj.hasOwnProperty(pageletId)){
					var objTemp = document.createElement("div");
					objTemp.innerHTML = htmlObj[pageletId];
					var dom = document.getElementById(pageletId);
					dom.innerHTML = objTemp.childNodes[0].innerHTML
				}
			}

			//eval script  TODO：pagelet加参数控制是否执行
			done();
		}
	}
}

//添加静态资源到map，会做排重处理
function _addResource(result, collect, type){
	if(collect && collect.length)
	{
		collect = collect.filter(function(uri){
			var has = loaded[uri] === true;
			loaded[uri] = true;
			return !has;
		});
		if(collect.length)
		{
			if(combo)
			{
				var uri = collect.join(',');
				result.push({
					uri: comboPattern.replace('%s', uri),
					type: type
				});
			}
			else 
			{
				collect.forEach(function(uri){
					result.push({
						uri: uri,
						type: type
					});
				});
			}
		}
	}
}

//加载静态资源
function _loadResource(url, type, callback){
	var isScript = type === 'js';
	var isCss = type === 'css';
	var node = document.createElement(isScript ? 'script' : 'link');
	var supportOnload = 'onload' in node;
	var tid = setTimeout(function(){
		clearTimeout(tid);
		clearInterval(intId);
		callback('timeout');
	}, TIMEOUT);
	var intId;
	if(isScript){
		node.type = 'text/javascript';
		node.async = 'async';
		node.src = url;
	} else {
		if(isCss){
			node.type = 'text/css';
			node.rel = 'stylesheet';
		}
		node.href = url;
	}
	node.onload = node.onreadystatechange = function(){
		if(node && (!node.readyState || /loaded|complete/.test(node.readyState)))
		{
			clearTimeout(tid);
			node.onload = node.onreadystatechange = noop;
			if(isScript && head && node.parentNode) head.removeChild(node);
			callback();
			node = null;
		}
	};
	node.onerror = function(e){
		clearTimeout(tid);
		clearInterval(intId);
		e = (e||{}).error || new Error('load resource timeout');
		e.message = 'Error loading [' + url + ']: ' + e.message;
		callback(e);
	};
	head.appendChild(node);
	if(isCss){
		if(isOldWebKit || !supportOnload)
		{
			intId = setInterval(function()
			{
				if(node && node.sheet){
					clearTimeout(tid);
					clearInterval(intId);
					callback();
				}
			}, 20);
		}
	}
}

//autoload
document.documentElement.addEventListener( 'click', function(e) 
{
	var target = e.target;
	while(target && target.tagName.toLowerCase()!="body")
	{
		if( target.tagName.toLowerCase() === 'a' ) {
			var href = target.getAttribute('href')
			//to array
			var pagelets = (target.getAttribute('data-pagelets') || '').split(/\s*,\s*/).filter(_filter)
			var stateReplace = target.getAttribute('data-pagelets-stateReplace') || false
			var nocache = target.getAttribute('data-pagelets-nocache') || false

			if( href && pagelets.length > 0 ){
				e.preventDefault()
				e.stopPropagation()

				var pageletOptions = {
					stateReplace : stateReplace,
					nocache : nocache
				}
				pagelet.go(href, pagelets, pageletOptions)
			}

			break;
		}

		target = target.parentNode
	}
})

global.addEventListener('popstate', function(e) {
	var state = e.state;
	if (!state) {
	    location.href = state.url;
	    return 
	}
	var url = state.url
	var pagelets = state.pagelets
	if(pagelet.emit('beforeload', url, pagelets)!="block"){
		pagelet.load(url, pagelets, state.pageletOptions, function(err, data, done){
			_processHtml(err, data.html, state.url, state.pagelets, done)
		})
	}
	
}, false);
})(window);