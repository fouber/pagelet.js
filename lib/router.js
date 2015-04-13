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