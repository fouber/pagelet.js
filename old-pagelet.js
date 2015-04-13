/**
 *  Pagelet main module
 */

var $document = document
var hist = global.history
var comboPattern = DEFAULT_COMBO_PATTERN;
var combo = false; // 是否采用combo
var loaded = {};
// 是否支持Html5的PushState
var supportPushState =
    hist && hist.pushState && hist.replaceState &&
    // pushState isn't reliable on iOS until 5.
    !navigator.userAgent.match(/((iPod|iPhone|iPad).+\bOS\s+[1-4]\D|WebApps\/.+CFNetwork)/);

var pagelet = global.pagelet = {};
/**
 *  Attature message function to pagelet instance
 */
messagify(pagelet);

pagelet.init = function(cb, cbp, used) {
    combo = !!cb;
    comboPattern = cbp || DEFAULT_COMBO_PATTERN;
    if (used && used.length) {
        used.forEach(function(uri) {
            loaded[uri] = true;
        });
    }
};

pagelet.load = function(url, pagelets, callback, progress) {
    if (pagelets && pagelets.length) {
        callback = callback || noop;
        progress = progress || noop;
        if (_is(pagelets, 'string')) {
            pagelets = pagelets.split(/\s*,\s*/);
        }
        var quickling = url + (url.indexOf('?') === -1 ? '?' : '&') + 'pagelets=' + encodeURIComponent(pagelets.join(','));

        loader.request(quickling, {
            before: function (xhr) {
                pagelet.emit('beforeload', pagelets, xhr)
            }
        }, function (err, result) {
            pagelet.emit('loadend', pagelets, err, result)

            if (err) return callback(err);

            $document.title = result.title || $document.title;
            var res = [];
            _addResource(res, result.js, 'js');
            _addResource(res, result.css, 'css');
            var done = function() {
                if (result.script && result.script.length) {
                    var left = '!function(){';
                    var right = '}();\n';
                    var code = left + result.script.join(right + left) + right;
                    _exec(code);
                }
                //TODO input[autofocus], textarea[autofocus]
                done = noop;
            };

            var error = err
            if (res && res.length) {
                var len = res.length;
                res.forEach(function(r) {
                    loader(r.uri, r.type, function(e) {
                        len--;
                        if (len === 0) {
                            callback(error, result, done);
                        }
                        error = e;
                    });
                });
            } else {
                callback(error, result, done);
            }
        }, progress)
    } else {
        location.href = url;
    }
};


var state; // state is a cached var for last popstate

pagelet.go = function(url, pagelets, processHtml, progress) {
    if (supportPushState && pagelets) {
        if (!state) {
            state = {
                url: global.location.href,
                title: $document.title
            };
            hist.replaceState(state, $document.title);
        }
        pagelet.load(url, pagelets, function(err, data, done) {
            var title = data.title || $document.title;
            state = {
                url: url,
                title: title
            };
            hist.replaceState(state, title, url);
            // Clear out any focused controls before inserting new page contents.
            try {
                $document.activeElement.blur()
            } catch (e) {}
            if (processHtml(null, data.html) !== false) done();
        }, progress);

        var xhr = loader.xhr()
        if (xhr && xhr.readyState > 0) {
            hist.pushState(null, "", url);
        }
    } else {
        location.href = url;
    }
};

pagelet.autoload = function() {
    global.addEventListener('popstate', function(e) {
        state = e.state;
        if (state) {
            location.href = state.url;
        }
    }, false);

    $document.documentElement.addEventListener('click', function(e) {
        var target = e.target;
        if (target.tagName.toLowerCase() === 'a') {
            // Middle click, cmd click, and ctrl click should open
            // links in a new tab as normal.
            if (e.which > 1 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            // Ignore cross origin links
            if (location.protocol !== target.protocol || location.hostname !== target.hostname) return;

            var pagelets = _attr(target, 'data-pagelets');
            var parents = _attr(target, 'data-parents');
            var autocache = _attr(target, 'data-autocache');
            var href = _attr(target, 'href');

            pagelets = (pagelets || '').split(/\s*,\s*/).filter(_filter);
            parents = (parents || '').split(/\s*,\s*/).filter(_filter);

            if (href && parents.length === pagelets.length && pagelets.length > 0) {
                e.preventDefault();
                e.stopPropagation();

                if (autocache === 'cached') {
                    // 不触发pagelet请求
                    return false;
                }
                if (autocache === 'false') {
                    // 让pagelet请求带上时间戳，避免命中浏览器缓存
                    href += (href.indexOf('?') >= 0 ? '&' : '?') + '_ts=' + Date.now();
                }

                var map = {};
                pagelets.forEach(function(pagelet, index) {
                    map[pagelet] = parents[index];
                });
                pagelet.go(href, pagelets, function(err, html) {
                    if (err) {
                        throw new Error(err);
                    } else {
                        for (var key in html) {
                            if (_hasOwn(html, key) && _hasOwn(map, key)) {
                                var parent = map[key];
                                var dom = $document.getElementById(parent);
                                if (dom) {
                                    dom = null;
                                    if (autocache === 'true') {
                                        // 下次点击不会触发pagelet请求
                                        target.setAttribute('data-autocache', 'cached');
                                    }
                                } else {
                                    throw new Error('undefined parent dom [' + parent + ']');
                                }
                            }
                        }
                    }
                });
            }
        }
    }, false);
};

function _addResource(result, collect, type) {
    if (collect && collect.length) {
        collect = collect.filter(function(uri) {
            var has = loaded[uri] === true;
            loaded[uri] = true;
            return !has;
        });
        if (collect.length) {
            if (combo) {
                var uri = collect.join(',');
                result.push({
                    uri: comboPattern.replace('%s', uri),
                    type: type
                });
            } else {
                collect.forEach(function(uri) {
                    result.push({
                        uri: uri,
                        type: type
                    });
                });
            }
        }
    }
}
