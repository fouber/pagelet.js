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
    var pagelets = options.pagelets || false
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
    xhr.setRequestHeader("scrat-pagelets", pagelets);
    xhr.send();
};