/**
 *  Pagelet main module
 */

var pagelet = global.pagelet = {};
var loaded = {};
var combo = false;
var lruOn = true;
var comboPattern = DEFAULT_COMBO_PATTERN;
var supportPushState = global.history && global.history.pushState && global.history.replaceState && !navigator.userAgent.match(/((iPod|iPhone|iPad).+\bOS\s+[1-4]\D|WebApps\/.+CFNetwork)/);
var _autoload = true, _state, _pageletQueryObj = {}

//路由派发
pageletRouter(pagelet)

//停止autoload
pagelet.stop = function(){
	_autoload = false
}

pagelet.init = function(cb, cbp, used){
	combo = !!cb;
	comboPattern = cbp || DEFAULT_COMBO_PATTERN;
	if(used && used.length){
		used.forEach(function(uri){
			loaded[uri] = true;
		});
	}
};

//设置全局pagelet请求追加参数
pagelet.addQuery = function(queryObj){
	_pageletQueryObj = queryObj
}

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
		pagelet.load(url, pagelets, pageletOptions, function(err, data, done, customData){

			if(err){
				throw new Error(err);
			}
			else{
				//加载成功之后用带 完整state的url去replace
				var title = data.title || document.title;
		        var state = {
					url: url,
					title: title,
					pagelets : pagelets,
					pageletOptions : pageletOptions
		        };

		        //直接通过缓存拿到的，不需要ajax请求，下面的那段pusthstate url先变的处理逻辑不会生效
		        if(customData && customData.fromCache){
		        	global.history.pushState(state, title, url);
		        }else{
		        	global.history.replaceState(state, title, url);
		        }
		        
		        _processHtml(err, data.html, url, done)
			}
		})
		
		//在发起异步请求开始时就先改变url，pagelet load完成之后再改变_state值
		var xhr = loader.xhr()
		//还要!=4，因为会拿到上一次已经完毕的xhr
		if (xhr.readyState > 0 && xhr.readyState!=4) {
			if(stateReplace){
				global.history.replaceState(null, "", url);
			}else{
				global.history.pushState(null, "", url);
			}
		}
	}
	else{
		//TODO 取消掉默认的load事件后，title没法变化
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

		var nocache = Boolean(pageletOptions.nocache) || false
		if(lruOn && !nocache){
			var pageletCache = lru.get(url + "-" + pagelets)
			if(pageletCache){
				_pageletLoaded(pageletCache, callback, true)
				return
			}
		}

		var quickling = url + (url.indexOf('?') === -1 ? '?' : '&') + 'pagelets=' + encodeURIComponent(pagelets);

		for (var key in _pageletQueryObj) {
			if(url.indexOf(key) === -1){
				quickling += '&' + key + '=' + encodeURIComponent(_pageletQueryObj[key])
			}
		}

		loader.request(quickling, {
			pagelets : pagelets,
            before: function (xhr) {
                //pagelet.emit('beforeload', pagelets, xhr)
            }
        }, function (err, result) {
        	if (err) return callback(err);

        	//设置lru cahce
        	lruOn && lru.set(url + "-" + pagelets, result)

        	_pageletLoaded(result, callback, false)
        })
	}
	//TODO 没有pagelet的情况会刷新页面
	//情景：后端渲染打开第一个页面，pushstate到第二个页面，再用浏览器返回按钮的时候会刷新，体验不好
	else {
		location.href = url;
	}
}

//pagelet加载完成
function _pageletLoaded(result, callback, fromCache){

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
			loader(r.uri, r.type, function(err)
			{
				len--;
				if(len === 0){
					callback(error, result, done, {fromCache : fromCache});
				}
				error = err;
			});
		});
	} 
	else {
		callback(error, result, done, {fromCache : fromCache});
	}
}

//默认的pagelet dom替换操作
function _processHtml(err, htmlObj, url, done){

	// Clear out any focused controls before inserting new page contents.
	try { document.activeElement.blur() } catch (e) { }

	if(err){
		throw new Error(err);
	}else{
		if(pagelet.emit('beforeDomReplace', url, htmlObj, done)!="block"){
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


//autoload
document.documentElement.addEventListener( 'click', function(e) 
{
	if(!_autoload) return
		
	var target = e.target;
	while(target && target.tagName && target.tagName.toLowerCase()!="body")
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
			_processHtml(err, data.html, state.url, done)
		})
	}
	
}, false);