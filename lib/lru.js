var LRU_MAP = []
var _MAX_COUNT = 100

var lru = {
	set : function(key, val) {
		if(LRU_MAP.length >= _MAX_COUNT){
			LRU_MAP.shift()
		}
		LRU_MAP.push({ key : key , val : val })
	},
	get : function(key){
		for (var i = LRU_MAP.length - 1; i >= 0; i--) {
			if(LRU_MAP[i].key == key){
				return LRU_MAP[i].val
			}
		}

		return false
	}
}