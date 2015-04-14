'use strict';

var express = require('express')
var path = require('path')
var app = express()
var colors = require('colors')




/**
 *  static folder
 **/
app.use(express.static(path.join(__dirname, '.')))
app.get('/index', function (req, res, next) {
    res.send({
        title: 'index',
        html: {
            index: '<div>Load by pagelet</div>'
        },
        js: ['js/index.js'],
        css: ['css/index.css']
    })
})


app.get('/a', function (req, res, next) {
    res.send({
        title: 'a',
        html: {
            pagelet_a: '<div id="pagelet_a">我是/a `pagelet_a` 的区域</div>',
            pagelet_b: '<div id="pagelet_b">我是/a `pagelet_b` 的区域</div>'
        },
        js: [],
        css: []
    })
})
app.get('/b', function (req, res, next) {
    res.send({
        title: 'b',
        html: {
            pagelet_a: '<div id="pagelet_a">我是/b `pagelet_a` 的区域</div>',
            pagelet_b: '<div id="pagelet_b">我是/b `pagelet_b` 的区域</div>'
        },
        js: [],
        css: []
    })
})
app.get('/c/:id', function (req, res, next) {
    res.send({
        title: 'c',
        html: {
            pagelet_a: '<div id="pagelet_a">我是/c `pagelet_a` 的区域</div>',
            pagelet_b: '<div id="pagelet_b">我是/c `pagelet_b` 的区域</div>'
        },
        js: [],
        css: []
    })
})

/**
 *  server and port
 **/
var port = process.env.PORT || 1024
app.listen(port, function () {
    console.log('Server is listen on port', String(port).blue)
    
})